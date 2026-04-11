'use client'

import { useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { useRouter } from 'next/navigation'

// This page handles the OAuth redirect back from the bank (e.g. Chase).
// Plaid redirects here after the user authenticates with their bank,
// then we re-initialize Plaid Link in "receivedRedirectUri" mode to complete the flow.
export default function OAuthCallbackPage() {
  const router = useRouter()
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    // Retrieve the link token saved before the OAuth redirect
    const saved = sessionStorage.getItem('plaid_link_token')
    if (saved) {
      setLinkToken(saved)
    } else {
      setError('Session expired — please try connecting your bank again.')
    }
  }, [])

  const { open, ready } = usePlaidLink({
    token:               linkToken ?? '',
    receivedRedirectUri: typeof window !== 'undefined' ? window.location.href : '',
    onSuccess: async (publicToken) => {
      sessionStorage.removeItem('plaid_link_token')
      await fetch('/api/plaid/exchange-token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ publicToken }),
      })
      router.push('/settings')
    },
    onExit: () => {
      sessionStorage.removeItem('plaid_link_token')
      router.push('/settings')
    },
  })

  useEffect(() => {
    if (ready) open()
  }, [ready, open])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <p className="text-sm text-muted-foreground">Completing bank connection…</p>
    </div>
  )
}
