'use client'

import { Pencil, Tag } from 'lucide-react'
import { LabelBadge } from '@/components/LabelBadge'
import { Button } from '@/components/ui/button'
import type { Label, Transaction } from '@/core/types'

interface LabelListProps {
  labels: Label[]
  transactions: Transaction[]
  onEdit: (label: Label) => void
}

export function LabelList({ labels, transactions, onEdit }: LabelListProps) {
  if (labels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <Tag className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No labels yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Add your first label to start categorizing transactions.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {labels.map((label) => {
        const count = transactions.filter((tx) => tx.labelIds.includes(label.id)).length

        return (
          <div
            key={label.id}
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
          >
            {/* Color swatch */}
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: label.color }}
              aria-hidden="true"
            />

            {/* Badge preview */}
            <div className="flex-1 min-w-0 flex items-center gap-3">
              <LabelBadge label={label} size="sm" />
              <span className="text-xs text-muted-foreground">
                {count} transaction{count !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Edit button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(label)}
              aria-label={`Edit ${label.name}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
