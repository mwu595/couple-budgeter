'use client'

import { X } from 'lucide-react'
import type { Label } from '@/core/types'

interface LabelBadgeProps {
  label: Label
  onRemove?: () => void
  size?: 'sm' | 'xs'
}

export function LabelBadge({ label, onRemove, size = 'sm' }: LabelBadgeProps) {
  const sizeClasses =
    size === 'xs'
      ? 'text-[10px] h-4 px-1.5 gap-0.5'
      : 'text-xs h-5 px-2 gap-1'

  return (
    <span
      className={`inline-flex items-center rounded-full border font-normal ${sizeClasses}`}
      style={{
        backgroundColor: `${label.color}20`,
        color: label.color,
        borderColor: `${label.color}40`,
      }}
    >
      {label.icon && <span aria-hidden="true">{label.icon}</span>}
      {label.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 hover:opacity-70 rounded-full leading-none"
          aria-label={`Remove ${label.name}`}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  )
}
