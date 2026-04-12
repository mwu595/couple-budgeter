'use client'

import { useState, useRef } from 'react'
import { ChevronDown, Pencil, Trash2, Plus, Check, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { Account } from '@/core/types'
import { useAppStore } from '@/core/store'

interface AccountPickerProps {
  accounts: Account[]
  value: string          // current accountName string on the transaction
  onChange: (name: string) => void
  hasError?: boolean
}

export function AccountPicker({ accounts, value, onChange, hasError }: AccountPickerProps) {
  const [open,       setOpen]       = useState(false)
  const [addingNew,  setAddingNew]  = useState(false)
  const [newName,    setNewName]    = useState('')
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [editName,   setEditName]   = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const newInputRef  = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const addAccount    = useAppStore((s) => s.addAccount)
  const updateAccount = useAppStore((s) => s.updateAccount)
  const deleteAccount = useAppStore((s) => s.deleteAccount)

  // ── Add new ────────────────────────────────────────────────────────────────

  function startAdding() {
    setAddingNew(true)
    setNewName('')
    setTimeout(() => newInputRef.current?.focus(), 0)
  }

  function cancelAdding() {
    setAddingNew(false)
    setNewName('')
  }

  async function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    const account = await addAccount(trimmed)
    onChange(account.name)
    setAddingNew(false)
    setNewName('')
    setOpen(false)
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  function startEditing(account: Account) {
    setEditingId(account.id)
    setEditName(account.name)
    setConfirmDeleteId(null)
    setTimeout(() => editInputRef.current?.focus(), 0)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditName('')
  }

  async function handleEdit() {
    const trimmed = editName.trim()
    if (!trimmed || !editingId) return
    const prev = accounts.find((a) => a.id === editingId)
    await updateAccount(editingId, trimmed)
    // If the currently selected account was renamed, follow the rename
    if (prev && value === prev.name) onChange(trimmed)
    setEditingId(null)
    setEditName('')
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  function confirmDelete(id: string) {
    setConfirmDeleteId(id)
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    await deleteAccount(id)
    setConfirmDeleteId(null)
    // Clear selection if the deleted account was selected
    const deleted = accounts.find((a) => a.id === id)
    if (deleted && value === deleted.name) onChange('')
  }

  // ── Select ─────────────────────────────────────────────────────────────────

  function select(name: string) {
    onChange(name)
    setOpen(false)
    setAddingNew(false)
    setEditingId(null)
    setConfirmDeleteId(null)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'w-full flex items-center justify-between text-sm px-3 py-2 rounded-md border bg-background transition-colors text-left',
          hasError
            ? 'border-destructive focus:ring-destructive'
            : 'border-foreground focus:ring-ring',
          'focus:outline-none focus:ring-1'
        )}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {value || 'Select account…'}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </PopoverTrigger>

      <PopoverContent className="w-72 p-2" align="start">
        {/* Existing accounts */}
        {accounts.length === 0 && !addingNew && (
          <p className="text-xs text-muted-foreground px-2 py-1">No accounts yet.</p>
        )}

        {accounts.map((account) => {
          const isEditing = editingId === account.id
          const isConfirmingDelete = confirmDeleteId === account.id

          if (isConfirmingDelete) {
            return (
              <div key={account.id} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs">
                <span className="text-destructive flex-1">Delete &ldquo;{account.name}&rdquo;?</span>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(account.id)}
                  className="text-white bg-destructive hover:bg-destructive/90 px-1.5 py-0.5 rounded text-xs"
                >
                  Delete
                </button>
              </div>
            )
          }

          if (isEditing) {
            return (
              <div key={account.id} className="flex items-center gap-1.5 px-1 py-1">
                <input
                  ref={editInputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); void handleEdit() }
                    if (e.key === 'Escape') cancelEditing()
                  }}
                  className="flex-1 text-xs border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => void handleEdit()}
                  disabled={!editName.trim()}
                  className="text-primary hover:text-primary/80 disabled:opacity-40"
                  aria-label="Save"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          }

          return (
            <div
              key={account.id}
              className="group flex items-center gap-1 rounded hover:bg-accent px-2 py-1.5 cursor-pointer"
              onClick={() => select(account.name)}
            >
              <span className="flex-1 text-sm truncate">{account.name}</span>
              {value === account.name && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); startEditing(account) }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-0.5 rounded transition-opacity"
                aria-label={`Edit ${account.name}`}
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); confirmDelete(account.id) }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-0.5 rounded transition-opacity"
                aria-label={`Delete ${account.name}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )
        })}

        {/* Add new account */}
        {addingNew ? (
          <div className="flex items-center gap-1.5 px-1 py-1 mt-1 border-t pt-2">
            <input
              ref={newInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); void handleAdd() }
                if (e.key === 'Escape') cancelAdding()
              }}
              placeholder="Account name…"
              className="flex-1 text-xs border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={!newName.trim()}
              className="text-primary hover:text-primary/80 disabled:opacity-40"
              aria-label="Save"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={cancelAdding}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startAdding}
            className="mt-1 w-full flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded transition-colors border-t"
          >
            <Plus className="w-3 h-3" />
            Add new account
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
