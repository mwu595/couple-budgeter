'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  useLabels,
  useProjects,
  useAccounts,
  useTransactions,
  useAppStore,
} from '@/core/store'
import { LabelForm, LabelList } from '@/modules/labels'
import { ProjectForm, ProjectList } from '@/modules/projects'
import type { Label, Project, Account } from '@/core/types'

// ── Dialog state union ────────────────────────────────────────────────────────
type DialogState =
  | { kind: 'none' }
  | { kind: 'project-add' }
  | { kind: 'project-edit'; project: Project }
  | { kind: 'label-add' }
  | { kind: 'label-edit'; label: Label }
  | { kind: 'account-add' }
  | { kind: 'account-edit'; account: Account }

export default function TagsPage() {
  const labels       = useLabels()
  const projects     = useProjects()
  const accounts     = useAccounts()
  const transactions = useTransactions()

  const addAccount    = useAppStore((s) => s.addAccount)
  const updateAccount = useAppStore((s) => s.updateAccount)
  const deleteAccount = useAppStore((s) => s.deleteAccount)

  const [dialog, setDialog]               = useState<DialogState>({ kind: 'none' })
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)
  const [accountNameInput, setAccountNameInput] = useState('')
  const [accountSaving, setAccountSaving] = useState(false)

  const txCountByAccount = accounts.reduce<Record<string, number>>((acc, account) => {
    acc[account.id] = transactions.filter((tx) => tx.accountName === account.name).length
    return acc
  }, {})

  // ── Account dialog helpers ─────────────────────────────────────────────────
  function openAccountAdd() {
    setAccountNameInput('')
    setDialog({ kind: 'account-add' })
  }

  function openAccountEdit(account: Account) {
    setAccountNameInput(account.name)
    setDialog({ kind: 'account-edit', account })
  }

  function closeDialog() {
    setDialog({ kind: 'none' })
    setAccountNameInput('')
  }

  async function handleAccountSave() {
    const trimmed = accountNameInput.trim()
    if (!trimmed) return
    setAccountSaving(true)
    try {
      if (dialog.kind === 'account-add') {
        await addAccount(trimmed)
      } else if (dialog.kind === 'account-edit') {
        await updateAccount(dialog.account.id, trimmed)
      }
      closeDialog()
    } finally {
      setAccountSaving(false)
    }
  }

  async function handleAccountDelete() {
    if (!deletingAccount) return
    await deleteAccount(deletingAccount.id)
    setDeletingAccount(null)
  }

  // ── Derived dialog open flags ──────────────────────────────────────────────
  const projectDialogOpen = dialog.kind === 'project-add' || dialog.kind === 'project-edit'
  const labelDialogOpen   = dialog.kind === 'label-add'   || dialog.kind === 'label-edit'
  const accountDialogOpen = dialog.kind === 'account-add' || dialog.kind === 'account-edit'

  return (
    <div className="flex flex-col h-full min-h-screen md:min-h-0 md:h-screen">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b bg-background sticky top-0 z-20">
        <h1 className="text-lg font-bold tracking-tight">Tags</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your projects, labels, and accounts
        </p>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4 space-y-4">

        {/* ══ Projects ══════════════════════════════════════════════════════ */}
        <section className="bg-card border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <span className="text-sm font-medium">Projects</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {projects.length}
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'project-add' })}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Project
            </Button>
          </div>

          <ProjectList
            projects={projects}
            transactions={transactions}
            onEdit={(project) => setDialog({ kind: 'project-edit', project })}
          />
        </section>

        {/* ══ Labels ════════════════════════════════════════════════════════ */}
        <section className="bg-card border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <span className="text-sm font-medium">Labels</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {labels.length}
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'label-add' })}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Label
            </Button>
          </div>

          <LabelList
            labels={labels}
            transactions={transactions}
            onEdit={(label) => setDialog({ kind: 'label-edit', label })}
          />
        </section>

        {/* ══ Accounts ══════════════════════════════════════════════════════ */}
        <section className="bg-card border border-border shadow-[rgba(0,0,0,0.08)_0px_2px_8px_0px] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <span className="text-sm font-medium">Accounts</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {accounts.length}
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={openAccountAdd}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Account
            </Button>
          </div>

          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
              <CreditCard className="w-6 h-6 opacity-30" />
              <p className="text-sm">No accounts yet</p>
            </div>
          ) : (
            <ul className="divide-y">
              {accounts.map((account) => {
                const count = txCountByAccount[account.id] ?? 0
                return (
                  <li
                    key={account.id}
                    className="flex items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{account.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {count} transaction{count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openAccountEdit(account)}
                        aria-label={`Edit ${account.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeletingAccount(account)}
                        aria-label={`Delete ${account.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ── Project dialog ───────────────────────────────────────────────── */}
      <Dialog open={projectDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog.kind === 'project-add' ? 'New Project' : 'Edit Project'}
            </DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={dialog.kind === 'project-edit' ? dialog.project : undefined}
            onSuccess={closeDialog}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>

      {/* ── Label dialog ─────────────────────────────────────────────────── */}
      <Dialog open={labelDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog.kind === 'label-add' ? 'New Label' : 'Edit Label'}
            </DialogTitle>
          </DialogHeader>
          <LabelForm
            label={dialog.kind === 'label-edit' ? dialog.label : undefined}
            onSuccess={closeDialog}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>

      {/* ── Account dialog ───────────────────────────────────────────────── */}
      <Dialog open={accountDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {dialog.kind === 'account-add' ? 'New Account' : 'Edit Account'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="account-name">
                Name
              </label>
              <Input
                id="account-name"
                placeholder="e.g. Chase Sapphire"
                value={accountNameInput}
                onChange={(e) => setAccountNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAccountSave() }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAccountSave}
                disabled={!accountNameInput.trim() || accountSaving}
              >
                {accountSaving ? 'Saving…' : dialog.kind === 'account-add' ? 'Create' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Account delete confirm ───────────────────────────────────────── */}
      {deletingAccount && (
        <ConfirmDialog
          open
          title={`Delete "${deletingAccount.name}"?`}
          description={
            txCountByAccount[deletingAccount.id]
              ? `This account has ${txCountByAccount[deletingAccount.id]} transaction${txCountByAccount[deletingAccount.id] !== 1 ? 's' : ''}. They will keep their account name but this account will be removed.`
              : 'This account will be permanently removed.'
          }
          confirmLabel="Delete"
          destructive
          onConfirm={handleAccountDelete}
          onCancel={() => setDeletingAccount(null)}
        />
      )}
    </div>
  )
}
