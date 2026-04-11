import { createClient } from '@/lib/supabase/client'
import type { Label } from '@/core/types'

export async function getLabels(householdId: string): Promise<Label[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('labels')
    .select('id, name, color, icon')
    .eq('household_id', householdId)
    .order('created_at')
  if (error) throw error
  return data.map((l) => ({
    id: l.id,
    name: l.name,
    color: l.color,
    icon: l.icon ?? undefined,
  }))
}

export async function insertLabel(
  householdId: string,
  label: Label,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('labels').insert({
    id: label.id,
    household_id: householdId,
    name: label.name,
    color: label.color,
    icon: label.icon ?? null,
  })
  if (error) throw error
}

export async function insertLabels(
  householdId: string,
  labels: Label[],
): Promise<void> {
  if (labels.length === 0) return
  const supabase = createClient()
  const { error } = await supabase.from('labels').insert(
    labels.map((l) => ({
      id: l.id,
      household_id: householdId,
      name: l.name,
      color: l.color,
      icon: l.icon ?? null,
    })),
  )
  if (error) throw error
}

export async function patchLabel(
  id: string,
  updates: Partial<Omit<Label, 'id'>>,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('labels')
    .update({
      ...(updates.name  !== undefined && { name: updates.name }),
      ...(updates.color !== undefined && { color: updates.color }),
      ...(updates.icon  !== undefined && { icon: updates.icon ?? null }),
    })
    .eq('id', id)
  if (error) throw error
}

export async function removeLabel(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('labels').delete().eq('id', id)
  if (error) throw error
}
