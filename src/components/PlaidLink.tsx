'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PlaidLinkButtonProps {
  onSuccess: () => void
}

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [fetching,  setFetching]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    setFetching(true)
    fetch('/api/plaid/link-token', { method: 'POST' })
      .then((r) => r.json())
      .then((data: { linkToken?: string; error?: string }) => {
        if (data.linkToken) {
          // Persist the token so the OAuth callback page can resume the flow
          sessionStorage.setItem('plaid_link_token', data.linkToken)
          setLinkToken(data.linkToken)
        } else {
          setError(data.error ?? 'Failed to initialize Plaid')
        }
      })
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setFetching(false))
  }, [])

  const handleSuccess = useCallback(
    async (publicToken: string) => {
      const res = await fetch('/api/plaid/exchange-token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ publicToken }),
      })
      if (res.ok) onSuccess()
      else setError('Failed to link account')
    },
    [onSuccess],
  )

  const { open, ready } = usePlaidLink({
    token:     linkToken ?? '',
    onSuccess: handleSuccess,
  })

  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <Button
      size="sm"
      onClick={() => open()}
      disabled={!ready || fetching || !linkToken}
    >
      <Building2 className="w-3.5 h-3.5 mr-1.5" />
      {fetching ? 'Loading…' : 'Connect bank account'}
    </Button>
  )
}
