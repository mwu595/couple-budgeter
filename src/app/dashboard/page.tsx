'use client'

import { useState, useCallback, useRef } from 'react'
import { format, parseISO, isAfter } from 'date-fns'
import { X, ArrowRight, ChevronDown, Check } from 'lucide-react'
import Link from 'next/link'
import {
  useTransactions,
  useLabels,
  useUsers,
  useActivePeriod,
  useProjects,
  useDashboardExcludedProjectIds,
  useAppStore,
} from '@/core/store'
import { filterTransactions, sortTransactions, getDateRangeForPeriod, UNLABELED_LABEL } from '@/core/utils'
import type { PayerId, UserId, PeriodPreset } from '@/core/types'
import {
  useAnalytics,
  SummaryCards,
  SpendingPieChart,
  SpendingLineChart,
  CashflowChart,
  SavingsByPersonChart,
  CumulativeSpendChart,
  TransactionCalendar,
} from '@/modules/analytics'
import { TransactionFeed, TransactionForm } from '@/modules/transactions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { NAV_LINKS } from '@/components/AppNav'

// Sentinel used in excludedProjectIds to represent transactions with no project assigned
const NO_PROJECT_ID = '__no_project__'

const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'all_time',   label: 'All Time' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
]

export default function DashboardPage() {
  // Local label filter — clicking pie slices toggles them; does NOT touch global store filters
  const [activeLabelIds, setActiveLabelIds] = useState<string[]>([])
  // Page-level payer filter — affects all charts, cards, and the transaction list
  const [payerIds, setPayerIds] = useState<PayerId[]>([])
  // Page-level applied person filter — filters by who the expense is for
  const [appliedPersons, setAppliedPersons] = useState<(UserId | 'shared')[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [incomeMsg, setIncomeMsg] = useState(false)
  const incomeMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const incomePageLabel = NAV_LINKS.find((l) => l.href === '/income')?.label ?? 'Income'

  const transactions          = useTransactions()
  const labels                = useLabels()
  const users                 = useUsers()
  const projects              = useProjects()
  const activePeriod          = useActivePeriod()
  const setActivePeriod       = useAppStore((s) => s.setActivePeriod)
  const excludedProjectIds    = useDashboardExcludedProjectIds()
  const setExcludedProjectIds = useAppStore((s) => s.setDashboardExcludedProjectIds)

  // Custom date range popover state
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

  const dateRange = getDateRangeForPeriod(activePeriod)

  function togglePayerId(val: PayerId) {
    setPayerIds((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val])
  }
  function toggleAppliedPerson(val: UserId | 'shared') {
    setAppliedPersons((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val])
  }

  // All transactions in the selected period — used as the base set
  const periodTransactions = filterTransactions(
    transactions,
    { search: '', labelIds: [], payerIds: [], appliedPersons: [], reviewed: 'all', projectId: undefined },
    dateRange
  )

  // Apply page-level filters: excluded projects + payer + applied person — affects all downstream metrics
  const visibleTransactions = periodTransactions.filter((tx) => {
    if (tx.projectId && excludedProjectIds.includes(tx.projectId)) return false
    if (!tx.projectId && excludedProjectIds.includes(NO_PROJECT_ID)) return false
    if (payerIds.length > 0 && !payerIds.includes(tx.payerId)) return false
    if (appliedPersons.length > 0 && !appliedPersons.includes(tx.appliedTo)) return false
    return true
  })

  // Same payer/project filters but NO date range — used by charts that allow free month navigation
  const allTimeFilteredTransactions = transactions.filter((tx) => {
    if (tx.projectId && excludedProjectIds.includes(tx.projectId)) return false
    if (!tx.projectId && excludedProjectIds.includes(NO_PROJECT_ID)) return false
    if (payerIds.length > 0 && !payerIds.includes(tx.payerId)) return false
    if (appliedPersons.length > 0 && !appliedPersons.includes(tx.appliedTo)) return false
    return true
  })

  const analytics = useAnalytics({ transactions: visibleTransactions, labels, users })

  // Transactions shown in the list — filtered by active labels if any are selected
  const listTransactions = sortTransactions(
    activeLabelIds.length > 0
      ? filterTransactions(
          transactions,
          { search: '', labelIds: activeLabelIds, payerIds, appliedPersons, reviewed: 'all', projectId: undefined },
          dateRange
        ).filter((tx) => {
            if (tx.projectId && excludedProjectIds.includes(tx.projectId)) return false
            if (!tx.projectId && excludedProjectIds.includes(NO_PROJECT_ID)) return false
            return true
          })
      : visibleTransactions
  )

  function toggleProjectExclusion(projectId: string) {
    setExcludedProjectIds(
      excludedProjectIds.includes(projectId)
        ? excludedProjectIds.filter((id) => id !== projectId)
        : [...excludedProjectIds, projectId]
    )
  }

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

  const handleEditTransaction = useCallback((id: string) => {
    const tx = transactions.find((t) => t.id === id)
    if (tx && tx.amount < 0) {
      setIncomeMsg(true)
      if (incomeMsgTimer.current) clearTimeout(incomeMsgTimer.current)
      incomeMsgTimer.current = setTimeout(() => setIncomeMsg(false), 3000)
      return
    }
    setEditingId(id)
  }, [transactions])
  function closeDialog() { setEditingId(null) }

  return (
    <div className="flex flex-col min-h-screen md:min-h-0 md:h-screen">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b bg-background sticky top-0 z-20">
        <h1 className="text-lg font-bold tracking-tight">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {visibleTransactions.length} transaction{visibleTransactions.length !== 1 ? 's' : ''} this period
        </p>
      </div>

      {/* ── Unified filter bar ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b bg-background overflow-x-auto scrollbar-none">
        {/* Time period */}
        <span className="flex-shrink-0 text-xs text-muted-foreground font-medium whitespace-nowrap">Time:</span>
        {PERIOD_PRESETS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setActivePeriod({ preset: value })}
            className={cn(
              'flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap',
              activePeriod.preset === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground hover:bg-[#e2e2e2]'
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
                : 'bg-secondary text-foreground hover:bg-[#e2e2e2]'
            )}
          >
            {customLabel}
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 space-y-3" align="start">
            <div className="space-y-1.5">
              <Label className="text-xs">First date</Label>
              <Input type="date" value={dateA} onChange={(e) => setDateA(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Second date</Label>
              <Input type="date" value={dateB} onChange={(e) => setDateB(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              The earlier date becomes the start, the later becomes the end.
            </p>
            <Button size="sm" className="w-full" disabled={!dateA || !dateB} onClick={handleApplyCustom}>
              Apply
            </Button>
          </PopoverContent>
        </Popover>

        {/* Separator */}
        <div className="w-px h-4 bg-border flex-shrink-0 mx-0.5" />
        <span className="flex-shrink-0 text-xs text-muted-foreground font-medium whitespace-nowrap">Payer:</span>

        {/* Payer — All clears selection; individual options toggle */}
        <button
          type="button"
          onClick={() => setPayerIds([])}
          className={cn(
            'flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap',
            payerIds.length === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-[#e2e2e2]'
          )}
        >
          All
        </button>
        {([
          { value: users[0].id as PayerId, label: users[0].avatarEmoji },
          { value: users[1].id as PayerId, label: users[1].avatarEmoji },
          { value: 'shared'    as const,   label: `${users[0].avatarEmoji}${users[1].avatarEmoji}` },
        ] as { value: PayerId; label: string }[]).map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => togglePayerId(value)}
            className={cn(
              'flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap',
              payerIds.includes(value) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-[#e2e2e2]'
            )}
          >
            {label}
          </button>
        ))}

        {/* Separator */}
        <div className="w-px h-4 bg-border flex-shrink-0 mx-0.5" />
        <span className="flex-shrink-0 text-xs text-muted-foreground font-medium whitespace-nowrap">Applied to:</span>

        {/* Applied Person — All clears selection; individual options toggle */}
        <button
          type="button"
          onClick={() => setAppliedPersons([])}
          className={cn(
            'flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap',
            appliedPersons.length === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-[#e2e2e2]'
          )}
        >
          All
        </button>
        {([
          { value: users[0].id as UserId, label: users[0].avatarEmoji },
          { value: users[1].id as UserId, label: users[1].avatarEmoji },
          { value: 'shared'    as const,  label: `${users[0].avatarEmoji}${users[1].avatarEmoji}` },
        ] as { value: UserId | 'shared'; label: string }[]).map(({ value, label }) => (
          <button
            key={`ap-${value}`}
            type="button"
            onClick={() => toggleAppliedPerson(value)}
            className={cn(
              'flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap',
              appliedPersons.includes(value) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-[#e2e2e2]'
            )}
          >
            {label}
          </button>
        ))}

        {/* Separator + Projects dropdown (only when projects exist) */}
        {projects.length > 0 && <div className="w-px h-4 bg-border flex-shrink-0 mx-0.5" />}
        {projects.length > 0 && <span className="flex-shrink-0 text-xs text-muted-foreground font-medium whitespace-nowrap">Project:</span>}
        {projects.length > 0 && (
          <Popover>
            <PopoverTrigger
              className={cn(
                'flex-shrink-0 inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap',
                excludedProjectIds.length > 0
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground hover:bg-[#e2e2e2]'
              )}
            >
              Projects
              {excludedProjectIds.length > 0 && (
                <span className="text-[10px] font-semibold">−{excludedProjectIds.length}</span>
              )}
              <ChevronDown className="w-3 h-3" />
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2 space-y-0.5" align="end">
              <button
                type="button"
                onClick={() => setExcludedProjectIds([])}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors"
              >
                <span className="font-medium">Show all</span>
                {excludedProjectIds.length === 0 && <Check className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={() => setExcludedProjectIds([NO_PROJECT_ID, ...projects.map((p) => p.id)])}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors"
              >
                <span className="font-medium">Unselect all</span>
                {excludedProjectIds.length === projects.length + 1 && excludedProjectIds.includes(NO_PROJECT_ID) && <Check className="w-3 h-3" />}
              </button>
              <div className="border-t my-1" />
              {/* No-project sentinel — always first */}
              <button
                type="button"
                onClick={() => toggleProjectExclusion(NO_PROJECT_ID)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0 border border-dashed border-muted-foreground" />
                  <span className={excludedProjectIds.includes(NO_PROJECT_ID) ? 'text-muted-foreground line-through' : ''}>
                    No project
                  </span>
                </span>
                {!excludedProjectIds.includes(NO_PROJECT_ID) && <Check className="w-3 h-3 text-muted-foreground" />}
              </button>
              {projects.map((project) => {
                const excluded = excludedProjectIds.includes(project.id)
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => toggleProjectExclusion(project.id)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                      {project.icon && <span>{project.icon}</span>}
                      <span className={excluded ? 'text-muted-foreground line-through' : ''}>{project.name}</span>
                    </span>
                    {!excluded && <Check className="w-3 h-3 text-muted-foreground" />}
                  </button>
                )
              })}
            </PopoverContent>
          </Popover>
        )}

        {/* Clear */}
        <div className="w-px h-4 bg-border flex-shrink-0 mx-0.5" />
        <button
          type="button"
          onClick={() => {
            setActivePeriod({ preset: 'all_time' })
            setPayerIds([])
            setAppliedPersons([])
            setExcludedProjectIds([])
            setActiveLabelIds([])
          }}
          className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
        >
          Clear
        </button>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <SummaryCards
          totalSpend={analytics.totalSpend}
          spendByOwner={analytics.spendByOwner}
          spendByLabel={analytics.spendByLabel}
          avgDailySpend={analytics.avgDailySpend}
          transactionCount={visibleTransactions.length}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SpendingPieChart
            spendByLabel={analytics.spendByLabel}
            onLabelClick={handleLabelClick}
            activeLabelIds={activeLabelIds}
          />
          <CashflowChart
            transactions={visibleTransactions}
            labels={labels}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SpendingLineChart
            transactions={visibleTransactions}
            users={users}
            dateRange={dateRange}
          />
          <CumulativeSpendChart
            transactions={allTimeFilteredTransactions}
            dateRange={dateRange}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TransactionCalendar
            transactions={allTimeFilteredTransactions}
            dateRange={dateRange}
          />
          <SavingsByPersonChart
            transactions={visibleTransactions}
            users={users}
            dateRange={dateRange}
          />
        </div>

        {/* ── Inline transaction list ───────────────────────────────────── */}
        <div className="bg-card border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl overflow-hidden">
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
                {listTransactions.length}{activeLabelIds.length > 0 ? ` of ${visibleTransactions.length}` : ''}
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

      {/* ── Income-only toast ────────────────────────────────────────────── */}
      <div
        aria-live="polite"
        className={cn(
          'fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50',
          'px-4 py-2.5 rounded-lg bg-foreground text-background text-sm shadow-lg',
          'transition-all duration-300 pointer-events-none whitespace-nowrap',
          incomeMsg ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        )}
      >
        Incomes can only be edited in the {incomePageLabel} page
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
