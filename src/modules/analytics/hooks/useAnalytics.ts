import { useMemo } from 'react'
import { parseISO, differenceInCalendarDays } from 'date-fns'
import type { Transaction, Label, User, PayerId } from '@/core/types'
import { UNLABELED_LABEL } from '@/core/utils'

export interface SpendByOwner {
  payerId: PayerId
  name: string
  total: number
}

export interface SpendByLabel {
  label: Label
  total: number
  count: number
}

export interface AnalyticsResult {
  totalSpend: number
  spendByOwner: SpendByOwner[]
  spendByLabel: SpendByLabel[]
  avgDailySpend: number
}

interface UseAnalyticsInput {
  transactions: Transaction[]
  labels: Label[]
  users: [User, User]
}

export function useAnalytics({ transactions, labels, users }: UseAnalyticsInput): AnalyticsResult {
  return useMemo(() => {
    // Only positive amounts count as spend (negative = refund/income)
    const spending = transactions.filter((tx) => tx.amount > 0)

    // ── Total spend ─────────────────────────────────────────────────────
    const totalSpend = spending.reduce((sum, tx) => sum + tx.amount, 0)

    // ── Spend by payer ──────────────────────────────────────────────────
    const payerMap = new Map<PayerId, number>()
    for (const tx of spending) {
      payerMap.set(tx.payerId, (payerMap.get(tx.payerId) ?? 0) + tx.amount)
    }
    const spendByOwner: SpendByOwner[] = [
      { payerId: users[0].id, name: users[0].name, total: payerMap.get(users[0].id) ?? 0 },
      { payerId: users[1].id, name: users[1].name, total: payerMap.get(users[1].id) ?? 0 },
      { payerId: 'shared',    name: 'Shared',       total: payerMap.get('shared') ?? 0 },
    ]

    // ── Spend by label ──────────────────────────────────────────────────
    const labelMap = new Map<string, { total: number; count: number }>()
    for (const tx of spending) {
      for (const lid of tx.labelIds) {
        const prev = labelMap.get(lid) ?? { total: 0, count: 0 }
        labelMap.set(lid, { total: prev.total + tx.amount, count: prev.count + 1 })
      }
    }
    const spendByLabel: SpendByLabel[] = labels
      .map((label) => {
        const data = labelMap.get(label.id) ?? { total: 0, count: 0 }
        return { label, total: data.total, count: data.count }
      })
      .filter((entry) => entry.total > 0)
      .sort((a, b) => b.total - a.total)

    // Add unlabeled bucket for transactions with no labels
    const unlabeledSpending = spending.filter((tx) => tx.labelIds.length === 0)
    const unlabeledTotal = unlabeledSpending.reduce((sum, tx) => sum + tx.amount, 0)
    if (unlabeledTotal > 0) {
      spendByLabel.push({ label: UNLABELED_LABEL, total: unlabeledTotal, count: unlabeledSpending.length })
    }

    // ── Avg daily spend ─────────────────────────────────────────────────
    let avgDailySpend = 0
    if (spending.length > 0) {
      const dates = spending.map((tx) => tx.date).sort()
      const firstDate = parseISO(dates[0])
      const lastDate  = parseISO(dates[dates.length - 1])
      const days = Math.max(1, differenceInCalendarDays(lastDate, firstDate) + 1)
      avgDailySpend = totalSpend / days
    }

    return { totalSpend, spendByOwner, spendByLabel, avgDailySpend }
  }, [transactions, labels, users])
}
