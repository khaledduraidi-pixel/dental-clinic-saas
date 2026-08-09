import { Link } from 'react-router-dom'
import ar from '../../i18n/ar'

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-lg">
        <h1 className="text-center text-lg font-bold text-primary">{ar.appName}</h1>
        <h2 className="mt-1 text-center text-sm text-text-muted">{ar.auth_signupTitle}</h2>

        <form className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="clinicName">
              {ar.auth_clinicName}
            </label>
            <input
              id="clinicName"
              type="text"
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
          <button
            type="submit"
            className="mt-2 h-11 w-full rounded-xl bg-primary text-sm font-medium text-white hover:bg-primary-dark"
          >
            {ar.auth_signupButton}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          {ar.auth_haveAccount}{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {ar.auth_goLogin}
          </Link>
        </p>
      </div>
    </div>
  )
}
