import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the user has a household
  const { data: member } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'No household found' }, { status: 403 })

  const { publicToken } = await request.json() as { publicToken: string }

  // Exchange public_token for access_token (this is the critical security step —
  // the access_token never leaves the server after this point)
  const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token: publicToken })
  const { access_token, item_id } = exchangeRes.data

  // Fetch institution details
  const itemRes = await plaidClient.itemGet({ access_token })
  const institutionId = itemRes.data.item.institution_id

  let institutionName = 'Unknown Bank'
  if (institutionId) {
    try {
      const instRes = await plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes:  ['US' as never],
      })
      institutionName = instRes.data.institution.name
    } catch {
      // Non-fatal — institution name is display-only
    }
  }

  // Store the item securely (service role — bypasses RLS, access_token never hits client)
  const service = createServiceClient()
  const { data: plaidItem, error: itemError } = await service
    .from('plaid_items')
    .insert({
      household_id:     member.household_id,
      item_id,
      access_token,
      institution_id:   institutionId,
      institution_name: institutionName,
    })
    .select('id')
    .single()

  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 })

  // Fetch and store linked accounts
  const accountsRes = await plaidClient.accountsGet({ access_token })
  const accounts = accountsRes.data.accounts

  if (accounts.length > 0) {
    await service.from('plaid_accounts').insert(
      accounts.map((a) => ({
        household_id:  member.household_id,
        plaid_item_id: plaidItem.id,
        account_id:    a.account_id,
        name:          a.name,
        official_name: a.official_name ?? null,
        type:          a.type,
        subtype:       a.subtype ?? null,
        mask:          a.mask ?? null,
      })),
    )
  }

  return NextResponse.json({
    institutionName,
    accounts: accounts.map((a) => ({
      accountId: a.account_id,
      name:      a.name,
      type:      a.type,
      subtype:   a.subtype,
      mask:      a.mask,
    })),
  })
}
