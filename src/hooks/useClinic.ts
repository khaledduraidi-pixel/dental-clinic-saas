import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Clinic } from '../types'
import { useAuth } from './useAuth'

// RLS scopes `clinics` to rows the current user belongs to, and the MVP is
// one clinic per user, so a plain select+single is enough — no clinic_id
// needs to be threaded through the app explicitly.
export function useClinic() {
  const { user } = useAuth()
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setClinic(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    supabase
      .from('clinics')
      .select('*')
      .single()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        setClinic((data as Clinic | null) ?? null)
        setError(fetchError ? fetchError.message : null)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  return { clinic, loading, error }
}
