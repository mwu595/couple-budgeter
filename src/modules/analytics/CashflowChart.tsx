'use client'

import { useMemo } from 'react'
import { ResponsiveSankey } from '@nivo/sankey'
import type { Transaction, Label } from '@/core/types'
import { formatCurrency } from '@/core/utils'
import { buildCashflowData } from './buildCashflowData'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CashflowChartProps {
  transactions: Transaction[]
  labels: Label[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CashflowChart({ transactions, labels }: CashflowChartProps) {
  const data = useMemo(
    () => buildCashflowData(transactions, labels),
    [transactions, labels],
  )

  // Empty state — no expense transactions at all
  if (data.nodes.length === 0) {
    return (
      <div className="bg-card ring-1 ring-border rounded-xl p-6 flex flex-col items-center justify-center h-48 gap-2">
        <p className="text-sm font-medium text-muted-foreground">No spending data</p>
        <p className="text-xs text-muted-foreground">Add some transactions to see your cashflow.</p>
      </div>
    )
  }

  // Build a lookup for the colors function — keyed by node id
  const colorById = new Map(data.nodes.map((n) => [n.id, n.color]))

  // nivo's `colors` prop accepts a function (datum) => string.
  // We cast via unknown to satisfy the generic constraint without fighting nivo's
  // complex OrdinalColorScaleConfig<Omit<SankeyNodeDatum,...,'color'|'label'>> type.
  const colorsAccessor = ((node: { id: string }) =>
    colorById.get(node.id) ?? '#94a3b8') as unknown as Parameters<
    typeof ResponsiveSankey
  >[0]['colors']

  return (
    <div className="bg-card ring-1 ring-border rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="px-4 pt-4 pb-0">
        <p className="text-sm font-medium">Cashflow</p>
        {!data.hasIncome && (
          <p className="text-xs text-muted-foreground mt-0.5">
            No income recorded for this period — showing expense breakdown only.
          </p>
        )}
      </div>

      {/* Chart */}
      <div className="h-80 w-full px-2 py-4">
        <ResponsiveSankey
          data={{ nodes: data.nodes, links: data.links }}
          margin={{ top: 8, right: 140, bottom: 8, left: 8 }}
          align="justify"
          colors={colorsAccessor}
          nodeOpacity={1}
          nodeHoverOpacity={1}
          nodeThickness={18}
          nodeSpacing={16}
          nodeInnerPadding={3}
          nodeBorderWidth={0}
          nodeBorderRadius={2}
          linkOpacity={0.35}
          linkHoverOpacity={0.65}
          linkHoverOthersOpacity={0.1}
          enableLinkGradient
          linkBlendMode="normal"
          labelPosition="outside"
          labelPadding={12}
          labelOrientation="horizontal"
          label={(node) => {
            // node here is SankeyNodeDatum which has .id
            const pct =
              data.hasIncome && data.totalIncome > 0
                ? ((node.value / data.totalIncome) * 100).toFixed(1)
                : data.totalExpenses > 0
                ? ((node.value / data.totalExpenses) * 100).toFixed(1)
                : '0'
            const raw = data.nodes.find((n) => n.id === node.id)
            const name = raw?.label ?? node.id
            return `${name}  ${formatCurrency(node.value)}  ${pct}%`
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelTextColor={(node: any) => colorById.get(node.id) ?? '#64748b'}
          nodeTooltip={({ node }) => {
            const pct =
              data.hasIncome && data.totalIncome > 0
                ? ((node.value / data.totalIncome) * 100).toFixed(1)
                : data.totalExpenses > 0
                ? ((node.value / data.totalExpenses) * 100).toFixed(1)
                : '0'
            const raw = data.nodes.find((n) => n.id === node.id)
            const name = raw?.label ?? node.id
            return (
              <div className="bg-popover text-popover-foreground text-xs shadow-md rounded-md px-3 py-2 flex flex-col gap-0.5 min-w-[140px]">
                <span
                  className="font-semibold"
                  style={{ color: colorById.get(node.id) }}
                >
                  {name}
                </span>
                <span>{formatCurrency(node.value)}</span>
                <span className="text-muted-foreground">{pct}% of total</span>
              </div>
            )
          }}
          linkTooltip={({ link }) => {
            const srcNode = data.nodes.find((n) => n.id === (link.source as { id: string }).id)
            const tgtNode = data.nodes.find((n) => n.id === (link.target as { id: string }).id)
            return (
              <div className="bg-popover text-popover-foreground text-xs shadow-md rounded-md px-3 py-2 flex flex-col gap-0.5 min-w-[160px]">
                <span className="font-semibold">
                  {srcNode?.label ?? '?'} → {tgtNode?.label ?? '?'}
                </span>
                <span>{formatCurrency(link.value)}</span>
              </div>
            )
          }}
          animate
          motionConfig="gentle"
        />
      </div>
    </div>
  )
}
