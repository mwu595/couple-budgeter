// All shared TypeScript types — single source of truth.
// Never define a type here that is only used within one module.
// Never re-export these from anywhere other than this file.

export type UserId = 'user_a' | 'user_b'

export interface User {
  id: UserId
  name: string
  avatarEmoji: string
}

// Owner of a transaction — one of the two users, or shared between both
export type OwnerId = UserId | 'shared'

export interface Label {
  id: string         // e.g. 'lbl_01' for mock data, uuid in v2
  name: string
  color: string      // hex color string, e.g. '#ef4444'
  icon?: string      // optional emoji or lucide icon name
}

export interface Account {
  id: string
  name: string       // display name, e.g. 'Chase Sapphire'
}

export interface Project {
  id: string
  name: string
  color: string      // hex color string
  icon?: string      // optional emoji
  startDate: string  // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
  budget?: number    // optional spending cap
}

export interface Transaction {
  id: string         // e.g. 'txn_001' for mock data, uuid in v2
  date: string       // ISO date 'YYYY-MM-DD'
  merchant: string
  amount: number     // positive = expense, negative = refund / income
  accountName: string // free text in MVP; will map to account id in v2
  notes?: string
  ownerId: OwnerId
  labelIds: string[] // references Label.id — one transaction can have multiple labels
  projectId?: string // references Project.id — optional, one project per transaction
  reviewed: boolean
  createdAt: string  // ISO datetime string
  recurringIncomeId?: string // set when spawned by a RecurringIncome; informational only
}

// ─── Recurring income ───────────────────────────────────────────────────────

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'semimonthly'

export interface RecurringIncome {
  id: string
  name: string          // display label, e.g. "Company Paycheck"
  amount: number        // positive; stored as negative in spawned transactions
  ownerId: OwnerId
  accountName: string
  notes?: string
  frequency: RecurringFrequency
  startDate: string     // YYYY-MM-DD, first occurrence
  nextDate: string      // YYYY-MM-DD, next date to spawn a transaction
  createdAt: string
}

// ─── Period selection ───────────────────────────────────────────────────────

export type PeriodPreset =
  | 'all_time'
  | 'this_month'
  | 'last_month'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_year'
  | 'custom'

export interface DateRange {
  start: string  // ISO date 'YYYY-MM-DD'
  end: string    // ISO date 'YYYY-MM-DD' (inclusive)
}

export interface ActivePeriod {
  preset: PeriodPreset
  custom?: DateRange  // only set when preset === 'custom'
}

// ─── Transaction feed filters ───────────────────────────────────────────────

export interface TransactionFilters {
  search: string           // matches merchant name or notes
  labelIds: string[]       // empty = show all labels
  ownerId: OwnerId | 'all' // 'all' = show all owners
  reviewed: 'all' | 'reviewed' | 'unreviewed'
  projectId: string | undefined // undefined = show all projects
}

// ─── Root application state ─────────────────────────────────────────────────

export interface AppState {
  users: [User, User]           // always exactly two users; index 0 = user_a, 1 = user_b
  transactions: Transaction[]
  labels: Label[]
  accounts: Account[]
  projects: Project[]
  recurringIncomes: RecurringIncome[]
  activePeriod: ActivePeriod
  filters: TransactionFilters
  onboardingComplete: boolean
  sampleDataDismissed: boolean  // true once user dismisses the "sample data" banner
  dashboardExcludedProjectIds: string[]  // project IDs hidden from all dashboard metrics
  // Cloud persistence
  householdId: string | null    // null until household is created (after onboarding)
  dataLoading: boolean          // true while loading household data from Supabase on mount
}
