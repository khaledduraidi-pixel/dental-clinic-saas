import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { syncReminderForAppointment } from './useReminders'
import ar from '../i18n/ar'
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

// Postgres error code for a violated EXCLUDE constraint — the
// appointments_no_doctor_overlap guard from migration 0002. The app's own
// pre-save check (findDoctorConflict) catches this in the common case; this
// code only fires when two saves race each other, which the DB constraint
// is the only thing that can actually prevent.
const EXCLUSION_VIOLATION_CODE = '23P01'

interface ConflictCandidate {
  id: string
  starts_at: string
  duration_minutes: number
  patients: { name: string } | null
}

// Longest bookable duration (60 min) — an appointment starting up to this
// long before our window could still overlap into it.
const MAX_DURATION_MS = 60 * 60_000

async function findDoctorConflict(
  doctorId: string,
  startsAt: string,
  durationMinutes: number,
  excludeAppointmentId?: string,
): Promise<ConflictCandidate | null> {
  const start = new Date(startsAt)
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  const lookback = new Date(start.getTime() - MAX_DURATION_MS)

  const { data } = await supabase
    .from('appointments')
    .select('id, starts_at, duration_minutes, patients(name)')
    .eq('doctor_id', doctorId)
    .neq('status', 'cancelled')
    .gte('starts_at', lookback.toISOString())
    .lt('starts_at', end.toISOString())

  const rows = (data as ConflictCandidate[] | null) ?? []
  return (
    rows.find((row) => {
      if (excludeAppointmentId && row.id === excludeAppointmentId) return false
      const rowStart = new Date(row.starts_at)
      const rowEnd = new Date(rowStart.getTime() + row.duration_minutes * 60_000)
      return rowStart < end && rowEnd > start
    }) ?? null
  )
}

function conflictMessage(conflict: ConflictCandidate): string {
  return conflict.patients ? `${ar.appt_conflictError} (${conflict.patients.name})` : ar.appt_conflictError
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
    const conflict = await findDoctorConflict(input.doctorId, input.startsAt, input.durationMinutes)
    if (conflict) return { error: conflictMessage(conflict) }

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
    if (insertError) {
      return { error: insertError.code === EXCLUSION_VIOLATION_CODE ? ar.appt_conflictError : insertError.message }
    }

    if (clinic) {
      await syncReminderForAppointment(data.id, clinic.id, input.startsAt, clinic.reminder_hours_before, false)
    }
    await refresh()
    return { error: null }
  }

  async function updateAppointment(id: string, input: AppointmentInput) {
    const conflict = await findDoctorConflict(input.doctorId, input.startsAt, input.durationMinutes, id)
    if (conflict) return { error: conflictMessage(conflict) }

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
    if (updateError) {
      return { error: updateError.code === EXCLUSION_VIOLATION_CODE ? ar.appt_conflictError : updateError.message }
    }

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
