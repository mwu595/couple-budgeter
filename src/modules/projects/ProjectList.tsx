'use client'

import { Pencil, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/core/utils'
import type { Project, Transaction } from '@/core/types'

interface ProjectListProps {
  projects: Project[]
  transactions: Transaction[]
  onEdit: (project: Project) => void
}

type ProjectStatus = 'active' | 'upcoming' | 'completed'

function getStatus(project: Project, today: string): ProjectStatus {
  if (project.endDate < today) return 'completed'
  if (project.startDate > today) return 'upcoming'
  return 'active'
}

function getSpend(project: Project, transactions: Transaction[]): number {
  return transactions
    .filter((tx) => tx.projectId === project.id && tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0)
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Active',
  upcoming: 'Upcoming',
  completed: 'Completed',
}

const STATUS_ORDER: ProjectStatus[] = ['active', 'upcoming', 'completed']

export function ProjectList({ projects, transactions, onEdit }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <FolderOpen className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No projects yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Create a project to group expenses by trip, event, or goal.
        </p>
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)

  const grouped = projects.reduce<Record<ProjectStatus, Project[]>>(
    (acc, p) => {
      acc[getStatus(p, today)].push(p)
      return acc
    },
    { active: [], upcoming: [], completed: [] },
  )

  return (
    <div>
      {STATUS_ORDER.map((status) => {
        const group = grouped[status]
        if (group.length === 0) return null

        return (
          <div key={status}>
            <div className="px-4 py-1.5 bg-background/95 backdrop-blur-sm border-y border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {STATUS_LABEL[status]}
            </div>
            <div className="divide-y">
              {group.map((project) => {
                const spend = getSpend(project, transactions)
                const hasBudget = project.budget != null
                const pct = hasBudget ? Math.min((spend / project.budget!) * 100, 100) : null

                return (
                  <div
                    key={project.id}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
                  >
                    {/* Color dot */}
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                      aria-hidden="true"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        {project.icon && <span aria-hidden="true">{project.icon}</span>}
                        <span className="font-medium truncate">{project.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{project.startDate} – {project.endDate}</span>
                        <span>·</span>
                        <span>
                          {hasBudget
                            ? `${formatCurrency(spend)} / ${formatCurrency(project.budget!)}`
                            : `${formatCurrency(spend)} spent`}
                        </span>
                      </div>

                      {/* Budget progress bar */}
                      {hasBudget && pct !== null && (
                        <div className="h-1 rounded-full bg-muted overflow-hidden w-full max-w-xs">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: pct >= 100 ? '#ef4444' : project.color,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Edit button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
                      onClick={() => onEdit(project)}
                      aria-label={`Edit ${project.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
