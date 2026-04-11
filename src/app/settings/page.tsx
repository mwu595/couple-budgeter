'use client'

import { useState, useEffect, useCallback } from 'react'
import { RotateCcw, LogOut, UserPlus, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useUsers, useAppStore } from '@/core/store'
import { UserProfileForm } from '@/modules/ownership'
import { PlaidLinkButton } from '@/components/PlaidLink'
import { createClient } from '@/lib/supabase/client'

interface PlaidAccount {
  accountId: string; name: string; officialName: string | null
  type: string; subtype: string | null; mask: string | null
}
interface Institution { id: string; institutionName: string; accounts: PlaidAccount[] }

export default function SettingsPage() {
  const router          = useRouter()
  const users           = useUsers()
  const resetToMockData = useAppStore((s) => s.resetToMockData)
  const loadHouseholdData = useAppStore((s) => s.loadHouseholdData)

  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [syncing,      setSyncing]      = useState(false)
  const [syncMsg,      setSyncMsg]      = useState<string | null>(null)

  const fetchAccounts = useCallback(() => {
    fetch('/api/plaid/accounts')
      .then((r) => r.json())
      .then((data: { institutions: Institution[] }) => setInstitutions(data.institutions ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  async function handleSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res  = await fetch('/api/plaid/sync', { method: 'POST' })
      const data = await res.json() as { added: number; message?: string }
      setSyncMsg(data.message ?? `${data.added} new transaction${data.added !== 1 ? 's' : ''} imported`)
      if (data.added > 0) await loadHouseholdData()
    } catch {
      setSyncMsg('Sync failed — please try again')
    } finally {
      setSyncing(false)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleReset() {
    if (
      window.confirm(
        'Reset all data? This will wipe all transactions and labels and reload the sample data.'
      )
    ) {
      resetToMockData()
    }
  }

  return (
    <div className="flex flex-col min-h-screen md:min-h-0 md:h-screen">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b bg-background sticky top-0 z-20">
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage profiles and app data</p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-8">
        {/* ── User profiles ────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Profiles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {users.map((user) => (
              <div key={user.id} className="border rounded-xl p-4 space-y-3">
                <p className="text-xs text-muted-foreground font-medium">
                  {user.id === 'user_a' ? 'Person 1' : 'Person 2'}
                </p>
                <UserProfileForm user={user} />
              </div>
            ))}
          </div>
        </section>

        {/* ── Connected accounts ───────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Connected accounts
          </h2>

          {institutions.length > 0 && (
            <div className="space-y-3">
              {institutions.map((inst) => (
                <div key={inst.id} className="border rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium">{inst.institutionName}</p>
                  <ul className="space-y-1">
                    {inst.accounts.map((a) => (
                      <li key={a.accountId} className="text-xs text-muted-foreground flex justify-between">
                        <span>{a.officialName ?? a.name}</span>
                        <span className="font-mono">{a.mask ? `••••${a.mask}` : a.type}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing…' : 'Sync transactions'}
                </Button>
                {syncMsg && <p className="text-xs text-muted-foreground">{syncMsg}</p>}
              </div>
            </div>
          )}

          <PlaidLinkButton onSuccess={() => { fetchAccounts(); setSyncMsg(null) }} />
        </section>

        {/* ── Partner ──────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Partner
          </h2>
          <div className="border rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium">Invite your partner</p>
            <p className="text-xs text-muted-foreground">
              Share this household so both of you can track spending together.
            </p>
            <Link
              href="/invite"
              className="mt-1 inline-flex items-center gap-1.5 text-sm h-8 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Manage invite
            </Link>
          </div>
        </section>

        {/* ── Account ──────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Account
          </h2>
          <div className="border rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">
              You will be redirected to the login page.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="mt-1"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sign out
            </Button>
          </div>
        </section>

        {/* ── Data management ──────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Data
          </h2>
          <div className="border rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium">Reset to sample data</p>
            <p className="text-xs text-muted-foreground">
              Wipes all your transactions, labels, and settings and reloads the built-in mock data.
              This cannot be undone.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReset}
              className="mt-1"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset all data
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
