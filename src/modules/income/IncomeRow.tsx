'use client'

import { format, parseISO } from 'date-fns'
import { RepeatIcon, CheckCircle2 } from 'lucide-react'
import { OwnerPicker } from '@/components/OwnerPicker'
import type { Transaction, User } from '@/core/types'
import { formatCurrency } from '@/core/utils'
import { useAppStore } from '@/core/store'

interface IncomeRowProps {
  transaction: Transaction
  users: [User, User]
  onEdit: (id: string) => void
}

const RAINBOW_GRADIENT =
  'linear-gradient(to right, rgba(239,68,68,0.15), rgba(249,115,22,0.15), rgba(234,179,8,0.15), rgba(34,197,94,0.15), rgba(59,130,246,0.15), rgba(139,92,246,0.15))'

export function IncomeRow({ transaction, users, onEdit }: IncomeRowProps) {
  const { id, date, merchant, amount, accountName, ownerId, recurringIncomeId, reviewed } = transaction
  const updateTransaction = useAppStore((s) => s.updateTransaction)

  return (
    <div
      role="button"
      tabIndex={0}
      className="w-full flex items-start gap-3 py-3 px-4 text-left transition-colors cursor-pointer group hover:brightness-95"
      style={{ background: RAINBOW_GRADIENT }}
      onClick={() => onEdit(id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onEdit(id) }}
      aria-label={`Edit income: ${merchant}`}
    >
      {/* Owner picker */}
      <OwnerPicker
        users={users}
        value={ownerId}
        onChange={(newOwner) => updateTransaction(id, { ownerId: newOwner })}
        triggerClassName="mt-0.5"
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top row: source + amount */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium truncate">{merchant}</span>
            {recurringIncomeId && (
              <RepeatIcon
                className="w-3 h-3 text-muted-foreground flex-shrink-0"
                aria-label="Recurring"
              />
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {reviewed && (
              <CheckCircle2
                className="w-4 h-4 text-green-500"
                aria-label="Reviewed"
              />
            )}
            <span className="font-semibold tabular-nums text-sm text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(Math.abs(amount))}
            </span>
          </div>
        </div>

        {/* Bottom row: date · account */}
        <div className="mt-0.5">
          <span className="text-xs text-muted-foreground">
            {format(parseISO(date), 'MMM d')} · {accountName}
          </span>
        </div>
      </div>
    </div>
  )
}
