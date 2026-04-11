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
- ✅ Migrated to production API (Step 12)
- ✅ Permanent deduplication via `plaid_seen_ids` ledger (Step 13)
- ✅ OAuth redirect URI support (`/oauth-callback` route)
- ⏳ Bank connection not yet working — limited production access blocks real institution connections
- ⏳ Requires full Plaid production approval to enable for real users (deferred to next release)

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

---

## Step 12 — Plaid Production Migration

**Goal:** Switch from Plaid sandbox to production API so real bank accounts can be connected.

**Requirements:**
- `PLAID_ENV` set to `production` in hosting environment (Vercel)
- `PLAID_SECRET` replaced with Plaid production secret (from Plaid dashboard)
- `PLAID_CLIENT_ID` is unchanged (same across environments)
- `.env.example` updated to show `PLAID_ENV=production` as the live default
- No API route or UI code changes required — `lib/plaid.ts` already reads env and resolves the correct base URL via `PlaidEnvironments[env]`

**Constraints:**
- Production keys must never be committed to `.env.local` or the repo — live in Vercel environment variables only
- Existing sandbox-linked `plaid_items` rows are invalid after the switch; users must re-link their bank accounts
- Existing imported transaction rows are unaffected

**Out of scope:**
- Webhook support (deferred — manual sync remains the trigger)
- OAuth redirect URI registration (handle if a user's bank requires it)

---

## Step 13 — Plaid Permanent Deduplication

**Goal:** Ensure that a transaction Plaid has ever sent is never re-imported, even if the user deletes it from the transaction feed.

**Why the current system is not sufficient:**
- Cursor-based sync (`transactionsSync` cursor stored on `plaid_items`) prevents re-fetching in normal operation but is reset when an item is re-linked or Plaid forces a full refresh
- The DB upsert on `plaid_transaction_id` only deduplicates while the transaction row still exists — a deleted row removes the unique constraint anchor

**Requirements:**

1. **New DB table: `plaid_seen_ids`**
   - Columns: `household_id` (uuid, FK → households), `plaid_transaction_id` (text), `seen_at` (timestamptz, default now())
   - Unique constraint on `(household_id, plaid_transaction_id)`
   - RLS: enabled, no permissive policies — service role only (same pattern as `plaid_items`)
   - New migration: `supabase/005_plaid_seen_ids.sql`

2. **Sync route update (`src/app/api/plaid/sync/route.ts`)**
   - After paging through all `added` transactions for an item, insert every `plaid_transaction_id` into `plaid_seen_ids` (upsert, ignore duplicates — idempotent)
   - Before inserting into `transactions`, fetch the set of already-seen IDs for this household from `plaid_seen_ids` and filter them out
   - Order of operations: check ledger → insert transactions → write ledger (so a partial failure doesn't silently skip entries on the next run)

3. **No UI changes, no store changes, no type changes**

**Files changed:**
- `supabase/005_plaid_seen_ids.sql` (new)
- `src/app/api/plaid/sync/route.ts` (modified)

---

## ✅ Step 14 — Dashboard Filter & Analytics UX Overhaul

**Goal:** Consolidate all dashboard filters into a single unified bar, elevate pie chart filters to page level, and clean up chart controls.

### Unified filter bar
- ✅ All dashboard filters merged into one horizontally-scrollable row (replaces the split `PeriodSelector` + `rightSlot` pattern)
- ✅ Consistent pill style across all filter groups; thin `w-px h-4` separators between groups
- ✅ `PeriodSelector` restored to a simple standalone component (no `rightSlot` prop); used unchanged by the Transactions page
- ✅ Period presets reduced to three: All Time, This Month, Last Month + Custom

### Page-level owner filter
- ✅ All / Person 1 / Person 2 / Shared pills moved from the pie chart card to the unified filter bar
- ✅ Owner filter now applies to all dashboard data: summary cards, pie chart, line chart, and transaction list

### Exclude Projects filter (persisted)
- ✅ Projects dropdown in filter bar: per-project toggle chips, "Show all", "Unselect all"
- ✅ "No project" sentinel (`__no_project__`) added — filters out transactions with no project tag when unchecked
- ✅ `dashboardExcludedProjectIds: string[]` added to `AppState` and persisted via `localStorage` (survives refresh and re-login)
- ✅ Excluded project IDs stored in Zustand store; read via `useDashboardExcludedProjectIds()`, written via `useAppStore((s) => s.setDashboardExcludedProjectIds)`

### Pie chart cleanup
- ✅ Owner filter and project filter controls removed from the pie chart card
- ✅ Amount / Count view toggle removed; chart hardcoded to Amount

### Line chart
- ✅ Default granularity changed to Daily (was auto-selected based on date range)
- ✅ "Granularity:" label added to the left of the Day / Week / Month / Year selector

### Transaction filters hint
- ✅ Owner filter row on the Transactions page now shows a `TriangleAlert` icon and the note: "The owner represents who this expense applies to, not who paid for it."

---

## ✅ Step 15 — Cashflow Chart

**Goal:** Add a Sankey diagram to the Dashboard that visualizes how money flows from income into spending categories, spanning the full row width below the pie and line charts.

### New dependency
- `@nivo/sankey` + `@nivo/core` — Sankey diagram renderer (added to `package.json`)

### Chart behavior
- ✅ **Income present:** Full Sankey — "Income" source node → "Total Income" intermediate node → per-label expense nodes (largest first)
- ✅ **No income recorded:** Fallback — synthetic "Total Spend" node → per-label expense nodes; subtitle note: *"No income recorded for this period — showing expense breakdown only."*
- ✅ **No expenses at all:** Empty state card with placeholder text
- ✅ **Amount convention:** `tx.amount < 0` = income, `tx.amount > 0` = expense (matches rest of app)
- ✅ **Multi-label transactions:** Each label gets the full transaction amount (same as `useAnalytics` / pie chart)
- ✅ Per-label node colors match label colors from the store; income nodes use a blue/teal palette

### Filter parity
- ✅ Receives `visibleTransactions` from the dashboard (already filtered by period, owner, and project exclusions) — no extra filter logic in the chart

### Module structure (follows ARCHITECTURE.md)
- ✅ `src/modules/analytics/CashflowChart.tsx` — pure chart component; no store access; props: `{ transactions, labels }`
- ✅ `src/modules/analytics/buildCashflowData.ts` — pure data-transform utility; builds Sankey nodes + links from transactions
- ✅ Exported via `src/modules/analytics/index.ts`
- ✅ Dashboard passes `visibleTransactions + labels` in `src/app/dashboard/page.tsx`

**Files changed:**
- `src/modules/analytics/CashflowChart.tsx` (new)
- `src/modules/analytics/buildCashflowData.ts` (new)
- `src/modules/analytics/index.ts` (export added)
- `src/app/dashboard/page.tsx` (chart inserted between line/pie and transaction feed)
- `package.json` (new deps: `@nivo/sankey`, `@nivo/core`)

---

## ✅ Step 16 — Income Page + Recurring Income Manager

**Goal:** Dedicated Income page for tracking income entries (separate from expenses), with a recurring income manager that automatically spawns transactions on schedule.

### Rename: Transactions → Expenses
- ✅ Nav label (`AppNav.tsx`): "Transactions" → "Expenses" (URL stays `/transactions`)
- ✅ Page `<h1>`: "Transactions" → "Expenses"

### New Income page (`/income`)
- ✅ Income entries = transactions with `amount < 0` (existing app convention)
- ✅ User always inputs a **positive** amount; stored as negative internally
- ✅ IncomeFeed + IncomeRow follow TransactionFeed/TransactionRow convention (date grouping, sticky headers, owner picker, edit on click)
- ✅ Amount displayed as `+$X.XX` in green on IncomeRow
- ✅ Period selector + owner filter bar (All / Person 1 / Person 2 / Shared)
- ✅ `TrendingUp` icon added to nav; `/income` added to `PROTECTED_PATHS` in AppShell

### Recurring income manager
- ✅ New `RecurringFrequency` type: `'weekly' | 'biweekly' | 'monthly' | 'semimonthly'`
- ✅ New `RecurringIncome` type in `core/types/index.ts`
- ✅ `recurringIncomeId?: string` added to `Transaction` type (links spawned entries to their manager; informational only)
- ✅ **Tile layout**: grid of cards (1-col mobile / 2-col tablet / 3-col desktop), each showing name, amount, frequency, next date, account, owner, Edit + Delete actions
- ✅ **Recurring tab** appears in the filter bar when ≥1 recurring income exists; disappears when all are deleted
- ✅ Frequency pill selector in the form: Weekly / Bi-weekly / Semi-monthly (1st & 15th) / Monthly

### Spawn logic
- ✅ `spawnDueIncomes()` store action: for each recurring income where `nextDate <= today`, creates a transaction (`amount = -ri.amount`) and advances `nextDate` by the frequency interval
- ✅ Handles missed spawns: loops until `nextDate > today` (catches up if app was closed for extended periods)
- ✅ Called automatically in `loadHouseholdData` (on app mount) and on Income page mount
- ✅ Optimistic updates + DB batch write (transactions + nextDate patches)

### Edit / delete rules
- ✅ Editing/deleting an individual income entry has no effect on the recurring manager
- ✅ Editing the recurring manager updates future spawns only (past entries untouched)
- ✅ Deleting the recurring manager stops future spawns; past entries are preserved

### New dependency
- `date-fns` (already installed) — `addDays`, `addMonths`, `setDate`, `getDate` used for next-date calculation

### New Supabase migration
- `supabase/006_recurring_incomes.sql`: `recurring_incomes` table + `transactions.recurring_income_id` column

**Files changed:**
- `src/core/types/index.ts` (RecurringFrequency, RecurringIncome, Transaction.recurringIncomeId, AppState.recurringIncomes)
- `src/core/store/appStore.ts` (state, actions, spawnDueIncomes, computeNextDate helper)
- `src/core/store/index.ts` (useRecurringIncomes, useRecurringIncomeActions)
- `src/lib/db/recurringIncomes.ts` (new)
- `src/lib/db/transactions.ts` (recurring_income_id in mapRow + inserts)
- `src/lib/db/index.ts` (re-export)
- `src/modules/income/IncomeRow.tsx` (new)
- `src/modules/income/IncomeFeed.tsx` (new)
- `src/modules/income/IncomeForm.tsx` (new)
- `src/modules/income/RecurringIncomeForm.tsx` (new)
- `src/modules/income/RecurringIncomeManager.tsx` (new)
- `src/modules/income/index.ts` (new)
- `src/app/income/page.tsx` (new)
- `src/components/AppNav.tsx` (Income link, Expenses rename)
- `src/components/AppShell.tsx` (/income protected)
- `src/app/transactions/page.tsx` (heading rename)
- `supabase/006_recurring_incomes.sql` (new)

---

## Upcoming — V2 Roadmap

| Step | Name | Summary |
|------|------|---------|
| 17 | Auto-Label Rules | Merchant-to-label rule engine, MCC mapping |
| 17 | Duplicate Detection | Surface duplicate transactions across accounts for review |
| 18 | Full Export | PDF summary report; enhanced CSV options |
| 19 | Offline + PWA | Service worker, offline cache, background sync |
| 20 | Notifications | Transaction threshold alerts, weekly digest |
