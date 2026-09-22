'use client'

import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label as FieldLabel } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'
import { formatCurrency, computeBudgetSpend } from '@/core/utils'
import type { Budget, BudgetPeriod, Label, Project, Transaction } from '@/core/types'
import { useAppStore } from '@/core/store'

// Positive number with at most two decimals. `numeric(12,2)` would round
// silently; we'd rather the user see what they typed is what gets saved.
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
  { value: 'month', label: 'Monthly' },
  { value: 'year',  label: 'Yearly' },
]

interface BudgetFormProps {
  monthStart: string                     // 'YYYY-MM-01'
  yearStart: string                      // 'YYYY-01-01'
  labels: Label[]
  projects: Project[]
  /** Full calendar month / year, page filters applied — for "spent so far". */
  monthTransactions: Transaction[]
  yearTransactions: Transaction[]
  /** Editing an existing budget → everything pre-filled, Remove available. */
  budget?: Budget
  /** Pre-select a source when opened from a "Set budget" affordance. */
  initialLabelId?: string
  initialProjectId?: string
  onSuccess: () => void
  onCancel: () => void
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

export function BudgetForm({
  monthStart,
  yearStart,
  labels,
  projects,
  monthTransactions,
  yearTransactions,
  budget,
  initialLabelId,
  initialProjectId,
  onSuccess,
  onCancel,
}: BudgetFormProps) {
  const isEditing = Boolean(budget)

  const [name, setName]             = useState(budget?.name ?? '')
  const [period, setPeriod]         = useState<BudgetPeriod>(budget?.period ?? 'month')
  const [amount, setAmount]         = useState(budget ? String(budget.amount) : '')
  const [labelIds, setLabelIds]     = useState<string[]>(
    budget?.labelIds ?? (initialLabelId ? [initialLabelId] : []),
  )
  const [projectIds, setProjectIds] = useState<string[]>(
    budget?.projectIds ?? (initialProjectId ? [initialProjectId] : []),
  )
  const [nameError, setNameError]     = useState('')
  const [amountError, setAmountError] = useState('')
  const [sourceError, setSourceError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const addBudget    = useAppStore((s) => s.addBudget)
  const updateBudget = useAppStore((s) => s.updateBudget)
  const deleteBudget = useAppStore((s) => s.deleteBudget)

  const periodLabel = period === 'month'
    ? format(parseISO(monthStart), 'MMMM yyyy')
    : format(parseISO(yearStart), 'yyyy')

  // A single-source budget rarely needs its own name — the placeholder shows
  // what it will be called if the field is left blank.
  const suggestedName =
    labels.find((l) => l.id === labelIds[0])?.name ??
    projects.find((p) => p.id === projectIds[0])?.name ??
    ''

  const hasSources = labelIds.length > 0 || projectIds.length > 0

  // Live preview of what this cap would be at right now.
  const spentSoFar = useMemo(() => {
    if (!hasSources) return null
    const draft: Budget = { id: 'draft', name: '', period, amount: 0, labelIds, projectIds, sortOrder: 0 }
    return computeBudgetSpend(draft, period === 'month' ? monthTransactions : yearTransactions).total
  }, [hasSources, period, labelIds, projectIds, monthTransactions, yearTransactions])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    let valid = true

    const finalName = name.trim() || suggestedName
    if (!finalName) { setNameError('Give it a name'); valid = false }
    else setNameError('')

    const trimmed = amount.trim()
    if (!AMOUNT_RE.test(trimmed) || Number(trimmed) <= 0) {
      setAmountError('Enter a positive amount with up to 2 decimals')
      valid = false
    } else {
      setAmountError('')
    }

    if (!hasSources) { setSourceError('Pick at least one label or project'); valid = false }
    else setSourceError('')

    if (!valid) return

    const data: Omit<Budget, 'id' | 'sortOrder'> = {
      name: finalName,
      period,
      amount: Number(trimmed),
      labelIds,
      projectIds,
    }

    if (isEditing && budget) {
      void updateBudget(budget.id, data)
    } else {
      void addBudget(data)
    }
    onSuccess()
  }

  function handleConfirmDelete() {
    if (!budget) return
    void deleteBudget(budget.id)
    onSuccess()
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 pt-1" noValidate>
        {/* Name */}
        <div className="space-y-1.5">
          <FieldLabel htmlFor="budget-name">Name</FieldLabel>
          <Input
            id="budget-name"
            value={name}
            onChange={(e) => { setName(e.target.value); if (nameError) setNameError('') }}
            placeholder={suggestedName || 'e.g. Travel'}
            aria-invalid={nameError ? true : undefined}
          />
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
        </div>

        {/* Cadence + amount */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-[auto_1fr] gap-3 items-end">
            <div className="space-y-1.5">
              <FieldLabel>Cadence</FieldLabel>
              <div className="flex gap-1.5">
                {PERIOD_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPeriod(value)}
                    className={cn(
                      'h-9 text-xs px-3 rounded-full font-medium transition-colors',
                      period === value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground hover:bg-[#e2e2e2]',
                    )}
                    aria-pressed={period === value}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel htmlFor="budget-amount">
                {period === 'month' ? 'Cap per month' : 'Cap per year'}
              </FieldLabel>
              <Input
                id="budget-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); if (amountError) setAmountError('') }}
                placeholder={period === 'month' ? 'e.g. 500' : 'e.g. 10000'}
                autoFocus
                aria-invalid={amountError ? true : undefined}
              />
            </div>
          </div>
          {amountError ? (
            <p className="text-xs text-destructive">{amountError}</p>
          ) : spentSoFar !== null ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              Spent so far in {periodLabel}: {formatCurrency(spentSoFar)}
            </p>
          ) : null}
        </div>

        {/* Sources */}
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <FieldLabel>
              Labels{' '}
              <span className="text-muted-foreground font-normal">— spend tagged with any of these</span>
            </FieldLabel>
            {labels.length === 0 ? (
              <p className="text-xs text-muted-foreground">No labels yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {labels.map((label) => {
                  const selected = labelIds.includes(label.id)
                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => { setLabelIds((prev) => toggle(prev, label.id)); if (sourceError) setSourceError('') }}
                      className={cn(
                        'inline-flex items-center gap-1 text-xs rounded-full border px-2 py-0.5 transition-all',
                        selected ? 'ring-2 ring-offset-1' : 'opacity-70 hover:opacity-100',
                      )}
                      style={
                        {
                          backgroundColor: `${label.color}20`,
                          color: label.color,
                          borderColor: `${label.color}40`,
                          '--tw-ring-color': selected ? label.color : undefined,
                        } as React.CSSProperties
                      }
                      aria-pressed={selected}
                    >
                      {selected && <Check className="w-2.5 h-2.5" />}
                      {label.icon && <span aria-hidden="true">{label.icon}</span>}
                      {label.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <FieldLabel>
              Projects{' '}
              <span className="text-muted-foreground font-normal">— everything filed under these</span>
            </FieldLabel>
            {projects.length === 0 ? (
              <p className="text-xs text-muted-foreground">No projects yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {projects.map((project) => {
                  const selected = projectIds.includes(project.id)
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => { setProjectIds((prev) => toggle(prev, project.id)); if (sourceError) setSourceError('') }}
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 font-medium transition-colors',
                        selected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-foreground hover:bg-[#e2e2e2]',
                      )}
                      aria-pressed={selected}
                    >
                      {selected ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: project.color }}
                          aria-hidden="true"
                        />
                      )}
                      {project.icon && <span aria-hidden="true">{project.icon}</span>}
                      {project.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {sourceError && <p className="text-xs text-destructive">{sourceError}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          {isEditing ? (
            <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Remove
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              {isEditing ? 'Save' : 'Create budget'}
            </Button>
          </div>
        </div>
      </form>

      {budget && (
        <ConfirmDialog
          open={confirmOpen}
          title={`Remove "${budget.name}"?`}
          description="Only the cap goes away — your labels, projects and transactions are untouched."
          confirmLabel="Remove"
          destructive
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  )
}
