import { NextResponse } from 'next/server'
import { CountryCode, Products } from 'plaid'
import { plaidClient } from '@/lib/plaid'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/oauth-callback`

  try {
    const response = await plaidClient.linkTokenCreate({
      user:          { client_user_id: user.id },
      client_name:   'Money Tracker',
      products:      [Products.Transactions],
      country_codes: [CountryCode.Us],
      language:      'en',
      redirect_uri:  redirectUri,
    })

    return NextResponse.json({ linkToken: response.data.link_token })
  } catch (err: unknown) {
    const message = (err as { response?: { data?: { error_message?: string } } })
      ?.response?.data?.error_message ?? String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
