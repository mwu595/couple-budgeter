'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
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
    <div className="bg-popover shadow-[rgba(0,0,0,0.16)_0px_4px_16px_0px] rounded-lg px-3 py-2 text-xs space-y-0.5">
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
    <div className="bg-card border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl p-4 flex flex-col h-[350px]">
      <p className="text-sm font-medium mb-2 flex-shrink-0">Spending by Label</p>

      {spendByLabel.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No spending for this period</p>
        </div>
      ) : (
        <>
          {/* ── Chart ── */}
          <div aria-label="Pie chart showing spending by label" className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
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
                  outerRadius={95}
                  innerRadius={48}
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
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* ── Custom legend ── */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-4 flex-shrink-0">
            {spendByLabel.map((entry) => {
              const isActive  = activeLabelIds.includes(entry.label.id)
              const hasFilter = activeLabelIds.length > 0
              return (
                <button
                  key={entry.label.id}
                  type="button"
                  onClick={() => onLabelClick(entry.label.id)}
                  className="flex items-center gap-1.5"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: entry.label.color,
                      opacity: hasFilter && !isActive ? 0.4 : 1,
                    }}
                  />
                  <span
                    className="text-[11px]"
                    style={{
                      color: hasFilter && !isActive ? 'var(--muted-foreground)' : entry.label.color,
                      opacity: hasFilter && !isActive ? 0.5 : 1,
                    }}
                  >
                    {entry.label.icon && <span className="mr-0.5">{entry.label.icon}</span>}
                    {entry.label.name}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
