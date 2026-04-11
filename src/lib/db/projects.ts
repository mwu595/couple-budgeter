import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/core/types'

interface ProjectRow {
  id: string
  name: string
  color: string
  icon: string | null
  start_date: string
  end_date: string
  budget: string | number | null
}

function mapRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    budget: row.budget != null ? Number(row.budget) : undefined,
  }
}

export async function getProjects(householdId: string): Promise<Project[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, color, icon, start_date, end_date, budget')
    .eq('household_id', householdId)
    .order('start_date', { ascending: false })
  if (error) throw error
  return (data as ProjectRow[]).map(mapRow)
}

export async function insertProject(householdId: string, project: Project): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('projects').insert({
    id: project.id,
    household_id: householdId,
    name: project.name,
    color: project.color,
    icon: project.icon ?? null,
    start_date: project.startDate,
    end_date: project.endDate,
    budget: project.budget ?? null,
  })
  if (error) throw error
}

export async function patchProject(id: string, updates: Partial<Omit<Project, 'id'>>): Promise<void> {
  const supabase = createClient()
  const dbUpdates: Record<string, unknown> = {}
  if (updates.name      !== undefined) dbUpdates.name       = updates.name
  if (updates.color     !== undefined) dbUpdates.color      = updates.color
  if (updates.icon      !== undefined) dbUpdates.icon       = updates.icon ?? null
  if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate
  if (updates.endDate   !== undefined) dbUpdates.end_date   = updates.endDate
  if (updates.budget    !== undefined) dbUpdates.budget     = updates.budget ?? null
  if (Object.keys(dbUpdates).length === 0) return
  const { error } = await supabase.from('projects').update(dbUpdates).eq('id', id)
  if (error) throw error
}

export async function removeProject(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}
