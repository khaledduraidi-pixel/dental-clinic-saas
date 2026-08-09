import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import ar from '../i18n/ar'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (
    email: string,
    password: string,
    clinicName: string,
    clinicPhone: string,
  ) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) return { error: ar.common_error }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? ar.auth_error : null }
  }

  async function signUp(email: string, password: string, clinicName: string, clinicPhone: string) {
    if (!isSupabaseConfigured) return { error: ar.common_error }

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: ar.auth_signupError }

    // Email confirmation must be disabled in the Supabase project (per spec:
    // "no email verification gate in the MVP") — otherwise there's no active
    // session yet here and the RPC below has no auth.uid() to work with.
    if (!data.session) return { error: ar.auth_signupError }

    const { error: rpcError } = await supabase.rpc('create_clinic_with_owner', {
      clinic_name: clinicName,
      clinic_phone: clinicPhone,
    })
    if (rpcError) return { error: ar.auth_signupError }

    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, session, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
