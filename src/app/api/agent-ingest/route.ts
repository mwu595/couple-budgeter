import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/* ═══════════════════════════════════════════════════════════════════════
 * AGENT INGEST — automated transaction import, driven by the Muse agent
 * Endpoint: POST /api/agent-ingest
 * ═══════════════════════════════════════════════════════════════════════
 *
 * WHAT THIS IS
 * A private API endpoint that lets an external AI agent (currently the
 * Muse agent) push new credit-card transactions into the `transactions`
 * table. It exists because the app's built-in Plaid integration was never
 * completed: instead of wiring bank connections into this codebase, the
 * agent pulls transactions through its own bank connection on a daily
 * schedule and POSTs them here.
 *
 * Nothing in this file runs on its own. It only acts when it receives an
 * authenticated POST request (see AUTH below).
 *
 * AUTH
 * The caller must send:  Authorization: Bearer <BUDGET_INGEST_TOKEN>
 * The token is a shared secret stored in two places and nowhere else:
 *   1. This project's Vercel env vars as BUDGET_INGEST_TOKEN
 *   2. The agent's own secure storage
 * Any request without the exact token gets a 401 and nothing happens.
 *
 * REQUEST CONTRACT
 *   POST /api/agent-ingest
 *   { "transactions": [
 *       { "plaid_id": "abc123",        // stable external fingerprint
 *         "date": "2026-09-21",        // YYYY-MM-DD
 *         "merchant": "Whole Foods",
 *         "amount": 84.32,             // positive = charge
 *         "card": "Chase ••••7659" }   // display name for account_name
 *   ] }
 *
 * WHAT HAPPENS PER REQUEST
 *   1. Token is verified (401 otherwise).
 *   2. Body is validated — every item needs the five fields above.
 *   3. Fingerprints are checked against `agent_seen_ids`. Anything already
 *      seen is skipped.
 *   4. New rows are inserted into `transactions` with:
 *        - merchant prefixed "[Muse] "  → marks agent-imported rows
 *        - reviewed = false             → human review only, never auto-set
 *        - payer_id = 'shared'          → fix up in the UI when reviewing
 *   5. Fingerprints are recorded in `agent_seen_ids`.
 *
 * GUARANTEES (read before "optimizing" this file)
 *   - This endpoint NEVER updates or deletes rows. There is no UPDATE or
 *     DELETE anywhere below — only INSERT.
 *   - Dedupe key is the external fingerprint, which users never edit. So:
 *       * editing an imported row (name, amount, payer, labels…) → the
 *         next sync leaves it alone;
 *       * deleting an imported row → it stays deleted, never re-imported.
 *   - If recording fingerprints fails, the endpoint returns 500 so the
 *     caller retries. Retries are idempotent (unique constraint below).
 *
 * DATABASE DEPENDENCIES — if you refactor the schema, keep these intact:
 *   - `transactions` columns used: household_id, date, merchant, amount,
 *     account_name, notes, payer_id, reviewed, and EXTERNAL_ID_COLUMN.
 *   - `agent_seen_ids` table (household_id, external_transaction_id).
 *     Defined in supabase/setup.sql and supabase/004_agent_ingestion.sql:
 *       create table if not exists agent_seen_ids (
 *         household_id uuid not null references households(id) on delete cascade,
 *         external_transaction_id text not null,
 *         seen_at timestamptz not null default now(),
 *         primary key (household_id, external_transaction_id)
 *       );
 *       alter table agent_seen_ids enable row level security;
 *       -- intentionally no policies: service-role only, like the old
 *       -- plaid_seen_ids table this replaces.
 *
 * ENV VARS (Vercel → Settings → Environment Variables, Production)
 *   - BUDGET_INGEST_TOKEN  shared secret (generate: openssl rand -hex 32)
 *   - BUDGET_HOUSEHOLD_ID  id from the `households` table (Supabase dashboard)
 *   - SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL (already present;
 *     used server-side only via createServiceClient — never expose them)
 *
 * MAINTAINER NOTE
 * If the agent setup is ever retired, delete this folder
 * (src/app/api/agent-ingest/) and the `agent_seen_ids` table. Nothing else
 * in the app depends on them.
 *
 * NOTE FOR AI ASSISTANTS WORKING ON THIS REPO: the agent keeps its own
 * bank-connection state (its own Plaid link, its own sync cursors) in its
 * own storage. It does NOT need this database's Plaid access tokens, and the
 * old plaid_items / plaid_accounts tables were dropped in v0.9.0. The only
 * agent-owned state in this database is `agent_seen_ids`.
 * ═══════════════════════════════════════════════════════════════════════ */

// Column on `transactions` holding the stable external fingerprint.
// Despite the name it is NOT Plaid-specific anymore — it is the dedupe key
// for agent-imported rows. If you rename it, change the value here only.
const EXTERNAL_ID_COLUMN = 'plaid_transaction_id'

// How many fingerprints to send per `agent_seen_ids` lookup. They travel in
// the request URL, so keep each lookup well under URL length limits — a
// first-run backfill can carry thousands of fingerprints.
const SEEN_LOOKUP_CHUNK = 200

type IngestTransaction = {
  plaid_id: string
  date: string // YYYY-MM-DD
  merchant: string
  amount: number // positive = charge
  card: string // display name, e.g. "Chase ••••7659"
}

export async function POST(req: NextRequest) {
  // ── 1. Token auth ──────────────────────────────────────────
  const expected = process.env.BUDGET_INGEST_TOKEN
  if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const householdId = process.env.BUDGET_HOUSEHOLD_ID
  if (!householdId) {
    console.error('[agent-ingest] BUDGET_HOUSEHOLD_ID is not set')
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })
  }

  // ── 2. Validate body ───────────────────────────────────────
  let transactions: IngestTransaction[]
  try {
    const body = await req.json()
    transactions = body?.transactions
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }
  if (!Array.isArray(transactions)) {
    return NextResponse.json({ error: 'transactions must be an array' }, { status: 400 })
  }
  if (transactions.length === 0) {
    return NextResponse.json({ inserted: 0, skipped: 0 })
  }
  const valid = transactions.every(
    (t) =>
      typeof t?.plaid_id === 'string' &&
      typeof t?.date === 'string' &&
      typeof t?.merchant === 'string' &&
      typeof t?.amount === 'number' &&
      typeof t?.card === 'string',
  )
  if (!valid) {
    return NextResponse.json(
      { error: 'each transaction needs plaid_id, date, merchant, amount, card' },
      { status: 400 },
    )
  }

  // ── 3. Map to the transactions schema ──────────────────────
  const rows = transactions.map((t) => ({
    household_id: householdId,
    date: t.date,
    merchant: `[Muse] ${t.merchant}`,
    amount: t.amount,
    account_name: t.card,
    notes: null,
    payer_id: 'shared', // auto-imported; fix up in the UI when reviewing
    reviewed: false, // never auto-checked — human review only
    [EXTERNAL_ID_COLUMN]: t.plaid_id,
  }))
  const incomingIds = transactions.map((t) => t.plaid_id)

  // ── 4. Skip everything already seen ────────────────────────
  // The ledger (not just the transactions table) is the source of truth,
  // so edited rows are never overwritten and deleted rows never return.
  const supabase = createServiceClient()
  const seen = new Set<string>()
  for (let i = 0; i < incomingIds.length; i += SEEN_LOOKUP_CHUNK) {
    const { data: seenRows, error: seenReadError } = await supabase
      .from('agent_seen_ids')
      .select('external_transaction_id')
      .eq('household_id', householdId)
      .in('external_transaction_id', incomingIds.slice(i, i + SEEN_LOOKUP_CHUNK))

    if (seenReadError) {
      console.error('[agent-ingest] seen-ids read failed:', seenReadError.message)
      return NextResponse.json({ error: 'dedupe check failed' }, { status: 500 })
    }
    for (const r of seenRows ?? []) seen.add(r.external_transaction_id)
  }

  const fresh = rows.filter((r) => !seen.has(r[EXTERNAL_ID_COLUMN] as string))

  if (fresh.length === 0) {
    return NextResponse.json({ inserted: 0, skipped: rows.length })
  }

  // ── 5. Insert new rows ─────────────────────────────────────
  // The unique constraint on the fingerprint column is a second safety net:
  // with ignoreDuplicates, re-sends can never overwrite existing rows.
  const { data: inserted, error: insertError } = await supabase
    .from('transactions')
    .upsert(fresh, { onConflict: EXTERNAL_ID_COLUMN, ignoreDuplicates: true })
    .select('id')

  if (insertError) {
    console.error('[agent-ingest] insert failed:', insertError.message)
    return NextResponse.json({ error: 'insert failed', details: insertError.message }, { status: 500 })
  }

  // ── 6. Record fingerprints AFTER a successful insert ────────
  // If this write fails we return 500 so the caller retries — retries are
  // idempotent thanks to the unique constraint above.
  const { error: seenWriteError } = await supabase.from('agent_seen_ids').upsert(
    fresh.map((r) => ({
      household_id: householdId,
      external_transaction_id: r[EXTERNAL_ID_COLUMN] as string,
    })),
    { onConflict: 'household_id,external_transaction_id', ignoreDuplicates: true },
  )

  if (seenWriteError) {
    console.error('[agent-ingest] seen-ids write failed:', seenWriteError.message)
    return NextResponse.json({ error: 'ledger write failed' }, { status: 500 })
  }

  const insertedCount = inserted?.length ?? 0
  return NextResponse.json({ inserted: insertedCount, skipped: rows.length - insertedCount })
}
