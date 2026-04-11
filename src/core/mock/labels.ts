import { v4 as uuidv4 } from 'uuid'
import type { Label } from '@/core/types'

// Templates hold display data only — IDs are generated fresh each time
// so mock data can be inserted into Supabase without UUID conflicts.
const LABEL_TEMPLATES: Omit<Label, 'id'>[] = [
  { name: 'Food',          color: '#ef4444' },
  { name: 'Dining Out',    color: '#f97316' },
  { name: 'Transport',     color: '#3b82f6' },
  { name: 'Groceries',     color: '#22c55e' },
  { name: 'Utilities',     color: '#8b5cf6' },
  { name: 'Subscriptions', color: '#ec4899' },
  { name: 'Health',        color: '#14b8a6' },
  { name: 'Travel',        color: '#f59e0b' },
  { name: 'Shopping',      color: '#6366f1' },
  { name: 'Entertainment', color: '#84cc16' },
]

export function generateMockLabels(): Label[] {
  return LABEL_TEMPLATES.map((t) => ({ ...t, id: uuidv4() }))
}
