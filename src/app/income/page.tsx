'use client'

import { useState, useEffect } from 'react'
import { format, parseISO, isAfter } from 'date-fns'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  useTransactions,
  useUsers,
  useActivePeriod,
  useRecurringIncomes,
  useAppStore,
} from '@/core/store'
import { filterTransactions, sortTransactions, getDateRangeForPeriod } from '@/core/utils'
import { IncomeForm, IncomeFeed, RecurringIncomeManager } from '@/modules/income'
import type { OwnerId, PeriodPreset } from '@/core/types'
import { cn } from '@/lib/utils'

export default function IncomePage() {
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [isAdding, setIsAdding]       = useState(false)
  const [ownerFilter, setOwnerFilter] = useState<OwnerId | 'all'>('all')

  const transactions     = useTransactions()
  const users            = useUsers()
  const activePeriod     = useActivePeriod()
  const recurringIncomes = useRecurringIncomes()

  const setActivePeriod       = useAppStore((s) => s.setActivePeriod)
  const addRecurringIncome    = useAppStore((s) => s.addRecurringIncome)
  const updateRecurringIncome = useAppStore((s) => s.updateRecurringIncome)
  const deleteRecurringIncome = useAppStore((s) => s.deleteRecurringIncome)
  const spawnDueIncomes       = useAppStore((s) => s.spawnDueIncomes)

  // Custom date range popover state
  const today = format(new Date(), 'yyyy-MM-dd')
  const existingCustom = activePeriod.preset === 'custom' && activePeriod.custom
  const [customOpen, setCustomOpen] = useState(false)
  const [dateA, setDateA] = useState(existingCustom ? activePeriod.custom!.start : '')
  const [dateB, setDateB] = useState(existingCustom ? activePeriod.custom!.end   : '')

  function handleApplyCustom() {
    if (!dateA || !dateB) return
    const [start, end] = isAfter(parseISO(dateA), parseISO(dateB))
      ? [dateB, dateA]
      : [dateA, dateB]
    setActivePeriod({ preset: 'custom', custom: { start, end } })
    setCustomOpen(false)
  }

  const customLabel =
    activePeriod.preset === 'custom' && activePeriod.custom
      ? `${format(parseISO(activePeriod.custom.start), 'MMM d')} – ${format(parseISO(activePeriod.custom.end), 'MMM d')}`
      : 'Custom'

  const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
    { value: 'all_time',   label: 'All Time' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
  ]

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

  return (
    <div className="flex flex-col h-full min-h-screen md:min-h-0 md:h-screen">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-4 border-b bg-background sticky top-0 z-20">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Income</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sorted.length} entr{sorted.length !== 1 ? 'ies' : 'y'} this period
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* ── Filter row ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b bg-background overflow-x-auto scrollbar-none">
        {/* Period presets */}
        {PERIOD_PRESETS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setActivePeriod({ preset: value })}
            className={cn(
              'flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap',
              activePeriod.preset === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground hover:bg-[#e2e2e2]',
            )}
          >
            {label}
          </button>
        ))}
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger
            className={cn(
              'flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap',
              activePeriod.preset === 'custom'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground hover:bg-[#e2e2e2]',
            )}
          >
            {customLabel}
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 space-y-3" align="start">
            <div className="space-y-1.5">
              <Label className="text-xs">First date</Label>
              <Input type="date" value={dateA} max={today} onChange={(e) => setDateA(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Second date</Label>
              <Input type="date" value={dateB} max={today} onChange={(e) => setDateB(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              The earlier date becomes the start, the later becomes the end.
            </p>
            <Button size="sm" className="w-full" disabled={!dateA || !dateB} onClick={handleApplyCustom}>
              Apply
            </Button>
          </PopoverContent>
        </Popover>

        <div className="w-px h-4 bg-border flex-shrink-0 mx-0.5" />

        {/* Owner pills */}
        {([
          { value: 'all'       as const,   label: 'All' },
          { value: users[0].id as OwnerId, label: users[0].name },
          { value: users[1].id as OwnerId, label: users[1].name },
          { value: 'shared'    as const,   label: 'Shared' },
        ] as { value: OwnerId | 'all'; label: string }[]).map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setOwnerFilter(value)}
            className={cn(
              'flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap',
              ownerFilter === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground hover:bg-[#e2e2e2]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Recurring income — always visible */}
        <div className="bg-card border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl overflow-hidden">
          <div className="flex items-center px-4 py-3 border-b border-border">
            <span className="text-sm font-medium">Recurring Income</span>
          </div>
          <RecurringIncomeManager
            recurringIncomes={recurringIncomes}
            users={users}
            onAdd={addRecurringIncome}
            onUpdate={(id, data) => updateRecurringIncome(id, data)}
            onDelete={deleteRecurringIncome}
          />
        </div>

        {/* Income history — always visible below */}
        <div className="bg-card border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl overflow-hidden">
          <div className="flex items-center px-4 py-3 border-b border-border">
            <span className="text-sm font-medium">History</span>
          </div>
          <IncomeFeed
            transactions={sorted}
            users={users}
            onEditTransaction={setEditingId}
          />
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
