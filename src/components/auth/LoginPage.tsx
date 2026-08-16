import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { useAuth } from '../../hooks/useAuth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: signInError } = await signIn(email, password)
    setLoading(false)
    if (signInError) {
      setError(signInError)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
      >
        <div className="mb-8 flex flex-col items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-accent" />
          <h1 className="text-xl font-bold tracking-tight text-primary-dark">{ar.appName}</h1>
          <h2 className="text-sm text-text-muted">{ar.auth_loginTitle}</h2>
        </div>

        <form
          className="space-y-4 rounded-2xl border border-border bg-surface p-8 shadow-sm"
          onSubmit={handleSubmit}
        >
          <Input
            id="email"
            label={ar.auth_email}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="password"
            label={ar.auth_password}
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p role="alert" className="rounded-xl bg-error-soft px-3 py-2.5 text-sm text-error">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-2 w-full" loading={loading}>
            {ar.auth_loginButton}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          {ar.auth_noAccount}{' '}
          <Link to="/signup" className="font-medium text-primary-dark hover:underline">
            {ar.auth_goSignup}
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
