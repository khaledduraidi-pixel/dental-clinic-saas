import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Doctor } from '../types'

// Doctors are never deleted (appointments reference doctor_id with ON DELETE
// RESTRICT) — the product action is deactivate, which just hides them from
// new scheduling while keeping their history intact.
export function useDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('doctors')
      .select('*')
      .order('created_at')

    if (fetchError) {
      setError(fetchError.message)
      setDoctors([])
    } else {
      setDoctors((data as Doctor[] | null) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function createDoctor(name: string, color: string) {
    const { error: insertError } = await supabase.from('doctors').insert({ name, color })
    if (insertError) return { error: insertError.message }
    await refresh()
    return { error: null }
  }

  async function updateDoctor(id: string, name: string, color: string) {
    const { error: updateError } = await supabase.from('doctors').update({ name, color }).eq('id', id)
    if (updateError) return { error: updateError.message }
    await refresh()
    return { error: null }
  }

  async function setDoctorActive(id: string, active: boolean) {
    const { error: updateError } = await supabase.from('doctors').update({ active }).eq('id', id)
    if (updateError) return { error: updateError.message }
    await refresh()
    return { error: null }
  }

  return { doctors, loading, error, createDoctor, updateDoctor, setDoctorActive, refresh }
}
