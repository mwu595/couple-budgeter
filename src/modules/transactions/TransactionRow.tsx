'use client'

import { format, parseISO } from 'date-fns'
import { CheckCircle2 } from 'lucide-react'
import { LabelBadge } from '@/components/LabelBadge'
import { LabelPicker } from '@/components/LabelPicker'
import { ProjectPicker } from '@/components/ProjectPicker'
import { OwnerPicker } from '@/components/OwnerPicker'
import { cn } from '@/lib/utils'
import type { Transaction, Label, User, Project } from '@/core/types'
import { formatCurrency } from '@/core/utils'
import { useAppStore } from '@/core/store'

interface TransactionRowProps {
  transaction: Transaction
  labels: Label[]
  users: [User, User]
  projects: Project[]
  onEdit: (id: string) => void
  // Selection mode
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

export function TransactionRow({
  transaction,
  labels,
  users,
  projects,
  onEdit,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: TransactionRowProps) {
  const { id, date, merchant, amount, accountName, ownerId, labelIds, projectId, reviewed } = transaction

  const updateTransaction = useAppStore((s) => s.updateTransaction)

  const txLabels = labelIds
    .map((lid) => labels.find((l) => l.id === lid))
    .filter((l): l is Label => l !== undefined)

  function handleClick() {
    if (selectionMode) {
      onToggleSelect?.(id)
    } else {
      onEdit(id)
    }
  }

  const isIncome = amount < 0
  const rainbowGradient = 'linear-gradient(to right, rgba(239,68,68,0.15), rgba(249,115,22,0.15), rgba(234,179,8,0.15), rgba(34,197,94,0.15), rgba(59,130,246,0.15), rgba(139,92,246,0.15))'

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'w-full flex items-start gap-3 py-3 px-4 text-left transition-colors cursor-pointer group',
        selected ? 'bg-primary/10' : 'hover:brightness-95',
      )}
      style={isIncome && !selected ? { background: rainbowGradient } : undefined}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      aria-label={selectionMode ? `${selected ? 'Deselect' : 'Select'} ${merchant}` : `Edit transaction: ${merchant}`}
      aria-selected={selectionMode ? selected : undefined}
    >
      {/* Left: checkbox in selection mode, owner picker otherwise */}
      {selectionMode ? (
        <div className="mt-1 flex-shrink-0 flex items-center justify-center w-8 h-8">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(id)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded accent-primary cursor-pointer"
            aria-label={`Select ${merchant}`}
          />
        </div>
      ) : (
        <OwnerPicker
          users={users}
          value={ownerId}
          onChange={(newOwner) => updateTransaction(id, { ownerId: newOwner })}
          triggerClassName="mt-0.5"
        />
      )}

      {/* Main content — 2-col grid keeps rows in sync across left and right */}
      <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-x-2">
        {/* Row 1 left: merchant */}
        <span className="font-medium truncate">{merchant}</span>

        {/* Row 1 right: reviewed + amount */}
        <div className="flex items-center gap-1.5 justify-end">
          {reviewed && (
            <CheckCircle2
              className="w-4 h-4 text-green-500"
              aria-label="Reviewed"
            />
          )}
          <span
            className={cn(
              'font-semibold tabular-nums text-sm',
              amount < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
            )}
          >
            {amount < 0 ? '+' : '−'}
            {formatCurrency(Math.abs(amount))}
          </span>
        </div>

        {/* Row 2 left: date · account + labels + label picker */}
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {format(parseISO(date), 'MMM d')} · {accountName}
          </span>

          {!isIncome && txLabels.map((label) => (
            <LabelBadge key={label.id} label={label} size="xs" />
          ))}

          {!isIncome && !selectionMode && (
            <LabelPicker
              labels={labels}
              selectedIds={labelIds}
              onChange={(ids) => updateTransaction(id, { labelIds: ids })}
              triggerContent="+ add label(s)"
              triggerClassName="md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity px-1 py-0.5 text-xs text-muted-foreground"
            />
          )}
        </div>

        {/* Row 2 right: project */}
        <div className="flex items-center justify-end mt-0.5">
          {!isIncome && (selectionMode ? (
            projectId && (() => {
              const proj = projects.find((p) => p.id === projectId)
              return proj ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: proj.color }}
                    aria-hidden="true"
                  />
                  {proj.name}
                </span>
              ) : null
            })()
          ) : (
            projects.length > 0 && (
              <ProjectPicker
                projects={projects}
                selectedId={projectId}
                onChange={(pid) => updateTransaction(id, { projectId: pid })}
                placeholder={projectId ? undefined : '📁 add a project'}
                showChevron={false}
                triggerClassName={cn(
                  'text-xs text-muted-foreground hover:text-foreground transition-opacity',
                  !projectId && 'md:opacity-0 md:group-hover:opacity-100 focus:opacity-100',
                )}
              />
            )
          ))}
        </div>
      </div>
    </div>
  )
}
