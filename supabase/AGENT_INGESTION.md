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
      "card":     "Chase ••••7659",

      "payer":    "MT",
      "for_who":  "shared",
      "labels":   ["Dining"]
    }
  ]
}
```

The last three fields are optional. Omit them and the row lands as
`shared` / `shared` with no labels — exactly the v0.9.0 behaviour.

| field | type | meaning |
|-------|------|---------|
| `plaid_id` | string | Stable external fingerprint. The dedup key — must never change for the same real-world transaction. |
| `date` | string | `YYYY-MM-DD` |
| `merchant` | string | Display name. The route prefixes it with `[Muse] ` so imported rows are recognisable. |
| `amount` | number | **Positive = money out (charge), negative = money in.** Same sign convention as the app. |
| `card` | string | Becomes `transactions.account_name`. Use a stable display string like `Chase ••••7659`. |
| `payer` | string, optional | Who paid → `payer_id`. A member's display name (case-insensitive, e.g. `"MT"`), a slot id (`"user_a"` / `"user_b"`), or `"shared"`. Absent or unmatched → `shared`. |
| `for_who` | string, optional | Who it's for → `applied_to`. Same resolution as `payer`. Absent or unmatched → `shared`. |
| `labels` | string[], optional | Label names, matched case-insensitively against the household's labels. Unknown names are skipped (never created) and echoed back in `unknown_labels`. |

Response:

```json
{ "inserted": 3, "skipped": 12, "unknown_labels": ["Groceries"] }
```

`skipped` = rows whose fingerprint was already in the ledger. Send the same
batch twice and the second call inserts nothing. `unknown_labels` lists
every label name in the request that didn't match a household label — use
it to learn the real label set; the app never auto-creates labels.

| status | meaning |
|--------|---------|
| 200 | processed |
| 400 | malformed body — a required field is missing, or `payer`/`for_who` isn't a string, or `labels` isn't an array of strings |
| 401 | missing or wrong bearer token |
| 500 | database error; safe to retry, retries are idempotent |

There is no batch-size limit. The route chunks its own dedup lookups, so a
first-run backfill of thousands of rows in one request is fine.

---

## 2. What the route does with a row

Insert-only. It never updates or deletes anything.

1. `payer` / `for_who` are resolved against `household_members.display_name`
   and `labels` against `labels.name` — one read each, case-insensitive.
2. Fingerprints are checked against `agent_seen_ids`; anything seen is skipped.
3. Fresh rows are inserted into `transactions` as:
   - `merchant` = `[Muse] <merchant>`
   - `account_name` = `card`
   - `payer_id` = resolved `payer`, `applied_to` = resolved `for_who`
     (`shared` when absent or unmatched)
   - `reviewed` = `false` — surfaces under the feed's **Unreviewed** filter
   - `plaid_transaction_id` = `plaid_id` (column name is historical; it is the
     generic external-fingerprint column, unique)
   - `notes`, `project_id`: empty — the user assigns during review
4. Resolved labels are attached via `transaction_labels`, **only to rows this
   request inserted**. A row that already existed is never relabelled.
5. Fingerprints are recorded in `agent_seen_ids`, **after** the writes
   succeed. Any failure after the insert returns 500; a retry re-processes
   idempotently rather than losing rows.

Consequences the agent can rely on:

- The user editing an imported row (merchant, amount, payer, labels…) is
  never overwritten — the next push skips it by fingerprint, and labels are
  only ever attached to newly created rows.
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
