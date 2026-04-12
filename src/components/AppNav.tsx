'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Receipt, TrendingUp, Tags, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

export const NAV_LINKS = [
  { href: '/dashboard',    label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Expenses',  icon: Receipt },
  { href: '/income',       label: 'Income',    icon: TrendingUp },
  { href: '/tags',         label: 'Tags',      icon: Tags },
  { href: '/settings',     label: 'Settings',  icon: Settings },
] as const

export function AppNav() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* ── Desktop sidebar (md+) ────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-sidebar border-r border-sidebar-border">
        {/* Wordmark */}
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center">
            <span className="font-bold text-xl tracking-tight text-foreground">Couple Budgeter</span>
          </div>
        </div>

        <nav className="flex-1 px-3 pt-3 space-y-0.5" aria-label="Main navigation">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-colors',
                isActive(href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
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
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-sidebar border-t border-sidebar-border"
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
                isActive(href) ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive(href) && 'stroke-[2.5]')} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
