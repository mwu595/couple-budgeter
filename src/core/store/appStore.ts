import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type {
  AppState,
  Transaction,
  Label,
  Account,
  Project,
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
} from '@/lib/db'

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

  // User actions
  updateUser: (id: UserId, updates: Partial<Omit<User, 'id'>>) => Promise<void>

  // Period & filter actions (local only — no DB)
  setActivePeriod: (period: ActivePeriod) => void
  setFilters: (filters: Partial<TransactionFilters>) => void
  resetFilters: () => void

  // Onboarding (local only)
  setOnboardingComplete: (value: boolean) => void
  setSampleDataDismissed: (value: boolean) => void

  // Data management
  resetToMockData: () => Promise<void>
}

// ─── Default values ─────────────────────────────────────────────────────────

const DEFAULT_FILTERS: TransactionFilters = {
  search: '',
  labelIds: [],
  ownerId: 'all',
  reviewed: 'all',
}

const DEFAULT_PERIOD: ActivePeriod = { preset: 'all_time' }

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
    activePeriod: DEFAULT_PERIOD,
    filters: DEFAULT_FILTERS,
    onboardingComplete: false,
    sampleDataDismissed: false,
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
          const accounts = await getAccounts(householdId).catch(() => [])
          const projects = await getProjects(householdId).catch(() => [])

          set({
            householdId,
            users,
            labels,
            transactions,
            accounts,
            projects,
            dataLoading: false,
            onboardingComplete: true,
          })
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
        activePeriod: state.activePeriod,
        onboardingComplete: state.onboardingComplete,
        sampleDataDismissed: state.sampleDataDismissed,
      }),
    },
  ),
)
