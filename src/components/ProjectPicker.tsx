'use client'

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { Project } from '@/core/types'

interface ProjectPickerProps {
  projects: Project[]
  selectedId?: string
  onChange: (id: string | undefined) => void
  triggerClassName?: string
}

export function ProjectPicker({ projects, selectedId, onChange, triggerClassName }: ProjectPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = projects.find((p) => p.id === selectedId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'inline-flex items-center gap-1 text-xs rounded transition-colors',
          triggerClassName,
        )}
        aria-label={selected ? `Project: ${selected.name}` : 'Assign project'}
      >
        {selected ? (
          <>
            {selected.icon ? (
              <span aria-hidden="true">{selected.icon}</span>
            ) : (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: selected.color }}
                aria-hidden="true"
              />
            )}
            <span className="text-muted-foreground max-w-[80px] truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground/40">📁</span>
        )}
      </PopoverTrigger>

      <PopoverContent
        className="w-52 p-2"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Assign project</p>

        {projects.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">No projects yet.</p>
        ) : (
          <div className="space-y-0.5">
            {selectedId && (
              <button
                type="button"
                onClick={() => { onChange(undefined); setOpen(false) }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-accent transition-colors"
              >
                None
              </button>
            )}
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => { onChange(project.id); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors',
                  project.id === selectedId
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-accent text-foreground',
                )}
                aria-pressed={project.id === selectedId}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color }}
                  aria-hidden="true"
                />
                {project.icon && <span aria-hidden="true">{project.icon}</span>}
                <span className="truncate">{project.name}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
