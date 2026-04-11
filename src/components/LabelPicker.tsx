'use client'

import { useState, useRef } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { Label } from '@/core/types'
import { useAppStore } from '@/core/store'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6',
  '#ec4899', '#84cc16', '#06b6d4', '#64748b',
]

interface LabelPickerProps {
  labels: Label[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  /** Content rendered inside the trigger button */
  triggerContent?: React.ReactNode
  /** Extra classes applied to the trigger button */
  triggerClassName?: string
}

export function LabelPicker({
  labels,
  selectedIds,
  onChange,
  triggerContent,
  triggerClassName,
}: LabelPickerProps) {
  const [creating, setCreating] = useState(false)
  const [newName,  setNewName]  = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[5])
  const [newIcon,  setNewIcon]  = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const addLabel = useAppStore((s) => s.addLabel)

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    )
  }

  function startCreating() {
    setCreating(true)
    setNewName('')
    setNewColor(PRESET_COLORS[5])
    setNewIcon('')
    // Focus after render
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  function cancelCreating() {
    setCreating(false)
    setNewName('')
  }

  async function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return

    const newLabel = await addLabel({
      name: trimmed,
      color: newColor,
      ...(newIcon.trim() ? { icon: newIcon.trim() } : {}),
    })

    // Auto-select the newly created label
    onChange([...selectedIds, newLabel.id])
    setCreating(false)
    setNewName('')
    setNewIcon('')
  }

  return (
    <Popover>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded',
          triggerClassName
        )}
      >
        {triggerContent ?? '+'}
      </PopoverTrigger>

      <PopoverContent
        className="w-64 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        {!creating ? (
          <>
            <p className="text-xs font-medium text-muted-foreground mb-2">Assign labels</p>

            {labels.length === 0 ? (
              <p className="text-xs text-muted-foreground mb-2">No labels yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto mb-2">
                {labels.map((label) => {
                  const selected = selectedIds.includes(label.id)
                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => toggle(label.id)}
                      className={cn(
                        'inline-flex items-center gap-1 text-xs rounded-full border px-2 py-0.5 transition-all',
                        selected ? 'ring-2 ring-offset-1' : 'opacity-70 hover:opacity-100'
                      )}
                      style={
                        {
                          backgroundColor: `${label.color}20`,
                          color: label.color,
                          borderColor: `${label.color}40`,
                          '--tw-ring-color': selected ? label.color : undefined,
                        } as React.CSSProperties
                      }
                      aria-pressed={selected}
                    >
                      {selected && <Check className="w-2.5 h-2.5" />}
                      {label.icon && <span aria-hidden="true">{label.icon}</span>}
                      {label.name}
                    </button>
                  )
                })}
              </div>
            )}

            <button
              type="button"
              onClick={startCreating}
              className="w-full flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1 px-1 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              Create new label
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">New label</p>
              <button type="button" onClick={cancelCreating} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Name */}
            <input
              ref={nameInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); void handleCreate() }
                if (e.key === 'Escape') cancelCreating()
              }}
              placeholder="Label name"
              className="w-full text-xs border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />

            {/* Icon (optional) */}
            <input
              type="text"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              placeholder="Icon (optional emoji)"
              maxLength={4}
              className="w-20 text-xs border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />

            {/* Color swatches */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={cn(
                    'w-5 h-5 rounded-full border-2 transition-transform',
                    newColor === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                  aria-pressed={newColor === c}
                />
              ))}
            </div>

            {/* Preview */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Preview:</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: `${newColor}20`,
                  color: newColor,
                  borderColor: `${newColor}40`,
                }}
              >
                {newIcon.trim() && <span className="mr-1">{newIcon.trim()}</span>}
                {newName.trim() || 'Label name'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={cancelCreating}
                className="text-xs px-2.5 py-1 rounded border hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={!newName.trim()}
                className="text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
