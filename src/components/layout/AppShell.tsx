import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import ConfirmDialog from './ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/', label: ar.nav_calendar, end: true },
  { to: '/patients', label: ar.nav_patients, end: false },
  { to: '/dashboard', label: ar.nav_dashboard, end: false },
  { to: '/settings', label: ar.nav_settings, end: false },
]

// Shared layoutId: framer-motion snapshots this element's position when it
// unmounts on the old tab and animates the newly mounted one in from there,
// producing a pill that slides between tabs instead of popping between them.
function NavPill() {
  return (
    <motion.span
      layoutId="nav-active-pill"
      className="absolute inset-0 rounded-xl bg-primary-soft"
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
    />
  )
}

function NavItem({ to, label, end }: { to: string; label: string; end: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className="relative rounded-xl px-4 py-2 text-sm font-medium transition-colors"
    >
      {({ isActive }) => (
        <>
          {isActive && <NavPill />}
          <span
            className={
              'relative z-10 ' + (isActive ? 'text-primary-dark' : 'text-text-muted hover:text-text')
            }
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-20 border-b border-white/40 bg-surface/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold text-primary">{ar.appName}</span>
            <nav className="hidden items-center gap-1 sm:flex">
              {navItems.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </nav>
          </div>
          <Button variant="ghost" className="px-4" onClick={() => setLogoutConfirmOpen(true)}>
            {ar.nav_logout}
          </Button>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-border/60 px-4 py-2 sm:hidden">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>

      <ConfirmDialog
        open={logoutConfirmOpen}
        title={ar.nav_logoutConfirmTitle}
        body={ar.nav_logoutConfirmBody}
        danger={false}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          setLogoutConfirmOpen(false)
          void signOut()
        }}
      />
    </div>
  )
}
