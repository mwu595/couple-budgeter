import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'No household found' }, { status: 403 })

  const service = createServiceClient()

  // Fetch the item to verify it belongs to this household and get the access_token
  const { data: item } = await service
    .from('plaid_items')
    .select('id, access_token')
    .eq('id', id)
    .eq('household_id', member.household_id)
    .single()

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Tell Plaid to revoke access — non-fatal if it fails (item may already be invalid)
  try {
    await plaidClient.itemRemove({ access_token: item.access_token })
  } catch {
    // Continue — the local record must still be removed even if Plaid call fails
  }

  // Delete the item row; plaid_accounts cascade-deletes via FK
  const { error } = await service
    .from('plaid_items')
    .delete()
    .eq('id', id)
    .eq('household_id', member.household_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
