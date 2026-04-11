'use client'

import { useState } from 'react'
import { format, parseISO, isAfter } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { PeriodPreset } from '@/core/types'
import { useActivePeriod, useAppStore } from '@/core/store'

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'all_time',   label: 'All Time' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
]

export function PeriodSelector() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const activePeriod    = useActivePeriod()
  const setActivePeriod = useAppStore((s) => s.setActivePeriod)

  const [open, setOpen] = useState(false)

  const existingCustom = activePeriod.preset === 'custom' && activePeriod.custom
  const [dateA, setDateA] = useState(existingCustom ? activePeriod.custom!.start : '')
  const [dateB, setDateB] = useState(existingCustom ? activePeriod.custom!.end   : '')

  function handlePreset(preset: PeriodPreset) {
    setActivePeriod({ preset })
  }

  function handleApply() {
    if (!dateA || !dateB) return
    const [start, end] = isAfter(parseISO(dateA), parseISO(dateB))
      ? [dateB, dateA]
      : [dateA, dateB]
    setActivePeriod({ preset: 'custom', custom: { start, end } })
    setOpen(false)
  }

  const customLabel =
    activePeriod.preset === 'custom' && activePeriod.custom
      ? `${format(parseISO(activePeriod.custom.start), 'MMM d')} – ${format(parseISO(activePeriod.custom.end), 'MMM d')}`
      : 'Custom'

  const pillBase    = 'flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap'
  const pillActive  = 'bg-primary text-primary-foreground border-primary'
  const pillInactive = 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'

  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b bg-background overflow-x-auto scrollbar-none">
      {PRESETS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handlePreset(value)}
          className={cn(pillBase, activePeriod.preset === value ? pillActive : pillInactive)}
        >
          {label}
        </button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className={cn(pillBase, activePeriod.preset === 'custom' ? pillActive : pillInactive)}>
          {customLabel}
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-3" align="start">
          <div className="space-y-1.5">
            <Label className="text-xs">First date</Label>
            <Input type="date" value={dateA} max={today} onChange={(e) => setDateA(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Second date</Label>
            <Input type="date" value={dateB} max={today} onChange={(e) => setDateB(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            The earlier date becomes the start, the later becomes the end.
          </p>
          <Button size="sm" className="w-full" disabled={!dateA || !dateB} onClick={handleApply}>
            Apply
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  )
}
