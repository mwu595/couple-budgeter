'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useProjects, useTransactions } from '@/core/store'
import { ProjectForm, ProjectList, ProjectSummaryCards } from '@/modules/projects'
import type { Project } from '@/core/types'

export default function ProjectsPage() {
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isAdding, setIsAdding]             = useState(false)

  const projects     = useProjects()
  const transactions = useTransactions()

  const projectsNewestFirst = [...projects].sort(
    (a, b) => b.startDate.localeCompare(a.startDate)
  )

  const isDialogOpen = isAdding || editingProject !== null

  function closeDialog() {
    setIsAdding(false)
    setEditingProject(null)
  }

  return (
    <div className="flex flex-col h-full min-h-screen md:min-h-0 md:h-screen">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-4 border-b bg-background sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Projects</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="w-4 h-4 mr-1" />
          New Project
        </Button>
      </div>

      {/* ── Project summary strip ────────────────────────────────────────── */}
      {projectsNewestFirst.length > 0 && (
        <div className="border-b">
          <ProjectSummaryCards projects={projectsNewestFirst} transactions={transactions} />
        </div>
      )}

      {/* ── Project list ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <ProjectList
          projects={projects}
          transactions={transactions}
          onEdit={(project) => setEditingProject(project)}
        />
      </div>

      {/* ── Add / Edit dialog ─────────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isAdding ? 'New Project' : 'Edit Project'}
            </DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={editingProject ?? undefined}
            onSuccess={closeDialog}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
