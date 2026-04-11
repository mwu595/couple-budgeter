'use client'

import { useState, useCallback } from 'react'
import { X, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import {
  useTransactions,
  useLabels,
  useUsers,
  useActivePeriod,
  useProjects,
} from '@/core/store'
import { filterTransactions, sortTransactions, getDateRangeForPeriod, UNLABELED_LABEL } from '@/core/utils'
import type { OwnerId } from '@/core/types'
import {
  useAnalytics,
  SummaryCards,
  SpendingPieChart,
  SpendingLineChart,
} from '@/modules/analytics'
import { TransactionFeed, TransactionForm } from '@/modules/transactions'
import { PeriodSelector } from '@/components/PeriodSelector'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function DashboardPage() {
  // Local label filter — clicking pie slices toggles them; does NOT touch global store filters
  const [activeLabelIds,  setActiveLabelIds]  = useState<string[]>([])
  // Owner filter for the pie chart only
  const [pieOwnerFilter,  setPieOwnerFilter]  = useState<OwnerId | 'all'>('all')
  const [editingId,     setEditingId]     = useState<string | null>(null)

  const transactions = useTransactions()
  const labels       = useLabels()
  const users        = useUsers()
  const projects     = useProjects()
  const activePeriod = useActivePeriod()

  const dateRange = getDateRangeForPeriod(activePeriod)

  // All transactions in the selected period — used for analytics
  const periodTransactions = filterTransactions(
    transactions,
    { search: '', labelIds: [], ownerId: 'all', reviewed: 'all' },
    dateRange
  )

  const analytics = useAnalytics({ transactions: periodTransactions, labels, users })

  // Separate analytics just for the pie chart — respects the owner filter
  const pieTransactions = pieOwnerFilter === 'all'
    ? periodTransactions
    : periodTransactions.filter((tx) => tx.ownerId === pieOwnerFilter)
  const pieAnalytics = useAnalytics({ transactions: pieTransactions, labels, users })

  // Transactions shown in the list — filtered by active labels if any are selected
  const listTransactions = sortTransactions(
    activeLabelIds.length > 0
      ? filterTransactions(
          transactions,
          { search: '', labelIds: activeLabelIds, ownerId: 'all', reviewed: 'all' },
          dateRange
        )
      : periodTransactions
  )

  // Resolve label objects for the active filter chips
  const activeLabels = activeLabelIds.map((id) =>
    id === UNLABELED_LABEL.id ? UNLABELED_LABEL : labels.find((l) => l.id === id)
  ).filter((l): l is NonNullable<typeof l> => l !== undefined)

  // Toggle: add if not present, remove if already selected
  function handleLabelClick(labelId: string) {
    setActiveLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    )
  }

  const editingTransaction = editingId
    ? transactions.find((tx) => tx.id === editingId)
    : undefined

  const handleEditTransaction = useCallback((id: string) => setEditingId(id), [])
  function closeDialog() { setEditingId(null) }

  return (
    <div className="flex flex-col min-h-screen md:min-h-0 md:h-screen">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b bg-background sticky top-0 z-20">
        <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {periodTransactions.length} transaction{periodTransactions.length !== 1 ? 's' : ''} this period
        </p>
      </div>

      {/* ── Period selector ──────────────────────────────────────────────── */}
      <PeriodSelector />

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <SummaryCards
          totalSpend={analytics.totalSpend}
          spendByOwner={analytics.spendByOwner}
          spendByLabel={analytics.spendByLabel}
          avgDailySpend={analytics.avgDailySpend}
          transactionCount={periodTransactions.length}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SpendingPieChart
            spendByLabel={pieAnalytics.spendByLabel}
            onLabelClick={handleLabelClick}
            activeLabelIds={activeLabelIds}
            users={users}
            ownerFilter={pieOwnerFilter}
            onOwnerFilterChange={setPieOwnerFilter}
          />
          <SpendingLineChart
            transactions={periodTransactions}
            users={users}
            dateRange={dateRange}
          />
        </div>

        {/* ── Inline transaction list ───────────────────────────────────── */}
        <div className="bg-card ring-1 ring-border rounded-xl overflow-hidden">
          {/* List header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium">Transactions</span>

              {/* Active label filter chips */}
              {activeLabels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center gap-1 text-xs rounded-full border px-2 py-0.5"
                  style={{
                    backgroundColor: `${label.color}20`,
                    color: label.color,
                    borderColor: `${label.color}40`,
                  }}
                >
                  {label.icon && <span aria-hidden="true">{label.icon}</span>}
                  {label.name}
                  <button
                    type="button"
                    onClick={() => handleLabelClick(label.id)}
                    className="hover:opacity-70 transition-opacity"
                    aria-label={`Remove ${label.name} filter`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <span className="text-xs text-muted-foreground">
                {listTransactions.length}{activeLabelIds.length > 0 ? ` of ${periodTransactions.length}` : ''}
              </span>
            </div>

            <Link
              href="/transactions"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Feed */}
          <TransactionFeed
            transactions={listTransactions}
            labels={labels}
            users={users}
            projects={projects}
            onEditTransaction={handleEditTransaction}
          />
        </div>
      </div>

      {/* ── Edit dialog ──────────────────────────────────────────────────── */}
      <Dialog open={editingId !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm
            transaction={editingTransaction}
            onSuccess={closeDialog}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
