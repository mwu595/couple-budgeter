'use client'

import { format, parseISO, isToday, isYesterday } from 'date-fns'
import type { Transaction, Label, User, Project } from '@/core/types'
import { TransactionRow } from './TransactionRow'

interface TransactionFeedProps {
  transactions: Transaction[]  // pre-filtered and sorted by the page
  labels: Label[]
  users: [User, User]
  projects?: Project[]
  onEditTransaction: (id: string) => void
  // Selection mode
  selectionMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}

function formatDateHeader(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, MMMM d')
}

export function TransactionFeed({
  transactions,
  labels,
  users,
  projects = [],
  onEditTransaction,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
}: TransactionFeedProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <p className="text-muted-foreground font-medium">No transactions found</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Try adjusting your filters or add a new transaction
        </p>
      </div>
    )
  }

  // Group transactions by date string (YYYY-MM-DD)
  const groups = transactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = []
    acc[tx.date].push(tx)
    return acc
  }, {})

  // Dates are already sorted newest-first by sortTransactions in the page
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  return (
    <div>
      {sortedDates.map((date) => (
        <div key={date}>
          {/* Date group header */}
          <div className="sticky top-0 z-10 px-4 py-1.5 bg-muted/90 backdrop-blur-sm border-y text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {formatDateHeader(date)}
          </div>

          {/* Rows for this date */}
          <div className="divide-y divide-border/60">
            {groups[date].map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                labels={labels}
                users={users}
                projects={projects}
                onEdit={onEditTransaction}
                selectionMode={selectionMode}
                selected={selectedIds?.has(tx.id) ?? false}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
