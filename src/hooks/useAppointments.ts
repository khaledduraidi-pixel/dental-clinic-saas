import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Appointment, AppointmentStatus, VisitType } from '../types'

export interface AppointmentWithRelations extends Appointment {
  patients: { id: string; name: string; phone: string } | null
  doctors: { id: string; name: string; color: string } | null
}

export interface AppointmentInput {
  patientId: string
  doctorId: string
  startsAt: string // ISO, UTC
  durationMinutes: 15 | 30 | 45 | 60
  visitType: VisitType
  notes: string
}

// Fetches everything in [rangeStart, rangeEnd) once and lets the calendar
// views filter by doctor client-side — clinic-scale appointment volume makes
// a full range fetch simpler than re-querying on every filter chip toggle.
export function useAppointments(rangeStart: Date, rangeEnd: Date) {
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const rangeStartIso = rangeStart.toISOString()
  const rangeEndIso = rangeEnd.toISOString()

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('appointments')
      .select('*, patients(id, name, phone), doctors(id, name, color)')
      .gte('starts_at', rangeStartIso)
      .lt('starts_at', rangeEndIso)
      .order('starts_at')

    if (fetchError) {
      setError(fetchError.message)
      setAppointments([])
    } else {
      setAppointments((data as AppointmentWithRelations[] | null) ?? [])
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStartIso, rangeEndIso])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function createAppointment(input: AppointmentInput) {
    const { error: insertError } = await supabase.from('appointments').insert({
      patient_id: input.patientId,
      doctor_id: input.doctorId,
      starts_at: input.startsAt,
      duration_minutes: input.durationMinutes,
      visit_type: input.visitType,
      notes: input.notes || null,
    })
    if (insertError) return { error: insertError.message }
    await refresh()
    return { error: null }
  }

  async function updateAppointment(id: string, input: AppointmentInput) {
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        patient_id: input.patientId,
        doctor_id: input.doctorId,
        starts_at: input.startsAt,
        duration_minutes: input.durationMinutes,
        visit_type: input.visitType,
        notes: input.notes || null,
      })
      .eq('id', id)
    if (updateError) return { error: updateError.message }
    await refresh()
    return { error: null }
  }

  async function setAppointmentStatus(id: string, status: AppointmentStatus) {
    const { error: updateError } = await supabase.from('appointments').update({ status }).eq('id', id)
    if (updateError) return { error: updateError.message }
    await refresh()
    return { error: null }
  }

  return {
    appointments,
    loading,
    error,
    createAppointment,
    updateAppointment,
    setAppointmentStatus,
    refresh,
  }
}
