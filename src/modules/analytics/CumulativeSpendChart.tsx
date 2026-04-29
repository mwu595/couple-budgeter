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
  past: number | null    // non-null for day <= todayDay (confirmed spend)
  future: number | null  // non-null for day >= todayDay (remaining days in month)
}

// todayDay: day-of-month for current month (split at today) | null = past month (all solid) | 0 = future month (all dotted)
function buildCumulativeData(
  transactions: Transaction[],
  ym: string,
  todayDay: number | null,
): CumulativePoint[] {
  const firstDay = parseISO(`${ym}-01`)
  const daysInMonth = getDaysInMonth(firstDay)
  const shortMonth = format(firstDay, 'MMM')

  const byDay = new Map<number, number>()
  for (const tx of transactions) {
    if (tx.amount <= 0) continue
    const day = parseInt(tx.date.slice(8, 10), 10)
    byDay.set(day, (byDay.get(day) ?? 0) + tx.amount)
  }

  let running = 0
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    running += byDay.get(day) ?? 0

    if (todayDay === null) {
      return { label: `${shortMonth} ${day}`, past: running, future: null }
    }
    if (day < todayDay) {
      return { label: `${shortMonth} ${day}`, past: running, future: null }
    }
    if (day === todayDay) {
      return { label: `${shortMonth} ${day}`, past: running, future: running }
    }
    return { label: `${shortMonth} ${day}`, past: null, future: running }
  })
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const val = payload.find((p: any) => p.value != null)?.value
  if (val == null) return null
  return (
    <div className="bg-popover shadow-[rgba(0,0,0,0.16)_0px_4px_16px_0px] rounded-lg px-3 py-2 text-xs">
      <p className="font-medium mb-1">{label}</p>
      <p className="text-muted-foreground">
        Total to date:{' '}
        <span className="font-medium tabular-nums text-foreground">
          {formatCurrency(val)}
        </span>
      </p>
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

  const data = useMemo(() => {
    const monthTxs = transactions.filter((tx) => tx.date.startsWith(currentYm))
    // null = past month (all solid), todayDay = current month (split), 0 = future month (all dotted)
    const dayArg = currentYm === todayYm ? todayDay : currentYm < todayYm ? null : 0
    return buildCumulativeData(monthTxs, currentYm, dayArg)
  }, [transactions, currentYm, todayYm, todayDay])

  const hasSpend = data.some((d) => (d.past ?? 0) > 0 || (d.future ?? 0) > 0)

  const axisTicks = data.length > 0
    ? [data[0].label, data[data.length - 1].label]
    : []

  const BASE_MAX = 10_000
  const STEP = 2_000
  const last = data.at(-1)
  const peak = last ? (last.past ?? last.future ?? 0) : 0
  const yMax = peak <= BASE_MAX ? BASE_MAX : Math.ceil(peak / STEP) * STEP
  const yTicks = Array.from({ length: yMax / STEP + 1 }, (_, i) => i * STEP)

  return (
    <div className="bg-card border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl p-4 flex flex-col h-[350px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <p className="text-sm font-medium">Monthly Accumulative Spending</p>
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
              <Tooltip content={<CustomTooltip />} />
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
