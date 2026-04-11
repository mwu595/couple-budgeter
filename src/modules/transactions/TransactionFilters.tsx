'use client'

import { Search, X, TriangleAlert } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { User, OwnerId, Label, Project } from '@/core/types'
import { useFilters, useAppStore } from '@/core/store'

interface TransactionFiltersProps {
  users: [User, User]
  labels: Label[]
  projects: Project[]
}

type OwnerOption = { value: OwnerId | 'all'; label: string; emoji?: string }
type ReviewedOption = { value: 'all' | 'reviewed' | 'unreviewed'; label: string }

export function TransactionFilters({ users, labels, projects }: TransactionFiltersProps) {
  const filters = useFilters()
  // Use individual stable selectors to avoid object-identity re-renders
  const setFilters   = useAppStore((s) => s.setFilters)
  const resetFilters = useAppStore((s) => s.resetFilters)

  const ownerOptions: OwnerOption[] = [
    { value: 'all',        label: 'All' },
    { value: users[0].id,  label: users[0].name, emoji: users[0].avatarEmoji },
    { value: users[1].id,  label: users[1].name, emoji: users[1].avatarEmoji },
    { value: 'shared',     label: 'Shared' },
  ]

  const reviewedOptions: ReviewedOption[] = [
    { value: 'all',        label: 'All' },
    { value: 'reviewed',   label: 'Reviewed' },
    { value: 'unreviewed', label: 'Unreviewed' },
  ]

  const hasActiveFilters =
    filters.search !== '' ||
    filters.ownerId !== 'all' ||
    filters.reviewed !== 'all' ||
    filters.labelIds.length > 0 ||
    filters.projectId !== undefined

  return (
    <div className="space-y-2.5 px-4 py-3 border-b bg-background">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search transactions..."
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          className="pl-9 pr-8 h-9 text-sm"
          aria-label="Search transactions"
        />
        {filters.search && (
          <button
            onClick={() => setFilters({ search: '' })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Owner filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
        {ownerOptions.map(({ value, label, emoji }) => (
          <button
            key={value}
            onClick={() => setFilters({ ownerId: value })}
            className={cn(
              'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors',
              filters.ownerId === value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
            )}
          >
            {emoji && <span>{emoji}</span>}
            {label}
          </button>
        ))}
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <TriangleAlert className="w-3 h-3 shrink-0" />
          The owner represents who this expense applies to, not who paid for it.
        </span>
      </div>

      {/* Reviewed filter + clear */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {reviewedOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilters({ reviewed: value })}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                filters.reviewed === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Label filter chips */}
      {labels.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {labels.map((label) => {
            const active = filters.labelIds.includes(label.id)
            return (
              <button
                key={label.id}
                onClick={() =>
                  setFilters({
                    labelIds: active
                      ? filters.labelIds.filter((id) => id !== label.id)
                      : [...filters.labelIds, label.id],
                  })
                }
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full border transition-all',
                  active ? 'ring-2 ring-offset-1' : 'opacity-60 hover:opacity-100'
                )}
                style={
                  {
                    backgroundColor: `${label.color}20`,
                    color: label.color,
                    borderColor: `${label.color}40`,
                    '--tw-ring-color': active ? label.color : undefined,
                  } as React.CSSProperties
                }
                aria-pressed={active}
              >
                {label.icon && <span className="mr-0.5">{label.icon}</span>}
                {label.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Project filter chips */}
      {projects.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {projects.map((project) => {
            const active = filters.projectId === project.id
            return (
              <button
                key={project.id}
                onClick={() => setFilters({ projectId: active ? undefined : project.id })}
                className={cn(
                  'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-all',
                  active ? 'ring-2 ring-offset-1' : 'opacity-60 hover:opacity-100'
                )}
                style={
                  {
                    backgroundColor: `${project.color}20`,
                    color: project.color,
                    borderColor: `${project.color}40`,
                    '--tw-ring-color': active ? project.color : undefined,
                  } as React.CSSProperties
                }
                aria-pressed={active}
              >
                {project.icon ? (
                  <span aria-hidden="true">{project.icon}</span>
                ) : (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                    aria-hidden="true"
                  />
                )}
                {project.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
