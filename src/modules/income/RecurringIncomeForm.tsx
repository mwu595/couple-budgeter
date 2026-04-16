'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PayerPicker } from '@/components/PayerPicker'
import { AccountPicker } from '@/components/AccountPicker'
import { cn } from '@/lib/utils'
import type { RecurringIncome, RecurringFrequency, PayerId } from '@/core/types'
import { useAccounts, useUsers } from '@/core/store'

interface RecurringIncomeFormProps {
  recurringIncome?: RecurringIncome  // undefined → new
  onSuccess: (values: Omit<RecurringIncome, 'id' | 'createdAt'>) => void
  onCancel: () => void
}

type FormValues = {
  name:        string
  amount:      string   // positive number, user-facing
  frequency:   RecurringFrequency
  startDate:   string
  accountName: string
  notes:       string
  payerId:     PayerId
}

const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'weekly',      label: 'Weekly' },
  { value: 'biweekly',   label: 'Bi-weekly' },
  { value: 'semimonthly', label: 'Semi-monthly (1st & 15th)' },
  { value: 'monthly',    label: 'Monthly' },
]

function getDefaults(ri?: RecurringIncome): FormValues {
  if (ri) {
    return {
      name:        ri.name,
      amount:      String(ri.amount),
      frequency:   ri.frequency,
      startDate:   ri.startDate,
      accountName: ri.accountName,
      notes:       ri.notes ?? '',
      payerId:     ri.payerId,
    }
  }
  return {
    name:        '',
    amount:      '',
    frequency:   'biweekly',
    startDate:   format(new Date(), 'yyyy-MM-dd'),
    accountName: '',
    notes:       '',
    payerId:     'shared',
  }
}

export function RecurringIncomeForm({ recurringIncome, onSuccess, onCancel }: RecurringIncomeFormProps) {
  const [values, setValues] = useState<FormValues>(() => getDefaults(recurringIncome))
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({})

  const allAccounts = useAccounts()
  const users       = useUsers()

  function field<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormValues, string>> = {}
    if (!values.name.trim())        next.name        = 'Required'
    if (!values.accountName.trim()) next.accountName = 'Required'
    if (!values.startDate)          next.startDate   = 'Required'
    const parsed = parseFloat(values.amount)
    if (!values.amount || isNaN(parsed) || parsed <= 0) next.amount = 'Enter a positive number'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const amount = parseFloat(values.amount)

    onSuccess({
      name:        values.name.trim(),
      amount,
      frequency:   values.frequency,
      startDate:   values.startDate,
      // nextDate stays as the existing nextDate on edit; set to startDate on create
      nextDate:    recurringIncome?.nextDate ?? values.startDate,
      accountName: values.accountName.trim(),
      notes:       values.notes.trim() || undefined,
      payerId:     values.payerId,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1" noValidate>
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="ri-name">Name</Label>
        <Input
          id="ri-name"
          value={values.name}
          onChange={(e) => field('name', e.target.value)}
          placeholder="e.g. Company Paycheck"
          autoFocus
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      {/* Amount + Frequency */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ri-amount">Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              id="ri-amount"
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
          <Label htmlFor="ri-start">First date</Label>
          <Input
            id="ri-start"
            type="date"
            value={values.startDate}
            onChange={(e) => field('startDate', e.target.value)}
          />
          {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
        </div>
      </div>

      {/* Frequency pills */}
      <div className="space-y-1.5">
        <Label>Frequency</Label>
        <div className="flex flex-wrap gap-2">
          {FREQUENCY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => field('frequency', value)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border transition-colors',
                values.frequency === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
              )}
            >
              {label}
            </button>
          ))}
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

      {/* Earner */}
      <div className="space-y-1.5">
        <Label>Earner</Label>
        <div className="flex items-center gap-2">
          <PayerPicker
            users={users}
            value={values.payerId}
            onChange={(id) => field('payerId', id)}
            triggerClassName="border border-border"
          />
          <span className="text-sm text-muted-foreground">
            {values.payerId === 'shared'
              ? 'Shared'
              : users.find((u) => u.id === values.payerId)?.name}
          </span>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="ri-notes">
          Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="ri-notes"
          value={values.notes}
          onChange={(e) => field('notes', e.target.value)}
          placeholder="Any notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          {recurringIncome ? 'Save Changes' : 'Add Recurring Income'}
        </Button>
      </div>
    </form>
  )
}
