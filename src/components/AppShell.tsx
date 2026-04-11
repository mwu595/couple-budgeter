'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AppNav } from '@/components/AppNav'
import { SampleDataBanner } from '@/components/SampleDataBanner'
import { createClient } from '@/lib/supabase/client'

const SHELL_LESS_PATHS = ['/login', '/signup']
const PROTECTED_PATHS = ['/dashboard', '/transactions', '/income', '/tags', '/settings', '/invite']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const bare = SHELL_LESS_PATHS.some((p) => pathname.startsWith(p))

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
      const isAuthPage   = SHELL_LESS_PATHS.some((p) => pathname.startsWith(p))
      if (!user && isProtected) router.replace('/login')
      else if (user && isAuthPage) router.replace('/dashboard')
    })
  }, [pathname, router])

  if (bare) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <AppNav />
      <main className="flex-1 min-w-0 pb-24 md:pb-0 overflow-auto">
        <SampleDataBanner />
        {children}
      </main>
    </div>
  )
}
