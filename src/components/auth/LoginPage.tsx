import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import ar from '../../i18n/ar'
import Button from '../ui/Button'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <motion.div
        className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-lg"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
      >
        <h1 className="text-center text-lg font-bold text-primary">{ar.appName}</h1>
        <h2 className="mt-1 text-center text-sm text-text-muted">{ar.auth_loginTitle}</h2>

        <form className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="email">
              {ar.auth_email}
            </label>
            <input
              id="email"
              type="email"
              className="block w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="password">
              {ar.auth_password}
            </label>
            <input
              id="password"
              type="password"
              className="block w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <Button type="submit" className="mt-2 w-full">
            {ar.auth_loginButton}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          {ar.auth_noAccount}{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            {ar.auth_goSignup}
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
