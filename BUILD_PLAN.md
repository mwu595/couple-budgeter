# BUILD_PLAN.md — Build History & Step Log

Steps are recorded in the order they were built. Completed steps are marked ✅. Future steps remain as planning documents.

---

## ✅ Step 0 — Foundation

**Goal:** Running Next.js app with all tooling configured and full folder structure.

- ✅ Next.js 15 with App Router and TypeScript
- ✅ `tsconfig.json` with `strict: true` and `@/` path alias
- ✅ Tailwind CSS v4
- ✅ Base UI + shadcn/ui components
- ✅ Dependencies: `zustand`, `recharts`, `date-fns`, `uuid`, `lucide-react`
- ✅ Full folder structure from ARCHITECTURE.md
- ✅ Root `layout.tsx` with font and metadata
- ✅ `.gitignore`, `.env.example`

---

## ✅ Step 1 — Types + Store + Mock Data

**Goal:** Complete data model, Zustand store, and mock data on first visit.

- ✅ Shared types in `core/types/index.ts`
- ✅ Zustand store with `persist` middleware (`localStorage` key `money-tracker-v1`)
- ✅ Granular selector hooks from `core/store/index.ts`
- ✅ Mock data generator: 2 users, 10 labels, ~90 transactions over 3 months
- ✅ First-launch seed logic (`onboardingComplete === false`)
- ✅ `core/utils/`: `getDateRangeForPeriod`, `filterTransactions`, `formatCurrency`

---

## ✅ Step 2 — Transaction Feed

**Goal:** Fully functional transaction list with filtering and search.

- ✅ `TransactionRow` — date, merchant, amount, account, owner badge, label chips
- ✅ `TransactionFeed` — sorted list, grouped by date, empty state
- ✅ `TransactionFilters` — search, owner filter, reviewed filter, label filter
- ✅ `TransactionForm` — add and edit, validation
- ✅ `app/transactions/page.tsx`
- ✅ `AppNav` — bottom tab bar (mobile) + sidebar (desktop)

---

## ✅ Step 3 — Label System

**Goal:** Create, edit, delete labels; assign inline.

- ✅ `LabelBadge` — colored chip
- ✅ `LabelPicker` — popover, multi-select, inline "Create new label"
- ✅ `LabelForm` — name, color, optional icon
- ✅ `LabelList` — CRUD with transaction count, delete confirmation
- ✅ `app/labels/page.tsx`
- ✅ `TransactionRow` updated with inline label assignment

---

## ✅ Step 4 — Ownership Assignment

**Goal:** Each transaction has an owner; user profiles are editable.

- ✅ `OwnerPicker` — popover with User A / User B / Shared
- ✅ `OwnerAvatar` — circular emoji badge
- ✅ `UserProfileForm` — edit name + emoji
- ✅ `app/onboarding/page.tsx` — first-launch profile setup
- ✅ `app/settings/page.tsx` — edit profiles, reset mock data
- ✅ `TransactionRow` updated with inline owner assignment

---

## ✅ Step 5 — Analytics Dashboard

**Goal:** Visual spending summary for the active period.

- ✅ `useAnalytics` hook — totalSpend, spendByOwner, spendByLabel, avgDailySpend, monthlyTotals
- ✅ `SummaryCards` — 4 cards: Total Spent, By Owner, Top Labels, Avg Daily
- ✅ `SpendingPieChart` — Recharts pie, clickable slices, owner filter overlay
- ✅ `SpendingLineChart` — per-owner lines, auto granularity (daily/monthly)
- ✅ `app/dashboard/page.tsx`

---

## ✅ Step 6 — Period Selector

**Goal:** All views respect a global time period.

- ✅ `PeriodSelector` — presets + custom date range popover
- ✅ Presets: All Time, This Month, Last Month, Last 30 Days, Last 90 Days, This Year
- ✅ Period persists via store across pages and refreshes

---

## ✅ Step 7 — Polish, Bulk Actions & PWA

**Goal:** Complete, shippable MVP with smooth first-run experience.

- ✅ Sample data dismissal banner
- ✅ Confirm dialogs for destructive actions
- ✅ Bulk select mode on Transactions: select rows, apply label/owner/reviewed/delete
- ✅ Empty states for feed, charts, labels
- ✅ Mobile bottom nav, desktop sidebar finalized
- ✅ PWA manifest and meta tags
- ✅ Page transitions via `template.tsx`
- ✅ CSV export

---

## ✅ Step 8 — V2 Auth + Supabase Backend

**Goal:** Real user accounts, household workspace, cloud data.

- ✅ Supabase Auth (email/password sign-up, sign-in)
- ✅ `/login`, `/signup`, `/invite` pages
- ✅ `AppShell` — client-side auth guard, redirects unauthenticated users
- ✅ Household model: both users share a single transaction pool
- ✅ All store actions made async with optimistic local update + background Supabase sync
- ✅ `lib/db/` — typed DB helpers for transactions, labels, accounts, projects, households
- ✅ `lib/supabase/` — browser and server Supabase clients
- ✅ Supabase migrations: `001` households/users, `002` transactions/labels, `003` accounts/Plaid, `004` projects
- ✅ RLS policies scoped to household

---

## ✅ Step 9 — Plaid Integration (Sandbox)

**Goal:** Wire Plaid API for bank account connection and transaction sync.

- ✅ `lib/plaid.ts` — Plaid SDK client
- ✅ `PlaidLink` component — Plaid Link flow UI
- ✅ API routes: `/api/plaid/link-token`, `/api/plaid/exchange-token`, `/api/plaid/accounts`, `/api/plaid/sync`
- ✅ `AccountPicker` component
- ✅ Functional in sandbox mode
- ⏳ Awaiting Plaid production approval to enable for real users

---

## ✅ Step 10 — Projects Feature

**Goal:** Group transactions under named projects with optional budgets.

- ✅ `Project` type added to `core/types/index.ts`
- ✅ `projectId?` field added to `Transaction` type
- ✅ `modules/projects/`: `ProjectForm`, `ProjectList`, `ProjectSummaryCards`
- ✅ `ProjectPicker` shared component — inline assignment on transaction rows
- ✅ `app/projects/page.tsx` — project CRUD + horizontal summary strip (newest first)
- ✅ `lib/db/projects.ts` — Supabase DB helpers
- ✅ Project summary strip removed from Dashboard; lives at top of Projects page

---

## ✅ Step 11 — Bulk Actions Redesign

**Goal:** Move bulk actions from bottom bar to header; add project bulk assignment.

- ✅ Bulk action bar removed from bottom of screen
- ✅ Header transforms in selection mode: Delete (left) + count/select-all + Labels/Project/Owner/Cancel (right)
- ✅ Bulk project assignment with toggle behavior
- ✅ Label bulk assignment computes intersection across selected transactions (toggle on/off)
- ✅ Owner picker reflects common owner across selected transactions
- ✅ Project tags persist (static badge) while in selection mode
- ✅ Pickers (Owner, Project) close on selection for clear visual feedback

---

## Upcoming — V2 Roadmap

| Step | Name | Summary |
|------|------|---------|
| 12 | Auto-Label Rules | Merchant-to-label rule engine, MCC mapping |
| 13 | Duplicate Detection | Surface duplicate transactions across accounts for review |
| 14 | Full Export | PDF summary report; enhanced CSV options |
| 15 | Offline + PWA | Service worker, offline cache, background sync |
| 16 | Notifications | Transaction threshold alerts, weekly digest |
