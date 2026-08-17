import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
    const { error: signUpError } = await signUp(email, password, clinicName, clinicPhone)
    setLoading(false)
    if (signUpError) {
      setError(signUpError)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface px-4 py-10 sm:justify-center">
      <div className="mx-auto w-full max-w-md">
        <span className="text-title-lg font-normal text-on-surface">{ar.appName}</span>
        <h1 className="mt-8 text-headline font-normal text-on-surface">{ar.auth_signupTitle}</h1>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
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
            dir="ltr"
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
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p role="alert" className="rounded-md bg-error-container px-4 py-3 text-body-sm text-on-error-container">
              {error}
            </p>
          )}

          <Button type="submit" variant="filled" className="w-full" loading={loading}>
            {ar.auth_signupButton}
          </Button>
        </form>

        <p className="mt-8 text-body-sm text-on-surface-variant">
          {ar.auth_haveAccount}{' '}
          <Link to="/login" className="font-semibold text-primary underline underline-offset-4">
            {ar.auth_goLogin}
          </Link>
        </p>
      </div>
    </div>
  )
}
