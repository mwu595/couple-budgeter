import { createClient } from '@/lib/supabase/client'
import type { RecurringIncome, RecurringFrequency, OwnerId } from '@/core/types'

interface RIRow {
  id: string
  name: string
  amount: string | number
  owner_id: string
  account_name: string
  notes: string | null
  frequency: string
  start_date: string
  next_date: string
  created_at: string
}

function mapRow(row: RIRow): RecurringIncome {
  return {
    id:          row.id,
    name:        row.name,
    amount:      Number(row.amount),
    ownerId:     row.owner_id as OwnerId,
    accountName: row.account_name,
    notes:       row.notes ?? undefined,
    frequency:   row.frequency as RecurringFrequency,
    startDate:   row.start_date,
    nextDate:    row.next_date,
    createdAt:   row.created_at,
  }
}

export async function getRecurringIncomes(householdId: string): Promise<RecurringIncome[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('recurring_incomes')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as RIRow[]).map(mapRow)
}

export async function insertRecurringIncome(
  householdId: string,
  ri: RecurringIncome,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('recurring_incomes').insert({
    id:           ri.id,
    household_id: householdId,
    name:         ri.name,
    amount:       ri.amount,
    owner_id:     ri.ownerId,
    account_name: ri.accountName,
    notes:        ri.notes ?? null,
    frequency:    ri.frequency,
    start_date:   ri.startDate,
    next_date:    ri.nextDate,
    created_at:   ri.createdAt,
  })
  if (error) throw error
}

export async function patchRecurringIncome(
  id: string,
  updates: Partial<Pick<RecurringIncome, 'name' | 'amount' | 'ownerId' | 'accountName' | 'notes' | 'frequency' | 'startDate' | 'nextDate'>>,
): Promise<void> {
  const supabase = createClient()
  const db: Record<string, unknown> = {}
  if (updates.name        !== undefined) db.name         = updates.name
  if (updates.amount      !== undefined) db.amount        = updates.amount
  if (updates.ownerId     !== undefined) db.owner_id      = updates.ownerId
  if (updates.accountName !== undefined) db.account_name  = updates.accountName
  if (updates.notes       !== undefined) db.notes         = updates.notes ?? null
  if (updates.frequency   !== undefined) db.frequency     = updates.frequency
  if (updates.startDate   !== undefined) db.start_date    = updates.startDate
  if (updates.nextDate    !== undefined) db.next_date     = updates.nextDate
  if (Object.keys(db).length === 0) return
  const { error } = await supabase.from('recurring_incomes').update(db).eq('id', id)
  if (error) throw error
}

export async function removeRecurringIncome(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('recurring_incomes').delete().eq('id', id)
  if (error) throw error
}
