# Money Tracker 2026 — Product Requirements Document

**Version:** 1.3
**Date:** 2026-04-06
**Status:** Active — MVP shipped, V2 backend live, post-MVP features in progress

---

## 1. Overview

A shared budget tracker for couples to track expenses, categorize spending, assign ownership (individual vs. collective), and visualize patterns over time.

**Product vision:** Connects to real bank accounts via Plaid for automatic transaction sync. The MVP delivered the full UI experience powered by mock/manual data. V2 backend (Supabase auth + database) is live. Plaid integration is built and pending production approval.

---

## 2. Target Users

| User | Description |
|------|-------------|
| Primary | A couple (2 users) sharing financial management |
| Each user | Has their own accounts, can see shared + personal expenses |

---

## 3. Core User Needs

1. **Transaction visibility** — I want to see all spending in one place.
2. **Smart labeling** — I want transactions categorized so I can understand where money goes.
3. **Ownership clarity** — I want to see at a glance whether something is mine, my partner's, or ours.
4. **Visual summaries** — I want to understand our spending at a glance without reading tables.
5. **Flexible time ranges** — I want to analyze spending for any period I choose.
6. **Project tracking** — I want to group transactions under a named project (e.g. a trip or renovation) with an optional budget and date range.
7. **Automatic sync** *(Plaid — pending production)* — I don't want to manually enter every purchase.

---

## 4. Features — Shipped

### Core MVP (Steps 0–7)

#### M1. User Profiles
- Two user profiles representing the couple (User A and User B)
- Each profile: display name + avatar emoji
- Profile setup on first launch; editable in Settings
- No authentication in MVP — profiles are local-only

#### M2. Manual Transaction Entry
- Add transactions: date, merchant name, amount, account name, notes
- Edit and delete any transaction
- Transactions default to unreviewed

#### M3. Transaction Feed
- Unified list sorted by date (newest first), grouped by date
- Each row: date, merchant, amount, account, label(s), project tag, owner avatar
- Filter by: date range, label, owner, reviewed status
- Search by merchant name or notes
- Mark transactions as reviewed / unreviewed
- **Bulk select mode** — select multiple transactions; bulk-assign owner, label, project, or delete; header transforms with actions in-line

#### M4. Label Management
- User-defined labels with name, color, optional icon (emoji)
- Multiple labels per transaction
- Label CRUD from the Labels page
- Inline assignment from the transaction feed
- Default label set on first launch

#### M5. Ownership Assignment
- Each transaction: User A / User B / Shared
- Owner emoji badge on each row; change inline
- Bulk-assign owner to selected transactions

#### M6. Analytics Dashboard
- **Summary cards:** total spend, breakdown by owner, top labels, avg daily spend
- **Pie chart:** label composition; click a slice to filter the transaction list
- **Line chart:** daily/monthly spending totals with per-owner lines
- Period-aware: all charts and cards update with the active period selector

#### M7. Period Selection
- Presets: All Time, This Month, Last Month, Last 30 Days, Last 90 Days, This Year
- Custom: pick any start and end date
- Period selection is global state, persisted, applied to Dashboard and Transactions

#### M8. Projects
- Named projects with color, optional icon, start/end date, optional budget
- Assign transactions to a project inline or via bulk select
- Projects page: horizontal summary strip (newest first, scrollable) + full project list
- Each project card: total spend, budget progress bar, date range
- Bulk-assign project to selected transactions with toggle behavior

### V2 Backend (Shipped)

#### V2.1 Authentication
- Email/password sign-up and sign-in via Supabase Auth
- Household workspace: both users share the same transaction pool
- Invite partner via email link (`/invite` flow)
- Role parity: both users have equal read/write permissions

#### V2.2 Cloud Database
- PostgreSQL via Supabase
- All transactions, labels, projects, accounts stored in cloud
- Optimistic local updates with background Supabase sync
- Row Level Security (RLS) scoped to household

#### V2.3 Plaid Integration (Built — pending production approval)
- API routes for Plaid Link token, token exchange, account listing, sync
- `/api/plaid/*` endpoints wired and functional in sandbox
- Awaiting Plaid production access to enable for real users

---

## 5. Features — Roadmap

#### V2.4 Auto-Labeling Rules
- Rule engine mapping merchant names / MCC codes to label suggestions
- Auto-suggested labels shown as chips; user accepts, removes, or adds more
- Learning: if a user consistently relabels a merchant, remember it

#### V2.5 Duplicate Detection
- Detect transactions that appear across multiple connected accounts
- Surface duplicates for user review before confirming

#### V2.6 Export
- CSV export (current view), PDF summary report
- Already partially implemented (CSV export button in Transactions)

#### V2.7 Notifications (Stretch)
- Alert when a transaction exceeds a user-set threshold
- Weekly spending digest
- Budget cap alert per label

---

## 6. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Performance | Transaction list renders in under 300ms for up to 500 transactions |
| Accessibility | WCAG 2.1 AA compliance |
| Responsiveness | Mobile-first; usable on any screen from 375px up |
| Data safety | Optimistic local updates; cloud sync in background |
| Privacy | All data scoped to household via RLS |

---

## 7. Out of Scope (All Versions)

- Bill splitting / IOUs / debt tracking between partners
- Investment / brokerage account tracking
- Tax categorization / reporting
- Receipt scanning / OCR
- Multi-currency support
- Multi-household support

---

## 8. Success Metrics

**MVP:**
- Both users can add, label, and assign ownership to transactions in under 30 seconds
- Analytics dashboard gives a clear picture of a month's spending at a glance
- App works on mobile and desktop without horizontal scrolling

**Post-V2:**
- Both users actively review transactions at least weekly
- >80% of transactions auto-labeled without manual correction
- Time to review a week of transactions < 5 minutes

---

## 9. App Form Factor

**Progressive Web App (PWA) — Mobile-First**

- Works on iOS (Safari), Android (Chrome), and desktop
- Installable to home screen — no app store required
- Desktop layout expands the dashboard for larger screens

---

## 10. Technology Stack

| Layer | Choice | Status |
|-------|--------|--------|
| Framework | Next.js 15 (App Router) | Live |
| Language | TypeScript (strict) | Live |
| Styling | Tailwind CSS v4 | Live |
| Components | Base UI + shadcn/ui | Live |
| Charts | Recharts | Live |
| Client state | Zustand | Live |
| Auth | Supabase Auth | Live |
| Database | PostgreSQL via Supabase | Live |
| Bank sync | Plaid Node SDK | Built — pending production |
| Hosting | Vercel | Live |

---

## 11. Data Model

### TypeScript Types (`core/types/index.ts`)

```
User           — id, name, avatarEmoji
Label          — id, name, color, icon?
Account        — id, name
Project        — id, name, color, icon?, startDate, endDate, budget?
Transaction    — id, date, merchant, amount, accountName, notes?,
                 ownerId (UserId | 'shared'), labelIds[], projectId?, reviewed, createdAt
AppState       — users[2], transactions[], labels[], accounts[], projects[],
                 activePeriod, filters, onboardingComplete, sampleDataDismissed,
                 householdId, dataLoading
```

### Database Schema (Supabase)

```
users              — id, email, name, avatar_emoji, household_id
households         — id, name
accounts           — id, household_id, plaid_item_id, plaid_account_id, name, type, institution
transactions       — id, account_id, household_id, date, amount, merchant_name,
                     owner_user_id (null = shared), reviewed, project_id?
labels             — id, household_id, name, color, icon
transaction_labels — transaction_id, label_id
projects           — id, household_id, name, color, icon, start_date, end_date, budget
plaid_items        — id, household_id, access_token (encrypted), cursor
```

---

## 12. Development Phases

See `BUILD_PLAN.md` for step-by-step history and `CHANGELOG.md` for version log.
