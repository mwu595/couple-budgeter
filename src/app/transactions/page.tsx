'use client'

import { useState, useCallback } from 'react'
import { Plus, CheckSquare, X, Download, Tag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LabelPicker } from '@/components/LabelPicker'
import { OwnerPicker } from '@/components/OwnerPicker'
import { ProjectPicker } from '@/components/ProjectPicker'
import {
  useTransactions,
  useLabels,
  useUsers,
  useActivePeriod,
  useFilters,
  useProjects,
  useAppStore,
} from '@/core/store'
import { filterTransactions, sortTransactions, getDateRangeForPeriod, exportTransactionsToCsv } from '@/core/utils'
import { TransactionFeed, TransactionFilters, TransactionForm } from '@/modules/transactions'
import { PeriodSelector } from '@/components/PeriodSelector'
import type { OwnerId } from '@/core/types'

export default function TransactionsPage() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding]   = useState(false)

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode]       = useState(false)
  const [selectedIds, setSelectedIds]           = useState<Set<string>>(new Set())
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const transactions = useTransactions()
  const labels       = useLabels()
  const users        = useUsers()
  const projects     = useProjects()
  const activePeriod = useActivePeriod()
  const filters      = useFilters()

  const updateTransaction      = useAppStore((s) => s.updateTransaction)
  const bulkDeleteTransactions = useAppStore((s) => s.bulkDeleteTransactions)

  const dateRange  = getDateRangeForPeriod(activePeriod)
  const filtered   = filterTransactions(transactions, filters, dateRange).filter((tx) => tx.amount > 0)
  const sorted     = sortTransactions(filtered)

  const editingTransaction = editingId
    ? transactions.find((tx) => tx.id === editingId)
    : undefined

  const isDialogOpen = isAdding || editingId !== null

  function closeDialog() {
    setIsAdding(false)
    setEditingId(null)
  }

  function toggleSelectionMode() {
    setSelectionMode((prev) => !prev)
    setSelectedIds(new Set())
  }

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const allSelected = selectedIds.size === sorted.length && sorted.length > 0

  function handleSelectAll() {
    setSelectedIds(new Set(sorted.map((tx) => tx.id)))
  }

  function handleDeselectAll() {
    setSelectedIds(new Set())
  }

  // ── Bulk intersection state ────────────────────────────────────────────────
  // Compute which labels / project are common across ALL selected transactions.
  // These drive the toggle UX: if a label is in the intersection it appears
  // "selected" in the picker; clicking it removes it from all.

  const selectedTransactions = sorted.filter((tx) => selectedIds.has(tx.id))

  const commonLabelIds: string[] = selectedTransactions.length === 0 ? [] :
    selectedTransactions[0].labelIds.filter((lid) =>
      selectedTransactions.every((tx) => tx.labelIds.includes(lid))
    )

  const commonProjectId: string | undefined =
    selectedTransactions.length > 0 &&
    selectedTransactions.every((tx) => tx.projectId === selectedTransactions[0].projectId)
      ? selectedTransactions[0].projectId
      : undefined

  const commonOwnerId: OwnerId =
    selectedTransactions.length > 0 &&
    selectedTransactions.every((tx) => tx.ownerId === selectedTransactions[0].ownerId)
      ? selectedTransactions[0].ownerId
      : 'shared'

  // ── Bulk operations ────────────────────────────────────────────────────────

  // newCommonIds is the full new intersection after LabelPicker toggles one label.
  // For each selected tx: remove old common labels, apply new common labels,
  // keep transaction-specific labels intact.
  function handleBulkSetLabels(newCommonIds: string[]) {
    for (const id of selectedIds) {
      const tx = transactions.find((t) => t.id === id)
      if (!tx) continue
      const uniqueToTx = tx.labelIds.filter((lid) => !commonLabelIds.includes(lid))
      updateTransaction(id, { labelIds: [...uniqueToTx, ...newCommonIds] })
    }
  }

  function handleBulkSetOwner(ownerId: OwnerId) {
    for (const id of selectedIds) {
      updateTransaction(id, { ownerId })
    }
  }

  function handleBulkSetProject(projectId: string | undefined) {
    for (const id of selectedIds) {
      updateTransaction(id, { projectId })
    }
  }

  function handleExport() {
    const filename = `transactions-${dateRange.start}-to-${dateRange.end}.csv`
    exportTransactionsToCsv(sorted, labels, users, filename)
  }

  function handleBulkDelete() {
    bulkDeleteTransactions(Array.from(selectedIds))
    setSelectedIds(new Set())
    setSelectionMode(false)
  }

  return (
    <div className="flex flex-col h-full min-h-screen md:min-h-0 md:h-screen">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      {selectionMode ? (
        // ── Selection mode header ──────────────────────────────────────
        <div className="flex items-center justify-between px-4 py-4 border-b bg-background sticky top-0 z-20 gap-2">
          {/* Left: delete + count */}
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={selectedIds.size === 0}
              onClick={() => setConfirmDeleteOpen(true)}
              aria-label="Delete selected"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium tabular-nums">
                {selectedIds.size} selected
              </span>
              <button
                onClick={allSelected ? handleDeselectAll : handleSelectAll}
                className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 text-left"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
          </div>

          {/* Right: bulk actions + cancel */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Labels */}
            <LabelPicker
              labels={labels}
              selectedIds={commonLabelIds}
              onChange={handleBulkSetLabels}
              triggerContent={
                <span className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-border text-xs hover:bg-accent transition-colors">
                  <Tag className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Labels</span>
                  {commonLabelIds.length > 0 && (
                    <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                      {commonLabelIds.length}
                    </span>
                  )}
                </span>
              }
            />

            {/* Project */}
            {projects.length > 0 && (
              <ProjectPicker
                projects={projects}
                selectedId={commonProjectId}
                onChange={handleBulkSetProject}
                triggerClassName="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-border text-xs hover:bg-accent transition-colors"
              />
            )}

            {/* Owner */}
            <OwnerPicker
              users={users}
              value={commonOwnerId}
              onChange={handleBulkSetOwner}
              triggerClassName="inline-flex items-center justify-center px-2 py-1.5 rounded-md border border-border text-sm hover:bg-accent transition-colors w-auto h-auto"
            />

            {/* Cancel */}
            <Button variant="ghost" size="sm" onClick={toggleSelectionMode} className="shrink-0 px-2">
              <X className="w-4 h-4" />
              <span className="hidden md:inline ml-1">Cancel</span>
            </Button>
          </div>
        </div>
      ) : (
        // ── Normal header ──────────────────────────────────────────────
        <div className="flex items-center justify-between px-4 py-4 border-b bg-background sticky top-0 z-20">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Expenses</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sorted.length !== transactions.length
                ? `${sorted.length} of ${transactions.length}`
                : sorted.length}{' '}
              transaction{sorted.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectionMode}
            >
              <CheckSquare className="w-4 h-4 mr-1" />
              Select
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              disabled={sorted.length === 0}
              aria-label="Export to CSV"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      )}

      {/* ── Period selector ──────────────────────────────────────────────── */}
      <PeriodSelector />

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <TransactionFilters users={users} labels={labels} projects={projects} />

      {/* ── Feed ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <TransactionFeed
          transactions={sorted}
          labels={labels}
          users={users}
          projects={projects}
          onEditTransaction={setEditingId}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
        />
      </div>

      {/* ── Delete confirm ───────────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`Delete ${selectedIds.size} transaction${selectedIds.size !== 1 ? 's' : ''}?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setConfirmDeleteOpen(false); handleBulkDelete() }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      {/* ── Add / Edit dialog ────────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isAdding ? 'Add Transaction' : 'Edit Transaction'}
            </DialogTitle>
          </DialogHeader>
          <TransactionForm
            transaction={editingTransaction}
            onSuccess={closeDialog}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
