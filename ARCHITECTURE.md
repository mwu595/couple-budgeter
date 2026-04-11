# ARCHITECTURE.md — Module Structure & Dependency Rules

---

## Guiding Principle

Each feature is a self-contained module. Modules don't know about each other. The page layer composes them by reading from the shared store and passing data down as props. Shared UI primitives (pickers, badges, dialogs) live in `components/` — not inside modules — so any module can use them without cross-importing.

The store is the only shared mutable state. All store actions are async: they apply an optimistic local update immediately, then sync to Supabase in the background and revert on failure.

---

## Folder Structure

```
src/
├── app/                          # Next.js App Router pages and layouts
│   ├── layout.tsx                # Root layout (fonts, providers, PWA meta)
│   ├── template.tsx              # Page transition wrapper
│   ├── page.tsx                  # Home → auth guard → /dashboard or /login
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── invite/page.tsx           # Accept household invite link
│   ├── onboarding/page.tsx       # First-launch profile setup
│   ├── dashboard/page.tsx        # Analytics dashboard
│   ├── transactions/page.tsx     # Transaction feed + bulk actions
│   ├── projects/page.tsx         # Project list + summary strip
│   ├── labels/page.tsx           # Label management
│   ├── settings/page.tsx         # User profiles, reset data
│   └── api/
│       ├── households/route.ts   # Create / get household
│       ├── invites/
│       │   ├── route.ts          # Create invite
│       │   └── accept/route.ts   # Accept invite
│       └── plaid/
│           ├── link-token/route.ts
│           ├── exchange-token/route.ts
│           ├── accounts/route.ts
│           └── sync/route.ts
│
├── modules/                      # Feature modules (self-contained)
│   ├── transactions/
│   │   ├── index.ts
│   │   ├── TransactionFeed.tsx
│   │   ├── TransactionRow.tsx
│   │   ├── TransactionForm.tsx
│   │   └── TransactionFilters.tsx
│   │
│   ├── labels/
│   │   ├── index.ts
│   │   ├── LabelList.tsx
│   │   └── LabelForm.tsx
│   │
│   ├── ownership/
│   │   ├── index.ts
│   │   └── UserProfileForm.tsx
│   │
│   ├── projects/
│   │   ├── index.ts
│   │   ├── ProjectForm.tsx
│   │   ├── ProjectList.tsx
│   │   └── ProjectSummaryCards.tsx
│   │
│   └── analytics/
│       ├── index.ts
│       ├── SummaryCards.tsx
│       ├── SpendingPieChart.tsx
│       ├── SpendingLineChart.tsx
│       └── hooks/useAnalytics.ts
│
├── components/                   # Shared UI primitives (used across modules)
│   ├── AppNav.tsx                # Bottom tabs (mobile) + sidebar (desktop)
│   ├── AppShell.tsx              # Auth guard + layout wrapper
│   ├── PeriodSelector.tsx        # Date range preset picker
│   ├── LabelBadge.tsx            # Read-only colored label chip
│   ├── LabelPicker.tsx           # Multi-select label popover + inline create
│   ├── OwnerAvatar.tsx           # Circular emoji owner badge
│   ├── OwnerPicker.tsx           # Owner selection popover
│   ├── ProjectPicker.tsx         # Project assignment popover
│   ├── AccountPicker.tsx         # Bank account selection
│   ├── PlaidLink.tsx             # Plaid Link flow trigger
│   ├── ConfirmDialog.tsx         # Generic destructive-action confirmation
│   ├── SampleDataBanner.tsx      # Dismissible "you're viewing sample data" banner
│   ├── Providers.tsx             # React context providers
│   └── ui/                       # shadcn/ui base components
│       └── button, input, dialog, popover, select, calendar, ...
│
├── core/
│   ├── types/index.ts            # ALL shared TypeScript types — single source of truth
│   ├── store/
│   │   ├── index.ts              # Selector hooks and action exports
│   │   └── appStore.ts           # Zustand store with async Supabase sync
│   ├── mock/
│   │   ├── index.ts
│   │   ├── transactions.ts
│   │   └── labels.ts
│   └── utils/
│       ├── index.ts
│       ├── currency.ts
│       ├── date.ts
│       ├── filters.ts
│       └── export.ts             # CSV export helper
│
└── lib/
    ├── db/                       # Typed Supabase DB helpers (one file per domain)
    │   ├── index.ts
    │   ├── transactions.ts
    │   ├── labels.ts
    │   ├── accounts.ts
    │   ├── projects.ts
    │   └── household.ts
    ├── supabase/
    │   ├── client.ts             # Browser Supabase client
    │   └── server.ts             # Server-side Supabase client
    ├── plaid.ts                  # Plaid SDK client
    └── utils.ts                  # cn() and other shared utilities
```

---

## Dependency Rules

```
app/pages
    │  reads store, passes props down
    ▼
modules/  ←── never cross-import between modules
    │  uses types, calls store actions, uses core/utils, uses components/
    ▼
core/store   core/types   core/utils   core/mock
    │
    ▼
lib/db  →  Supabase (cloud)
    +
localStorage (via Zustand persist — fallback / sample data)
```

**Allowed imports:**
- `app/` → `modules/*/index.ts`, `core/store`, `core/types`, `components/`, `lib/`
- `modules/` → `core/store`, `core/types`, `core/utils`, `components/`
- `modules/` → **NEVER** → other `modules/`
- `components/` → `core/types`, `core/store`, `lib/utils`
- `core/store/` → `core/types`, `core/mock`, `lib/db`
- `lib/db/` → `lib/supabase/`, `core/types`

---

## Core Types (`core/types/index.ts`)

```typescript
export type UserId = 'user_a' | 'user_b'
export type OwnerId = UserId | 'shared'

export interface User       { id, name, avatarEmoji }
export interface Label      { id, name, color, icon? }
export interface Account    { id, name }
export interface Project    { id, name, color, icon?, startDate, endDate, budget? }

export interface Transaction {
  id, date, merchant, amount, accountName, notes?,
  ownerId: OwnerId, labelIds: string[], projectId?, reviewed, createdAt
}

export interface AppState {
  users: [User, User], transactions[], labels[], accounts[], projects[],
  activePeriod, filters, onboardingComplete, sampleDataDismissed,
  householdId: string | null, dataLoading: boolean
}
```

---

## Store Design (`core/store/appStore.ts`)

Zustand store with two persistence layers:

1. **localStorage** (`money-tracker-v1`) — instant load, offline fallback, sample data
2. **Supabase** — cloud sync; loaded on mount when `householdId` is set

All mutating actions follow the optimistic pattern:
```
1. Apply change to local Zustand state immediately (instant UI update)
2. Call lib/db helper to sync to Supabase
3. On error: revert local state to previous snapshot, log error
```

Exported hooks:
- `useAppStore(selector)` — full store access
- `useTransactions()`, `useLabels()`, `useUsers()`, `useProjects()`, `useActivePeriod()`, `useFilters()`

---

## Page Responsibilities

Pages read from the store and compose modules. Pages handle:
- Loading data from the store and computing derived state
- Wiring bulk/cross-module operations (e.g., bulk label + project + owner assignment)
- Opening/closing dialogs

Pages do not contain rendering logic beyond layout.

| Page | Responsibility |
|------|---------------|
| `/` | Auth redirect: → `/dashboard` (authed) or `/login` |
| `/login`, `/signup` | Supabase Auth forms |
| `/invite` | Accept household invite, join household |
| `/onboarding` | Set up two user profiles; mark `onboardingComplete` |
| `/dashboard` | Filtered transactions → SummaryCards + charts |
| `/transactions` | Filtered feed + bulk selection + add/edit dialog |
| `/projects` | Summary strip + project list + add/edit dialog |
| `/labels` | Label list + add/edit dialog |
| `/settings` | Edit profiles, reset data, connected accounts |

---

## Naming Conventions

| Pattern | Convention |
|---------|-----------|
| Components | `PascalCase.tsx` |
| Hooks | `useCamelCase.ts` |
| Utilities | `camelCase.ts` |
| Types | `PascalCase` interfaces, `camelCase` properties |
| Store state keys | `camelCase` |
| IDs | `snake_case` string literals (`'user_a'`, `'shared'`) |

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 15.x | Framework |
| react | 19.x | UI |
| typescript | 5.x | Type safety |
| tailwindcss | 4.x | Styling |
| @base-ui/react | latest | Headless UI primitives (Popover, etc.) |
| zustand | 5.x | State management + localStorage persist |
| recharts | 2.x | Charts |
| date-fns | 4.x | Date utilities |
| uuid | 11.x | ID generation |
| lucide-react | latest | Icons |
| @supabase/supabase-js | latest | Auth + DB client |
| @supabase/ssr | latest | Server-side Supabase |
| plaid | latest | Plaid Node SDK |
