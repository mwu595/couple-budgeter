'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, startOfMonth, getDay, getDaysInMonth, isToday, addMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Transaction, DateRange } from '@/core/types'

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Component ────────────────────────────────────────────────────────────────

export interface TransactionCalendarProps {
  transactions: Transaction[]
  dateRange: DateRange
}

export function TransactionCalendar({ transactions, dateRange }: TransactionCalendarProps) {
  const { newestYm, expenseDates, incomeDates } = useMemo(() => {
    const expenseDates = new Set<string>()
    const incomeDates = new Set<string>()
    let newestYm = ''

    for (const tx of transactions) {
      // newestYm only considers the selected period — anchors the default month reset
      if (tx.date >= dateRange.start && tx.date <= dateRange.end) {
        const ym = tx.date.slice(0, 7)
        if (ym > newestYm) newestYm = ym
      }
      if (tx.amount > 0) expenseDates.add(tx.date)
      else if (tx.amount < 0) incomeDates.add(tx.date)
    }

    return { newestYm: newestYm || null, expenseDates, incomeDates }
  }, [transactions, dateRange.start, dateRange.end])

  const todayYm = format(new Date(), 'yyyy-MM')

  const defaultYm = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    return dateRange.end > todayStr ? todayYm : (newestYm ?? todayYm)
  }, [dateRange.end, todayYm, newestYm])

  const [currentYm, setCurrentYm] = useState(defaultYm)

  useEffect(() => { setCurrentYm(defaultYm) }, [defaultYm])

  const goOlder = () =>
    setCurrentYm(format(addMonths(parseISO(`${currentYm}-01`), -1), 'yyyy-MM'))
  const goNewer = () =>
    setCurrentYm(format(addMonths(parseISO(`${currentYm}-01`), 1), 'yyyy-MM'))

  const calendarShape = useMemo(() => {
    const firstDay = startOfMonth(parseISO(`${currentYm}-01`))
    return {
      daysInMonth: getDaysInMonth(firstDay),
      startDow: getDay(firstDay),
    }
  }, [currentYm])

  return (
    <div className="bg-card border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl p-4 flex flex-col h-[350px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <p className="text-sm font-medium">Transaction Calendar</p>
        <div className="flex items-center gap-2">
          {currentYm !== defaultYm && (
            <button
              onClick={() => setCurrentYm(defaultYm)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Reset
            </button>
          )}
          <div className="flex items-center gap-1">
          <button
            onClick={goOlder}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="text-xs text-muted-foreground w-24 text-center tabular-nums">
            {format(parseISO(`${currentYm}-01`), 'MMMM yyyy')}
          </span>
          <button
            onClick={goNewer}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="size-3.5" />
          </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 mb-2 flex-shrink-0">
          {DOW_LABELS.map((d) => (
            <div key={d} className="text-[10px] text-muted-foreground text-center font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid — rows stretch to fill remaining height */}
        <div className="flex-1 grid grid-cols-7 [grid-auto-rows:1fr]">
          {Array.from({ length: calendarShape.startDow }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {Array.from({ length: calendarShape.daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayStr = `${currentYm}-${String(day).padStart(2, '0')}`
            const hasExpense = expenseDates.has(dayStr)
            const hasIncome = incomeDates.has(dayStr)
            const today = isToday(parseISO(dayStr))

            return (
              <div key={dayStr} className="flex flex-col items-center justify-center gap-1">
                <span
                  className={
                    today
                      ? 'text-xs w-6 h-6 flex items-center justify-center rounded-full bg-foreground text-background font-semibold leading-none'
                      : 'text-xs leading-none'
                  }
                >
                  {day}
                </span>
                <div className="flex gap-0.5 items-center h-2">
                  {hasExpense && <span className="w-1.5 h-1.5 rounded-full bg-destructive" />}
                  {hasIncome && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex justify-center gap-6 pt-4 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
          <span className="text-[11px] text-muted-foreground">Expense</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <span className="text-[11px] text-muted-foreground">Income</span>
        </div>
      </div>
    </div>
  )
}
