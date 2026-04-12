'use client'

import { X } from 'lucide-react'
import { useOnboardingComplete, useSampleDataDismissed, useAppStore } from '@/core/store'

export function SampleDataBanner() {
  const onboardingComplete    = useOnboardingComplete()
  const sampleDataDismissed   = useSampleDataDismissed()
  const setSampleDataDismissed = useAppStore((s) => s.setSampleDataDismissed)

  if (!onboardingComplete || sampleDataDismissed) return null

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-foreground text-background text-xs border-b border-foreground/10">
      <p>
        <span className="font-semibold">You&apos;re viewing sample data.</span>{' '}
        Add your own transactions to get started.
      </p>
      <button
        onClick={() => setSampleDataDismissed(true)}
        className="flex-shrink-0 hover:opacity-60 transition-opacity rounded-full p-0.5"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
