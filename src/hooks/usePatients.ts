import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Patient } from '../types'

export interface PatientWithStats extends Patient {
  lastVisit: string | null
  nextAppointment: string | null
  totalVisits: number
}

interface AppointmentStub {
  patient_id: string
  starts_at: string
  status: string
}

// Clinic-scale data (tens to low hundreds of patients) makes a full refetch
// after each mutation simpler and safer than hand-rolled optimistic patching
// with rollback, so that's the trade-off made here.
export function usePatients() {
  const [patients, setPatients] = useState<PatientWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [patientsRes, appointmentsRes] = await Promise.all([
      supabase.from('patients').select('*').order('name'),
      supabase.from('appointments').select('patient_id, starts_at, status'),
    ])

    if (patientsRes.error) {
      setError(patientsRes.error.message)
      setPatients([])
      setLoading(false)
      return
    }

    const appointments = (appointmentsRes.data ?? []) as AppointmentStub[]
    const now = Date.now()

    const withStats: PatientWithStats[] = ((patientsRes.data ?? []) as Patient[]).map((patient) => {
      const own = appointments.filter((a) => a.patient_id === patient.id && a.status !== 'cancelled')
      const past = own.filter((a) => new Date(a.starts_at).getTime() <= now)
      const future = own.filter((a) => new Date(a.starts_at).getTime() > now)

      const lastVisit = past.length
        ? past.reduce((latest, a) => (a.starts_at > latest ? a.starts_at : latest), past[0].starts_at)
        : null
      const nextAppointment = future.length
        ? future.reduce((earliest, a) => (a.starts_at < earliest ? a.starts_at : earliest), future[0].starts_at)
        : null
      const totalVisits = own.filter((a) => a.status === 'completed').length

      return { ...patient, lastVisit, nextAppointment, totalVisits }
    })

    setPatients(withStats)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function createPatient(name: string, phone: string, notes: string) {
    const { data, error: insertError } = await supabase
      .from('patients')
      .insert({ name, phone, notes: notes || null })
      .select('*')
      .single()
    if (insertError) return { error: insertError.message, patient: null }
    await refresh()
    return { error: null, patient: data as Patient }
  }

  async function updatePatient(id: string, name: string, phone: string, notes: string) {
    const { error: updateError } = await supabase
      .from('patients')
      .update({ name, phone, notes: notes || null })
      .eq('id', id)
    if (updateError) return { error: updateError.message }
    await refresh()
    return { error: null }
  }

  async function deletePatient(id: string) {
    const { error: deleteError } = await supabase.from('patients').delete().eq('id', id)
    if (deleteError) return { error: deleteError.message }
    await refresh()
    return { error: null }
  }

  return { patients, loading, error, createPatient, updatePatient, deletePatient, refresh }
}
