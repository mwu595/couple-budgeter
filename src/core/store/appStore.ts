import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { addDays, addMonths, setDate, getDate, parseISO, format as fnsFormat } from 'date-fns'
import type {
  AppState,
  Transaction,
  Label,
  Account,
  Project,
  RecurringIncome,
  RecurringFrequency,
  User,
  UserId,
  ActivePeriod,
  TransactionFilters,
} from '@/core/types'
import { generateMockData } from '@/core/mock'
import {
  getMyHouseholdId,
  updateHouseholdMember,
  getHouseholdMembers,
  getLabels,
  getTransactions,
  insertLabel,
  insertLabels,
  patchLabel,
  removeLabel,
  insertTransaction,
  insertTransactions,
  patchTransaction,
  removeTransaction,
  removeTransactions,
  removeAllTransactions,
  removeAllLabels,
  renameTransactionAccount,
  getAccounts,
  insertAccount,
  patchAccount,
  removeAccount,
  getProjects,
  insertProject,
  patchProject,
  removeProject,
  getRecurringIncomes,
  insertRecurringIncome,
  patchRecurringIncome,
  removeRecurringIncome,
  removeAllRecurringIncomes,
  removeRecurringIncomeTransactions,
} from '@/lib/db'

// ─── Pure helper: advance a date by one recurrence interval ─────────────────

function computeNextDate(currentDate: string, frequency: RecurringFrequency): string {
  const d = parseISO(currentDate)
  switch (frequency) {
    case 'weekly':
      return fnsFormat(addDays(d, 7), 'yyyy-MM-dd')
    case 'biweekly':
      return fnsFormat(addDays(d, 14), 'yyyy-MM-dd')
    case 'monthly':
      return fnsFormat(addMonths(d, 1), 'yyyy-MM-dd')
    case 'semimonthly': {
      const day = getDate(d)
      if (day < 15) return fnsFormat(setDate(d, 15), 'yyyy-MM-dd')
      // On 15th or later → 1st of next month
      return fnsFormat(addMonths(setDate(d, 1), 1), 'yyyy-MM-dd')
    }
  }
}

// ─── Store type: AppState + all actions ────────────────────────────────────

export interface AppStore extends AppState {
  // Data loading (called once on mount)
  loadHouseholdData: () => Promise<void>

  // Household creation (called at end of onboarding)
  createHouseholdAndSeed: (
    userA: { name: string; emoji: string },
    userB: { name: string; emoji: string },
  ) => Promise<void>

  // Transaction actions (optimistic: update local state, then sync to DB)
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  toggleReviewed: (id: string) => Promise<void>
  bulkDeleteTransactions: (ids: string[]) => Promise<void>

  // Label actions
  addLabel: (data: Omit<Label, 'id'>) => Promise<Label>
  updateLabel: (id: string, updates: Partial<Omit<Label, 'id'>>) => Promise<void>
  deleteLabel: (id: string) => Promise<void>

  // Project actions
  addProject: (data: Omit<Project, 'id'>) => Promise<Project>
  updateProject: (id: string, updates: Partial<Omit<Project, 'id'>>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  // Account actions
  addAccount: (name: string) => Promise<Account>
  updateAccount: (id: string, newName: string) => Promise<void>
  deleteAccount: (id: string) => Promise<void>

  // Recurring income actions
  addRecurringIncome: (data: Omit<RecurringIncome, 'id' | 'createdAt'>) => Promise<void>
  updateRecurringIncome: (id: string, updates: Partial<Omit<RecurringIncome, 'id' | 'createdAt'>>) => Promise<void>
  deleteRecurringIncome: (id: string) => Promise<void>
  clearAllRecurringData: () => Promise<void>
  spawnDueIncomes: () => Promise<void>

  // User actions
  updateUser: (id: UserId, updates: Partial<Omit<User, 'id'>>) => Promise<void>

  // Period & filter actions (local only — no DB)
  setActivePeriod: (period: ActivePeriod) => void
  setFilters: (filters: Partial<TransactionFilters>) => void
  resetFilters: () => void

  // Onboarding (local only)
  setOnboardingComplete: (value: boolean) => void
  setSampleDataDismissed: (value: boolean) => void
  setDashboardExcludedProjectIds: (ids: string[]) => void

  // Data management
  resetToMockData: () => Promise<void>
}

// ─── Default values ─────────────────────────────────────────────────────────

const DEFAULT_FILTERS: TransactionFilters = {
  search: '',
  labelIds: [],
  payerIds: [],
  appliedPersons: [],
  reviewed: 'all',
  projectId: undefined,
}

const DEFAULT_PERIOD: ActivePeriod = { preset: 'this_month' }

const DEFAULT_USERS: [User, User] = [
  { id: 'user_a', name: 'Person 1', avatarEmoji: '🧑' },
  { id: 'user_b', name: 'Person 2', avatarEmoji: '👩' },
]

// Initial state — data arrays are empty; Supabase fills them via loadHouseholdData.
// UI state (period, filters, onboarding) is rehydrated from localStorage.
function buildInitialState(): AppState {
  return {
    users: DEFAULT_USERS,
    transactions: [],
    labels: [],
    accounts: [],
    projects: [],
    recurringIncomes: [],
    activePeriod: DEFAULT_PERIOD,
    filters: DEFAULT_FILTERS,
    onboardingComplete: false,
    sampleDataDismissed: false,
    dashboardExcludedProjectIds: [],
    householdId: null,
    dataLoading: true,
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...buildInitialState(),

      // ── Load all household data from Supabase ─────────────────────────────
      loadHouseholdData: async () => {
        set({ dataLoading: true })
        try {
          let householdId = await getMyHouseholdId()

          if (!householdId) {
            // No household yet — check if there's a pending invite for this user.
            // If so, accept it automatically so the partner skips onboarding.
            const res = await fetch('/api/invites/accept', { method: 'POST' })
            if (res.ok) {
              const body = await res.json() as { accepted?: boolean; householdId?: string }
              if (body.accepted && body.householdId) {
                householdId = body.householdId
              }
            }
          }

          if (!householdId) {
            // Still no household — user needs onboarding
            set({ dataLoading: false, onboardingComplete: false })
            return
          }

          const [users, labels, transactions] = await Promise.all([
            getHouseholdMembers(householdId),
            getLabels(householdId),
            getTransactions(householdId),
          ])
          // Loaded separately so missing tables never poison the main load.
          const accounts         = await getAccounts(householdId).catch(() => [])
          const projects         = await getProjects(householdId).catch(() => [])
          const recurringIncomes = await getRecurringIncomes(householdId).catch(() => [])

          set({
            householdId,
            users,
            labels,
            transactions,
            accounts,
            projects,
            recurringIncomes,
            dataLoading: false,
            onboardingComplete: true,
          })

          // Spawn any overdue recurring income entries after state is populated.
          await get().spawnDueIncomes()
        } catch (err) {
          console.error('[store] loadHouseholdData failed:', err)
          set({ dataLoading: false })
        }
      },

      // ── Create household (called at end of onboarding) ───────────────────
      createHouseholdAndSeed: async (userA, userB) => {
        // Use the server-side Route Handler to create the household with the
        // service role key — this bypasses the RLS chicken-and-egg problem
        // where you can't insert into household_members until you're already a member.
        const res = await fetch('/api/households', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userA, userB }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }

        const { householdId } = await res.json() as { householdId: string }

        const users: [User, User] = [
          { id: 'user_a', name: userA.name, avatarEmoji: userA.emoji },
          { id: 'user_b', name: userB.name, avatarEmoji: userB.emoji },
        ]

        // New accounts start completely empty — no seeded data.
        set({
          householdId,
          users,
          labels: [],
          transactions: [],
          onboardingComplete: true,
          sampleDataDismissed: true,
          dataLoading: false,
        })
      },

      // ── Transactions ──────────────────────────────────────────────────────
      addTransaction: async (data) => {
        const id = uuidv4()
        const createdAt = new Date().toISOString()
        const tx: Transaction = { ...data, id, createdAt }

        // Optimistic update
        set((state) => ({ transactions: [tx, ...state.transactions] }))

        const { householdId } = get()
        if (householdId) {
          try {
            await insertTransaction(householdId, tx)
          } catch (err) {
            console.error('[store] addTransaction sync failed:', err)
            // Revert
            set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }))
          }
        }
      },

      updateTransaction: async (id, updates) => {
        // Snapshot for revert
        const prev = get().transactions.find((t) => t.id === id)

        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id ? { ...tx, ...updates } : tx,
          ),
        }))

        const { householdId } = get()
        if (householdId) {
          try {
            await patchTransaction(id, updates)
          } catch (err) {
            console.error('[store] updateTransaction sync failed:', err)
            if (prev) {
              set((state) => ({
                transactions: state.transactions.map((tx) => (tx.id === id ? prev : tx)),
              }))
            }
          }
        }
      },

      deleteTransaction: async (id) => {
        const prev = get().transactions.find((t) => t.id === id)

        set((state) => ({ transactions: state.transactions.filter((tx) => tx.id !== id) }))

        const { householdId } = get()
        if (householdId) {
          try {
            await removeTransaction(id)
          } catch (err) {
            console.error('[store] deleteTransaction sync failed:', err)
            if (prev) {
              set((state) => ({ transactions: [prev, ...state.transactions] }))
            }
          }
        }
      },

      toggleReviewed: async (id) => {
        const tx = get().transactions.find((t) => t.id === id)
        if (!tx) return
        await get().updateTransaction(id, { reviewed: !tx.reviewed })
      },

      bulkDeleteTransactions: async (ids) => {
        const removed = get().transactions.filter((t) => ids.includes(t.id))

        set((state) => ({ transactions: state.transactions.filter((tx) => !ids.includes(tx.id)) }))

        const { householdId } = get()
        if (householdId) {
          try {
            await removeTransactions(ids)
          } catch (err) {
            console.error('[store] bulkDeleteTransactions sync failed:', err)
            set((state) => ({ transactions: [...removed, ...state.transactions] }))
          }
        }
      },

      // ── Labels ────────────────────────────────────────────────────────────
      addLabel: async (data) => {
        const label: Label = { ...data, id: uuidv4() }

        set((state) => ({ labels: [...state.labels, label] }))

        const { householdId } = get()
        if (householdId) {
          try {
            await insertLabel(householdId, label)
          } catch (err) {
            console.error('[store] addLabel sync failed:', err)
            set((state) => ({ labels: state.labels.filter((l) => l.id !== label.id) }))
          }
        }

        return label
      },

      updateLabel: async (id, updates) => {
        const prev = get().labels.find((l) => l.id === id)

        set((state) => ({
          labels: state.labels.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        }))

        const { householdId } = get()
        if (householdId) {
          try {
            await patchLabel(id, updates)
          } catch (err) {
            console.error('[store] updateLabel sync failed:', err)
            if (prev) {
              set((state) => ({
                labels: state.labels.map((l) => (l.id === id ? prev : l)),
              }))
            }
          }
        }
      },

      deleteLabel: async (id) => {
        const prev = get().labels.find((l) => l.id === id)
        const prevTransactions = get().transactions

        set((state) => ({
          labels: state.labels.filter((l) => l.id !== id),
          transactions: state.transactions.map((tx) => ({
            ...tx,
            labelIds: tx.labelIds.filter((lid) => lid !== id),
          })),
        }))

        const { householdId } = get()
        if (householdId) {
          try {
            await removeLabel(id)
          } catch (err) {
            console.error('[store] deleteLabel sync failed:', err)
            if (prev) {
              set({ labels: [...get().labels, prev], transactions: prevTransactions })
            }
          }
        }
      },

      // ── Projects ──────────────────────────────────────────────────────────
      addProject: async (data) => {
        const project: Project = { ...data, id: uuidv4() }

        set((state) => ({ projects: [project, ...state.projects] }))

        const { householdId } = get()
        if (householdId) {
          try {
            await insertProject(householdId, project)
          } catch (err) {
            console.error('[store] addProject sync failed:', err)
            set((state) => ({ projects: state.projects.filter((p) => p.id !== project.id) }))
          }
        }

        return project
      },

      updateProject: async (id, updates) => {
        const prev = get().projects.find((p) => p.id === id)

        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }))

        const { householdId } = get()
        if (householdId) {
          try {
            await patchProject(id, updates)
          } catch (err) {
            console.error('[store] updateProject sync failed:', err)
            if (prev) {
              set((state) => ({
                projects: state.projects.map((p) => (p.id === id ? prev : p)),
              }))
            }
          }
        }
      },

      deleteProject: async (id) => {
        const prev = get().projects.find((p) => p.id === id)
        const prevTransactions = get().transactions

        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          transactions: state.transactions.map((tx) =>
            tx.projectId === id ? { ...tx, projectId: undefined } : tx,
          ),
        }))

        const { householdId } = get()
        if (householdId) {
          try {
            await removeProject(id)
          } catch (err) {
            console.error('[store] deleteProject sync failed:', err)
            if (prev) {
              set({ projects: [...get().projects, prev], transactions: prevTransactions })
            }
          }
        }
      },

      // ── Accounts ──────────────────────────────────────────────────────────
      addAccount: async (name) => {
        const account: Account = { id: uuidv4(), name }

        set((state) => ({ accounts: [...state.accounts, account].sort((a, b) => a.name.localeCompare(b.name)) }))

        const { householdId } = get()
        if (householdId) {
          try {
            await insertAccount(householdId, account)
          } catch (err) {
            console.error('[store] addAccount sync failed:', err)
            set((state) => ({ accounts: state.accounts.filter((a) => a.id !== account.id) }))
          }
        }

        return account
      },

      updateAccount: async (id, newName) => {
        const prev = get().accounts.find((a) => a.id === id)
        if (!prev) return
        const oldName = prev.name
        const prevTransactions = get().transactions

        set((state) => ({
          accounts: state.accounts
            .map((a) => (a.id === id ? { ...a, name: newName } : a))
            .sort((a, b) => a.name.localeCompare(b.name)),
          transactions: state.transactions.map((tx) =>
            tx.accountName === oldName ? { ...tx, accountName: newName } : tx
          ),
        }))

        const { householdId } = get()
        if (householdId) {
          try {
            await patchAccount(id, newName)
            await renameTransactionAccount(householdId, oldName, newName)
          } catch (err) {
            console.error('[store] updateAccount sync failed:', err)
            set((state) => ({
              accounts: state.accounts.map((a) => (a.id === id ? prev : a)),
              transactions: prevTransactions,
            }))
          }
        }
      },

      deleteAccount: async (id) => {
        const prev = get().accounts.find((a) => a.id === id)

        set((state) => ({ accounts: state.accounts.filter((a) => a.id !== id) }))

        const { householdId } = get()
        if (householdId) {
          try {
            await removeAccount(id)
          } catch (err) {
            console.error('[store] deleteAccount sync failed:', err)
            if (prev) {
              set((state) => ({
                accounts: [...state.accounts, prev].sort((a, b) => a.name.localeCompare(b.name)),
              }))
            }
          }
        }
      },

      // ── Recurring incomes ─────────────────────────────────────────────────
      addRecurringIncome: async (data) => {
        const ri: RecurringIncome = { ...data, id: uuidv4(), createdAt: new Date().toISOString() }

        set((state) => ({ recurringIncomes: [ri, ...state.recurringIncomes] }))

        const { householdId } = get()
        if (householdId) {
          try {
            await insertRecurringIncome(householdId, ri)
            // Immediately try to spawn if startDate <= today
            await get().spawnDueIncomes()
          } catch (err) {
            console.error('[store] addRecurringIncome sync failed:', err)
            set((state) => ({ recurringIncomes: state.recurringIncomes.filter((r) => r.id !== ri.id) }))
          }
        }
      },

      updateRecurringIncome: async (id, updates) => {
        const prev = get().recurringIncomes.find((r) => r.id === id)

        set((state) => ({
          recurringIncomes: state.recurringIncomes.map((r) =>
            r.id === id ? { ...r, ...updates } : r,
          ),
        }))

        const { householdId } = get()
        if (householdId) {
          try {
            await patchRecurringIncome(id, updates)
          } catch (err) {
            console.error('[store] updateRecurringIncome sync failed:', err)
            if (prev) {
              set((state) => ({
                recurringIncomes: state.recurringIncomes.map((r) => (r.id === id ? prev : r)),
              }))
            }
          }
        }
      },

      deleteRecurringIncome: async (id) => {
        const prev = get().recurringIncomes.find((r) => r.id === id)

        set((state) => ({ recurringIncomes: state.recurringIncomes.filter((r) => r.id !== id) }))

        const { householdId } = get()
        if (householdId) {
          try {
            await removeRecurringIncome(id)
          } catch (err) {
            console.error('[store] deleteRecurringIncome sync failed:', err)
            if (prev) {
              set((state) => ({ recurringIncomes: [prev, ...state.recurringIncomes] }))
            }
          }
        }
      },

      clearAllRecurringData: async () => {
        const { householdId } = get()

        set((state) => ({
          recurringIncomes: [],
          transactions: state.transactions.filter((t) => !t.recurringIncomeId || t.reviewed),
        }))

        if (householdId) {
          try {
            await removeAllRecurringIncomes(householdId)
            await removeRecurringIncomeTransactions(householdId)
          } catch (err) {
            console.error('[store] clearAllRecurringData sync failed:', err)
          }
        }
      },

      spawnDueIncomes: async () => {
        const { recurringIncomes, transactions, householdId } = get()
        const today = fnsFormat(new Date(), 'yyyy-MM-dd')

        // Prevent re-spawning income that was already inserted for a given date
        const alreadySpawned = new Set(
          transactions
            .filter((t) => t.recurringIncomeId)
            .map((t) => `${t.recurringIncomeId}::${t.date}`)
        )

        const newTransactions: Transaction[] = []
        const nextDateUpdates = new Map<string, string>()  // riId → new nextDate

        for (const ri of recurringIncomes) {
          let nextDate = ri.nextDate
          if (nextDate > today) continue

          while (nextDate <= today) {
            if (!alreadySpawned.has(`${ri.id}::${nextDate}`)) {
              newTransactions.push({
                id:                uuidv4(),
                date:              nextDate,
                merchant:          ri.name,
                amount:            -(ri.amount),   // positive → negative (income convention)
                accountName:       ri.accountName,
                notes:             ri.notes,
                payerId:           ri.payerId,
                appliedTo:         'shared' as const,
                labelIds:          [],
                reviewed:          false,
                recurringIncomeId: ri.id,
                createdAt:         new Date().toISOString(),
              })
            }
            nextDate = computeNextDate(nextDate, ri.frequency)
          }

          nextDateUpdates.set(ri.id, nextDate)
        }

        if (newTransactions.length === 0 && nextDateUpdates.size === 0) return

        // Optimistic update
        set((state) => ({
          transactions: newTransactions.length > 0
            ? [...newTransactions, ...state.transactions]
            : state.transactions,
          recurringIncomes: state.recurringIncomes.map((r) => {
            const nd = nextDateUpdates.get(r.id)
            return nd ? { ...r, nextDate: nd } : r
          }),
        }))

        if (!householdId) return

        try {
          if (newTransactions.length > 0) {
            await insertTransactions(householdId, newTransactions)
          }
          await Promise.all(
            [...nextDateUpdates.entries()].map(([id, nextDate]) =>
              patchRecurringIncome(id, { nextDate }),
            ),
          )
        } catch (err) {
          console.error('[store] spawnDueIncomes sync failed:', err)
          // Revert optimistic state for new transactions only
          const spawnedIds = new Set(newTransactions.map((t) => t.id))
          set((state) => ({
            transactions: state.transactions.filter((t) => !spawnedIds.has(t.id)),
            recurringIncomes: state.recurringIncomes.map((r) => {
              const original = recurringIncomes.find((o) => o.id === r.id)
              return original ?? r
            }),
          }))
        }
      },

      // ── Users ─────────────────────────────────────────────────────────────
      updateUser: async (id, updates) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === id ? { ...u, ...updates } : u,
          ) as [User, User],
        }))

        const { householdId } = get()
        if (householdId) {
          try {
            await updateHouseholdMember(householdId, id, {
              ...(updates.name        !== undefined && { display_name: updates.name }),
              ...(updates.avatarEmoji !== undefined && { avatar_emoji: updates.avatarEmoji }),
            })
          } catch (err) {
            console.error('[store] updateUser sync failed:', err)
          }
        }
      },

      // ── Period & Filters (local only) ─────────────────────────────────────
      setActivePeriod: (period) => set({ activePeriod: period }),

      setFilters: (filters) =>
        set((state) => ({ filters: { ...state.filters, ...filters } })),

      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      // ── Onboarding (local only) ───────────────────────────────────────────
      setOnboardingComplete: (value) => set({ onboardingComplete: value }),
      setSampleDataDismissed: (value) => set({ sampleDataDismissed: value }),
      setDashboardExcludedProjectIds: (ids) => set({ dashboardExcludedProjectIds: ids }),

      // ── Reset to mock data ────────────────────────────────────────────────
      resetToMockData: async () => {
        const { householdId } = get()
        if (!householdId) return

        // Clear then reseed
        await removeAllTransactions(householdId)
        await removeAllLabels(householdId)

        const mock = generateMockData()
        await insertLabels(householdId, mock.labels)
        await insertTransactions(householdId, mock.transactions)

        set({
          labels: mock.labels,
          transactions: mock.transactions,
          sampleDataDismissed: false,
        })
      },
    }),
    {
      name: 'money-tracker-v1',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      // Only persist UI preferences — data lives in Supabase.
      // filters is intentionally excluded: label IDs in filters can reference
      // labels from a different session/account, silently hiding all transactions.
      partialize: (state) => ({
        onboardingComplete: state.onboardingComplete,
        sampleDataDismissed: state.sampleDataDismissed,
        dashboardExcludedProjectIds: state.dashboardExcludedProjectIds,
      }),
    },
  ),
)
