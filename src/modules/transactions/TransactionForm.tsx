'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LabelBadge } from '@/components/LabelBadge'
import { LabelPicker } from '@/components/LabelPicker'
import { OwnerPicker } from '@/components/OwnerPicker'
import { AccountPicker } from '@/components/AccountPicker'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Transaction, OwnerId } from '@/core/types'
import { useAppStore, useLabels, useUsers, useAccounts } from '@/core/store'

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
  ownerId: OwnerId
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
      ownerId:     tx.ownerId,
    }
  }
  return {
    date:        format(new Date(), 'yyyy-MM-dd'),
    merchant:    '',
    amount:      '',
    accountName: '',
    notes:       '',
    reviewed:    false,
    labelIds:    [],
    ownerId:     'shared',
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
  const users             = useUsers()

  const isEditing = Boolean(transaction)

  function field<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormValues, string>> = {}
    if (!values.merchant.trim())    next.merchant    = 'Required'
    if (!values.date)               next.date        = 'Required'
    if (!values.accountName.trim()) next.accountName = 'Required'
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
      ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
    }

    if (isEditing && transaction) {
      updateTransaction(transaction.id, { ...data, labelIds: values.labelIds, ownerId: values.ownerId })
    } else {
      addTransaction({ ...data, ownerId: values.ownerId, labelIds: values.labelIds })
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
        <Label htmlFor="merchant">Merchant</Label>
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
          <Label htmlFor="amount">Amount</Label>
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
          <Label htmlFor="date">Date</Label>
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

      {/* Account */}
      <div className="space-y-1.5">
        <Label>Account</Label>
        <AccountPicker
          accounts={allAccounts}
          value={values.accountName}
          onChange={(name) => field('accountName', name)}
          hasError={Boolean(errors.accountName)}
        />
        {errors.accountName && (
          <p className="text-xs text-destructive">{errors.accountName}</p>
        )}
      </div>

      {/* Owner */}
      <div className="space-y-1.5">
        <Label>Owner</Label>
        <div className="flex items-center gap-2">
          <OwnerPicker
            users={users}
            value={values.ownerId}
            onChange={(id) => field('ownerId', id)}
            triggerClassName="border border-border"
          />
          <span className="text-sm text-muted-foreground">
            {values.ownerId === 'shared'
              ? 'Shared'
              : users.find((u) => u.id === values.ownerId)?.name}
          </span>
        </div>
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
