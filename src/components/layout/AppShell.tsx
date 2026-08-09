import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import ar from '../../i18n/ar'

const navItems = [
  { to: '/', label: ar.nav_calendar, end: true },
  { to: '/patients', label: ar.nav_patients, end: false },
  { to: '/dashboard', label: ar.nav_dashboard, end: false },
  { to: '/settings', label: ar.nav_settings, end: false },
]

function linkClasses(isActive: boolean) {
  return [
    'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary-soft text-primary-dark'
      : 'text-text-muted hover:bg-surface hover:text-text',
  ].join(' ')
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold text-primary">{ar.appName}</span>
            <nav className="hidden items-center gap-1 sm:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => linkClasses(isActive)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-medium text-text-muted hover:bg-bg hover:text-text"
          >
            {ar.nav_logout}
          </button>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 sm:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => linkClasses(isActive) + ' whitespace-nowrap'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
