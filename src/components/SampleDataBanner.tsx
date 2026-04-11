'use client'

import { X } from 'lucide-react'
import { useOnboardingComplete, useSampleDataDismissed, useAppStore } from '@/core/store'

export function SampleDataBanner() {
  const onboardingComplete    = useOnboardingComplete()
  const sampleDataDismissed   = useSampleDataDismissed()
  const setSampleDataDismissed = useAppStore((s) => s.setSampleDataDismissed)

  if (!onboardingComplete || sampleDataDismissed) return null

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs">
      <p>
        <span className="font-medium">You're viewing sample data.</span>{' '}
        Add your own transactions to get started.
      </p>
      <button
        onClick={() => setSampleDataDismissed(true)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity rounded p-0.5"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
