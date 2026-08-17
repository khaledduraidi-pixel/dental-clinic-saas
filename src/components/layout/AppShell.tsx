import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import ar from '../../i18n/ar'
import Icon, { type IconName } from '../ui/Icon'
import ConfirmDialog from './ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'

// Four destinations, same order everywhere. Mobile gets the M3 navigation bar
// (container-height 80px, active indicator 64×32 corner-full); desktop gets
// pill nav inside the top app bar (container-height 64px). See design.md §8.
const navItems: { to: string; label: string; icon: IconName; end: boolean }[] = [
  { to: '/', label: ar.nav_calendar, icon: 'calendar', end: true },
  { to: '/patients', label: ar.nav_patients, icon: 'users', end: false },
  { to: '/dashboard', label: ar.nav_dashboard, icon: 'chart', end: false },
  { to: '/settings', label: ar.nav_settings, icon: 'settings', end: false },
]

function BottomNav() {
  return (
    <nav
      aria-label={ar.appName}
      className="flex h-20 shrink-0 bg-surface-low sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {navItems.map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="flex flex-1 flex-col items-center justify-center gap-1 pt-3 text-label-sm font-semibold outline outline-2 -outline-offset-4 outline-transparent focus-visible:outline-primary"
        >
          {({ isActive }) => (
            <>
              <span className="relative flex h-8 w-16 items-center justify-center">
                {isActive && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-full bg-primary-container"
                    transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                  />
                )}
                <Icon
                  name={icon}
                  className={
                    'relative ' + (isActive ? 'text-on-primary-container' : 'text-on-surface-variant')
                  }
                />
              </span>
              <span className={isActive ? 'text-on-surface' : 'text-on-surface-variant'}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function DesktopNav() {
  return (
    <nav aria-label={ar.appName} className="hidden flex-1 items-center gap-1 sm:flex">
      {navItems.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="relative rounded-full px-4 py-2 text-label font-semibold outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-primary"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="nav-indicator-desktop"
                  className="absolute inset-0 rounded-full bg-primary-container"
                  transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                />
              )}
              <span
                className={
                  'relative ' + (isActive ? 'text-on-primary-container' : 'text-on-surface-variant')
                }
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* top app bar — 64px, headline title-large 22/28 at weight 400 */}
      <header className="flex h-16 shrink-0 items-center gap-4 px-4 sm:px-6">
        <span className="text-title-lg font-normal text-on-surface">{ar.appName}</span>
        <DesktopNav />
        <button
          type="button"
          onClick={() => setLogoutConfirmOpen(true)}
          aria-label={ar.nav_logout}
          className="ms-auto flex h-12 w-12 items-center justify-center rounded-full text-on-surface-variant outline outline-2 outline-offset-2 outline-transparent hover:bg-surface-high focus-visible:outline-primary sm:ms-0"
        >
          <Icon name="logout" />
        </button>
      </header>

      <main className="min-h-0 flex-1 px-4 pb-4 sm:px-6 sm:pb-6">{children}</main>

      <BottomNav />

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
