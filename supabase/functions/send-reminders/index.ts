// Invoked every 15 minutes by pg_cron (see supabase/migrations/0003_send_reminders_cron.sql),
// and on-demand by the client's "resend reminder" action for clinics in
// live mode (see src/hooks/useReminders.ts — the client never calls the
// Meta Cloud API directly, only this function does).
//
// For every due, pending reminder belonging to a clinic in live mode:
//   1. atomically claim it (conditional pending -> sent update; a 0-row
//      result means a concurrent invocation already claimed it, so skip)
//   2. call the WhatsApp Cloud API template-message endpoint
//   3. record the provider message id and a messages_log row
//   4. on failure, flip the reminder to 'failed' and log that too
//
// Reminders for clinics still in mock mode are left untouched — those are
// sent client-side by useReminderAutoProcessor instead, so a clinic is
// always handled by exactly one pipeline at a time.
//
// NOTE: this file runs on Deno and has not been executed in this sandbox
// (no Deno runtime available here) — it has only been reviewed statically.
// Verify it against a real Supabase project before relying on it.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { REMINDER_TEMPLATE_NAME, renderReminderMessage } from '../_shared/whatsapp-template.ts'
import { formatDateAr, formatTimeAr } from '../_shared/dates.ts'
import { sendTemplateMessage } from '../_shared/whatsapp-send.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// Batch size per tick — comfortably above what a single-clinic MVP produces
// in a 15-minute window, while bounding worst-case function runtime.
const BATCH_LIMIT = 100

interface DueReminder {
  id: string
  appointment_id: string
  appointments: {
    id: string
    starts_at: string
    patients: { name: string; phone: string } | null
  } | null
  clinics: {
    id: string
    name: string
    timezone: string
    whatsapp_mode: 'mock' | 'live'
    whatsapp_phone_number_id: string | null
  } | null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: due, error: fetchError } = await supabase
    .from('reminders')
    .select(
      'id, appointment_id, appointments(id, starts_at, patients(name, phone)), clinics(id, name, timezone, whatsapp_mode, whatsapp_phone_number_id)',
    )
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(BATCH_LIMIT)

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const reminder of (due as DueReminder[] | null) ?? []) {
    const clinic = reminder.clinics
    const appointment = reminder.appointments
    const patient = appointment?.patients

    // Mock-mode clinics are handled client-side (useReminderAutoProcessor);
    // this pipeline only ever touches live clinics.
    if (!clinic || clinic.whatsapp_mode !== 'live') {
      skipped++
      continue
    }

    if (!appointment || !patient || !clinic.whatsapp_phone_number_id) {
      await supabase.from('reminders').update({ status: 'failed' }).eq('id', reminder.id).eq('status', 'pending')
      failed++
      continue
    }

    // Atomic claim: only proceed if this reminder is still 'pending'. This
    // is the idempotency guard against a concurrent invocation (an
    // overlapping cron tick, or a manual "resend" firing at the same time)
    // processing the same reminder twice.
    const { data: claimed } = await supabase
      .from('reminders')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', reminder.id)
      .eq('status', 'pending')
      .select('id')
    if (!claimed || claimed.length === 0) {
      skipped++
      continue
    }

    const body = renderReminderMessage({
      patientName: patient.name,
      clinicName: clinic.name,
      dateLabel: formatDateAr(appointment.starts_at, clinic.timezone),
      timeLabel: formatTimeAr(appointment.starts_at, clinic.timezone),
    })

    try {
      const providerMessageId = await sendTemplateMessage(clinic.whatsapp_phone_number_id, patient.phone, REMINDER_TEMPLATE_NAME, 'ar', [
        patient.name,
        clinic.name,
        formatDateAr(appointment.starts_at, clinic.timezone),
        formatTimeAr(appointment.starts_at, clinic.timezone),
      ])

      await supabase.from('reminders').update({ provider_message_id: providerMessageId }).eq('id', reminder.id)
      await supabase.from('messages_log').insert({
        clinic_id: clinic.id,
        reminder_id: reminder.id,
        appointment_id: appointment.id,
        patient_phone: patient.phone,
        body,
        direction: 'outbound',
        status: 'sent',
        provider_message_id: providerMessageId,
      })
      sent++
    } catch (err) {
      await supabase.from('reminders').update({ status: 'failed' }).eq('id', reminder.id)
      await supabase.from('messages_log').insert({
        clinic_id: clinic.id,
        reminder_id: reminder.id,
        appointment_id: appointment.id,
        patient_phone: patient.phone,
        body,
        direction: 'outbound',
        status: 'failed',
      })
      console.error('send-reminders: failed to send', reminder.id, err)
      failed++
    }
  }

  return new Response(JSON.stringify({ sent, failed, skipped }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
