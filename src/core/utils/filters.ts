import type { Transaction, TransactionFilters, DateRange, Label } from '@/core/types'

// Sentinel label representing transactions with no labels assigned.
// Used in the pie chart and as a filter value.
export const UNLABELED_LABEL: Label = {
  id:    '__unlabeled__',
  name:  'Unlabeled',
  color: '#94a3b8', // slate-400
}

// All transaction dates are 'YYYY-MM-DD' strings.
// Lexicographic comparison is correct and avoids timezone edge cases.
export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
  dateRange: DateRange
): Transaction[] {
  const { search, labelIds, ownerId, reviewed } = filters
  const searchLower = search.toLowerCase()

  return transactions.filter((tx) => {
    // ── Date range ────────────────────────────────────────────────────────
    if (tx.date < dateRange.start || tx.date > dateRange.end) return false

    // ── Search ────────────────────────────────────────────────────────────
    if (searchLower) {
      const merchantMatch = tx.merchant.toLowerCase().includes(searchLower)
      const notesMatch = tx.notes?.toLowerCase().includes(searchLower) ?? false
      if (!merchantMatch && !notesMatch) return false
    }

    // ── Owner ─────────────────────────────────────────────────────────────
    if (ownerId !== 'all' && tx.ownerId !== ownerId) return false

    // ── Labels ────────────────────────────────────────────────────────────
    // The UNLABELED_LABEL sentinel matches transactions with no labels.
    // Regular label IDs match transactions containing that label (any-match).
    if (labelIds.length > 0) {
      const wantsUnlabeled = labelIds.includes(UNLABELED_LABEL.id)
      const regularIds     = labelIds.filter((id) => id !== UNLABELED_LABEL.id)
      const matchesUnlabeled = wantsUnlabeled && tx.labelIds.length === 0
      const matchesLabeled   = regularIds.length > 0 && regularIds.some((id) => tx.labelIds.includes(id))
      if (!matchesUnlabeled && !matchesLabeled) return false
    }

    // ── Reviewed status ───────────────────────────────────────────────────
    if (reviewed === 'reviewed'   && !tx.reviewed) return false
    if (reviewed === 'unreviewed' &&  tx.reviewed) return false

    return true
  })
}

// Sort transactions newest-first by date, then by createdAt for same-day ties.
export function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date)
    if (dateDiff !== 0) return dateDiff
    return b.createdAt.localeCompare(a.createdAt)
  })
}
