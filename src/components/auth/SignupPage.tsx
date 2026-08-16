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
    <div className="flex min-h-screen">
      <div className="hidden bg-primary-dark p-12 text-primary-ink sm:flex sm:w-2/5 sm:flex-col sm:justify-between lg:w-[45%]">
        <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-accent" />
          {ar.appName}
        </span>
        <p className="max-w-sm text-3xl font-bold leading-snug tracking-tight">{ar.appTagline}</p>
        <span />
      </div>

      <div className="flex flex-1 flex-col justify-center bg-bg px-6 py-12 sm:px-16">
        <motion.div
          className="mx-auto w-full max-w-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
        >
          <span className="mb-8 flex items-center gap-2 text-lg font-bold tracking-tight text-primary-dark sm:hidden">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-accent" />
            {ar.appName}
          </span>

          <h1 className="text-2xl font-bold tracking-tight text-text">{ar.auth_signupTitle}</h1>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
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

          <p className="mt-6 text-sm text-text-muted">
            {ar.auth_haveAccount}{' '}
            <Link to="/login" className="font-medium text-primary-dark hover:underline">
              {ar.auth_goLogin}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
