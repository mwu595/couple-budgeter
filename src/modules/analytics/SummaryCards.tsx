'use client'

import { formatCurrency } from '@/core/utils'
import type { SpendByOwner, SpendByLabel } from './hooks/useAnalytics'

interface SummaryCardsProps {
  totalSpend: number
  spendByOwner: SpendByOwner[]
  spendByLabel: SpendByLabel[]
  avgDailySpend: number
  transactionCount: number
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card ring-1 ring-border rounded-xl p-4 space-y-2.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
      {children}
    </div>
  )
}

// Owner color dots — consistent with SpendingLineChart line colors
const OWNER_COLORS: Record<string, string> = {
  user_a: '#2E7D32',
  user_b: '#1565C0',
  shared: '#7B1FA2',
}

export function SummaryCards({
  totalSpend,
  spendByOwner,
  spendByLabel,
  avgDailySpend,
  transactionCount,
}: SummaryCardsProps) {
  const topLabels = spendByLabel.slice(0, 3)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Total Spent */}
      <Card title="Total Spent">
        <p className="text-3xl font-bold tabular-nums tracking-tight">{formatCurrency(totalSpend)}</p>
        <p className="text-xs text-muted-foreground">
          {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
        </p>
      </Card>

      {/* By Person */}
      <Card title="By Person">
        <div className="space-y-1.5">
          {spendByOwner.map(({ ownerId, name, total }) => (
            <div key={ownerId} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: OWNER_COLORS[ownerId] ?? '#888784' }}
                />
                <span className="text-xs text-muted-foreground truncate">{name}</span>
              </div>
              <span className="text-xs font-semibold tabular-nums shrink-0">
                {formatCurrency(total)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Top Labels */}
      <Card title="Top Labels">
        {topLabels.length === 0 ? (
          <p className="text-xs text-muted-foreground">No labeled transactions</p>
        ) : (
          <div className="space-y-1.5">
            {topLabels.map(({ label, total }) => (
              <div key={label.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="text-xs text-muted-foreground truncate">
                    {label.icon && <span className="mr-0.5">{label.icon}</span>}
                    {label.name}
                  </span>
                </div>
                <span className="text-xs font-semibold tabular-nums shrink-0">
                  {formatCurrency(total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Avg Daily */}
      <Card title="Avg / Day">
        <p className="text-3xl font-bold tabular-nums tracking-tight">{formatCurrency(avgDailySpend)}</p>
        <p className="text-xs text-muted-foreground">per day this period</p>
      </Card>
    </div>
  )
}
