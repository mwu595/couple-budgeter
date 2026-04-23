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
- **Analytics dashboard** — spending totals, pie chart by label, line chart over time, Sankey cashflow diagram
- **Period selector** — filter every view by preset or custom date range
- **CSV export** — because sometimes you need to yell at a spreadsheet
- **Cloud sync** — Supabase backend with optimistic updates (feels instant, syncs in the background)
- **Plaid integration** — connect bank accounts to pull transactions automatically (sandbox mode; production live)

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
| Bank sync | Plaid |
| Hosting | Vercel |

---

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase + Plaid keys
npm run dev
```

Open `http://localhost:xxxx` (Next.js will tell you the port).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `PLAID_CLIENT_ID` | Plaid client ID |
| `PLAID_SECRET` | Plaid sandbox secret |
| `PLAID_ENV` | `sandbox` or `production` |

---

## Project Docs

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | Module structure, dependency rules, folder layout |
| `CHANGELOG.md` | Version history and release notes |
| `DESIGN.md` | Visual design system and UI conventions |
