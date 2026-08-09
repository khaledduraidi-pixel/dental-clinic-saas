import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [clinicName, setClinicName] = useState('')
  const [clinicPhone, setClinicPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: signupError } = await signUp(email, password, clinicName, clinicPhone)
    setLoading(false)
    if (signupError) {
      setError(signupError)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <motion.div
        className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-lg"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
      >
        <h1 className="text-center text-lg font-bold text-primary">{ar.appName}</h1>
        <h2 className="mt-1 text-center text-sm text-text-muted">{ar.auth_signupTitle}</h2>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="clinicName">
              {ar.auth_clinicName}
            </label>
            <input
              id="clinicName"
              type="text"
              required
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="block w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="clinicPhone">
              {ar.auth_clinicPhone}
            </label>
            <input
              id="clinicPhone"
              type="tel"
              required
              value={clinicPhone}
              onChange={(e) => setClinicPhone(e.target.value)}
              className="block w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="email">
              {ar.auth_email}
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <Button type="submit" className="mt-2 w-full" loading={loading}>
            {ar.auth_signupButton}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          {ar.auth_haveAccount}{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {ar.auth_goLogin}
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
