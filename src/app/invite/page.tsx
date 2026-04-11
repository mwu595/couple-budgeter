'use client'

import { useState, useEffect } from 'react'
import { Mail, CheckCircle2, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface InviteStatus {
  invite: { invited_email: string; accepted_at: string | null; created_at: string } | null
  partnerJoined: boolean
}

export default function InvitePage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [status,  setStatus]  = useState<InviteStatus | null>(null)

  useEffect(() => {
    fetch('/api/invites')
      .then((r) => r.json())
      .then((data: InviteStatus) => {
        setStatus(data)
        if (data.invite) setEmail(data.invite.invited_email)
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/invites', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    })

    const body = await res.json() as { error?: string }
    setLoading(false)

    if (!res.ok) {
      setError(body.error ?? 'Something went wrong')
      return
    }

    setSent(true)
    setStatus((prev) => ({
      partnerJoined: prev?.partnerJoined ?? false,
      invite: { invited_email: email.toLowerCase(), accepted_at: null, created_at: new Date().toISOString() },
    }))
  }

  const partnerJoined = status?.partnerJoined
  const pendingEmail  = status?.invite?.invited_email

  return (
    <div className="flex flex-col min-h-screen md:min-h-0 md:h-screen">
      <div className="px-4 py-4 border-b bg-background sticky top-0 z-20">
        <h1 className="text-xl font-bold tracking-tight">Invite partner</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Share your household with one other person
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 max-w-md space-y-6">
        {/* Partner already joined */}
        {partnerJoined && (
          <div className="flex items-start gap-3 border rounded-xl p-4 bg-muted/40">
            <UserCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Partner joined</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pendingEmail} has accepted the invite and is now part of your household.
              </p>
            </div>
          </div>
        )}

        {/* Invite sent confirmation */}
        {!partnerJoined && sent && (
          <div className="flex items-start gap-3 border rounded-xl p-4 bg-muted/40">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Invite saved</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Have <strong>{email.toLowerCase()}</strong> sign up on this app.
                They'll be automatically linked to your household.
              </p>
            </div>
          </div>
        )}

        {/* Pending invite (loaded from DB) */}
        {!partnerJoined && !sent && pendingEmail && (
          <div className="flex items-start gap-3 border rounded-xl p-4 bg-muted/40">
            <Mail className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Invite pending</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Waiting for <strong>{pendingEmail}</strong> to sign up.
              </p>
            </div>
          </div>
        )}

        {/* Invite form */}
        {!partnerJoined && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Partner's email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="partner@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Saving…' : sent || pendingEmail ? 'Update invite' : 'Send invite'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Your partner will be automatically linked when they sign up with this email.
              No email is sent — just share this app with them.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
