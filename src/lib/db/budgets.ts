import { createClient } from '@/lib/supabase/client'
import type { Budget, BudgetPeriod } from '@/core/types'

interface BudgetRow {
  id: string
  name: string
  period: BudgetPeriod
  amount: string | number
  sort_order: number
  budget_labels: { label_id: string }[]
  budget_projects: { project_id: string }[]
}

function mapRow(row: BudgetRow): Budget {
  return {
    id: row.id,
    name: row.name,
    period: row.period,
    amount: Number(row.amount),
    labelIds: row.budget_labels.map((bl) => bl.label_id),
    projectIds: row.budget_projects.map((bp) => bp.project_id),
    sortOrder: row.sort_order,
  }
}

export async function getBudgets(householdId: string): Promise<Budget[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('budgets')
    .select('id, name, period, amount, sort_order, budget_labels(label_id), budget_projects(project_id)')
    .eq('household_id', householdId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as BudgetRow[]).map(mapRow)
}

// Bring a junction table to exactly `ids`: add what's missing first (upsert
// ignores rows already there), then prune the rest. Add-before-prune means a
// failure part-way leaves the old sources in place rather than none at all.
async function syncJunction(
  table: 'budget_labels' | 'budget_projects',
  column: 'label_id' | 'project_id',
  budgetId: string,
  ids: string[],
): Promise<void> {
  const supabase = createClient()

  if (ids.length > 0) {
    const { error } = await supabase
      .from(table)
      .upsert(
        ids.map((id) => ({ budget_id: budgetId, [column]: id })),
        { onConflict: `budget_id,${column}`, ignoreDuplicates: true },
      )
    if (error) throw error
  }

  let prune = supabase.from(table).delete().eq('budget_id', budgetId)
  if (ids.length > 0) prune = prune.not(column, 'in', `(${ids.join(',')})`)
  const { error } = await prune
  if (error) throw error
}

async function replaceSources(
  budgetId: string,
  labelIds: string[] | undefined,
  projectIds: string[] | undefined,
): Promise<void> {
  if (labelIds   !== undefined) await syncJunction('budget_labels',   'label_id',   budgetId, labelIds)
  if (projectIds !== undefined) await syncJunction('budget_projects', 'project_id', budgetId, projectIds)
}

// The client generates the id (like projects) so the optimistic row and the
// DB row share it and no reconciliation is needed. If the sources can't be
// written the budget row is removed again, so a failed create never leaves
// an empty budget behind that the store has already reverted.
export async function insertBudget(householdId: string, budget: Budget): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('budgets').insert({
    id: budget.id,
    household_id: householdId,
    name: budget.name,
    period: budget.period,
    amount: budget.amount,
    sort_order: budget.sortOrder,
  })
  if (error) throw error

  try {
    await replaceSources(budget.id, budget.labelIds, budget.projectIds)
  } catch (err) {
    await supabase.from('budgets').delete().eq('id', budget.id)
    throw err
  }
}

export async function patchBudget(
  id: string,
  updates: Partial<Omit<Budget, 'id'>>,
): Promise<void> {
  const supabase = createClient()
  const dbUpdates: Record<string, unknown> = {}
  if (updates.name   !== undefined) dbUpdates.name   = updates.name
  if (updates.period !== undefined) dbUpdates.period = updates.period
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder
  if (Object.keys(dbUpdates).length > 0) {
    const { error } = await supabase.from('budgets').update(dbUpdates).eq('id', id)
    if (error) throw error
  }
  await replaceSources(id, updates.labelIds, updates.projectIds)
}

// Rewrites sort_order for every budget whose id appears in `orderedIds`
// using the array index as the new value. The block reorders one cadence
// group at a time, so monthly and yearly positions overlap harmlessly.
export async function reorderBudgets(orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return
  const supabase = createClient()
  const results = await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from('budgets').update({ sort_order: idx }).eq('id', id),
    ),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
}

export async function removeBudget(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('budgets').delete().eq('id', id)
  if (error) throw error
}

export async function removeAllBudgets(householdId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('budgets').delete().eq('household_id', householdId)
  if (error) throw error
}
