# Couple Budgeter

This app won't fix your relationship, but it will at least make sure you're both looking at the same numbers.

**Couple Budgeter** is a shared expense tracker built specifically for two people who want to split financial visibility without splitting their sanity. Track expenses individually or as a pair, categorize spending, watch your habits in charts that don't lie, and sync it all to the cloud so neither person can claim ignorance.

**Live:** Deployed on Vercel · **Repo:** [mwu595/couple-budgeter](https://github.com/mwu595/couple-budgeter)

---

## What It Does

- **Shared + individual ownership** — every transaction is tagged to Person A, Person B, or Shared. Filter by person. No more "wait, whose credit card was that?"
- **Transaction feed** — add, edit, search, filter, bulk-select, and mark transactions as reviewed
- **Labels** — color-coded, emoji-tagged categories for the things you actually spend on
- **Projects** — group transactions under a named goal (vacation, renovation, etc.) with optional budget and date range
- **Bulk actions** — select multiple transactions and assign labels, owner, or project in one tap
- **Income tracking** — log one-off income and set up recurring paychecks or transfers
- **Analytics dashboard** — spending totals, pie chart by label, line chart over time, Sankey cashflow diagram, per-person savings breakdown with yearly projection, monthly accumulative spend line, and a transaction calendar dot-map
- **Period selector** — filter every view by preset or custom date range
- **CSV export** — because sometimes you need to yell at a spreadsheet
- **Cloud sync** — Supabase backend with optimistic updates (feels instant, syncs in the background)
- **Bring your own agent** — an external AI agent (e.g. Muse) that holds your Plaid connection can push transactions straight into the app, pre-tagged with who paid, who it's for, and labels. See [Feeding transactions from an agent](#feeding-transactions-from-an-agent).

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Components | Base UI + shadcn/ui |
| Charts | Recharts |
| State | Zustand |
| Auth + DB | Supabase |
| Bank data | Your own agent (Plaid on its side) → `POST /api/agent-ingest` |
| Hosting | Vercel |

---

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase keys
npm run dev
```

Open `http://localhost:xxxx` (Next.js will tell you the port).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; used by invite/household routes and `/api/agent-ingest` |
| `BUDGET_INGEST_TOKEN` | Bearer token the ingest agent must present |
| `BUDGET_HOUSEHOLD_ID` | Household that agent-pushed transactions belong to |

---

## Feeding transactions from an agent

The app doesn't connect to banks itself. Instead it exposes one private endpoint that any external agent — Muse, a cron job, a script — can push transactions through. The agent owns the bank connection (Plaid link, sync cursors, credentials); the app owns the data once it lands.

```
POST https://<your-domain>/api/agent-ingest
Authorization: Bearer <BUDGET_INGEST_TOKEN>

{ "transactions": [
    { "plaid_id": "abc123",            // stable fingerprint — the dedup key
      "date":     "2026-09-21",
      "merchant": "Whole Foods",
      "amount":   84.32,               // positive = charge, negative = credit
      "card":     "Chase ••••7659",    // becomes the account name
      "payer":    "MT",                // optional — member name, slot id, or "shared"
      "for_who":  "shared",            // optional — same resolution
      "labels":   ["Grocery"] }        // optional — matched to your label names
] }
```

What you get back: `{ "inserted": 1, "skipped": 0, "unknown_labels": [] }`.

Rules the endpoint enforces so the agent can't make a mess:

- **Insert-only.** It never updates or deletes. Edit or delete an imported row in the app and it stays that way — the fingerprint ledger means the next push skips it.
- **Human review.** Every imported row lands unreviewed, merchant prefixed `[Muse]`, so you can find them under the feed's Unreviewed filter.
- **Labels never auto-create.** Unknown names are skipped and echoed back in `unknown_labels`.
- **Idempotent.** Re-send a batch and nothing duplicates; a 500 is always safe to retry.

Setup: run `supabase/004_agent_ingestion.sql`, set `BUDGET_INGEST_TOKEN` and `BUDGET_HOUSEHOLD_ID` in Vercel, hand the token and URL to your agent. Full contract in [`supabase/AGENT_INGESTION.md`](supabase/AGENT_INGESTION.md).

---

## Project Docs

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | Module structure, dependency rules, folder layout |
| `CHANGELOG.md` | Version history and release notes |
| `DESIGN.md` | Visual design system and UI conventions |
