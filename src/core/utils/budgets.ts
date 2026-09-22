import type { Budget, Transaction } from '@/core/types'

export interface BudgetSourceSpend {
  kind: 'label' | 'project'
  id: string
  total: number
}

export interface BudgetSpend {
  total: number
  /** One entry per source in the budget (labels then projects), zero-spend included. */
  bySource: BudgetSourceSpend[]
}

// True when an expense counts toward the budget: any of its labels, or its
// project, is one of the budget's sources. Refunds / income never count.
export function budgetCoversTransaction(budget: Budget, tx: Transaction): boolean {
  if (tx.amount <= 0) return false
  if (tx.projectId && budget.projectIds.includes(tx.projectId)) return true
  return budget.labelIds.some((id) => tx.labelIds.includes(id))
}

// Sums the expenses (amount > 0) in `transactions` that a budget covers.
// Each transaction counts once: it is attributed to its project if that
// project is in the budget, otherwise to the first of the budget's labels it
// carries. Projects win because they are the more specific grouping — a
// flight tagged Flights and filed under the Japan trip shows up as "Japan".
export function computeBudgetSpend(budget: Budget, transactions: Transaction[]): BudgetSpend {
  const totals = new Map<string, number>()
  for (const id of budget.labelIds)   totals.set(`label:${id}`, 0)
  for (const id of budget.projectIds) totals.set(`project:${id}`, 0)

  const projectSet = new Set(budget.projectIds)
  let total = 0

  for (const tx of transactions) {
    if (tx.amount <= 0) continue

    let key: string | undefined
    if (tx.projectId && projectSet.has(tx.projectId)) {
      key = `project:${tx.projectId}`
    } else {
      const labelId = budget.labelIds.find((id) => tx.labelIds.includes(id))
      if (labelId) key = `label:${labelId}`
    }
    if (!key) continue

    totals.set(key, (totals.get(key) ?? 0) + tx.amount)
    total += tx.amount
  }

  const bySource: BudgetSourceSpend[] = [
    ...budget.labelIds.map((id)   => ({ kind: 'label'   as const, id, total: totals.get(`label:${id}`)   ?? 0 })),
    ...budget.projectIds.map((id) => ({ kind: 'project' as const, id, total: totals.get(`project:${id}`) ?? 0 })),
  ]

  return { total, bySource }
}
