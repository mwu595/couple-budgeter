'use client'

import { useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/core/utils'
import type { User, OwnerId } from '@/core/types'
import type { SpendByLabel } from './hooks/useAnalytics'

interface SpendingPieChartProps {
  spendByLabel: SpendByLabel[]
  onLabelClick: (labelId: string) => void
  /** IDs of the currently active label filters — highlights those slices */
  activeLabelIds?: string[]
  /** Owner filter controls rendered inside the card */
  users: [User, User]
  ownerFilter: OwnerId | 'all'
  onOwnerFilterChange: (owner: OwnerId | 'all') => void
}

type ViewMode = 'amount' | 'count'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, viewMode }: any) {
  if (!active || !payload?.length) return null
  const { label, total, count } = payload[0].payload
  return (
    <div className="bg-popover border rounded-lg shadow-md px-3 py-2 text-xs space-y-0.5">
      <p className="font-medium" style={{ color: label.color }}>
        {label.icon && <span className="mr-1">{label.icon}</span>}
        {label.name}
      </p>
      <p className="text-muted-foreground">
        {viewMode === 'amount' ? formatCurrency(total) : `${count} transaction${count !== 1 ? 's' : ''}`}
      </p>
    </div>
  )
}

export function SpendingPieChart({
  spendByLabel,
  onLabelClick,
  activeLabelIds = [],
  users,
  ownerFilter,
  onOwnerFilterChange,
}: SpendingPieChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('amount')

  const ownerTabs: { value: OwnerId | 'all'; label: string }[] = [
    { value: 'all',    label: 'All' },
    { value: users[0].id, label: users[0].name },
    { value: users[1].id, label: users[1].name },
    { value: 'shared', label: 'Shared' },
  ]

  const pillBase    = 'text-xs px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap'
  const pillActive  = 'bg-primary text-primary-foreground border-primary'
  const pillInactive = 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'

  return (
    <div className="bg-card ring-1 ring-border rounded-xl p-4">
      {/* ── Header row: title + amount/count toggle ── */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">Spending by Label</p>
        <div className="flex items-center gap-1">
          {(['amount', 'count'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                viewMode === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode === 'amount' ? 'Amount' : 'Count'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Owner filter tabs ── */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto scrollbar-none">
        {ownerTabs.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onOwnerFilterChange(value)}
            className={`${pillBase} ${ownerFilter === value ? pillActive : pillInactive}`}
          >
            {label}
          </button>
        ))}
      </div>

      {spendByLabel.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No spending for this period</p>
        </div>
      ) : (
        <>
          {/* ── Chart ── */}
          <div aria-label={`Pie chart showing spending by label (${viewMode})`}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={spendByLabel.map((entry) => ({
                    ...entry,
                    value: viewMode === 'amount' ? entry.total : entry.count,
                  }))}
                  dataKey="value"
                  nameKey="label.name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                  onClick={(entry) => onLabelClick(entry.label.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {spendByLabel.map((entry) => {
                    const isActive  = activeLabelIds.includes(entry.label.id)
                    const hasFilter = activeLabelIds.length > 0
                    return (
                      <Cell
                        key={entry.label.id}
                        fill={entry.label.color}
                        opacity={hasFilter && !isActive ? 0.3 : 1}
                        stroke={isActive ? entry.label.color : 'transparent'}
                        strokeWidth={isActive ? 2 : 0}
                      />
                    )
                  })}
                </Pie>
                <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
                <Legend
                  formatter={(value, entry) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const item = (entry as any).payload
                    const isActive  = activeLabelIds.includes(item?.label?.id)
                    const hasFilter = activeLabelIds.length > 0
                    return (
                      <span
                        className="text-xs"
                        style={{
                          color: hasFilter && !isActive ? 'var(--muted-foreground)' : 'var(--foreground)',
                          opacity: hasFilter && !isActive ? 0.5 : 1,
                        }}
                      >
                        {item?.label?.icon && <span className="mr-0.5">{item.label.icon}</span>}
                        {item?.label?.name ?? value}
                      </span>
                    )
                  }}
                  wrapperStyle={{ fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-1">
            Click a slice to filter · click again to clear
          </p>
        </>
      )}
    </div>
  )
}
