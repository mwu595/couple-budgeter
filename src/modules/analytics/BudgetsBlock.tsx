'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, getMonth, endOfMonth, differenceInCalendarDays } from 'date-fns'
import { Plus, ChevronDown, ChevronRight, TriangleAlert, CircleAlert, GripVertical, Pencil, Receipt } from 'lucide-react'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LabelBadge } from '@/components/LabelBadge'
import { cn } from '@/lib/utils'
import { formatCurrency, computeBudgetSpend } from '@/core/utils'
import type { Budget, BudgetPeriod, Label, Project, Transaction } from '@/core/types'
import { useAppStore } from '@/core/store'
import { BudgetForm } from './BudgetForm'

// ── Types ────────────────────────────────────────────────────────────────────

export interface BudgetsBlockProps {
  /** First day of the month being budgeted, 'YYYY-MM-01'. */
  budgetMonth: string
  /** First day of the year being budgeted, 'YYYY-01-01'. */
  budgetYear: string
  budgets: Budget[]
  labels: Label[]
  projects: Project[]
  /** Full calendar month / year, page filters (payer, for-who, project) applied. */
  monthTransactions: Transaction[]
  yearTransactions: Transaction[]
  /** Budget whose expenses the page is currently showing, if any. */
  activeBudgetId?: string | null
  /** "View expenses" on a tile — the page filters its list to that budget. */
  onViewExpenses: (budgetId: string) => void
}

type BudgetState = 'ok' | 'near' | 'over'

interface TileSource {
  kind: 'label' | 'project'
  id: string
  name: string
  color: string
  icon?: string
  total: number
}

interface TileData {
  budget: Budget
  spent: number
  pct: number          // 0–∞, un-clamped
  state: BudgetState
  /** Resolved sources, biggest spend first; labels / projects that no longer exist are dropped. */
  sources: TileSource[]
}

interface UnbudgetedEntry {
  kind: 'label' | 'project'
  id: string
  name: string
  color: string
  icon?: string
  label?: Label
  total: number
}

type DialogState =
  | { kind: 'none' }
  | { kind: 'add'; labelId?: string; projectId?: string }
  | { kind: 'edit'; budgetId: string }

const NEAR_LIMIT_PCT = 80
const LEGEND_LIMIT   = 2

function stateFor(pct: number): BudgetState {
  if (pct > 100) return 'over'
  if (pct >= NEAR_LIMIT_PCT) return 'near'
  return 'ok'
}

function buildTiles(
  budgets: Budget[],
  period: BudgetPeriod,
  transactions: Transaction[],
  labelById: Map<string, Label>,
  projectById: Map<string, Project>,
): TileData[] {
  return budgets
    .filter((b) => b.period === period)
    .map((budget) => {
      const spend = computeBudgetSpend(budget, transactions)
      const sources: TileSource[] = spend.bySource.flatMap((s): TileSource[] => {
        const entity = s.kind === 'label' ? labelById.get(s.id) : projectById.get(s.id)
        if (!entity) return []
        return [{ kind: s.kind, id: s.id, name: entity.name, color: entity.color, icon: entity.icon, total: s.total }]
      })
      // Stable sort: biggest first, definition order for ties.
      sources.sort((a, b) => b.total - a.total)
      const pct = budget.amount > 0 ? (spend.total / budget.amount) * 100 : 0
      return { budget, spent: spend.total, pct, state: stateFor(pct), sources }
    })
    .sort((a, b) => a.budget.sortOrder - b.budget.sortOrder || a.budget.name.localeCompare(b.budget.name))
}

// ── Meter ────────────────────────────────────────────────────────────────────

interface MeterProps {
  tile: TileData
  /** Bars start at 0 and grow in once the block has mounted. */
  animateIn: boolean
}

// One colour per state, never per label: a budget whose tag happens to be red
// must not read as an overspent one. Length says how much of the cap is gone,
// colour says whether that is a problem. Bands match the percent pill and the
// status line so the tile never contradicts itself.
const METER_FILL: Record<BudgetState, string> = {
  ok:   'bg-emerald-600 dark:bg-emerald-500',
  near: 'bg-amber-500',
  over: 'bg-destructive',
}

// Still one segment per label / project — the 2px gaps keep showing what the
// cap is made of — but every segment carries the state colour.
function Meter({ tile, animateIn }: MeterProps) {
  const segments = tile.sources.filter((s) => s.total > 0)
  // Under the cap a segment is its share of the cap, so the fill reads as the
  // percentage used. Over it the bar is full and segments split it by share of
  // spend, so the dividers survive the overspend.
  const basis = tile.state === 'over' ? tile.spent : tile.budget.amount
  // Fallback for the rare case where the spend counted but its source is gone
  // (a label the other member deleted, not yet synced here).
  const parts = segments.length > 0
    ? segments.map((s) => ({ key: `${s.kind}:${s.id}`, width: (s.total / basis) * 100 }))
    : [{ key: 'total', width: Math.min(tile.pct, 100) }]

  return (
    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden flex gap-0.5" aria-hidden="true">
      {parts.map((part, i) => (
        <div
          key={part.key}
          className={cn(
            'h-full transition-[width] duration-500 ease-out',
            METER_FILL[tile.state],
            i === 0 && 'rounded-l-full',
            i === parts.length - 1 && 'rounded-r-full',
          )}
          style={{ width: animateIn ? `${part.width}%` : '0%' }}
        />
      ))}
    </div>
  )
}

// ── Tile ─────────────────────────────────────────────────────────────────────

function SourceDot({ source }: { source: TileSource }) {
  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: source.color }} aria-hidden="true" />
      {source.icon && <span aria-hidden="true">{source.icon}</span>}
      <span className="truncate min-w-0">{source.name}</span>
    </span>
  )
}

interface TileProps {
  tile: TileData
  pacingHint?: string
  animateIn: boolean
  isActive: boolean
  onEdit: () => void
  onViewExpenses: () => void
}

function Tile({ tile, pacingHint, animateIn, isActive, onEdit, onViewExpenses }: TileProps) {
  const { budget, spent, pct, state, sources } = tile
  const remaining = budget.amount - spent
  const legend = sources.slice(0, LEGEND_LIMIT)
  const extra  = sources.length - legend.length

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: budget.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  // A summary-card-sized tile has no room for per-source amounts, so the full
  // breakdown rides along on the tile's tooltip.
  const breakdown = sources.length > 0
    ? sources.map((s) => `${s.name} ${formatCurrency(s.total)}`).join(' · ')
    : 'No labels or projects yet'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative h-32 bg-card border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-lg p-3 transition-shadow',
        isActive ? 'border-foreground' : 'border-border',
        isDragging && 'shadow-[rgba(0,0,0,0.16)_0px_4px_16px_0px]',
      )}
    >
      {/* The whole tile toggles the expense list. It sits *under* the content,
          which is click-through, so the grip and Edit stay reachable. */}
      <button
        type="button"
        onClick={onViewExpenses}
        aria-pressed={isActive}
        title={`${breakdown} — click to ${isActive ? 'clear' : 'view'} these expenses`}
        className="absolute inset-0 rounded-lg cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="sr-only">
          {isActive ? `Stop showing ${budget.name} expenses` : `View ${budget.name} expenses`}
        </span>
      </button>

      <div className="relative flex flex-col h-full pointer-events-none">
        {/* Handle + name + edit */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="pointer-events-auto touch-none -ml-1 flex items-center justify-center w-5 h-5 shrink-0 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing rounded"
            aria-label={`Reorder ${budget.name}`}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <p className="text-[13px] font-semibold truncate flex-1 min-w-0">{budget.name}</p>
          {isActive && <Receipt className="w-3 h-3 shrink-0" aria-hidden="true" />}
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${budget.name}`}
            className="pointer-events-auto -mr-1 flex items-center justify-center w-5 h-5 shrink-0 rounded-full text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>

        {/* Spent of cap + percent */}
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <p className="min-w-0 truncate leading-none">
            <span className={cn('text-xl font-bold tracking-tight tabular-nums', state === 'over' && 'text-destructive')}>
              {formatCurrency(spent)}
            </span>
            <span className="text-[11px] text-muted-foreground"> of {formatCurrency(budget.amount)}</span>
          </p>
          <span
            className={cn(
              'ml-auto shrink-0 text-[10px] font-semibold tabular-nums rounded-full px-1.5 py-px',
              state === 'ok'   && 'bg-secondary text-muted-foreground',
              state === 'near' && 'bg-amber-100 text-amber-800',
              state === 'over' && 'bg-destructive/10 text-destructive',
            )}
          >
            {Math.round(pct)}%
          </span>
        </div>

        <div className="mt-2">
          <Meter tile={tile} animateIn={animateIn} />
        </div>

        {/* Status line */}
        <p className="mt-2 flex items-center gap-1 min-w-0 text-[11px] tabular-nums">
          {state === 'over' ? (
            <>
              <CircleAlert className="w-3 h-3 text-destructive shrink-0" aria-hidden="true" />
              <span className="min-w-0 text-destructive font-medium truncate">Over by {formatCurrency(-remaining)}</span>
            </>
          ) : state === 'near' ? (
            <>
              <TriangleAlert className="w-3 h-3 text-amber-600 shrink-0" aria-hidden="true" />
              <span className="min-w-0 text-amber-700 font-medium truncate">{formatCurrency(remaining)} left</span>
            </>
          ) : (
            <span className="min-w-0 text-muted-foreground truncate">{formatCurrency(remaining)} left</span>
          )}
          {pacingHint && state !== 'over' && (
            <span className="text-muted-foreground shrink-0">· {pacingHint}</span>
          )}
        </p>

        {/* Sources — one line, pinned to the bottom so every tile lines up */}
        <div className="mt-auto flex items-center gap-2 overflow-hidden whitespace-nowrap text-[10px] text-muted-foreground">
          {sources.length === 0 ? (
            <span className="text-amber-700 truncate">No labels or projects</span>
          ) : (
            <>
              {legend.map((s) => (
                <SourceDot key={`${s.kind}:${s.id}`} source={s} />
              ))}
              {extra > 0 && <span className="shrink-0">+{extra}</span>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Group (Monthly · September 2026 / Yearly · 2026) ─────────────────────────

interface GroupProps {
  period: BudgetPeriod
  title: string
  periodLabel: string
  tiles: TileData[]
  pacingHint?: string
  animateIn: boolean
  activeBudgetId?: string | null
  onEdit: (tile: TileData) => void
  onViewExpenses: (tile: TileData) => void
}

// Each cadence is its own DnD context, so a monthly tile can't be dropped
// among the yearly ones.
function Group({ period, title, periodLabel, tiles, pacingHint, animateIn, activeBudgetId, onEdit, onViewExpenses }: GroupProps) {
  const reorderBudgets = useAppStore((s) => s.reorderBudgets)

  // PointerSensor with a small distance threshold keeps a plain click on the
  // handle from starting a drag; TouchSensor with a delay leaves room to
  // scroll the page on mobile without a tile latching to the finger.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tiles.findIndex((t) => t.budget.id === active.id)
    const newIndex = tiles.findIndex((t) => t.budget.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    void reorderBudgets(arrayMove(tiles, oldIndex, newIndex).map((t) => t.budget.id))
  }

  return (
    <div>
      <p className="text-xs font-medium mb-2">
        {title} <span className="text-muted-foreground font-normal">· {periodLabel}</span>
      </p>
      <DndContext id={`budgets-${period}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tiles.map((t) => t.budget.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {tiles.map((tile) => (
              <Tile
                key={tile.budget.id}
                tile={tile}
                pacingHint={pacingHint}
                animateIn={animateIn}
                isActive={tile.budget.id === activeBudgetId}
                onEdit={() => onEdit(tile)}
                onViewExpenses={() => onViewExpenses(tile)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function BudgetsBlock({
  budgetMonth,
  budgetYear,
  budgets,
  labels,
  projects,
  monthTransactions,
  yearTransactions,
  activeBudgetId,
  onViewExpenses,
}: BudgetsBlockProps) {
  const monthLabel = format(parseISO(budgetMonth), 'MMMM yyyy')
  const monthShort = format(parseISO(budgetMonth), 'MMMM')
  const yearLabel  = format(parseISO(budgetYear), 'yyyy')

  const [dialog, setDialog]                 = useState<DialogState>({ kind: 'none' })
  const [showUnbudgeted, setShowUnbudgeted] = useState(false)
  const [mounted, setMounted]               = useState(false)

  // Defer to the next frame so the first paint is at 0% and the transition runs.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const labelById   = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels])
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const monthTiles = useMemo(
    () => buildTiles(budgets, 'month', monthTransactions, labelById, projectById),
    [budgets, monthTransactions, labelById, projectById],
  )
  const yearTiles = useMemo(
    () => buildTiles(budgets, 'year', yearTransactions, labelById, projectById),
    [budgets, yearTransactions, labelById, projectById],
  )

  // Labels and projects with spend this month that no budget covers — the
  // nudge that turns a chart into a habit. A label counts as covered if it
  // appears in any budget at either cadence.
  const unbudgeted = useMemo<UnbudgetedEntry[]>(() => {
    const coveredLabels   = new Set(budgets.flatMap((b) => b.labelIds))
    const coveredProjects = new Set(budgets.flatMap((b) => b.projectIds))
    const labelTotals   = new Map<string, number>()
    const projectTotals = new Map<string, number>()
    for (const tx of monthTransactions) {
      if (tx.amount <= 0) continue
      for (const lid of tx.labelIds) labelTotals.set(lid, (labelTotals.get(lid) ?? 0) + tx.amount)
      if (tx.projectId) projectTotals.set(tx.projectId, (projectTotals.get(tx.projectId) ?? 0) + tx.amount)
    }
    const entries: UnbudgetedEntry[] = []
    for (const label of labels) {
      const total = labelTotals.get(label.id) ?? 0
      if (total > 0 && !coveredLabels.has(label.id)) {
        entries.push({ kind: 'label', id: label.id, name: label.name, color: label.color, icon: label.icon, label, total })
      }
    }
    for (const project of projects) {
      const total = projectTotals.get(project.id) ?? 0
      if (total > 0 && !coveredProjects.has(project.id)) {
        entries.push({ kind: 'project', id: project.id, name: project.name, color: project.color, icon: project.icon, total })
      }
    }
    return entries.sort((a, b) => b.total - a.total)
  }, [budgets, labels, projects, monthTransactions])

  const hasTiles = monthTiles.length > 0 || yearTiles.length > 0
  const canAdd   = labels.length > 0 || projects.length > 0

  // Pacing context, only meaningful when the period in view is the current one.
  const today = new Date()
  const monthsLeftHint = (() => {
    if (budgetYear !== format(today, 'yyyy-01-01')) return undefined
    const left = 11 - getMonth(today)
    return left > 0 ? `${left} month${left === 1 ? '' : 's'} left` : 'final month'
  })()
  const daysLeftHint = (() => {
    if (budgetMonth !== format(today, 'yyyy-MM-01')) return undefined
    const left = differenceInCalendarDays(endOfMonth(today), today)
    return left > 0 ? `${left} day${left === 1 ? '' : 's'} left` : 'last day'
  })()

  const closeDialog = () => setDialog({ kind: 'none' })
  const editingBudget = dialog.kind === 'edit' ? budgets.find((b) => b.id === dialog.budgetId) : undefined

  const formShared = {
    monthStart: budgetMonth,
    yearStart: budgetYear,
    labels,
    projects,
    monthTransactions,
    yearTransactions,
    onSuccess: closeDialog,
    onCancel: closeDialog,
  }

  return (
    <div className="bg-card border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl p-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Budgets</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDialog({ kind: 'add' })}
          disabled={!canAdd}
          className="shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Set budget
        </Button>
      </div>

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {!hasTiles && (
        <div className="py-8 flex flex-col items-center text-center gap-3">
          <div>
            <p className="text-sm font-medium">No budgets yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Cap a label, or group labels and projects — Flights, Hotels and the Japan trip — under one number.
            </p>
          </div>

          {!canAdd ? (
            <p className="text-xs text-muted-foreground">
              Create a label on the{' '}
              <Link href="/tags" className="underline underline-offset-2 hover:text-foreground">Tags page</Link>
              {' '}to start budgeting.
            </p>
          ) : unbudgeted.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
              <span>Biggest this month:</span>
              {unbudgeted.slice(0, 3).map((entry) => (
                <button
                  key={`${entry.kind}:${entry.id}`}
                  type="button"
                  onClick={() => setDialog(
                    entry.kind === 'label'
                      ? { kind: 'add', labelId: entry.id }
                      : { kind: 'add', projectId: entry.id },
                  )}
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 hover:bg-muted transition-colors tabular-nums"
                  title={`Set a budget for ${entry.name}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-foreground">{entry.name}</span>
                  <span>{formatCurrency(entry.total)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nothing spent yet in {monthShort} — budgets can be set ahead of time.
            </p>
          )}

          {canAdd && (
            <Button size="sm" onClick={() => setDialog({ kind: 'add' })} className="mt-1">
              Set your first budget
            </Button>
          )}
        </div>
      )}

      {/* ── Groups — each renders only when it has tiles ───────────────── */}
      {hasTiles && (
        <div className="mt-4 space-y-4">
          {monthTiles.length > 0 && (
            <Group
              period="month"
              title="Monthly"
              periodLabel={monthLabel}
              tiles={monthTiles}
              pacingHint={daysLeftHint}
              animateIn={mounted}
              activeBudgetId={activeBudgetId}
              onEdit={(tile) => setDialog({ kind: 'edit', budgetId: tile.budget.id })}
              onViewExpenses={(tile) => onViewExpenses(tile.budget.id)}
            />
          )}
          {yearTiles.length > 0 && (
            <Group
              period="year"
              title="Yearly"
              periodLabel={yearLabel}
              tiles={yearTiles}
              pacingHint={monthsLeftHint}
              animateIn={mounted}
              activeBudgetId={activeBudgetId}
              onEdit={(tile) => setDialog({ kind: 'edit', budgetId: tile.budget.id })}
              onViewExpenses={(tile) => onViewExpenses(tile.budget.id)}
            />
          )}
        </div>
      )}

      {/* ── Spend with no budget ───────────────────────────────────────── */}
      {hasTiles && unbudgeted.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => setShowUnbudgeted((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-expanded={showUnbudgeted}
          >
            {showUnbudgeted ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Not in any budget this month ({unbudgeted.length})
          </button>

          {showUnbudgeted && (
            <div className="mt-2 -mx-2 divide-y divide-border/60">
              {unbudgeted.map((entry) => (
                <div key={`${entry.kind}:${entry.id}`} className="flex items-center gap-3 px-2 py-2">
                  <div className="flex-1 min-w-0 sm:flex-none sm:w-44 flex items-center">
                    {entry.label ? (
                      <LabelBadge label={entry.label} />
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                        {entry.icon && <span aria-hidden="true">{entry.icon}</span>}
                        <span className="truncate">{entry.name}</span>
                        <span className="text-muted-foreground shrink-0">· project</span>
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0 sm:flex-1">
                    {formatCurrency(entry.total)} in {monthShort}
                  </span>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => setDialog(
                      entry.kind === 'label'
                        ? { kind: 'add', labelId: entry.id }
                        : { kind: 'add', projectId: entry.id },
                    )}
                    className="shrink-0"
                  >
                    Set budget
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Add / edit dialog ──────────────────────────────────────────── */}
      <Dialog open={dialog.kind !== 'none'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBudget ? `Edit ${editingBudget.name}` : 'New budget'}</DialogTitle>
          </DialogHeader>
          {dialog.kind === 'add' && (
            <BudgetForm
              {...formShared}
              initialLabelId={dialog.labelId}
              initialProjectId={dialog.projectId}
            />
          )}
          {dialog.kind === 'edit' && editingBudget && (
            <BudgetForm {...formShared} budget={editingBudget} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
