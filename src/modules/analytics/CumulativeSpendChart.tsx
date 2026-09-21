'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, getDaysInMonth, addMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Transaction, DateRange } from '@/core/types'
import { formatCurrency } from '@/core/utils'

// ── Data builder ─────────────────────────────────────────────────────────────

interface CumulativePoint {
  label: string
  past: number | null      // non-null for day <= todayDay (confirmed spend)
  future: number | null    // non-null for day >= todayDay (remaining days in month)
  lastMonth: number | null // non-null when comparison overlay enabled and day <= last month's last day
}

// Cumulative running totals per day-of-month for a given set of monthly transactions.
function buildRunningByDay(transactions: Transaction[], daysInMonth: number): number[] {
  const byDay = new Map<number, number>()
  for (const tx of transactions) {
    if (tx.amount <= 0) continue
    const day = parseInt(tx.date.slice(8, 10), 10)
    byDay.set(day, (byDay.get(day) ?? 0) + tx.amount)
  }
  const out: number[] = []
  let running = 0
  for (let day = 1; day <= daysInMonth; day++) {
    running += byDay.get(day) ?? 0
    out.push(running)
  }
  return out
}

// todayDay: day-of-month for current month (split at today) | null = past month (all solid) | 0 = future month (all dotted)
// lastMonthTxs: when provided, overlays last month's running cumulative as `lastMonth`.
function buildCumulativeData(
  transactions: Transaction[],
  ym: string,
  todayDay: number | null,
  lastMonthTxs?: Transaction[],
  lastMonthDays?: number,
): CumulativePoint[] {
  const firstDay = parseISO(`${ym}-01`)
  const daysInMonth = getDaysInMonth(firstDay)
  const shortMonth = format(firstDay, 'MMM')

  const currentRunning = buildRunningByDay(transactions, daysInMonth)
  const lastRunning = lastMonthTxs && lastMonthDays
    ? buildRunningByDay(lastMonthTxs, lastMonthDays)
    : null

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const running = currentRunning[i]
    const lastMonth = lastRunning && day <= lastRunning.length ? lastRunning[day - 1] : null

    let past: number | null = null
    let future: number | null = null
    if (todayDay === null) {
      past = running
    } else if (day < todayDay) {
      past = running
    } else if (day === todayDay) {
      past = running
      future = running
    } else {
      future = running
    }

    return { label: `${shortMonth} ${day}`, past, future, lastMonth }
  })
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, showComparison }: any) {
  if (!active || !payload?.length) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const get = (key: string) => payload.find((p: any) => p.dataKey === key && p.value != null)?.value
  const current = get('past') ?? get('future')
  const lastMonth = get('lastMonth')
  if (current == null && lastMonth == null) return null

  return (
    <div className="bg-popover shadow-[rgba(0,0,0,0.16)_0px_4px_16px_0px] rounded-lg px-3 py-2 text-xs space-y-1">
      <p className="font-medium">{label}</p>
      {current != null && (
        <p className="text-muted-foreground">
          {showComparison ? 'This month' : 'Total to date'}:{' '}
          <span className="font-medium tabular-nums text-foreground">
            {formatCurrency(current)}
          </span>
        </p>
      )}
      {showComparison && lastMonth != null && (
        <p className="text-muted-foreground">
          Last month:{' '}
          <span className="font-medium tabular-nums text-foreground">
            {formatCurrency(lastMonth)}
          </span>
        </p>
      )}
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export interface CumulativeSpendChartProps {
  transactions: Transaction[]
  dateRange: DateRange
}

export function CumulativeSpendChart({ transactions, dateRange }: CumulativeSpendChartProps) {
  const todayYm = format(new Date(), 'yyyy-MM')
  const todayDay = new Date().getDate()

  // Newest month with expense transactions within the selected period — anchors the default for past-only periods
  const newestYm = useMemo(() => {
    let newest = ''
    for (const tx of transactions) {
      if (tx.amount > 0 && tx.date >= dateRange.start && tx.date <= dateRange.end) {
        const ym = tx.date.slice(0, 7)
        if (ym > newest) newest = ym
      }
    }
    return newest || null
  }, [transactions, dateRange.start, dateRange.end])

  const defaultYm = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    return dateRange.end > todayStr ? todayYm : (newestYm ?? todayYm)
  }, [dateRange.end, todayYm, newestYm])

  const [currentYm, setCurrentYm] = useState(defaultYm)

  useEffect(() => { setCurrentYm(defaultYm) }, [defaultYm])

  const monthLabel = format(parseISO(`${currentYm}-01`), 'MMMM yyyy')

  const goOlder = () =>
    setCurrentYm(format(addMonths(parseISO(`${currentYm}-01`), -1), 'yyyy-MM'))
  const goNewer = () =>
    setCurrentYm(format(addMonths(parseISO(`${currentYm}-01`), 1), 'yyyy-MM'))

  // Overlay last month's series only when viewing the current month.
  const showComparison = currentYm === todayYm
  const lastYm = useMemo(
    () => format(addMonths(parseISO(`${currentYm}-01`), -1), 'yyyy-MM'),
    [currentYm],
  )

  const data = useMemo(() => {
    const monthTxs = transactions.filter((tx) => tx.date.startsWith(currentYm))
    // null = past month (all solid), todayDay = current month (split), 0 = future month (all dotted)
    const dayArg = currentYm === todayYm ? todayDay : currentYm < todayYm ? null : 0

    if (!showComparison) {
      return buildCumulativeData(monthTxs, currentYm, dayArg)
    }
    const lastMonthTxs = transactions.filter((tx) => tx.date.startsWith(lastYm))
    const lastMonthDays = getDaysInMonth(parseISO(`${lastYm}-01`))
    return buildCumulativeData(monthTxs, currentYm, dayArg, lastMonthTxs, lastMonthDays)
  }, [transactions, currentYm, todayYm, todayDay, showComparison, lastYm])

  const hasSpend = data.some(
    (d) => (d.past ?? 0) > 0 || (d.future ?? 0) > 0 || (d.lastMonth ?? 0) > 0,
  )

  const axisTicks = data.length > 0
    ? [data[0].label, data[data.length - 1].label]
    : []

  const BASE_MAX = 10_000
  const STEP = 2_000
  const last = data.at(-1)
  const currentPeak = last ? (last.past ?? last.future ?? 0) : 0
  // Last month's peak is always the final non-null lastMonth value (running total is monotonic).
  const lastMonthPeak = showComparison
    ? data.reduce((m, d) => (d.lastMonth != null && d.lastMonth > m ? d.lastMonth : m), 0)
    : 0
  const peak = Math.max(currentPeak, lastMonthPeak)
  const yMax = peak <= BASE_MAX ? BASE_MAX : Math.ceil(peak / STEP) * STEP
  const yTicks = Array.from({ length: yMax / STEP + 1 }, (_, i) => i * STEP)

  return (
    <div className="bg-card border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl p-4 flex flex-col h-[350px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <p className="text-sm font-medium whitespace-nowrap">Monthly Accumulative Spending</p>
          {showComparison && (
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-[2px] bg-black" />
                This month
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-px bg-[#b8c8d6]" />
                Last month
              </span>
            </div>
          )}
        </div>
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
          <span className="text-xs text-muted-foreground w-24 text-center">
            {monthLabel}
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

      {!hasSpend ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No spending data for this period</p>
        </div>
      ) : (
        <div aria-label="Cumulative monthly spend line chart" className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                ticks={axisTicks}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, yMax]}
                ticks={yTicks}
                tickFormatter={(v) => `$${(v as number).toLocaleString()}`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={<CustomTooltip showComparison={showComparison} />} />
              {/* Last month — drawn first so it sits behind */}
              {showComparison && (
                <Line
                  type="linear"
                  dataKey="lastMonth"
                  stroke="#b8c8d6"
                  strokeWidth={1}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                  activeDot={{ r: 3, fill: '#b8c8d6' }}
                />
              )}
              {/* Confirmed spend — solid black */}
              <Line
                type="linear"
                dataKey="past"
                stroke="#000000"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
                activeDot={{ r: 4, fill: '#000000' }}
              />
              {/* Remaining days — grey dotted */}
              <Line
                type="linear"
                dataKey="future"
                stroke="#999999"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
                activeDot={{ r: 4, fill: '#999999' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
