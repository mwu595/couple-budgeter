import type { Transaction, Label, User, OwnerId } from '@/core/types'

function escapeCsvField(value: string): string {
  // Wrap every field in quotes and escape any internal quotes by doubling them
  return `"${value.replace(/"/g, '""')}"`
}

/**
 * Converts the given transactions to a CSV string and triggers a browser download.
 *
 * @param transactions - Pre-filtered and sorted transactions to export
 * @param labels       - Full label list (for ID → name lookup)
 * @param users        - Both household users (for owner ID → name lookup)
 * @param filename     - Suggested download filename
 */
export function exportTransactionsToCsv(
  transactions: Transaction[],
  labels: Label[],
  users: [User, User],
  filename: string,
): void {
  const labelMap = new Map(labels.map((l) => [l.id, l.name]))

  const ownerName: Record<OwnerId, string> = {
    user_a:  users[0].name,
    user_b:  users[1].name,
    shared:  'Shared',
  }

  const headers = ['Date', 'Merchant', 'Amount', 'Account', 'Owner', 'Labels', 'Reviewed', 'Notes']

  const rows = transactions.map((tx) => [
    tx.date,
    tx.merchant,
    tx.amount.toFixed(2),
    tx.accountName,
    ownerName[tx.ownerId] ?? tx.ownerId,
    tx.labelIds.map((id) => labelMap.get(id) ?? id).join('; '),
    tx.reviewed ? 'Yes' : 'No',
    tx.notes ?? '',
  ])

  const csvContent = [headers, ...rows]
    .map((row) => row.map((field) => escapeCsvField(String(field))).join(','))
    .join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
