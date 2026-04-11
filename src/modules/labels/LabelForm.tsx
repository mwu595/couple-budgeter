'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Label as LabelType } from '@/core/types'
import { useAppStore } from '@/core/store'

export const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6',
  '#ec4899', '#84cc16', '#06b6d4', '#64748b',
]

interface LabelFormProps {
  label?: LabelType
  onSuccess: () => void
  onCancel: () => void
}

export function LabelForm({ label, onSuccess, onCancel }: LabelFormProps) {
  const [name, setName]         = useState(label?.name ?? '')
  const [color, setColor]       = useState(label?.color ?? PRESET_COLORS[5])
  const [icon, setIcon]         = useState(label?.icon ?? '')
  const [nameError, setNameError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const addLabel    = useAppStore((s) => s.addLabel)
  const updateLabel = useAppStore((s) => s.updateLabel)
  const deleteLabel = useAppStore((s) => s.deleteLabel)
  const transactions = useAppStore((s) => s.transactions)

  const isEditing = Boolean(label)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setNameError('Required'); return }
    setNameError('')

    const data = {
      name: trimmed,
      color,
      ...(icon.trim() ? { icon: icon.trim() } : { icon: undefined }),
    }

    if (isEditing && label) {
      updateLabel(label.id, data)
    } else {
      addLabel(data)
    }
    onSuccess()
  }

  function handleDelete() {
    setConfirmOpen(true)
  }

  function handleConfirmDelete() {
    if (!label) return
    deleteLabel(label.id)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1" noValidate>
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="label-name">Name</Label>
        <Input
          id="label-name"
          value={name}
          onChange={(e) => { setName(e.target.value); if (nameError) setNameError('') }}
          placeholder="e.g. Insurance"
          autoFocus
        />
        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
      </div>

      {/* Color swatches */}
      <div className="space-y-1.5">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={cn(
                'w-7 h-7 rounded-full border-2 transition-transform',
                color === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
              )}
              style={{ backgroundColor: c }}
              aria-label={`Select color ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        {/* Preview */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-muted-foreground">Preview:</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full border"
            style={{
              backgroundColor: `${color}20`,
              color,
              borderColor: `${color}40`,
            }}
          >
            {icon.trim() && <span className="mr-1">{icon.trim()}</span>}
            {name.trim() || 'Label name'}
          </span>
        </div>
      </div>

      {/* Icon */}
      <div className="space-y-1.5">
        <Label htmlFor="label-icon">
          Icon <span className="text-muted-foreground font-normal">(optional emoji)</span>
        </Label>
        <Input
          id="label-icon"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="e.g. 🏥"
          className="w-24"
          maxLength={4}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        {isEditing ? (
          <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
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
            {isEditing ? 'Save Changes' : 'Add Label'}
          </Button>
        </div>
      </div>

      {label && (
        <ConfirmDialog
          open={confirmOpen}
          title={`Delete "${label.name}"?`}
          description={
            (() => {
              const count = transactions.filter((tx) => tx.labelIds.includes(label.id)).length
              return count > 0
                ? `It will be removed from ${count} transaction${count !== 1 ? 's' : ''}. This cannot be undone.`
                : 'This cannot be undone.'
            })()
          }
          confirmLabel="Delete"
          destructive
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </form>
  )
}
