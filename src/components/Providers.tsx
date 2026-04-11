'use client'

import { useEffect } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { rehydrateStore, useAppStore } from '@/core/store'
import { createClient } from '@/lib/supabase/client'

const EMPTY_DATA = {
  householdId: null,
  transactions: [] as never[],
  labels: [] as never[],
  accounts: [] as never[],
  onboardingComplete: false,
  sampleDataDismissed: false,
  dataLoading: false,
}

export function Providers({ children }: { children: React.ReactNode }) {
  const loadHouseholdData = useAppStore((s) => s.loadHouseholdData)

  useEffect(() => {
    // Rehydrate localStorage preferences (period, filters, onboarding flag).
    rehydrateStore()

    const supabase = createClient()

    // Listen for auth state changes so data is always in sync with the
    // current user — handles sign-in on the same tab as a previous user.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        loadHouseholdData()
      }
      if (event === 'SIGNED_OUT') {
        // Clear all user data from the store so the next user starts clean.
        useAppStore.setState(EMPTY_DATA)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [loadHouseholdData])

  return <TooltipProvider>{children}</TooltipProvider>
}
