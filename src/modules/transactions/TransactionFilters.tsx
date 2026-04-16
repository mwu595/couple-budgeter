'use client'

import { useState } from 'react'
import { format, parseISO, isAfter } from 'date-fns'
import { ChevronDown, Check, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { User, PayerId, UserId, Label as LabelType, Project, PeriodPreset } from '@/core/types'
import { useFilters, useActivePeriod, useAppStore } from '@/core/store'

interface TransactionFiltersProps {
  users: [User, User]
  labels: LabelType[]
  projects: Project[]
}

const pill        = 'flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap'
const active      = 'bg-primary text-primary-foreground'
const inactive    = 'bg-secondary text-foreground hover:bg-[#e2e2e2]'
const Divider     = () => <div className="w-px h-4 bg-border flex-shrink-0 mx-0.5" />
const FilterTag   = ({ children }: { children: React.ReactNode }) => (
  <span className="flex-shrink-0 text-xs text-muted-foreground font-medium whitespace-nowrap">{children}</span>
)

const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'all_time',   label: 'All Time' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
]

export function TransactionFilters({ users, labels, projects }: TransactionFiltersProps) {
  const filters         = useFilters()
  const setFilters      = useAppStore((s) => s.setFilters)
  const resetFilters    = useAppStore((s) => s.resetFilters)
  const activePeriod    = useActivePeriod()
  const setActivePeriod = useAppStore((s) => s.setActivePeriod)

  const existingCustom = activePeriod.preset === 'custom' && activePeriod.custom
  const [customOpen, setCustomOpen] = useState(false)
  const [dateA, setDateA] = useState(existingCustom ? activePeriod.custom!.start : '')
  const [dateB, setDateB] = useState(existingCustom ? activePeriod.custom!.end   : '')

  function handleApplyCustom() {
    if (!dateA || !dateB) return
    const [start, end] = isAfter(parseISO(dateA), parseISO(dateB))
      ? [dateB, dateA] : [dateA, dateB]
    setActivePeriod({ preset: 'custom', custom: { start, end } })
    setCustomOpen(false)
  }

  const customLabel =
    activePeriod.preset === 'custom' && activePeriod.custom
      ? `${format(parseISO(activePeriod.custom.start), 'MMM d')} – ${format(parseISO(activePeriod.custom.end), 'MMM d')}`
      : 'Custom'

  const payerIndividualOptions: { value: PayerId; label: string }[] = [
    { value: users[0].id as PayerId, label: users[0].avatarEmoji },
    { value: users[1].id as PayerId, label: users[1].avatarEmoji },
    { value: 'shared',               label: `${users[0].avatarEmoji}${users[1].avatarEmoji}` },
  ]

  const appliedPersonIndividualOptions: { value: UserId | 'shared'; label: string }[] = [
    { value: users[0].id as UserId, label: users[0].avatarEmoji },
    { value: users[1].id as UserId, label: users[1].avatarEmoji },
    { value: 'shared',              label: `${users[0].avatarEmoji}${users[1].avatarEmoji}` },
  ]

  const reviewedOptions = [
    { value: 'all'        as const, label: 'All' },
    { value: 'reviewed'   as const, label: 'Reviewed' },
    { value: 'unreviewed' as const, label: 'Unreviewed' },
  ]

  function togglePayerId(value: PayerId) {
    const next = filters.payerIds.includes(value)
      ? filters.payerIds.filter((v) => v !== value)
      : [...filters.payerIds, value]
    setFilters({ payerIds: next })
  }

  function toggleAppliedPerson(value: UserId | 'shared') {
    const next = filters.appliedPersons.includes(value)
      ? filters.appliedPersons.filter((v) => v !== value)
      : [...filters.appliedPersons, value]
    setFilters({ appliedPersons: next })
  }

  function handleClearAll() {
    resetFilters()
    setActivePeriod({ preset: 'all_time' })
  }

  const activeProject = projects.find((p) => p.id === filters.projectId)

  return (
    <>
      {/* ── Filter row ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b bg-background overflow-x-auto scrollbar-none">

        {/* Period presets */}
        <FilterTag>Time:</FilterTag>
        {PERIOD_PRESETS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setActivePeriod({ preset: value })}
            className={cn(pill, activePeriod.preset === value ? active : inactive)}
          >
            {label}
          </button>
        ))}
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger className={cn(pill, activePeriod.preset === 'custom' ? active : inactive)}>
            {customLabel}
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 space-y-3" align="start">
            <div className="space-y-1.5">
              <Label className="text-xs">First date</Label>
              <Input type="date" value={dateA} onChange={(e) => setDateA(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Second date</Label>
              <Input type="date" value={dateB} onChange={(e) => setDateB(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              The earlier date becomes the start, the later becomes the end.
            </p>
            <Button size="sm" className="w-full" disabled={!dateA || !dateB} onClick={handleApplyCustom}>
              Apply
            </Button>
          </PopoverContent>
        </Popover>

        <Divider />
        <FilterTag>Payer:</FilterTag>

        {/* Payer — All clears selection; individual options toggle */}
        <button
          type="button"
          onClick={() => setFilters({ payerIds: [] })}
          className={cn(pill, filters.payerIds.length === 0 ? active : inactive)}
        >
          All
        </button>
        {payerIndividualOptions.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => togglePayerId(value)}
            className={cn(pill, filters.payerIds.includes(value) ? active : inactive)}
          >
            {label}
          </button>
        ))}

        <Divider />
        <FilterTag>Applied to:</FilterTag>

        {/* Applied Person — All clears selection; individual options toggle */}
        <button
          type="button"
          onClick={() => setFilters({ appliedPersons: [] })}
          className={cn(pill, filters.appliedPersons.length === 0 ? active : inactive)}
        >
          All
        </button>
        {appliedPersonIndividualOptions.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => toggleAppliedPerson(value)}
            className={cn(pill, filters.appliedPersons.includes(value) ? active : inactive)}
          >
            {label}
          </button>
        ))}

        <Divider />
        <FilterTag>Status:</FilterTag>

        {/* Reviewed — dropdown */}
        <Popover>
          <PopoverTrigger
            className={cn(pill, 'inline-flex items-center gap-1', filters.reviewed !== 'all' ? active : inactive)}
          >
            {reviewedOptions.find((o) => o.value === filters.reviewed)?.label ?? 'All'}
            <ChevronDown className="w-3 h-3" />
          </PopoverTrigger>
          <PopoverContent className="w-36 p-1" align="start">
            {reviewedOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilters({ reviewed: value })}
                className={cn(
                  'w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors',
                  filters.reviewed === value
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-accent text-foreground',
                )}
              >
                {label}
                {filters.reviewed === value && <Check className="w-3 h-3" />}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Projects dropdown */}
        {projects.length > 0 && (
          <>
            <Divider />
            <FilterTag>Project:</FilterTag>
            <Popover>
              <PopoverTrigger
                className={cn(pill, 'inline-flex items-center gap-1', filters.projectId ? active : inactive)}
              >
                {activeProject ? (
                  <>
                    {activeProject.icon ? (
                      <span aria-hidden="true">{activeProject.icon}</span>
                    ) : (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: activeProject.color }}
                        aria-hidden="true"
                      />
                    )}
                    <span>{activeProject.name}</span>
                  </>
                ) : (
                  <>
                    <span>Projects</span>
                    <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-52 p-2" align="start">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Filter by project</p>
                <div className="space-y-0.5">
                  {filters.projectId && (
                    <button
                      type="button"
                      onClick={() => setFilters({ projectId: undefined })}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-accent transition-colors"
                    >
                      None
                    </button>
                  )}
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => setFilters({ projectId: filters.projectId === project.id ? undefined : project.id })}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors',
                        project.id === filters.projectId
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-accent text-foreground',
                      )}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                        aria-hidden="true"
                      />
                      {project.icon && <span aria-hidden="true">{project.icon}</span>}
                      <span className="truncate">{project.name}</span>
                      {project.id === filters.projectId && <Check className="w-3 h-3 ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}

        <Divider />
        <button
          type="button"
          onClick={handleClearAll}
          className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
        >
          Clear
        </button>
      </div>

      {/* ── Label row ──────────────────────────────────────────────────── */}
      {labels.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b bg-background overflow-x-auto scrollbar-none">
          <FilterTag>Labels:</FilterTag>
          {labels.map((label) => {
            const isActive = filters.labelIds.includes(label.id)
            return (
              <button
                key={label.id}
                type="button"
                onClick={() =>
                  setFilters({
                    labelIds: isActive
                      ? filters.labelIds.filter((id) => id !== label.id)
                      : [...filters.labelIds, label.id],
                  })
                }
                className={cn(
                  'flex-shrink-0 text-xs px-2.5 py-1 rounded-full border transition-all whitespace-nowrap',
                  isActive ? 'ring-2 ring-offset-1' : 'opacity-60 hover:opacity-100',
                )}
                style={{
                  backgroundColor: `${label.color}20`,
                  color: label.color,
                  borderColor: `${label.color}40`,
                  '--tw-ring-color': isActive ? label.color : undefined,
                } as React.CSSProperties}
                aria-pressed={isActive}
              >
                {label.icon && <span className="mr-0.5">{label.icon}</span>}
                {label.name}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Search row ─────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-b bg-background">
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
              type="button"
              onClick={() => setFilters({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </>
  )
}
