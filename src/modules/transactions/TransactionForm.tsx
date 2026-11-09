'use client'

import { useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LabelBadge } from '@/components/LabelBadge'
import { LabelPicker } from '@/components/LabelPicker'
import { AccountPicker } from '@/components/AccountPicker'
import { ProjectPicker } from '@/components/ProjectPicker'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Transaction, PayerId, UserId, CurrencyCode } from '@/core/types'
import { useAppStore, useLabels, useUsers, useAccounts, useProjects } from '@/core/store'
import {
  BASE_CURRENCY,
  PINNED_CURRENCIES,
  OTHER_CURRENCIES,
  currencyName,
  currencySymbol,
  formatCurrency,
  toUsd,
} from '@/core/utils'
import { cn } from '@/lib/utils'

interface TransactionFormProps {
  transaction?: Transaction  // undefined → new transaction
  onSuccess: () => void
  onCancel: () => void
}

// Hides the browser's up/down stepper on number inputs.
const NO_SPINNER =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

// market = fetched for the expense date · manual = typed by the user (never
// overwritten by a fetch) · locked = the rate an existing expense was saved with
type RateSource = 'market' | 'manual' | 'locked'
type RateStatus = 'idle' | 'loading' | 'error'

type FormValues = {
  date: string
  merchant: string
  amount: string        // in `currency` — the amount actually paid
  currency: CurrencyCode
  rate: string          // units of `currency` per 1 USD; '' for USD
  rateSource: RateSource
  rateDate: string      // date the market rate was published for ('' otherwise)
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
    const foreign = tx.currency !== undefined && tx.currency !== BASE_CURRENCY
    return {
      date:        tx.date,
      merchant:    tx.merchant,
      amount:      String(foreign ? tx.originalAmount ?? tx.amount : tx.amount),
      currency:    foreign && tx.currency ? tx.currency : BASE_CURRENCY,
      rate:        foreign && tx.exchangeRate ? String(tx.exchangeRate) : '',
      rateSource:  foreign && tx.exchangeRate ? 'locked' : 'manual',
      rateDate:    '',
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
    currency:    BASE_CURRENCY,   // new expenses always start in USD
    rate:        '',
    rateSource:  'market',
    rateDate:    '',
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
  const [rateStatus, setRateStatus] = useState<RateStatus>('idle')
  // Bumped on every rate request / manual edit so a slow fetch never
  // overwrites a newer choice.
  const rateRequest = useRef(0)

  // Individual stable selectors — no new object per render
  const addTransaction    = useAppStore((s) => s.addTransaction)
  const updateTransaction = useAppStore((s) => s.updateTransaction)
  const deleteTransaction = useAppStore((s) => s.deleteTransaction)
  const getExchangeRate   = useAppStore((s) => s.getExchangeRate)
  const allLabels         = useLabels()
  const allAccounts       = useAccounts()
  const allProjects       = useProjects()
  const users             = useUsers()

  const isEditing = Boolean(transaction)
  const isForeign = values.currency !== BASE_CURRENCY

  function field<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function loadMarketRate(code: CurrencyCode, date: string) {
    const request = ++rateRequest.current
    setRateStatus('loading')
    try {
      const fx = await getExchangeRate(code, date || undefined)
      if (request !== rateRequest.current) return
      setValues((v) =>
        v.currency === code && v.rateSource !== 'manual'
          ? { ...v, rate: String(fx.rate), rateSource: 'market', rateDate: fx.rateDate }
          : v,
      )
      setErrors((e) => ({ ...e, rate: undefined }))
      setRateStatus('idle')
    } catch {
      if (request !== rateRequest.current) return
      setRateStatus('error')
    }
  }

  function handleCurrencyChange(code: CurrencyCode) {
    if (code === values.currency) return
    rateRequest.current++
    setRateStatus('idle')
    setValues((v) => ({ ...v, currency: code, rate: '', rateSource: 'market', rateDate: '' }))
    setErrors((e) => ({ ...e, rate: undefined }))
    if (code !== BASE_CURRENCY) void loadMarketRate(code, values.date)
  }

  function handleDateChange(date: string) {
    field('date', date)
    // The market rate follows the expense date; manual and locked rates stay put.
    if (isForeign && values.rateSource === 'market') void loadMarketRate(values.currency, date)
  }

  function handleRateChange(rate: string) {
    rateRequest.current++
    setRateStatus('idle')
    setValues((v) => ({ ...v, rate, rateSource: 'manual', rateDate: '' }))
    if (errors.rate) setErrors((e) => ({ ...e, rate: undefined }))
  }

  function applyMarketRate() {
    setValues((v) => ({ ...v, rateSource: 'market' }))
    void loadMarketRate(values.currency, values.date)
  }

  const parsedAmount = parseFloat(values.amount)
  const parsedRate   = parseFloat(values.rate)
  const rateValid    = !isNaN(parsedRate) && parsedRate > 0
  const usdPreview   = isForeign && rateValid && !isNaN(parsedAmount)
    ? toUsd(parsedAmount, parsedRate)
    : null

  function validate(): boolean {
    const next: Partial<Record<keyof FormValues, string>> = {}
    if (!values.merchant.trim()) next.merchant    = 'Required'
    if (!values.date)            next.date        = 'Required'
    if (!values.payerId)         next.payerId     = 'Required'
    if (!values.forPersonId)        next.forPersonId = 'Required'
    const parsed = parseFloat(values.amount)
    if (!values.amount || isNaN(parsed)) next.amount = 'Enter a valid number'
    if (isForeign && !rateValid) {
      next.rate = rateStatus === 'loading' ? 'Still fetching the rate…' : 'Enter an exchange rate'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const entered = parseFloat(values.amount)
    // USD is canonical: `amount` is converted once here and never again.
    const currencyFields: Pick<Transaction, 'currency' | 'originalAmount' | 'exchangeRate'> = isForeign
      ? { currency: values.currency, originalAmount: entered, exchangeRate: parsedRate }
      : { currency: BASE_CURRENCY, originalAmount: undefined, exchangeRate: undefined }
    const wasForeign = transaction?.currency !== undefined && transaction.currency !== BASE_CURRENCY
    const data = {
      date:        values.date,
      merchant:    values.merchant.trim(),
      amount:      isForeign ? toUsd(entered, parsedRate) : entered,
      // Only send currency fields when they matter, so USD-only edits never
      // touch the currency columns.
      ...(isForeign || wasForeign ? currencyFields : {}),
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
          {/* One input-styled box: tappable currency symbol, then the number */}
          <div
            className={cn(
              'flex h-9 items-center rounded-lg border border-foreground transition-colors focus-within:ring-3 focus-within:ring-ring/30',
              errors.amount && 'border-destructive',
            )}
          >
            <Select
              value={values.currency}
              onValueChange={(code) => { if (code) handleCurrencyChange(code) }}
            >
              <SelectTrigger
                aria-label={`Currency: ${values.currency}`}
                title={`${values.currency} — change currency`}
                className="ml-1 shrink-0 gap-0 rounded-md border-0 bg-transparent px-1.5 font-medium data-[size=default]:h-7 hover:bg-secondary focus-visible:ring-0 focus-visible:bg-secondary dark:bg-transparent [&>svg]:hidden"
              >
                <SelectValue>{(code: CurrencyCode) => currencySymbol(code)}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} align="start" className="w-64">
                {PINNED_CURRENCIES.map((code) => (
                  <CurrencyOption key={code} code={code} />
                ))}
                <SelectSeparator />
                {OTHER_CURRENCIES.map((code) => (
                  <CurrencyOption key={code} code={code} />
                ))}
              </SelectContent>
            </Select>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={values.amount}
              onChange={(e) => field('amount', e.target.value)}
              placeholder="0.00"
              className={cn('h-full rounded-none border-0 pl-1 focus-visible:ring-0', NO_SPINNER)}
            />
          </div>
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
            onChange={(e) => handleDateChange(e.target.value)}
          />
          {errors.date && (
            <p className="text-xs text-destructive">{errors.date}</p>
          )}
        </div>
      </div>

      {/* Exchange rate — foreign currency only */}
      {isForeign && (
        <div className="space-y-1.5">
          <Label htmlFor="rate">Exchange rate <span className="text-destructive">*</span></Label>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground whitespace-nowrap">1 USD =</span>
            <Input
              id="rate"
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              value={values.rate}
              onChange={(e) => handleRateChange(e.target.value)}
              placeholder={rateStatus === 'loading' ? 'Fetching…' : '0.0000'}
              className={cn('w-28', NO_SPINNER)}
            />
            <span className="text-muted-foreground">{values.currency}</span>
            {usdPreview !== null && (
              <span className="ml-auto font-medium tabular-nums whitespace-nowrap">
                ≈ {formatCurrency(usdPreview)}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {rateStatus === 'loading' && 'Fetching market rate…'}
            {rateStatus === 'error' && "Couldn't fetch a market rate — enter one manually."}
            {rateStatus === 'idle' && values.rateSource === 'market' && values.rateDate &&
              `Market rate · ${format(parseISO(values.rateDate), 'MMM d, yyyy')}`}
            {rateStatus === 'idle' && values.rateSource === 'manual' && 'Manual rate'}
            {rateStatus === 'idle' && values.rateSource === 'locked' && 'Locked at the rate this expense was saved with'}
            {(rateStatus === 'idle' && values.rateSource !== 'market') || rateStatus === 'error' ? (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={applyMarketRate}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {rateStatus === 'error' ? 'Retry' : 'Use market rate'}
                </button>
              </>
            ) : null}
          </p>
          {errors.rate && <p className="text-xs text-destructive">{errors.rate}</p>}
        </div>
      )}

      {/* Who pays + For — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Who Pays <span className="text-destructive">*</span></Label>
          <div className="flex gap-2 flex-wrap">
            {([
              { id: users[0].id, emoji: users[0].avatarEmoji },
              { id: users[1].id, emoji: users[1].avatarEmoji },
              { id: 'shared',    emoji: 'Split' },
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
              { id: 'shared',    emoji: 'Both' },
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

function CurrencyOption({ code }: { code: CurrencyCode }) {
  return (
    <SelectItem value={code}>
      <span className="w-6 text-muted-foreground">{currencySymbol(code)}</span>
      <span className="w-9 font-medium">{code}</span>
      <span className="text-muted-foreground">{currencyName(code)}</span>
    </SelectItem>
  )
}
