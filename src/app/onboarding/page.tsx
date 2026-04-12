'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/core/store'

const DEFAULT_A = { name: 'Alex',   emoji: '🧑' }
const DEFAULT_B = { name: 'Jordan', emoji: '👩' }

export default function OnboardingPage() {
  const router = useRouter()
  const createHouseholdAndSeed = useAppStore((s) => s.createHouseholdAndSeed)

  const [nameA,  setNameA]  = useState(DEFAULT_A.name)
  const [emojiA, setEmojiA] = useState(DEFAULT_A.emoji)
  const [nameB,  setNameB]  = useState(DEFAULT_B.name)
  const [emojiB, setEmojiB] = useState(DEFAULT_B.emoji)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleStart() {
    setError(null)
    setLoading(true)
    try {
      await createHouseholdAndSeed(
        { name: nameA.trim() || DEFAULT_A.name, emoji: emojiA.trim() || DEFAULT_A.emoji },
        { name: nameB.trim() || DEFAULT_B.name, emoji: emojiB.trim() || DEFAULT_B.emoji },
      )
      router.replace('/dashboard')
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Money Tracker</h1>
          <p className="text-muted-foreground text-sm">
            Set up your two profiles to get started. You can change these any time in Settings.
          </p>
        </div>

        {/* Profile cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* User A */}
          <div className="border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl select-none flex-shrink-0">
                {emojiA.trim() || DEFAULT_A.emoji}
              </span>
              <span className="text-sm font-medium text-muted-foreground">Person 1 (you)</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name-a">Name</Label>
              <Input
                id="name-a"
                value={nameA}
                onChange={(e) => setNameA(e.target.value)}
                placeholder="Your name"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emoji-a">Avatar emoji</Label>
              <Input
                id="emoji-a"
                value={emojiA}
                onChange={(e) => setEmojiA(e.target.value)}
                placeholder="🧑"
                className="w-20 text-lg text-center"
                maxLength={4}
              />
            </div>
          </div>

          {/* User B */}
          <div className="border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl select-none flex-shrink-0">
                {emojiB.trim() || DEFAULT_B.emoji}
              </span>
              <span className="text-sm font-medium text-muted-foreground">Person 2 (partner)</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name-b">Name</Label>
              <Input
                id="name-b"
                value={nameB}
                onChange={(e) => setNameB(e.target.value)}
                placeholder="Partner's name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emoji-b">Avatar emoji</Label>
              <Input
                id="emoji-b"
                value={emojiB}
                onChange={(e) => setEmojiB(e.target.value)}
                placeholder="👩"
                className="w-20 text-lg text-center"
                maxLength={4}
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        <Button onClick={handleStart} className="w-full" size="lg" disabled={loading}>
          {loading ? 'Setting up…' : "Let's go →"}
        </Button>
      </div>
    </div>
  )
}
