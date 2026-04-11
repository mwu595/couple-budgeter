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

  // Fetch the permanent ledger of every plaid_transaction_id ever imported
  // for this household. This prevents re-importing transactions the user deleted.
  const { data: seenRows } = await service
    .from('plaid_seen_ids')
    .select('plaid_transaction_id')
    .eq('household_id', member.household_id)

  const seenIds = new Set((seenRows ?? []).map((r) => r.plaid_transaction_id))

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
    const toInsert:  Record<string, unknown>[] = []
    const newSeenIds: string[] = []

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

        // Record in the seen ledger regardless of whether we insert —
        // this marks it permanently so it won't come back after deletion
        newSeenIds.push(tx.transaction_id)

        // Skip if this transaction has ever been imported before
        if (seenIds.has(tx.transaction_id)) continue

        toInsert.push({
          id:                   uuidv4(),
          household_id:         member.household_id,
          date:                 tx.date,
          merchant:             tx.merchant_name ?? tx.name,
          // Plaid: positive = money out (expense), negative = money in (refund/income)
          amount:               tx.amount,
          account_name:         accountNameMap.get(tx.account_id) ?? tx.account_id,
          notes:                null,
          owner_id:             member.slot,
          reviewed:             false,
          plaid_transaction_id: tx.transaction_id,
        })
      }

      cursor  = next_cursor
      hasMore = has_more
    }

    // Insert new transactions first
    if (toInsert.length > 0) {
      const { data: inserted } = await service
        .from('transactions')
        .upsert(toInsert, { onConflict: 'plaid_transaction_id', ignoreDuplicates: true })
        .select('id')

      totalAdded += inserted?.length ?? 0
    }

    // Write the full batch of seen IDs to the permanent ledger (upsert, idempotent)
    if (newSeenIds.length > 0) {
      await service
        .from('plaid_seen_ids')
        .upsert(
          newSeenIds.map((pid) => ({
            household_id:         member.household_id,
            plaid_transaction_id: pid,
          })),
          { onConflict: 'household_id,plaid_transaction_id', ignoreDuplicates: true },
        )
    }

    // Save updated cursor so next sync only fetches new data from Plaid
    await service
      .from('plaid_items')
      .update({ cursor })
      .eq('id', item.id)
  }

  return NextResponse.json({ added: totalAdded })
}
