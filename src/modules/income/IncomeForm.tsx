'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OwnerPicker } from '@/components/OwnerPicker'
import { AccountPicker } from '@/components/AccountPicker'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Transaction, OwnerId } from '@/core/types'
import { useAppStore, useAccounts, useUsers } from '@/core/store'

interface IncomeFormProps {
  transaction?: Transaction   // undefined → new income entry
  onSuccess: () => void
  onCancel: () => void
}

type FormValues = {
  date:        string
  source:      string   // maps to transaction.merchant
  amount:      string   // positive; stored as negative
  accountName: string
  notes:       string
  ownerId:     OwnerId
  reviewed:    boolean
}

function getDefaults(tx?: Transaction): FormValues {
  if (tx) {
    return {
      date:        tx.date,
      source:      tx.merchant,
      amount:      String(Math.abs(tx.amount)),  // show positive to user
      accountName: tx.accountName,
      notes:       tx.notes ?? '',
      ownerId:     tx.ownerId,
      reviewed:    tx.reviewed,
    }
  }
  return {
    date:        format(new Date(), 'yyyy-MM-dd'),
    source:      '',
    amount:      '',
    accountName: '',
    notes:       '',
    ownerId:     'shared',
    reviewed:    false,
  }
}

export function IncomeForm({ transaction, onSuccess, onCancel }: IncomeFormProps) {
  const [values, setValues]     = useState<FormValues>(() => getDefaults(transaction))
  const [errors, setErrors]     = useState<Partial<Record<keyof FormValues, string>>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)

  const addTransaction    = useAppStore((s) => s.addTransaction)
  const updateTransaction = useAppStore((s) => s.updateTransaction)
  const deleteTransaction = useAppStore((s) => s.deleteTransaction)
  const allAccounts       = useAccounts()
  const users             = useUsers()

  const isEditing = Boolean(transaction)

  function field<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormValues, string>> = {}
    if (!values.source.trim())      next.source      = 'Required'
    if (!values.date)               next.date        = 'Required'
    if (!values.accountName.trim()) next.accountName = 'Required'
    const parsed = parseFloat(values.amount)
    if (!values.amount || isNaN(parsed) || parsed <= 0) next.amount = 'Enter a positive number'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const amount = -(parseFloat(values.amount))   // user sees positive, stored as negative

    const data = {
      date:        values.date,
      merchant:    values.source.trim(),
      amount,
      accountName: values.accountName.trim(),
      reviewed:    values.reviewed,
      ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
    }

    if (isEditing && transaction) {
      updateTransaction(transaction.id, { ...data, ownerId: values.ownerId })
    } else {
      addTransaction({ ...data, ownerId: values.ownerId, labelIds: [] })
    }
    onSuccess()
  }

  function handleConfirmDelete() {
    if (!transaction) return
    deleteTransaction(transaction.id)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1" noValidate>
      {/* Source */}
      <div className="space-y-1.5">
        <Label htmlFor="source">Source</Label>
        <Input
          id="source"
          value={values.source}
          onChange={(e) => field('source', e.target.value)}
          placeholder="e.g. Acme Corp Paycheck"
          autoFocus
        />
        {errors.source && <p className="text-xs text-destructive">{errors.source}</p>}
      </div>

      {/* Amount + Date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={values.amount}
              onChange={(e) => field('amount', e.target.value)}
              placeholder="0.00"
              className="pl-7"
            />
          </div>
          {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={values.date}
            onChange={(e) => field('date', e.target.value)}
          />
          {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
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
        {errors.accountName && <p className="text-xs text-destructive">{errors.accountName}</p>}
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
        <Label htmlFor="notes">
          Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="notes"
          value={values.notes}
          onChange={(e) => field('notes', e.target.value)}
          placeholder="Any notes..."
        />
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
            onClick={() => setConfirmOpen(true)}
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
            {isEditing ? 'Save Changes' : 'Add Income'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete income entry?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </form>
  )
}
