# Changelog

All notable changes to Money Tracker 2026 are recorded here.
Format: `[version] — date — summary`

---

## [Unreleased]

Changes in active development toward 1.0.0. Moved to a versioned section on release.

---

## [0.4.0] — 2026-04-10

### Added
- **Exclude Projects filter** (Dashboard): dropdown in the filter bar lets users hide specific projects from all dashboard metrics; "No project" option hides untagged transactions; selection persists across sessions and refreshes
- **Page-level owner filter** (Dashboard): All / Person 1 / Person 2 / Shared pills now apply to every chart, card, and transaction list on the page — not just the pie chart
- **"Granularity:" label** on the Spending line chart, clarifying the Day / Week / Month / Year selector
- **Owner hint** on the Transactions filter bar: triangle alert icon with "The owner represents who this expense applies to, not who paid for it."

### Changed
- **Unified Dashboard filter bar**: all filters (period, owner, projects) merged into a single horizontally-scrollable row with consistent pill styling and thin separators between groups
- **Period presets** reduced to three options: All Time, This Month, Last Month (+ Custom) — Last 30 Days, Last 90 Days, This Year removed
- **Spending line chart** now defaults to Daily granularity instead of auto-selecting based on date range
- **`PeriodSelector`** restored to a simple standalone component (no slot props); used identically on the Transactions page

### Removed
- Owner filter and project filter controls from inside the pie chart card
- Amount / Count view toggle from the pie chart (Amount is now the only view)

---

## [0.3.1] — 2026-04-06

### Fixed
- Bulk owner assignment now reflects the common owner across all selected transactions instead of always defaulting to "Shared"
- Project tags no longer disappear when entering bulk-select mode — a static colored badge is shown in place of the interactive picker
- `OwnerPicker` and `ProjectPicker` now close immediately on selection, making bulk assignment visually clear
- Bulk label assignment correctly computes the intersection of labels across selected transactions, enabling true toggle behavior (click to add, click again to remove)

### Changed
- Bulk action controls moved from a fixed bottom bar to the page header — Delete on the left, Labels/Project/Owner/Cancel on the right
- Delete and Cancel positions swapped: Delete is now on the far left, Cancel on the far right

---

## [0.3.0] — 2026-04-06

### Added
- **Bulk actions in header**: when entering select mode, the Transactions page header transforms to show bulk action controls inline (Labels, Project, Owner, Delete, Cancel)
- **Bulk project assignment**: assign or remove a project from all selected transactions at once
- **Project summary strip on Projects page**: horizontal scrollable row of project cards at the top of the Projects page, sorted newest first
- Toggle behavior for bulk label and project assignment: selecting an option that's already applied to all selected transactions removes it

### Changed
- Project summary cards removed from the Dashboard page
- Bulk action bottom bar (`BulkActionBar` component) removed entirely

---

## [0.2.0] — 2026-04-05

### Added
- **Projects feature**: create named projects with color, icon, date range, and optional budget
- `/projects` page with project list (edit, delete) and a summary card per project
- Inline project assignment on each transaction row via `ProjectPicker`
- `Project` type added to `core/types/index.ts`
- `projectId` field added to `Transaction` type
- `lib/db/projects.ts` — Supabase DB helpers for projects
- `supabase/004_projects.sql` — RLS-secured projects table and migration

### Changed
- Nav bar updated to include Projects tab

---

## [0.1.0] — 2026-03-31

### Added — Core App (Steps 0–7)

- **Foundation**: Next.js 15, TypeScript strict, Tailwind CSS v4, Base UI + shadcn/ui, Zustand, Recharts
- **Transaction feed**: add, edit, delete transactions; search; filter by label/owner/reviewed; date grouping
- **Label system**: create/edit/delete labels with color + emoji; inline multi-label assignment
- **Ownership**: assign transactions to User A, User B, or Shared; inline picker; user profile setup
- **Analytics dashboard**: total spend, by-owner breakdown, top labels, avg daily spend; pie chart; line chart
- **Period selector**: presets (All Time, This Month, Last Month, Last 30/90 Days, This Year) + custom range
- **Bulk select**: select multiple transactions; bulk-assign label, owner, reviewed; bulk delete
- **CSV export**
- **Onboarding**: first-launch profile setup flow
- **Sample data**: realistic mock transactions, dismissible banner
- **PWA**: manifest, Apple meta tags, installable to home screen
- **Mobile + desktop layout**: bottom tab nav (mobile), sidebar (desktop)

### Added — Cloud Backend (Steps 8–9)

- **Supabase Auth**: email/password sign-up, sign-in, session management
- **Households**: two-user shared workspace; invite via email link
- **Cloud database**: PostgreSQL via Supabase; all data synced in background
- **Optimistic updates**: store actions update locally first, sync to Supabase, revert on error
- **RLS**: Row Level Security policies scoped to household
- **Plaid integration** (sandbox): link-token, token exchange, account list, transaction sync endpoints

---

## Versioning Convention

- `0.x.0` — new features in pre-release development
- `0.x.y` — bug fixes and polish during pre-release
- `1.0.0` — first public MVP release
- `1.x.0` — post-MVP features
- `2.0.0` — breaking changes to data model or auth
