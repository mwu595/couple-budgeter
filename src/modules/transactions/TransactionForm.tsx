'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LabelBadge } from '@/components/LabelBadge'
import { LabelPicker } from '@/components/LabelPicker'
import { AccountPicker } from '@/components/AccountPicker'
import { ProjectPicker } from '@/components/ProjectPicker'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Transaction, PayerId, UserId } from '@/core/types'
import { useAppStore, useLabels, useUsers, useAccounts, useProjects } from '@/core/store'
import { cn } from '@/lib/utils'

interface TransactionFormProps {
  transaction?: Transaction  // undefined → new transaction
  onSuccess: () => void
  onCancel: () => void
}

type FormValues = {
  date: string
  merchant: string
  amount: string
  accountName: string
  notes: string
  reviewed: boolean
  labelIds: string[]
  payerId: PayerId | ''
  forPersonId: UserId | 'shared' | ''  // '' = unset; 'shared' → isPersonal: false; UserId → isPersonal: true
  projectId: string | undefined
}

function getDefaults(tx?: Transaction): FormValues {
  if (tx) {
    return {
      date:        tx.date,
      merchant:    tx.merchant,
      amount:      String(tx.amount),
      accountName: tx.accountName,
      notes:       tx.notes ?? '',
      reviewed:    tx.reviewed,
      labelIds:    tx.labelIds,
      payerId:     tx.payerId,
      forPersonId: tx.appliedTo,
      projectId:   tx.projectId,
    }
  }
  return {
    date:        '',
    merchant:    '',
    amount:      '',
    accountName: '',
    notes:       '',
    reviewed:    false,
    labelIds:    [],
    payerId:     '',
    forPersonId: '',
    projectId:   undefined,
  }
}

export function TransactionForm({ transaction, onSuccess, onCancel }: TransactionFormProps) {
  const [values, setValues] = useState<FormValues>(() => getDefaults(transaction))
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Individual stable selectors — no new object per render
  const addTransaction    = useAppStore((s) => s.addTransaction)
  const updateTransaction = useAppStore((s) => s.updateTransaction)
  const deleteTransaction = useAppStore((s) => s.deleteTransaction)
  const allLabels         = useLabels()
  const allAccounts       = useAccounts()
  const allProjects       = useProjects()
  const users             = useUsers()

  const isEditing = Boolean(transaction)

  function field<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormValues, string>> = {}
    if (!values.merchant.trim()) next.merchant    = 'Required'
    if (!values.date)            next.date        = 'Required'
    if (!values.payerId)         next.payerId     = 'Required'
    if (!values.forPersonId)        next.forPersonId = 'Required'
    const parsed = parseFloat(values.amount)
    if (!values.amount || isNaN(parsed)) next.amount = 'Enter a valid number'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const amount = parseFloat(values.amount)
    const data = {
      date:        values.date,
      merchant:    values.merchant.trim(),
      amount,
      accountName: values.accountName.trim(),
      reviewed:    values.reviewed,
      projectId:   values.projectId,
      ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
    }

    const payerId = values.payerId as PayerId
    const appliedTo = values.forPersonId as UserId | 'shared'
    if (isEditing && transaction) {
      updateTransaction(transaction.id, { ...data, labelIds: values.labelIds, payerId, appliedTo })
    } else {
      addTransaction({ ...data, payerId, appliedTo, labelIds: values.labelIds })
    }
    onSuccess()
  }

  function handleDelete() {
    setConfirmOpen(true)
  }

  function handleConfirmDelete() {
    if (!transaction) return
    deleteTransaction(transaction.id)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1" noValidate>
      {/* Merchant */}
      <div className="space-y-1.5">
        <Label htmlFor="merchant">Merchant <span className="text-destructive">*</span></Label>
        <Input
          id="merchant"
          value={values.merchant}
          onChange={(e) => field('merchant', e.target.value)}
          placeholder="e.g. Whole Foods"
          autoFocus
        />
        {errors.merchant && (
          <p className="text-xs text-destructive">{errors.merchant}</p>
        )}
      </div>

      {/* Amount + Date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount <span className="text-destructive">*</span></Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={values.amount}
            onChange={(e) => field('amount', e.target.value)}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
          <Input
            id="date"
            type="date"
            value={values.date}
            onChange={(e) => field('date', e.target.value)}
          />
          {errors.date && (
            <p className="text-xs text-destructive">{errors.date}</p>
          )}
        </div>
      </div>

      {/* Who pays + For — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Who Pays <span className="text-destructive">*</span></Label>
          <div className="flex gap-2 flex-wrap">
            {([
              { id: users[0].id, emoji: users[0].avatarEmoji },
              { id: users[1].id, emoji: users[1].avatarEmoji },
              { id: 'shared',    emoji: `${users[0].avatarEmoji}${users[1].avatarEmoji}` },
            ] as { id: PayerId; emoji: string }[]).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => field('payerId', opt.id)}
                className={cn(
                  'flex items-center px-3 py-1.5 rounded-full border text-sm transition-colors',
                  values.payerId === opt.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
                )}
              >
                {opt.emoji}
              </button>
            ))}
          </div>
          {errors.payerId && <p className="text-xs text-destructive">{errors.payerId}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>For Who <span className="text-destructive">*</span></Label>
          <div className="flex gap-2 flex-wrap">
            {([
              { id: users[0].id, emoji: users[0].avatarEmoji },
              { id: users[1].id, emoji: users[1].avatarEmoji },
              { id: 'shared',    emoji: `${users[0].avatarEmoji}${users[1].avatarEmoji}` },
            ] as { id: UserId | 'shared'; emoji: string }[]).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => field('forPersonId', opt.id)}
                className={cn(
                  'flex items-center px-3 py-1.5 rounded-full border text-sm transition-colors',
                  values.forPersonId === opt.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
                )}
              >
                {opt.emoji}
              </button>
            ))}
          </div>
          {errors.forPersonId && <p className="text-xs text-destructive">{errors.forPersonId}</p>}
        </div>
      </div>

      {/* Account */}
      <div className="space-y-1.5">
        <Label>Account <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <AccountPicker
          accounts={allAccounts}
          value={values.accountName}
          onChange={(name) => field('accountName', name)}
          hasError={Boolean(errors.accountName)}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input
          id="notes"
          value={values.notes}
          onChange={(e) => field('notes', e.target.value)}
          placeholder="Any notes..."
        />
      </div>

      {/* Labels */}
      <div className="space-y-1.5">
        <Label>Labels <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <div className="flex items-center flex-wrap gap-1.5 min-h-[28px]">
          {values.labelIds
            .map((lid) => allLabels.find((l) => l.id === lid))
            .filter((l): l is NonNullable<typeof l> => l !== undefined)
            .map((label) => (
              <LabelBadge
                key={label.id}
                label={label}
                onRemove={() => field('labelIds', values.labelIds.filter((id) => id !== label.id))}
              />
            ))}
          <LabelPicker
            labels={allLabels}
            selectedIds={values.labelIds}
            onChange={(ids) => field('labelIds', ids)}
            triggerContent="+ Add label"
            triggerClassName="border border-dashed border-border rounded-full px-2 py-0.5"
          />
        </div>
      </div>

      {/* Project */}
      {allProjects.length > 0 && (
        <div className="space-y-1.5">
          <Label>Project <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <ProjectPicker
            projects={allProjects}
            selectedId={values.projectId}
            onChange={(id) => field('projectId', id)}
            placeholder="Select project…"
            triggerClassName="w-full flex items-center justify-between text-sm px-3 py-2 rounded-md border border-foreground bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      {/* Reviewed */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="reviewed"
          checked={values.reviewed}
          onChange={(e) => field('reviewed', e.target.checked)}
          className="w-4 h-4 rounded accent-primary"
        />
        <Label htmlFor="reviewed" className="font-normal cursor-pointer select-none">
          Mark as reviewed
        </Label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        {isEditing ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete
          </Button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            {isEditing ? 'Save Changes' : 'Add Transaction'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete transaction?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </form>
  )
}
