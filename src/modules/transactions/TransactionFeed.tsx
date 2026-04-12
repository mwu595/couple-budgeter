'use client'

import { useState, useEffect, useRef } from 'react'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Transaction, Label, User, Project } from '@/core/types'
import { TransactionRow } from './TransactionRow'

const SESSION_KEY = 'txFeed_futureExpanded'

function formatDateHeader(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, MMMM d')
}

function isFutureDate(dateStr: string): boolean {
  return dateStr > format(new Date(), 'yyyy-MM-dd')
}

interface TransactionFeedProps {
  transactions: Transaction[]  // pre-filtered and sorted by the page
  labels: Label[]
  users: [User, User]
  projects?: Project[]
  onEditTransaction: (id: string) => void
  scrollToAnchor?: boolean
  // Selection mode
  selectionMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}

export function TransactionFeed({
  transactions,
  labels,
  users,
  projects = [],
  onEditTransaction,
  scrollToAnchor = false,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
}: TransactionFeedProps) {
  const [futureExpanded, setFutureExpanded] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === 'true'
    } catch {
      return false
    }
  })

  const anchorRef = useRef<HTMLDivElement>(null)

  function toggleFuture() {
    const next = !futureExpanded
    setFutureExpanded(next)
    try {
      sessionStorage.setItem(SESSION_KEY, String(next))
    } catch {
      // ignore — sessionStorage unavailable
    }
  }

  // Scroll so today (or most recent past group) is at the top of the container
  useEffect(() => {
    if (!scrollToAnchor || !anchorRef.current) return
    anchorRef.current.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [scrollToAnchor, transactions])

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

  const futureDates = sortedDates.filter(isFutureDate)
  const pastDates   = sortedDates.filter((d) => !isFutureDate(d))

  const today = format(new Date(), 'yyyy-MM-dd')
  const anchorDate = pastDates.length > 0
    ? (pastDates.includes(today) ? today : pastDates[0])
    : undefined

  const futureCount = futureDates.reduce((sum, d) => sum + groups[d].length, 0)

  function renderGroup(date: string) {
    return (
      <div key={date} ref={date === anchorDate ? anchorRef : undefined}>
        <div className="sticky top-0 z-10 px-4 py-1.5 bg-background/95 backdrop-blur-sm border-y border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {formatDateHeader(date)}
        </div>
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
    )
  }

  return (
    <div>
      {/* Future transactions — collapsed by default */}
      {futureDates.length > 0 && (
        <>
          <button
            onClick={toggleFuture}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b text-xs font-semibold text-muted-foreground hover:bg-muted/70 transition-colors"
          >
            {futureExpanded
              ? <ChevronUp className="w-3.5 h-3.5 shrink-0" />
              : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
            {futureCount} future transaction{futureCount !== 1 ? 's' : ''}
          </button>
          {futureExpanded && futureDates.map(renderGroup)}
        </>
      )}

      {/* Past & present transactions */}
      {pastDates.map(renderGroup)}
    </div>
  )
}
