# Couple Budgeter

This app won't fix your relationship, but it will at least make sure you're both looking at the same numbers.

**Couple Budgeter** is a shared expense tracker built specifically for two people who want to split financial visibility without splitting their sanity. Track expenses individually or as a pair, categorize spending, watch your habits in charts that don't lie, and sync it all to the cloud so neither person can claim ignorance.

**Live:** Deployed on Vercel · **Repo:** [mwu595/couple-budgeter](https://github.com/mwu595/couple-budgeter)

---

## What It Does

**Two people, one ledger, no arguments about whose card that was.** Every transaction is tagged with who paid and who it was for — Person A, Person B, or Shared — so the split is visible on every row, not reconstructed at the end of the month. On top of that sits a dashboard that actually answers questions: who's spending on what, where the money flows, how this month stacks up against last, and how much each of you is saving toward the year.

Everything else that comes along for the ride:

- **Transaction feed** — add, edit, search, filter, bulk-select, and mark transactions as reviewed
- **Labels** — color-coded, emoji-tagged categories you can drag into whatever order you like
- **Projects** — group transactions under a named goal (vacation, renovation, etc.) with optional budget and date range
- **Bulk actions** — select multiple transactions and assign labels, owner, or project in one tap
- **Income tracking** — log one-off income and set up recurring paychecks or transfers
- **Dashboard charts** — spending totals, pie by label, spend over time, Sankey cashflow, per-person savings with yearly projection, monthly accumulative line with last month ghosted behind it, top projects, and a transaction calendar dot-map
- **Period selector** — filter every view by preset or custom date range
- **CSV export** — because sometimes you need to yell at a spreadsheet
- **Cloud sync** — Supabase backend with optimistic updates (feels instant, syncs in the background)
- **PWA** — installs to your phone's home screen like a real app
- **Bring your own agent** — an external AI agent that holds your bank connection can push transactions straight in, pre-tagged. See [below](#feeding-transactions-from-an-agent).

---

## Feeding transactions from an agent

The app doesn't connect to banks itself. Instead it exposes one private endpoint that any external agent — an AI agent like Muse, a cron job, a script — can push transactions through. The agent owns the bank connection (Plaid link, sync cursors, credentials); the app owns the data once it lands.

Rules the endpoint enforces so the agent can't make a mess:

- **Insert-only.** It never updates or deletes. Edit or delete an imported row in the app and it stays that way — a fingerprint ledger means the next push skips it.
- **Human review.** Every imported row lands unreviewed, merchant prefixed `[Muse]`, so you can find them under the feed's Unreviewed filter.
- **Labels never auto-create.** Unknown names are skipped and echoed back so the agent can learn your real label set.
- **Idempotent.** Re-send a batch and nothing duplicates; a 500 is always safe to retry.

### Set it up

1. Run `supabase/004_agent_ingestion.sql` in your Supabase SQL editor (creates the `agent_seen_ids` ledger).
2. In Vercel → Settings → Environment Variables, add `BUDGET_INGEST_TOKEN` (`openssl rand -hex 32`) and `BUDGET_HOUSEHOLD_ID` (your `households.id`). Redeploy.
3. Give your agent the block below.

### Copy this to your agent

Replace the three `<…>` placeholders and the member/label names with your own, then paste the whole thing.

```
You can push transactions into my budget app. Use this endpoint and nothing else — do not write to the database directly.

ENDPOINT
  POST https://<YOUR_DOMAIN>/api/agent-ingest
  Authorization: Bearer <BUDGET_INGEST_TOKEN>
  Content-Type: application/json

REQUEST BODY
  {
    "transactions": [
      {
        "plaid_id": "<stable external fingerprint, e.g. the Plaid transaction_id>",
        "date":     "YYYY-MM-DD",
        "merchant": "Whole Foods",
        "amount":   84.32,
        "card":     "Chase ••••7659",
        "payer":    "<MEMBER_NAME>",
        "for_who":  "shared",
        "labels":   ["Grocery"]
      }
    ]
  }

FIELD RULES
  plaid_id  required. Must never change for the same real-world transaction — it is the dedup key.
  date      required. YYYY-MM-DD.
  merchant  required. Display name; the app prefixes it with "[Muse] ".
  amount    required. Positive = money out (charge), negative = money in. Send the bank's amount unchanged.
  card      required. A stable display string; it becomes the transaction's account name in the app.
  payer     optional. Who paid: a member name, "user_a"/"user_b", or "shared". Absent or unrecognised → "shared".
  for_who   optional. Who it's for. Same values as payer. Absent or unrecognised → "shared".
  labels    optional. Array of label names, matched case-insensitively. Unknown names are skipped, never created.

  Household members (case-insensitive): <MEMBER_A>, <MEMBER_B>
  Household labels (use these exact names): <LABEL_1>, <LABEL_2>, <LABEL_3>, …

  Skip bank transactions that are still pending; send them once they post.
  Ignore the bank's "modified" and "removed" feeds — the endpoint is insert-only by design.
  No batch-size limit; a first-run backfill of thousands of rows in one request is fine.

RESPONSE
  200  { "inserted": 3, "skipped": 12, "unknown_labels": [] }
       skipped = already seen; re-sending a batch is safe and inserts nothing.
       unknown_labels = names that didn't match; the rows were still inserted, just without those labels. Fix your mapping.
  400  malformed body — do not retry unchanged.
  401  wrong or missing token.
  500  database error — safe to retry; retries are idempotent.

GUARANTEES
  The endpoint never updates or deletes. If the user edits or deletes a row you inserted, it stays that way; resending the same plaid_id is skipped.
  Labels attach only to rows a request itself created. An existing transaction is never relabelled.
```

Full contract, including the database side: [`supabase/AGENT_INGESTION.md`](supabase/AGENT_INGESTION.md).

---

## Run Your Own Copy

This is a two-person app, so you deploy your own instance rather than signing up somewhere.

1. **Supabase** — create a project, open the SQL editor, paste and run `supabase/setup.sql` (idempotent; safe to re-run later).
2. **Vercel** — import this repo, add the environment variables below, deploy.
3. **Sign up** on your new URL, then use **Settings → Manage invite** to bring your partner in.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; used by invite/household routes and `/api/agent-ingest` |
| `BUDGET_INGEST_TOKEN` | Only if you're feeding an agent — bearer token it must present |
| `BUDGET_HOUSEHOLD_ID` | Only if you're feeding an agent — household its transactions belong to |

### Local development (optional)

Only needed if you want to change the code.

```bash
npm install
cp .env.example .env.local   # fill in the same values
npm run dev
```

---

## Project Docs

| File | Purpose |
|------|---------|
| `CHANGELOG.md` | Version history and release notes |
| `supabase/AGENT_INGESTION.md` | The agent ingest contract in full |
| `supabase/setup.sql` | Complete schema for a fresh install |
| `supabase/001`–`004_*.sql` | Incremental migrations for existing deployments |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Components | Base UI + shadcn/ui |
| Charts | Recharts + Nivo (Sankey) |
| State | Zustand |
| Auth + DB | Supabase |
| Bank data | Your own agent → `POST /api/agent-ingest` |
| Hosting | Vercel |
| PWA | @ducanh2912/next-pwa |
