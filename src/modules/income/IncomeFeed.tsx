'use client'

import { format, parseISO, isToday, isYesterday } from 'date-fns'
import type { Transaction, User } from '@/core/types'
import { IncomeRow } from './IncomeRow'

interface IncomeFeedProps {
  transactions: Transaction[]   // pre-filtered and sorted by the page
  users: [User, User]
  onEditTransaction: (id: string) => void
}

function formatDateHeader(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date))     return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, MMMM d')
}

export function IncomeFeed({ transactions, users, onEditTransaction }: IncomeFeedProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <p className="text-muted-foreground font-medium">No income recorded</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Add an income entry or set up a recurring income above.
        </p>
      </div>
    )
  }

  // Group by date (YYYY-MM-DD); dates already sorted newest-first by the page
  const groups = transactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = []
    acc[tx.date].push(tx)
    return acc
  }, {})

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  return (
    <div>
      {sortedDates.map((date) => (
        <div key={date}>
          <div className="sticky top-0 z-10 px-4 py-1.5 bg-background/95 backdrop-blur-sm border-y border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {formatDateHeader(date)}
          </div>
          <div className="divide-y divide-border/60">
            {groups[date].map((tx) => (
              <IncomeRow
                key={tx.id}
                transaction={tx}
                users={users}
                onEdit={onEditTransaction}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
