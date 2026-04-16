import { createClient } from '@/lib/supabase/client'
import type { Transaction } from '@/core/types'

// ── Shape returned by Supabase for a transaction row ───────────────────────
interface TxRow {
  id: string
  date: string
  merchant: string
  amount: string | number
  account_name: string
  notes: string | null
  payer_id: string
  applied_to: string
  project_id: string | null
  recurring_income_id: string | null
  reviewed: boolean
  created_at: string
  transaction_labels: { label_id: string }[]
}

function mapRow(row: TxRow): Transaction {
  return {
    id: row.id,
    date: row.date,
    merchant: row.merchant,
    amount: Number(row.amount),
    accountName: row.account_name,
    notes: row.notes ?? undefined,
    payerId: row.payer_id as Transaction['payerId'],
    appliedTo: row.applied_to as Transaction['appliedTo'],
    labelIds: row.transaction_labels.map((tl) => tl.label_id),
    projectId: row.project_id ?? undefined,
    recurringIncomeId: row.recurring_income_id ?? undefined,
    reviewed: row.reviewed,
    createdAt: row.created_at,
  }
}

export async function getTransactions(householdId: string): Promise<Transaction[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*, transaction_labels(label_id), project_id')
    .eq('household_id', householdId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as TxRow[]).map(mapRow)
}

export async function insertTransaction(
  householdId: string,
  tx: Transaction,
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.from('transactions').insert({
    id: tx.id,
    household_id: householdId,
    date: tx.date,
    merchant: tx.merchant,
    amount: tx.amount,
    account_name: tx.accountName,
    notes: tx.notes ?? null,
    payer_id: tx.payerId,
    applied_to: tx.appliedTo,
    reviewed: tx.reviewed,
    created_at: tx.createdAt,
    recurring_income_id: tx.recurringIncomeId ?? null,
  })
  if (error) throw error

  if (tx.labelIds.length > 0) {
    const { error: lblError } = await supabase
      .from('transaction_labels')
      .insert(tx.labelIds.map((labelId) => ({ transaction_id: tx.id, label_id: labelId })))
    if (lblError) throw lblError
  }
}

export async function insertTransactions(
  householdId: string,
  txs: Transaction[],
): Promise<void> {
  if (txs.length === 0) return
  const supabase = createClient()

  const { error } = await supabase.from('transactions').insert(
    txs.map((tx) => ({
      id: tx.id,
      household_id: householdId,
      date: tx.date,
      merchant: tx.merchant,
      amount: tx.amount,
      account_name: tx.accountName,
      notes: tx.notes ?? null,
      payer_id: tx.payerId,
      applied_to: tx.appliedTo,
      reviewed: tx.reviewed,
      created_at: tx.createdAt,
      recurring_income_id: tx.recurringIncomeId ?? null,
    })),
  )
  if (error) throw error

  const junctionRows = txs.flatMap((tx) =>
    tx.labelIds.map((labelId) => ({ transaction_id: tx.id, label_id: labelId })),
  )
  if (junctionRows.length > 0) {
    const { error: lblError } = await supabase
      .from('transaction_labels')
      .insert(junctionRows)
    if (lblError) throw lblError
  }
}

export async function patchTransaction(
  id: string,
  updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>,
): Promise<void> {
  const supabase = createClient()

  const dbUpdates: Record<string, unknown> = {}
  if (updates.date        !== undefined) dbUpdates.date         = updates.date
  if (updates.merchant    !== undefined) dbUpdates.merchant     = updates.merchant
  if (updates.amount      !== undefined) dbUpdates.amount       = updates.amount
  if (updates.accountName !== undefined) dbUpdates.account_name = updates.accountName
  if (updates.notes       !== undefined) dbUpdates.notes        = updates.notes ?? null
  if (updates.payerId    !== undefined) dbUpdates.payer_id    = updates.payerId
  if (updates.appliedTo  !== undefined) dbUpdates.applied_to  = updates.appliedTo
  if (updates.reviewed   !== undefined) dbUpdates.reviewed    = updates.reviewed
  if (updates.projectId   !== undefined) dbUpdates.project_id   = updates.projectId ?? null

  if (Object.keys(dbUpdates).length > 0) {
    const { error } = await supabase.from('transactions').update(dbUpdates).eq('id', id)
    if (error) throw error
  }

  // Replace label junction rows when labelIds is being updated
  if (updates.labelIds !== undefined) {
    await supabase.from('transaction_labels').delete().eq('transaction_id', id)
    if (updates.labelIds.length > 0) {
      const { error } = await supabase
        .from('transaction_labels')
        .insert(updates.labelIds.map((labelId) => ({ transaction_id: id, label_id: labelId })))
      if (error) throw error
    }
  }
}

export async function removeTransaction(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

export async function removeTransactions(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const supabase = createClient()
  const { error } = await supabase.from('transactions').delete().in('id', ids)
  if (error) throw error
}

export async function removeAllTransactions(householdId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('household_id', householdId)
  if (error) throw error
}

export async function renameTransactionAccount(
  householdId: string,
  oldName: string,
  newName: string,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('transactions')
    .update({ account_name: newName })
    .eq('household_id', householdId)
    .eq('account_name', oldName)
  if (error) throw error
}

export async function removeAllLabels(householdId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('labels')
    .delete()
    .eq('household_id', householdId)
  if (error) throw error
}
