# Agent Ingestion Contract

Couple Budgeter does **not** connect to banks. Transactions are pushed into it
by an external AI agent that holds its own bank connection (its own Plaid
link, its own sync cursors, in its own storage). The app exposes one private
endpoint for that, and keeps one table of agent state — a dedup ledger.

The endpoint knows nothing about Plaid. It accepts fingerprinted rows from
anything that can make an authenticated HTTP call.

---

## 1. Endpoint

```
POST https://<app-domain>/api/agent-ingest
Authorization: Bearer <BUDGET_INGEST_TOKEN>
Content-Type: application/json
```

Request body:

```json
{
  "transactions": [
    {
      "plaid_id": "abc123",
      "date":     "2026-09-21",
      "merchant": "Whole Foods",
      "amount":   84.32,
      "card":     "Chase ••••7659"
    }
  ]
}
```

| field | type | meaning |
|-------|------|---------|
| `plaid_id` | string | Stable external fingerprint. The dedup key — must never change for the same real-world transaction. |
| `date` | string | `YYYY-MM-DD` |
| `merchant` | string | Display name. The route prefixes it with `[Muse] ` so imported rows are recognisable. |
| `amount` | number | **Positive = money out (charge), negative = money in.** Same sign convention as the app. |
| `card` | string | Becomes `transactions.account_name`. Use a stable display string like `Chase ••••7659`. |

Response:

```json
{ "inserted": 3, "skipped": 12 }
```

`skipped` = rows whose fingerprint was already in the ledger. Send the same
batch twice and the second call inserts nothing.

| status | meaning |
|--------|---------|
| 200 | processed |
| 400 | malformed body — a field is missing or the wrong type |
| 401 | missing or wrong bearer token |
| 500 | database error; safe to retry, retries are idempotent |

There is no batch-size limit. The route chunks its own dedup lookups, so a
first-run backfill of thousands of rows in one request is fine.

---

## 2. What the route does with a row

Insert-only. It never updates or deletes anything.

1. Fingerprints are checked against `agent_seen_ids`; anything seen is skipped.
2. Fresh rows are inserted into `transactions` as:
   - `merchant` = `[Muse] <merchant>`
   - `account_name` = `card`
   - `payer_id` = `'shared'`, `applied_to` = `'shared'` (DB default)
   - `reviewed` = `false` — surfaces under the feed's **Unreviewed** filter
   - `plaid_transaction_id` = `plaid_id` (column name is historical; it is the
     generic external-fingerprint column, unique)
   - `notes`, `project_id`, labels: empty — the user assigns during review
3. Fingerprints are recorded in `agent_seen_ids`, **after** the insert
   succeeds. A crash between the two steps re-processes on retry rather than
   losing rows.

Consequences the agent can rely on:

- The user editing an imported row (merchant, amount, payer, labels…) is
  never overwritten — the next push skips it by fingerprint.
- The user deleting an imported row — it stays deleted. The ledger row
  outlives the transaction row.

---

## 3. Database

The only agent-owned object:

```sql
create table agent_seen_ids (
  household_id            uuid not null references households(id) on delete cascade,
  external_transaction_id text not null,
  seen_at                 timestamptz not null default now(),
  primary key (household_id, external_transaction_id)
);
-- RLS enabled, no policies: service-role only.
```

Never delete from it. Defined in `supabase/setup.sql` (fresh installs) and
`supabase/004_agent_ingestion.sql` (upgrades — also drops the retired
`plaid_items` / `plaid_accounts` tables and renames `plaid_seen_ids` to
`agent_seen_ids` in place, preserving existing rows).

The agent does **not** write to the database directly and does **not** hold
the service-role key. The route uses it server-side.

---

## 4. Environment variables (app side)

Set in Vercel (Production) and in `.env.local` for local testing:

| variable | value |
|----------|-------|
| `BUDGET_INGEST_TOKEN` | shared secret; `openssl rand -hex 32`. Lives here and in the agent's secure storage, nowhere else. |
| `BUDGET_HOUSEHOLD_ID` | `households.id` for the household the agent feeds. One agent, one household. |
| `SUPABASE_SERVICE_ROLE_KEY` | already present; used server-side by the route |

---

## 5. Account names and the picker

`transactions.account_name` is free text. The app's account filter and picker
list rows from a separate `accounts (household_id, name)` table, which the
route does **not** touch. For imported rows to be filterable by account, add a
matching account once in the app (Tags page → Accounts) with the exact same
string the agent sends as `card`.

---

## 6. Source of truth

- Route: `src/app/api/agent-ingest/route.ts` — its header comment is the
  canonical description of behaviour and guarantees.
- Schema: `supabase/setup.sql`, `supabase/004_agent_ingestion.sql`.
