'use client'

import Link from 'next/link'
import { formatCurrency } from '@/core/utils'
import type { Project, Transaction } from '@/core/types'

interface ProjectSummaryCardsProps {
  projects: Project[]
  transactions: Transaction[]
}

function getSpend(project: Project, transactions: Transaction[]): number {
  return transactions
    .filter((tx) => tx.projectId === project.id && tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0)
}

export function ProjectSummaryCards({ projects, transactions }: ProjectSummaryCardsProps) {
  if (projects.length === 0) return null

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
      {projects.map((project) => {
        const spend = getSpend(project, transactions)
        const hasBudget = project.budget != null
        const pct = hasBudget ? Math.min((spend / project.budget!) * 100, 100) : null

        return (
          <Link
            key={project.id}
            href="/projects"
            className="flex-shrink-0 w-44 bg-card ring-1 ring-border rounded-xl p-3 hover:ring-primary/40 transition-all group"
          >
            <div className="flex items-center gap-1.5 mb-1">
              {project.icon && <span aria-hidden="true" className="text-sm">{project.icon}</span>}
              <span className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                {project.name}
              </span>
            </div>

            <p className="text-base font-bold tabular-nums">{formatCurrency(spend)}</p>

            {hasBudget && (
              <p className="text-xs text-muted-foreground">
                of {formatCurrency(project.budget!)}
              </p>
            )}

            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              {project.startDate} – {project.endDate}
            </p>

            {/* Color bar */}
            {hasBudget && pct !== null ? (
              <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: pct >= 100 ? '#ef4444' : project.color,
                  }}
                />
              </div>
            ) : (
              <div
                className="mt-2 h-1 rounded-full"
                style={{ backgroundColor: project.color }}
              />
            )}
          </Link>
        )
      })}
    </div>
  )
}
