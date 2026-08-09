import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { syncReminderForAppointment } from './useReminders'
import type { Appointment, AppointmentStatus, Clinic, VisitType } from '../types'

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
// `clinic` (id + reminder_hours_before) is needed to keep each appointment's
// reminder row in sync on save — see useReminders.syncReminderForAppointment.
export function useAppointments(rangeStart: Date, rangeEnd: Date, clinic: Clinic | null) {
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
    const { data, error: insertError } = await supabase
      .from('appointments')
      .insert({
        patient_id: input.patientId,
        doctor_id: input.doctorId,
        starts_at: input.startsAt,
        duration_minutes: input.durationMinutes,
        visit_type: input.visitType,
        notes: input.notes || null,
      })
      .select('id')
      .single()
    if (insertError) return { error: insertError.message }

    if (clinic) {
      await syncReminderForAppointment(data.id, clinic.id, input.startsAt, clinic.reminder_hours_before, false)
    }
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

    if (clinic) {
      await syncReminderForAppointment(id, clinic.id, input.startsAt, clinic.reminder_hours_before, false)
    }
    await refresh()
    return { error: null }
  }

  async function setAppointmentStatus(id: string, status: AppointmentStatus, startsAt?: string) {
    const { error: updateError } = await supabase.from('appointments').update({ status }).eq('id', id)
    if (updateError) return { error: updateError.message }

    if (clinic && status === 'cancelled' && startsAt) {
      await syncReminderForAppointment(id, clinic.id, startsAt, clinic.reminder_hours_before, true)
    }
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
