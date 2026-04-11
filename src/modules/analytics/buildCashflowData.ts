import type { Transaction, Label } from '@/core/types'

// ─── Output types ────────────────────────────────────────────────────────────

export interface SankeyNode {
  id: string
  label: string
  color: string
}

export interface SankeyLink {
  source: string
  target: string
  value: number
}

export interface CashflowData {
  nodes: SankeyNode[]
  links: SankeyLink[]
  totalIncome: number
  totalExpenses: number
  hasIncome: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INCOME_SOURCE_ID = '__income_source__'
const INCOME_NODE_ID   = '__income__'
const TOTAL_SPEND_ID   = '__total_spend__'

const INCOME_SOURCE_COLOR  = '#0ea5e9'  // sky-500
const INCOME_NODE_COLOR    = '#38bdf8'  // sky-400
const TOTAL_SPEND_COLOR    = '#94a3b8'  // slate-400 — used in the no-income fallback
const UNLABELED_COLOR      = '#94a3b8'  // slate-400
const SAVINGS_NODE_ID      = '__savings__'
const SAVINGS_COLOR        = '#eab308'  // yellow-500 — distinct gold, universally reads as "savings"

// ─── Builder ─────────────────────────────────────────────────────────────────

export function buildCashflowData(
  transactions: Transaction[],
  labels: Label[],
): CashflowData {
  const labelMap = new Map(labels.map((l) => [l.id, l]))

  // Split into income (negative amount) and expenses (positive amount)
  const incomeTransactions  = transactions.filter((tx) => tx.amount < 0)
  const expenseTransactions = transactions.filter((tx) => tx.amount > 0)

  const totalIncome   = incomeTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const totalExpenses = expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0)

  const hasIncome = totalIncome > 0
  const hasExpenses = totalExpenses > 0

  if (!hasExpenses) {
    // Nothing to show — return empty data; the component will render an empty state.
    return { nodes: [], links: [], totalIncome, totalExpenses: 0, hasIncome }
  }

  // ── Aggregate expenses by label ───────────────────────────────────────────
  // A transaction with multiple labels contributes its full amount to each label
  // (same convention as useAnalytics / SpendingPieChart).
  const expenseByLabel = new Map<string, number>()

  for (const tx of expenseTransactions) {
    if (tx.labelIds.length === 0) {
      // Unlabeled bucket
      expenseByLabel.set(
        '__unlabeled__',
        (expenseByLabel.get('__unlabeled__') ?? 0) + tx.amount,
      )
    } else {
      for (const lid of tx.labelIds) {
        expenseByLabel.set(lid, (expenseByLabel.get(lid) ?? 0) + tx.amount)
      }
    }
  }

  // Sort expense nodes largest → smallest
  const sortedExpenses = [...expenseByLabel.entries()].sort((a, b) => b[1] - a[1])

  // ── Build expense nodes ───────────────────────────────────────────────────
  const expenseNodes: SankeyNode[] = sortedExpenses.map(([lid]) => {
    if (lid === '__unlabeled__') {
      return { id: '__unlabeled__', label: 'Unlabeled', color: UNLABELED_COLOR }
    }
    const l = labelMap.get(lid)
    return {
      id: lid,
      label: l?.name ?? 'Unknown',
      color: l?.color ?? UNLABELED_COLOR,
    }
  })

  const expenseLinks: SankeyLink[] = sortedExpenses.map(([lid, value]) => ({
    source: hasIncome ? INCOME_NODE_ID : TOTAL_SPEND_ID,
    target: lid,
    value,
  }))

  if (hasIncome) {
    // ── Full Sankey: income source → income node → expense nodes ─────────
    const potentialSavings = totalIncome - totalExpenses

    // Savings node appears first (top of right column) when income exceeds expenses
    const savingsNodes: SankeyNode[] = potentialSavings > 0
      ? [{ id: SAVINGS_NODE_ID, label: 'Potential Savings', color: SAVINGS_COLOR }]
      : []

    const savingsLinks: SankeyLink[] = potentialSavings > 0
      ? [{ source: INCOME_NODE_ID, target: SAVINGS_NODE_ID, value: potentialSavings }]
      : []

    const nodes: SankeyNode[] = [
      { id: INCOME_SOURCE_ID, label: 'Income',       color: INCOME_SOURCE_COLOR },
      { id: INCOME_NODE_ID,   label: 'Total Income', color: INCOME_NODE_COLOR   },
      ...expenseNodes,
      ...savingsNodes,
    ]

    const links: SankeyLink[] = [
      { source: INCOME_SOURCE_ID, target: INCOME_NODE_ID, value: totalIncome },
      ...expenseLinks,
      ...savingsLinks,
    ]

    return { nodes, links, totalIncome, totalExpenses, hasIncome: true }
  } else {
    // ── Fallback: total spend node → expense nodes ────────────────────────
    const nodes: SankeyNode[] = [
      { id: TOTAL_SPEND_ID, label: 'Total Spend', color: TOTAL_SPEND_COLOR },
      ...expenseNodes,
    ]

    return { nodes, links: expenseLinks, totalIncome: 0, totalExpenses, hasIncome: false }
  }
}
