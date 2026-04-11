import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ institutions: [] })

  const service = createServiceClient()

  // Fetch items (institutions) for this household
  const { data: items } = await service
    .from('plaid_items')
    .select('id, institution_name, created_at')
    .eq('household_id', member.household_id)
    .order('created_at')

  if (!items?.length) return NextResponse.json({ institutions: [] })

  // Fetch accounts grouped by item
  const { data: accounts } = await service
    .from('plaid_accounts')
    .select('plaid_item_id, account_id, name, official_name, type, subtype, mask')
    .eq('household_id', member.household_id)

  const institutions = items.map((item) => ({
    id:              item.id,
    institutionName: item.institution_name,
    connectedAt:     item.created_at,
    accounts:        (accounts ?? [])
      .filter((a) => a.plaid_item_id === item.id)
      .map((a) => ({
        accountId:    a.account_id,
        name:         a.name,
        officialName: a.official_name,
        type:         a.type,
        subtype:      a.subtype,
        mask:         a.mask,
      })),
  }))

  return NextResponse.json({ institutions })
}
