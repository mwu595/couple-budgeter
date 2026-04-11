import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('household_members')
    .select('household_id, slot')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'No household found' }, { status: 403 })

  const service = createServiceClient()

  // Fetch all Plaid items for this household
  const { data: items } = await service
    .from('plaid_items')
    .select('id, access_token, cursor')
    .eq('household_id', member.household_id)

  if (!items?.length) return NextResponse.json({ added: 0, message: 'No connected accounts' })

  // Fetch account name map for display
  const { data: accountRows } = await service
    .from('plaid_accounts')
    .select('account_id, name, mask')
    .eq('household_id', member.household_id)

  const accountNameMap = new Map(
    (accountRows ?? []).map((a) => [
      a.account_id,
      a.mask ? `${a.name} ••••${a.mask}` : a.name,
    ]),
  )

  let totalAdded = 0

  for (const item of items) {
    let cursor    = item.cursor ?? undefined
    let hasMore   = true
    const toInsert: Record<string, unknown>[] = []

    // Page through all available updates
    while (hasMore) {
      const syncRes = await plaidClient.transactionsSync({
        access_token: item.access_token,
        cursor,
      })

      const { added, next_cursor, has_more } = syncRes.data

      for (const tx of added) {
        // Skip pending transactions — they haven't settled yet
        if (tx.pending) continue

        toInsert.push({
          id:                   uuidv4(),
          household_id:         member.household_id,
          date:                 tx.date,
          merchant:             tx.merchant_name ?? tx.name,
          // Plaid: positive = money out (expense), negative = money in (refund/income)
          amount:               tx.amount,
          account_name:         accountNameMap.get(tx.account_id) ?? tx.account_id,
          notes:                null,
          owner_id:             member.slot,  // assign to the user who triggered the sync
          reviewed:             false,
          plaid_transaction_id: tx.transaction_id,
        })
      }

      cursor  = next_cursor
      hasMore = has_more
    }

    // Upsert — skip any transaction already imported (idempotent)
    if (toInsert.length > 0) {
      const { data: inserted } = await service
        .from('transactions')
        .upsert(toInsert, { onConflict: 'plaid_transaction_id', ignoreDuplicates: true })
        .select('id')

      totalAdded += inserted?.length ?? 0
    }

    // Save updated cursor so next sync only fetches new data
    await service
      .from('plaid_items')
      .update({ cursor })
      .eq('id', item.id)
  }

  return NextResponse.json({ added: totalAdded })
}
