import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import ar from '../i18n/ar'
import type { Clinic } from '../types'
import { useAuth } from './useAuth'

export interface ClinicUpdateInput {
  name: string
  phone: string
  working_hours_start: string
  working_hours_end: string
  reminder_hours_before: 12 | 24 | 48
  whatsapp_mode: 'mock' | 'live'
  whatsapp_phone_number_id: string | null
}

interface ClinicContextValue {
  clinic: Clinic | null
  loading: boolean
  error: string | null
  updateClinic: (input: Partial<ClinicUpdateInput>) => Promise<{ error: string | null }>
  refresh: () => Promise<void>
}

const ClinicContext = createContext<ClinicContextValue | null>(null)

// A single shared fetch for the whole app — several components on the same
// page (e.g. the settings screen) both read and write clinic fields, and
// each needs to see the others' saves immediately rather than holding its
// own stale copy until a full reload.
export function ClinicProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setClinic(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase.from('clinics').select('*').single()
    setClinic((data as Clinic | null) ?? null)
    setError(fetchError ? fetchError.message : null)
    setLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function updateClinic(input: Partial<ClinicUpdateInput>) {
    if (!clinic) return { error: ar.common_error }
    const { data, error: updateError } = await supabase
      .from('clinics')
      .update(input)
      .eq('id', clinic.id)
      .select('*')
      .single()
    if (updateError) return { error: updateError.message }
    setClinic(data as Clinic)
    return { error: null }
  }

  return (
    <ClinicContext.Provider value={{ clinic, loading, error, updateClinic, refresh }}>
      {children}
    </ClinicContext.Provider>
  )
}

export function useClinic() {
  const ctx = useContext(ClinicContext)
  if (!ctx) throw new Error('useClinic must be used within ClinicProvider')
  return ctx
}
