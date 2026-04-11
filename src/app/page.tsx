'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useOnboardingComplete, useDataLoading } from '@/core/store'

export default function HomePage() {
  const router             = useRouter()
  const [mounted, setMounted] = useState(false)
  const onboardingComplete = useOnboardingComplete()
  const dataLoading        = useDataLoading()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    // Wait for mount and for Supabase data load to complete before redirecting.
    // This ensures onboardingComplete reflects the actual DB state, not stale localStorage.
    if (!mounted || dataLoading) return

    async function redirect() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      router.replace(onboardingComplete ? '/dashboard' : '/onboarding')
    }

    redirect()
  }, [mounted, dataLoading, onboardingComplete, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}
