import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import Input from '../ui/Input'
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
          <h2 className="text-sm text-text-muted">{ar.auth_signupTitle}</h2>
        </div>

        <form
          className="space-y-4 rounded-2xl border border-border bg-surface p-8 shadow-sm"
          onSubmit={handleSubmit}
        >
          <Input
            id="clinicName"
            label={ar.auth_clinicName}
            type="text"
            required
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
          />
          <Input
            id="clinicPhone"
            label={ar.auth_clinicPhone}
            type="tel"
            required
            value={clinicPhone}
            onChange={(e) => setClinicPhone(e.target.value)}
          />
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
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p role="alert" className="rounded-xl bg-error-soft px-3 py-2.5 text-sm text-error">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-2 w-full" loading={loading}>
            {ar.auth_signupButton}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          {ar.auth_haveAccount}{' '}
          <Link to="/login" className="font-medium text-primary-dark hover:underline">
            {ar.auth_goLogin}
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
