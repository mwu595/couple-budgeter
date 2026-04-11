import { createClient } from '@/lib/supabase/client'
import type { User } from '@/core/types'

export async function createHousehold(): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('households')
    .insert({})
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function getMyHouseholdId(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('household_members')
    .select('household_id')
    .limit(1)
    .single()
  return data?.household_id ?? null
}

export async function addHouseholdMember(
  householdId: string,
  slot: 'user_a' | 'user_b',
  displayName: string,
  avatarEmoji: string,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('household_members').insert({
    household_id: householdId,
    slot,
    display_name: displayName,
    avatar_emoji: avatarEmoji,
  })
  if (error) throw error
}

export async function updateHouseholdMember(
  householdId: string,
  slot: 'user_a' | 'user_b',
  updates: { display_name?: string; avatar_emoji?: string },
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('household_members')
    .update(updates)
    .eq('household_id', householdId)
    .eq('slot', slot)
  if (error) throw error
}

export async function getHouseholdMembers(householdId: string): Promise<[User, User]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('household_members')
    .select('slot, display_name, avatar_emoji')
    .eq('household_id', householdId)
  if (error) throw error

  const memberA = data.find((m) => m.slot === 'user_a')
  const memberB = data.find((m) => m.slot === 'user_b')

  return [
    {
      id: 'user_a',
      name: memberA?.display_name ?? 'Person 1',
      avatarEmoji: memberA?.avatar_emoji ?? '🧑',
    },
    {
      id: 'user_b',
      name: memberB?.display_name ?? 'Person 2',
      avatarEmoji: memberB?.avatar_emoji ?? '👩',
    },
  ]
}
