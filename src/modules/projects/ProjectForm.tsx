'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Project } from '@/core/types'
import { useAppStore } from '@/core/store'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6',
  '#ec4899', '#84cc16', '#06b6d4', '#64748b',
]

interface ProjectFormProps {
  project?: Project
  onSuccess: () => void
  onCancel: () => void
}

export function ProjectForm({ project, onSuccess, onCancel }: ProjectFormProps) {
  const today = new Date().toISOString().slice(0, 10)

  const [name,      setName]      = useState(project?.name      ?? '')
  const [color,     setColor]     = useState(project?.color     ?? PRESET_COLORS[2])
  const [icon,      setIcon]      = useState(project?.icon      ?? '')
  const [startDate, setStartDate] = useState(project?.startDate ?? today)
  const [endDate,   setEndDate]   = useState(project?.endDate   ?? today)
  const [budget,    setBudget]    = useState(project?.budget != null ? String(project.budget) : '')
  const [nameError, setNameError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const addProject    = useAppStore((s) => s.addProject)
  const updateProject = useAppStore((s) => s.updateProject)
  const deleteProject = useAppStore((s) => s.deleteProject)
  const transactions  = useAppStore((s) => s.transactions)

  const isEditing = Boolean(project)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setNameError('Required'); return }
    setNameError('')

    const data: Omit<Project, 'id'> = {
      name: trimmed,
      color,
      ...(icon.trim() ? { icon: icon.trim() } : {}),
      startDate,
      endDate,
      ...(budget.trim() && !isNaN(Number(budget)) ? { budget: Number(budget) } : {}),
    }

    if (isEditing && project) {
      updateProject(project.id, data)
    } else {
      addProject(data)
    }
    onSuccess()
  }

  function handleConfirmDelete() {
    if (!project) return
    deleteProject(project.id)
    onSuccess()
  }

  const txCount = project
    ? transactions.filter((tx) => tx.projectId === project.id).length
    : 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1" noValidate>
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="project-name">Name</Label>
        <Input
          id="project-name"
          value={name}
          onChange={(e) => { setName(e.target.value); if (nameError) setNameError('') }}
          placeholder="e.g. Istanbul Trip"
          autoFocus
        />
        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
      </div>

      {/* Color swatches */}
      <div className="space-y-1.5">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={cn(
                'w-7 h-7 rounded-full border-2 transition-transform',
                color === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105',
              )}
              style={{ backgroundColor: c }}
              aria-label={`Select color ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      {/* Icon */}
      <div className="space-y-1.5">
        <Label htmlFor="project-icon">
          Icon <span className="text-muted-foreground font-normal">(optional emoji)</span>
        </Label>
        <Input
          id="project-icon"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="e.g. ✈️"
          className="w-24"
          maxLength={4}
        />
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="project-start">Start date</Label>
          <Input
            id="project-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project-end">End date</Label>
          <Input
            id="project-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-1.5">
        <Label htmlFor="project-budget">
          Budget <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="project-budget"
          type="number"
          min="0"
          step="0.01"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="e.g. 2000"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        {isEditing ? (
          <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete
          </Button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            {isEditing ? 'Save Changes' : 'Add Project'}
          </Button>
        </div>
      </div>

      {project && (
        <ConfirmDialog
          open={confirmOpen}
          title={`Delete "${project.name}"?`}
          description={
            txCount > 0
              ? `It will be unlinked from ${txCount} transaction${txCount !== 1 ? 's' : ''}. This cannot be undone.`
              : 'This cannot be undone.'
          }
          confirmLabel="Delete"
          destructive
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </form>
  )
}
