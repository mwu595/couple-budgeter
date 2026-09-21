import { createClient } from '@/lib/supabase/client'
import type { Label } from '@/core/types'

export async function getLabels(householdId: string): Promise<Label[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('labels')
    .select('id, name, color, icon')
    .eq('household_id', householdId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data.map((l) => ({
    id: l.id,
    name: l.name,
    color: l.color,
    icon: l.icon ?? undefined,
  }))
}

// New labels are appended after the household's current last label.
// Reads max(sort_order) rather than trusting the local count so that gaps
// left by deleted labels can't cause a collision.
export async function insertLabel(
  householdId: string,
  label: Label,
): Promise<void> {
  const supabase = createClient()
  const { data: last, error: readError } = await supabase
    .from('labels')
    .select('sort_order')
    .eq('household_id', householdId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (readError) throw readError

  const { error } = await supabase.from('labels').insert({
    id: label.id,
    household_id: householdId,
    name: label.name,
    color: label.color,
    icon: label.icon ?? null,
    sort_order: last ? last.sort_order + 1 : 0,
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
    labels.map((l, idx) => ({
      id: l.id,
      household_id: householdId,
      name: l.name,
      color: l.color,
      icon: l.icon ?? null,
      sort_order: idx,
    })),
  )
  if (error) throw error
}

// Rewrites sort_order for every label whose id appears in `orderedIds`
// using the array index as the new value. Used by the Tags page when the
// user drags labels into a new order.
export async function reorderLabels(orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return
  const supabase = createClient()
  const results = await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from('labels').update({ sort_order: idx }).eq('id', id),
    ),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
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
