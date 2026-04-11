import { createClient } from '@/lib/supabase/client'
import type { Account } from '@/core/types'

export async function getAccounts(householdId: string): Promise<Account[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('household_id', householdId)
    .order('name')
  if (error) throw error
  return (data ?? []) as Account[]
}

export async function insertAccount(householdId: string, account: Account): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('accounts')
    .insert({ id: account.id, household_id: householdId, name: account.name })
  if (error) throw error
}

export async function patchAccount(id: string, name: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('accounts')
    .update({ name })
    .eq('id', id)
  if (error) throw error
}

export async function removeAccount(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)
  if (error) throw error
}
