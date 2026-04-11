'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PeriodSelector } from '@/components/PeriodSelector'
import {
  useTransactions,
  useUsers,
  useActivePeriod,
  useRecurringIncomes,
  useAppStore,
} from '@/core/store'
import { filterTransactions, sortTransactions, getDateRangeForPeriod } from '@/core/utils'
import { IncomeForm, IncomeFeed, RecurringIncomeManager } from '@/modules/income'
import type { OwnerId, RecurringIncome } from '@/core/types'
import { cn } from '@/lib/utils'

type Tab = 'history' | 'recurring'

export default function IncomePage() {
  const [activeTab, setActiveTab]     = useState<Tab>('history')
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [isAdding, setIsAdding]       = useState(false)
  const [ownerFilter, setOwnerFilter] = useState<OwnerId | 'all'>('all')

  const transactions     = useTransactions()
  const users            = useUsers()
  const activePeriod     = useActivePeriod()
  const recurringIncomes = useRecurringIncomes()

  const addRecurringIncome    = useAppStore((s) => s.addRecurringIncome)
  const updateRecurringIncome = useAppStore((s) => s.updateRecurringIncome)
  const deleteRecurringIncome = useAppStore((s) => s.deleteRecurringIncome)
  const spawnDueIncomes       = useAppStore((s) => s.spawnDueIncomes)

  const dateRange = getDateRangeForPeriod(activePeriod)

  // Spawn any overdue recurring incomes when this page mounts
  useEffect(() => {
    spawnDueIncomes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter to income transactions only (amount < 0)
  const allIncome = transactions.filter((tx) => tx.amount < 0)

  const filtered = filterTransactions(
    allIncome,
    { search: '', labelIds: [], ownerId: ownerFilter, reviewed: 'all', projectId: undefined },
    dateRange,
  )
  const sorted = sortTransactions(filtered)

  const editingTransaction = editingId
    ? transactions.find((tx) => tx.id === editingId)
    : undefined

  function closeDialog() {
    setIsAdding(false)
    setEditingId(null)
  }

  // Recurring tab is always visible so users can add their first recurring income

  function handleAddRecurring(data: Omit<RecurringIncome, 'id' | 'createdAt'>) {
    addRecurringIncome(data)
    // Switch to recurring tab to show the new tile
    setActiveTab('recurring')
  }

  return (
    <div className="flex flex-col h-full min-h-screen md:min-h-0 md:h-screen">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-4 border-b bg-background sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Income</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sorted.length} entr{sorted.length !== 1 ? 'ies' : 'y'} this period
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* ── Period selector ───────────────────────────────────────────────────── */}
      <PeriodSelector />

      {/* ── Owner filter + tabs ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b bg-background overflow-x-auto scrollbar-none">
        {/* Owner pills */}
        {([
          { value: 'all'       as const,    label: 'All' },
          { value: users[0].id as OwnerId,  label: users[0].name },
          { value: users[1].id as OwnerId,  label: users[1].name },
          { value: 'shared'    as const,    label: 'Shared' },
        ] as { value: OwnerId | 'all'; label: string }[]).map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setOwnerFilter(value)}
            className={cn(
              'flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap',
              ownerFilter === value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
            )}
          >
            {label}
          </button>
        ))}

        {/* Tab switcher — always visible */}
        <>
          <div className="w-px h-4 bg-border flex-shrink-0 mx-0.5" />
          {(['history', 'recurring'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap',
                activeTab === tab
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
              )}
            >
              {tab === 'history' ? 'History' : 'Recurring'}
            </button>
          ))}
        </>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-card ring-1 ring-border rounded-xl overflow-hidden">
          {activeTab === 'history' ? (
            <IncomeFeed
              transactions={sorted}
              users={users}
              onEditTransaction={setEditingId}
            />
          ) : (
            <RecurringIncomeManager
              recurringIncomes={recurringIncomes}
              users={users}
              onAdd={handleAddRecurring}
              onUpdate={(id, data) => updateRecurringIncome(id, data)}
              onDelete={deleteRecurringIncome}
            />
          )}
        </div>
      </div>

      {/* ── Add / Edit dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={isAdding || editingId !== null}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isAdding ? 'Add Income' : 'Edit Income'}
            </DialogTitle>
          </DialogHeader>
          <IncomeForm
            transaction={editingTransaction}
            onSuccess={closeDialog}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
