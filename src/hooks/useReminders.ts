import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateAr, formatTimeAr } from '../lib/dates'
import { isWhatsAppMockMode, renderReminderMessage } from '../lib/whatsapp'
import type { Clinic } from '../types'

// Keeps the single reminders row for an appointment in sync with its
// current starts_at/cancelled state. Only ever touches a 'pending' reminder
// or creates one from scratch — a reminder that already fired ('sent') is
// left alone as history, matching the spec's "update or skip the pending
// reminder" wording exactly.
export async function syncReminderForAppointment(
  appointmentId: string,
  clinicId: string,
  startsAtIso: string,
  reminderHoursBefore: number,
  cancelled: boolean,
) {
  const scheduledFor = new Date(new Date(startsAtIso).getTime() - reminderHoursBefore * 3_600_000)
  const hasLeadTime = !cancelled && scheduledFor.getTime() > Date.now()

  const { data: existing } = await supabase
    .from('reminders')
    .select('*')
    .eq('appointment_id', appointmentId)
    .maybeSingle()

  if (!hasLeadTime) {
    // Cancelled, or now too close in time for a reminder to make sense.
    if (existing && existing.status === 'pending') {
      await supabase.from('reminders').update({ status: 'cancelled' }).eq('id', existing.id)
    }
    return
  }

  if (!existing) {
    await supabase.from('reminders').insert({
      clinic_id: clinicId,
      appointment_id: appointmentId,
      status: 'pending',
      scheduled_for: scheduledFor.toISOString(),
    })
  } else if (existing.status === 'pending') {
    await supabase.from('reminders').update({ scheduled_for: scheduledFor.toISOString() }).eq('id', existing.id)
  }
  // 'sent' / 'failed' / 'cancelled' reminders are left as-is.
}

interface AppointmentForReminder {
  id: string
  starts_at: string
  patients: { name: string; phone: string } | null
}

// The mock "send": renders the approved template and logs it, exactly what
// the live Edge Function will do server-side once Meta credentials exist —
// only the transport differs.
async function mockSend(
  reminderId: string,
  appointment: AppointmentForReminder,
  clinic: Clinic,
): Promise<{ error: string | null }> {
  if (!appointment.patients) return { error: 'missing patient' }

  const body = renderReminderMessage({
    patientName: appointment.patients.name,
    clinicName: clinic.name,
    dateLabel: formatDateAr(appointment.starts_at, clinic.timezone),
    timeLabel: formatTimeAr(appointment.starts_at, clinic.timezone),
  })

  const { error: logError } = await supabase.from('messages_log').insert({
    clinic_id: clinic.id,
    reminder_id: reminderId,
    appointment_id: appointment.id,
    patient_phone: appointment.patients.phone,
    body,
    status: 'sent',
  })
  if (logError) return { error: logError.message }

  const { error: updateError } = await supabase
    .from('reminders')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', reminderId)
  return { error: updateError ? updateError.message : null }
}

// Manual "resend reminder" — works on demand regardless of scheduled_for,
// and creates the reminder row first if none exists yet (e.g. the
// appointment was booked with too little lead time to auto-generate one).
export function useReminders() {
  async function resendReminder(appointment: AppointmentForReminder, clinic: Clinic) {
    if (!isWhatsAppMockMode()) {
      return { error: 'sending is only available in mock mode until WhatsApp is connected' }
    }

    const { data: existing } = await supabase
      .from('reminders')
      .select('*')
      .eq('appointment_id', appointment.id)
      .maybeSingle()

    let reminderId = existing?.id as string | undefined
    if (!reminderId) {
      const { data: created, error: insertError } = await supabase
        .from('reminders')
        .insert({
          clinic_id: clinic.id,
          appointment_id: appointment.id,
          status: 'pending',
          scheduled_for: new Date().toISOString(),
        })
        .select('*')
        .single()
      if (insertError) return { error: insertError.message }
      reminderId = created.id
    }

    return mockSend(reminderId!, appointment, clinic)
  }

  return { resendReminder }
}

const POLL_INTERVAL_MS = 30_000

// Simulates the pg_cron-driven send-reminders Edge Function client-side,
// purely so the pipeline is demoable before that function exists (Step 9).
// Once live mode is wired up, sending is the server's job on its own
// schedule — this must not run then, so it's gated on mock mode.
export function useReminderAutoProcessor(clinic: Clinic | null) {
  const processingRef = useRef(false)

  useEffect(() => {
    if (!clinic || !isWhatsAppMockMode()) return

    async function tick() {
      if (processingRef.current || !clinic) return
      processingRef.current = true
      try {
        const { data: due } = await supabase
          .from('reminders')
          .select('*, appointments(id, starts_at, patients(name, phone))')
          .eq('status', 'pending')
          .lte('scheduled_for', new Date().toISOString())

        for (const reminder of due ?? []) {
          const appointment = reminder.appointments
          if (appointment) await mockSend(reminder.id, appointment, clinic)
        }
      } finally {
        processingRef.current = false
      }
    }

    void tick()
    const interval = setInterval(tick, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [clinic])
}
