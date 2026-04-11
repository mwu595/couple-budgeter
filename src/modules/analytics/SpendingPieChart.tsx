'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/core/utils'
import type { SpendByLabel } from './hooks/useAnalytics'

interface SpendingPieChartProps {
  spendByLabel: SpendByLabel[]
  onLabelClick: (labelId: string) => void
  /** IDs of the currently active label filters — highlights those slices */
  activeLabelIds?: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const { label, total } = payload[0].payload
  return (
    <div className="bg-popover border rounded-lg shadow-md px-3 py-2 text-xs space-y-0.5">
      <p className="font-medium" style={{ color: label.color }}>
        {label.icon && <span className="mr-1">{label.icon}</span>}
        {label.name}
      </p>
      <p className="text-muted-foreground">{formatCurrency(total)}</p>
    </div>
  )
}

export function SpendingPieChart({
  spendByLabel,
  onLabelClick,
  activeLabelIds = [],
}: SpendingPieChartProps) {
  return (
    <div className="bg-card ring-1 ring-border rounded-xl p-4">
      <p className="text-sm font-medium mb-2">Spending by Label</p>

      {spendByLabel.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No spending for this period</p>
        </div>
      ) : (
        <>
          {/* ── Chart ── */}
          <div aria-label="Pie chart showing spending by label">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={spendByLabel.map((entry) => ({
                    ...entry,
                    value: entry.total,
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
                <Tooltip content={<CustomTooltip />} />
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
