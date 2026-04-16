// Public store API — modules and pages import from here, never from appStore.ts directly.

import { useAppStore } from './appStore'
import type { ActivePeriod, TransactionFilters, UserId, PayerId } from '@/core/types'

export { useAppStore } from './appStore'

// ─── Rehydration (called once on client mount in Providers.tsx) ─────────────
export const rehydrateStore = () => useAppStore.persist.rehydrate()

// ─── Selector hooks ──────────────────────────────────────────────────────────
export const useTransactions        = () => useAppStore((s) => s.transactions)
export const useLabels              = () => useAppStore((s) => s.labels)
export const useAccounts            = () => useAppStore((s) => s.accounts)
export const useProjects            = () => useAppStore((s) => s.projects)
export const useRecurringIncomes    = () => useAppStore((s) => s.recurringIncomes)
export const useUsers               = () => useAppStore((s) => s.users)
export const useActivePeriod        = () => useAppStore((s) => s.activePeriod)
export const useFilters             = () => useAppStore((s) => s.filters)
export const useOnboardingComplete  = () => useAppStore((s) => s.onboardingComplete)
export const useSampleDataDismissed           = () => useAppStore((s) => s.sampleDataDismissed)
export const useDashboardExcludedProjectIds   = () => useAppStore((s) => s.dashboardExcludedProjectIds)
export const useDataLoading         = () => useAppStore((s) => s.dataLoading)
export const useHouseholdId         = () => useAppStore((s) => s.householdId)

// ─── Action hooks ────────────────────────────────────────────────────────────
export const useTransactionActions = () =>
  useAppStore((s) => ({
    addTransaction:          s.addTransaction,
    updateTransaction:       s.updateTransaction,
    deleteTransaction:       s.deleteTransaction,
    toggleReviewed:          s.toggleReviewed,
    bulkDeleteTransactions:  s.bulkDeleteTransactions,
  }))

export const useLabelActions = () =>
  useAppStore((s) => ({
    addLabel:    s.addLabel,
    updateLabel: s.updateLabel,
    deleteLabel: s.deleteLabel,
  }))

export const useProjectActions = () =>
  useAppStore((s) => ({
    addProject:    s.addProject,
    updateProject: s.updateProject,
    deleteProject: s.deleteProject,
  }))

export const useAccountActions = () =>
  useAppStore((s) => ({
    addAccount:    s.addAccount,
    updateAccount: s.updateAccount,
    deleteAccount: s.deleteAccount,
  }))

export const useUserActions = () =>
  useAppStore((s) => ({
    updateUser: s.updateUser,
  }))

export const usePeriodActions = () =>
  useAppStore((s) => ({
    setActivePeriod: s.setActivePeriod,
  }))

export const useFilterActions = () =>
  useAppStore((s) => ({
    setFilters:   s.setFilters,
    resetFilters: s.resetFilters,
  }))

export const useRecurringIncomeActions = () =>
  useAppStore((s) => ({
    addRecurringIncome:    s.addRecurringIncome,
    updateRecurringIncome: s.updateRecurringIncome,
    deleteRecurringIncome: s.deleteRecurringIncome,
    spawnDueIncomes:       s.spawnDueIncomes,
  }))

export const useDataActions = () =>
  useAppStore((s) => ({
    setOnboardingComplete:  s.setOnboardingComplete,
    setSampleDataDismissed: s.setSampleDataDismissed,
    resetToMockData:        s.resetToMockData,
    loadHouseholdData:      s.loadHouseholdData,
    createHouseholdAndSeed: s.createHouseholdAndSeed,
  }))


// ─── Type re-exports for convenience ─────────────────────────────────────────
export type { ActivePeriod, TransactionFilters, UserId, PayerId }
