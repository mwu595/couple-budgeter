'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { RecurringIncome, RecurringFrequency, User } from '@/core/types'
import { formatCurrency } from '@/core/utils'
import { RecurringIncomeForm } from './RecurringIncomeForm'

interface RecurringIncomeManagerProps {
  recurringIncomes: RecurringIncome[]
  users: [User, User]
  onAdd:    (data: Omit<RecurringIncome, 'id' | 'createdAt'>) => void
  onUpdate: (id: string, data: Omit<RecurringIncome, 'id' | 'createdAt'>) => void
  onDelete: (id: string) => void
}

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly:       'Weekly',
  biweekly:     'Bi-weekly',
  semimonthly:  'Semi-monthly',
  monthly:      'Monthly',
}

export function RecurringIncomeManager({
  recurringIncomes,
  users,
  onAdd,
  onUpdate,
  onDelete,
}: RecurringIncomeManagerProps) {
  const [formOpen, setFormOpen]       = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  const editingItem = editingId
    ? recurringIncomes.find((r) => r.id === editingId)
    : undefined

  function openAdd() {
    setEditingId(null)
    setFormOpen(true)
  }

  function openEdit(id: string) {
    setEditingId(id)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
  }

  function handleFormSuccess(data: Omit<RecurringIncome, 'id' | 'createdAt'>) {
    if (editingId) {
      onUpdate(editingId, data)
    } else {
      onAdd(data)
    }
    closeForm()
  }

  function handleConfirmDelete() {
    if (deletingId) onDelete(deletingId)
    setDeletingId(null)
  }

  function ownerLabel(ri: RecurringIncome): string {
    if (ri.ownerId === 'shared') return 'Shared'
    return users.find((u) => u.id === ri.ownerId)?.name ?? ri.ownerId
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {recurringIncomes.length} recurring income{recurringIncomes.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add recurring
        </Button>
      </div>

      {/* Tile grid */}
      {recurringIncomes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recurringIncomes.map((ri) => (
            <div
              key={ri.id}
              className="bg-background ring-1 ring-border rounded-xl p-4 flex flex-col gap-3"
            >
              {/* Top: name + amount */}
              <div>
                <p className="font-semibold text-sm leading-snug">{ri.name}</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg tabular-nums mt-0.5">
                  +{formatCurrency(ri.amount)}
                </p>
              </div>

              {/* Meta */}
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Frequency</span>
                  <span className="text-foreground font-medium">{FREQUENCY_LABELS[ri.frequency]}</span>
                </div>
                <div className="flex justify-between">
                  <span>Next on</span>
                  <span className="text-foreground font-medium">
                    {format(parseISO(ri.nextDate), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Account</span>
                  <span className="text-foreground font-medium truncate max-w-[120px]">{ri.accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Owner</span>
                  <span className="text-foreground font-medium">{ownerLabel(ri)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-border/60">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => openEdit(ri.id)}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeletingId(ri.id)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Recurring Income' : 'Add Recurring Income'}
            </DialogTitle>
          </DialogHeader>
          <RecurringIncomeForm
            recurringIncome={editingItem}
            onSuccess={handleFormSuccess}
            onCancel={closeForm}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deletingId !== null}
        title="Stop recurring income?"
        description="Future entries will no longer be created. Past income entries are kept."
        confirmLabel="Stop"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  )
}
