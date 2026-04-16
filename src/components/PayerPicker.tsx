'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { PayerId, User } from '@/core/types'

interface PayerPickerProps {
  users: [User, User]
  value: PayerId
  onChange: (payerId: PayerId) => void
  triggerClassName?: string
}

type PayerOption = { id: PayerId; label: string; emoji: string }

export function PayerPicker({ users, value, onChange, triggerClassName }: PayerPickerProps) {
  const [open, setOpen] = useState(false)

  const options: PayerOption[] = [
    { id: users[0].id, label: users[0].name, emoji: users[0].avatarEmoji },
    { id: users[1].id, label: users[1].name, emoji: users[1].avatarEmoji },
    { id: 'shared',    label: 'Shared',       emoji: '♾' },
  ]

  const current = options.find((o) => o.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm select-none transition-opacity hover:opacity-80',
          triggerClassName
        )}
        aria-label={`Payer: ${current?.label ?? 'Unknown'}`}
      >
        {value === 'shared' ? (
          <span className="text-xs">{users[0].avatarEmoji}{users[1].avatarEmoji}</span>
        ) : (
          <span>{current?.emoji}</span>
        )}
      </PopoverTrigger>

      <PopoverContent
        className="w-48 p-1.5"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-medium text-muted-foreground px-2 py-1 mb-0.5">Assign payer</p>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => { onChange(option.id); setOpen(false) }}
            className={cn(
              'w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors text-left',
              value === option.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <span className="text-base">{option.emoji}</span>
            <span className="flex-1">{option.label}</span>
            {value === option.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
