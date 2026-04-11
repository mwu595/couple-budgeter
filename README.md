# Money Tracker 2026

A shared budget tracker for couples — track expenses, assign ownership, label spending, and visualize patterns over time.

**Live:** Deployed on Vercel · **Repo:** [mwu595/money-tracker-2026](https://github.com/mwu595/money-tracker-2026)

---

## Features

- **Transaction feed** — add, edit, search, filter, and review transactions
- **Labels** — categorize spending with colored, emoji-tagged labels
- **Ownership** — tag each transaction as User A, User B, or Shared
- **Projects** — group transactions under a named project with an optional budget and date range
- **Bulk actions** — select multiple transactions and assign labels, projects, or owner in one tap
- **Analytics dashboard** — spending totals, pie chart by label, line chart over time
- **Period selector** — filter all views by preset or custom date range
- **CSV export** — export the current filtered view
- **Cloud sync** — Supabase backend with real-time optimistic updates
- **Plaid integration** — bank account connection (sandbox; production pending)

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
| Bank sync | Plaid (sandbox) |
| Hosting | Vercel |

---

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Plaid keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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
| `PRD.md` | Full product requirements and feature roadmap |
| `ARCHITECTURE.md` | Module structure, dependency rules, folder layout |
| `BUILD_PLAN.md` | Step-by-step build history with completion status |
| `CHANGELOG.md` | Version history and release notes |
| `CLAUDE.md` | Instructions for Claude Code when working in this repo |
