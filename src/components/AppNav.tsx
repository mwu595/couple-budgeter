'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Receipt, Tag, FolderOpen, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/labels',       label: 'Labels',       icon: Tag },
  { href: '/projects',     label: 'Projects',     icon: FolderOpen },
  { href: '/settings',     label: 'Settings',     icon: Settings },
] as const

export function AppNav() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* ── Desktop sidebar (md+) ────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-sidebar">
        {/* Wordmark */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            <span className="font-bold text-sm tracking-tight text-foreground">Money Tracker</span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5" aria-label="Main navigation">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* ── Mobile bottom tab bar (< md) ─────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-sidebar shadow-[0_-1px_0_0_var(--border)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Main navigation"
      >
        <div className="flex">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 min-h-[56px] text-[10px] font-medium transition-colors',
                isActive(href) ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
