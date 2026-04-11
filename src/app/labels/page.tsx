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
import { useLabels, useTransactions } from '@/core/store'
import { LabelForm, LabelList } from '@/modules/labels'
import type { Label } from '@/core/types'

export default function LabelsPage() {
  const [editingLabel, setEditingLabel] = useState<Label | null>(null)
  const [isAdding, setIsAdding]         = useState(false)

  const labels       = useLabels()
  const transactions = useTransactions()

  const isDialogOpen = isAdding || editingLabel !== null

  function closeDialog() {
    setIsAdding(false)
    setEditingLabel(null)
  }

  return (
    <div className="flex flex-col h-full min-h-screen md:min-h-0 md:h-screen">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-4 border-b bg-background sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Labels</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {labels.length} label{labels.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="w-4 h-4 mr-1" />
          New Label
        </Button>
      </div>

      {/* ── Label list ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <LabelList
          labels={labels}
          transactions={transactions}
          onEdit={(label) => setEditingLabel(label)}
        />
      </div>

      {/* ── Add / Edit dialog ────────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isAdding ? 'New Label' : 'Edit Label'}
            </DialogTitle>
          </DialogHeader>
          <LabelForm
            label={editingLabel ?? undefined}
            onSuccess={closeDialog}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
