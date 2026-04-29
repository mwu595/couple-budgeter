'use client'

import { Info } from 'lucide-react'
import type { Transaction, User, DateRange } from '@/core/types'
import { formatCurrency } from '@/core/utils'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { useSavingsByPerson } from './hooks/useSavingsByPerson'

export interface SavingsByPersonChartProps {
  transactions: Transaction[]
  users: [User, User]
  dateRange: DateRange
}

export function SavingsByPersonChart({ transactions, users, dateRange }: SavingsByPersonChartProps) {
  const [p1, p2] = useSavingsByPerson(transactions, users, dateRange)

  return (
    <div className="bg-card border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl p-4 flex flex-col h-[350px]">
      <p className="text-sm font-medium mb-4 flex-shrink-0">Savings by Person</p>

      {transactions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No transactions for this period</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs text-muted-foreground font-medium pb-3 w-1/4" />
              <th className="text-right text-xs text-muted-foreground font-medium pb-3">
                {p1.name}
              </th>
              <th className="text-right text-xs text-muted-foreground font-medium pb-3">
                {p2.name}
              </th>
              <th className="text-right text-xs text-muted-foreground font-medium pb-3">
                Together
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="py-2.5 text-xs text-muted-foreground">Income</td>
              <td className="py-2.5 text-right tabular-nums">{formatCurrency(p1.income)}</td>
              <td className="py-2.5 text-right tabular-nums">{formatCurrency(p2.income)}</td>
              <td className="py-2.5 text-right tabular-nums">{formatCurrency(p1.income + p2.income)}</td>
            </tr>
            <tr>
              <td className="py-2.5 text-xs text-muted-foreground">Expenses</td>
              <td className="py-2.5 text-right tabular-nums text-destructive">
                −{formatCurrency(p1.expenses)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-destructive">
                −{formatCurrency(p2.expenses)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-destructive">
                −{formatCurrency(p1.expenses + p2.expenses)}
              </td>
            </tr>
            <tr>
              <td className="py-2.5 text-xs font-semibold">Net Savings</td>
              <td
                className={`py-2.5 text-right tabular-nums font-semibold ${
                  p1.savings >= 0 ? 'text-green-600' : 'text-destructive'
                }`}
              >
                {formatCurrency(p1.savings)}
              </td>
              <td
                className={`py-2.5 text-right tabular-nums font-semibold ${
                  p2.savings >= 0 ? 'text-green-600' : 'text-destructive'
                }`}
              >
                {formatCurrency(p2.savings)}
              </td>
              <td
                className={`py-2.5 text-right tabular-nums font-semibold ${
                  p1.savings + p2.savings >= 0 ? 'text-green-600' : 'text-destructive'
                }`}
              >
                {formatCurrency(p1.savings + p2.savings)}
              </td>
            </tr>
            {p1.annualPace !== null && (
              <tr>
                <td className="py-2.5 text-xs text-muted-foreground">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 cursor-default w-fit">
                        Yearly Projection
                        <Info className="size-3 shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Your current savings rate extrapolated to a full year. Assumes spending and income stay consistent.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                <td
                  className={`py-2.5 text-right tabular-nums ${
                    p1.annualPace >= 0 ? 'text-green-600' : 'text-destructive'
                  }`}
                >
                  {formatCurrency(p1.annualPace)}
                </td>
                <td
                  className={`py-2.5 text-right tabular-nums ${
                    p2.annualPace! >= 0 ? 'text-green-600' : 'text-destructive'
                  }`}
                >
                  {formatCurrency(p2.annualPace!)}
                </td>
                <td
                  className={`py-2.5 text-right tabular-nums ${
                    p1.annualPace + p2.annualPace! >= 0 ? 'text-green-600' : 'text-destructive'
                  }`}
                >
                  {formatCurrency(p1.annualPace + p2.annualPace!)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
