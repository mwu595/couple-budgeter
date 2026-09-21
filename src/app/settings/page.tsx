'use client'

import { LogOut, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useUsers } from '@/core/store'
import { UserProfileForm } from '@/modules/ownership'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const users  = useUsers()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col min-h-screen md:min-h-0 md:h-screen">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b bg-background sticky top-0 z-20">
        <h1 className="text-lg font-bold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage profiles and app data</p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-8">
        {/* ── User profiles ────────────────────────────────────────────────── */}
        <section>
          <div className="border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl overflow-hidden">
            <div className="flex items-center px-4 py-3 border-b border-border">
              <span className="text-sm font-medium">Profiles</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {users.map((user) => (
                  <div key={user.id} className="border border-border rounded-lg p-4 space-y-3">
                    <p className="text-xs text-muted-foreground font-medium">
                      {user.id === 'user_a' ? 'Person 1' : 'Person 2'}
                    </p>
                    <UserProfileForm user={user} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Partner ──────────────────────────────────────────────────────── */}
        <section>
          <div className="border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl overflow-hidden">
            <div className="flex items-center px-4 py-3 border-b border-border">
              <span className="text-sm font-medium">Partner</span>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                Share this household so both of you can track spending together.
              </p>
              <Link
                href="/invite"
                className="mt-1 inline-flex items-center gap-1.5 text-sm h-8 px-3 rounded-full border border-border bg-background hover:bg-secondary transition-colors font-medium"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Manage invite
              </Link>
            </div>
          </div>
        </section>

        {/* ── Account ──────────────────────────────────────────────────────── */}
        <section>
          <div className="border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl overflow-hidden">
            <div className="flex items-center px-4 py-3 border-b border-border">
              <span className="text-sm font-medium">Account</span>
            </div>
            <div className="p-4 space-y-2">
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
          </div>
        </section>
      </div>
    </div>
  )
}
