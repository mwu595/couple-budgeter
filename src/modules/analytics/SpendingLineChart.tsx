'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  format,
  parseISO,
  differenceInCalendarDays,
  startOfWeek,
} from 'date-fns'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/core/utils'
import { cn } from '@/lib/utils'
import type { Transaction, User, DateRange } from '@/core/types'

// ── Granularity ──────────────────────────────────────────────────────────────

type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly'

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'daily',   label: 'Day' },
  { value: 'weekly',  label: 'Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'yearly',  label: 'Year' },
]

/** Pick a sensible default based on how many days the range spans. */
function autoGranularity(dateRange: DateRange): Granularity {
  const days =
    differenceInCalendarDays(parseISO(dateRange.end), parseISO(dateRange.start)) + 1
  if (days <= 60)  return 'daily'
  if (days <= 180) return 'weekly'
  if (days <= 730) return 'monthly'
  return 'yearly'
}

/** Return a display label and a lexicographically-sortable key for a given date + granularity. */
function toBucket(date: string, g: Granularity): { label: string; sortKey: string } {
  const d = parseISO(date)
  switch (g) {
    case 'daily':
      return { label: format(d, 'MMM d'), sortKey: date }
    case 'weekly': {
      const wk = startOfWeek(d, { weekStartsOn: 1 })
      return { label: format(wk, 'MMM d'), sortKey: format(wk, 'yyyy-MM-dd') }
    }
    case 'monthly':
      return { label: format(d, "MMM ''yy"), sortKey: date.slice(0, 7) }
    case 'yearly':
      return { label: format(d, 'yyyy'), sortKey: date.slice(0, 4) }
  }
}

// ── Chart data ───────────────────────────────────────────────────────────────

interface ChartPoint {
  label: string
  sortKey: string
  userA: number
  userB: number
  shared: number
}

function buildChartData(
  transactions: Transaction[],
  users: [User, User],
  granularity: Granularity,
): ChartPoint[] {
  const map = new Map<string, ChartPoint>()

  for (const tx of transactions) {
    if (tx.amount <= 0) continue
    const { label, sortKey } = toBucket(tx.date, granularity)
    const prev = map.get(sortKey) ?? { label, sortKey, userA: 0, userB: 0, shared: 0 }
    if (tx.ownerId === users[0].id) {
      map.set(sortKey, { ...prev, userA: prev.userA + tx.amount })
    } else if (tx.ownerId === users[1].id) {
      map.set(sortKey, { ...prev, userB: prev.userB + tx.amount })
    } else {
      map.set(sortKey, { ...prev, shared: prev.shared + tx.amount })
    }
  }

  return Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border rounded-lg shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium tabular-nums">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

interface SpendingLineChartProps {
  transactions: Transaction[]
  users: [User, User]
  dateRange: DateRange
}

const GRANULARITY_LABELS: Record<Granularity, string> = {
  daily:   'Daily',
  weekly:  'Weekly',
  monthly: 'Monthly',
  yearly:  'Yearly',
}

export function SpendingLineChart({ transactions, users, dateRange }: SpendingLineChartProps) {
  const auto = autoGranularity(dateRange)
  const [override, setOverride] = useState<Granularity | null>(null)

  // When the period changes, reset any manual override so auto takes over
  useEffect(() => {
    setOverride(null)
  }, [dateRange.start, dateRange.end])

  const granularity = override ?? auto
  const isOverridden = override !== null

  const chartData = useMemo(
    () => buildChartData(transactions, users, granularity),
    [transactions, users, granularity],
  )

  const title = `${GRANULARITY_LABELS[granularity]} Spending`

  return (
    <div className="bg-card ring-1 ring-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-medium">{title}</p>
          {!isOverridden && (
            <p className="text-xs text-muted-foreground">
              Auto · {GRANULARITY_LABELS[auto].toLowerCase()} buckets
            </p>
          )}
        </div>

        {/* Manual granularity selector */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {GRANULARITY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setOverride(value === auto && !isOverridden ? null : value)}
              className={cn(
                'text-[11px] px-2 py-0.5 rounded transition-colors',
                granularity === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart or empty state */}
      {chartData.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No data for this period</p>
        </div>
      ) : (
        <div aria-label={`Line chart showing ${granularity} spending by person`}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => `$${Math.round(v)}`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line
                type="linear"
                dataKey="userA"
                name={users[0].name}
                stroke="#2E7D32"
                strokeWidth={2}
                dot={{ r: 3, fill: '#2E7D32' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="linear"
                dataKey="userB"
                name={users[1].name}
                stroke="#1565C0"
                strokeWidth={2}
                dot={{ r: 3, fill: '#1565C0' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="linear"
                dataKey="shared"
                name="Shared"
                stroke="#7B1FA2"
                strokeWidth={2}
                dot={{ r: 3, fill: '#7B1FA2' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
