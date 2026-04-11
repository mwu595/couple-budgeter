'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { User } from '@/core/types'
import { useAppStore } from '@/core/store'

interface UserProfileFormProps {
  user: User
  /** Called after successfully saving */
  onSaved?: () => void
}

export function UserProfileForm({ user, onSaved }: UserProfileFormProps) {
  const [name, setName]   = useState(user.name)
  const [emoji, setEmoji] = useState(user.avatarEmoji)
  const [nameError, setNameError] = useState('')

  const updateUser = useAppStore((s) => s.updateUser)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) { setNameError('Name is required'); return }
    setNameError('')
    updateUser(user.id, { name: trimmedName, avatarEmoji: emoji.trim() || user.avatarEmoji })
    onSaved?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {/* Avatar preview */}
      <div className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl select-none flex-shrink-0">
          {emoji.trim() || user.avatarEmoji}
        </span>
        <div className="flex-1 space-y-1">
          <Label htmlFor={`emoji-${user.id}`} className="text-xs text-muted-foreground font-normal">
            Avatar emoji
          </Label>
          <Input
            id={`emoji-${user.id}`}
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="e.g. 🧑"
            className="w-20 text-lg text-center"
            maxLength={4}
          />
        </div>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor={`name-${user.id}`}>Name</Label>
        <Input
          id={`name-${user.id}`}
          value={name}
          onChange={(e) => { setName(e.target.value); if (nameError) setNameError('') }}
          placeholder="Your name"
        />
        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
      </div>

      <Button type="submit" size="sm" className="w-full">
        Save
      </Button>
    </form>
  )
}
