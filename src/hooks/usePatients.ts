import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ar from '../i18n/ar'
import { useClinic } from './useClinic'
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

export interface ImportPatientInput {
  name: string
  phone: string
  notes: string | null
}

// Clinic-scale data (tens to low hundreds of patients) makes a full refetch
// after each mutation simpler and safer than hand-rolled optimistic patching
// with rollback, so that's the trade-off made here.
export function usePatients() {
  const { clinic } = useClinic()
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
    if (!clinic) return { error: ar.common_error, patient: null }
    const { data, error: insertError } = await supabase
      .from('patients')
      .insert({ clinic_id: clinic.id, name, phone, notes: notes || null })
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

  // Isolated from updatePatient so saving a plan from the patient file never
  // has to round-trip the name/phone fields it isn't editing.
  async function updateTreatmentPlan(id: string, plan: string) {
    const { error: updateError } = await supabase
      .from('patients')
      .update({ treatment_plan: plan.trim() || null })
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

  // Bulk insert for the Settings "استيراد المرضى" flow — a single
  // round-trip instead of calling createPatient in a loop (which would
  // also mean one full refetch per row for a file that can be hundreds of
  // rows long). Caller is responsible for de-duplication against the
  // already-loaded `patients` list before calling this.
  async function importPatients(rows: ImportPatientInput[]) {
    if (!clinic) return { error: ar.common_error, inserted: 0 }
    if (rows.length === 0) return { error: null, inserted: 0 }
    const { data, error: insertError } = await supabase
      .from('patients')
      .insert(rows.map((r) => ({ clinic_id: clinic.id, name: r.name, phone: r.phone, notes: r.notes })))
      .select('id')
    if (insertError) return { error: insertError.message, inserted: 0 }
    await refresh()
    return { error: null, inserted: data?.length ?? 0 }
  }

  return { patients, loading, error, createPatient, updatePatient, updateTreatmentPlan, deletePatient, importPatients, refresh }
}
