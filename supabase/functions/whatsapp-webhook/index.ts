// Handles Meta's webhook for a clinic's connected WhatsApp Business number:
//   - GET is the one-time verification handshake Meta performs when you
//     register this URL in the App Dashboard.
//   - POST delivers inbound events, routed by message type:
//       'button'      -> quick-reply on the reminder template (confirm /
//                        reschedule an EXISTING appointment)
//       'interactive' -> a tap on a list message from the booking flow below
//       'text'        -> free text: either a "حجز" trigger, a name during
//                        signup, "تأكيد"/"إلغاء" during confirmation, or a
//                        nudge back to the list for any other state
//
// Booking flow (patient-initiated, self-service):
//   idle -> [doctor pick, skipped if the clinic has exactly one] ->
//   date pick -> slot pick (computed from real availability: clinic working
//   hours, minus this doctor's existing bookings, minus past times) ->
//   [name, only for a phone not already a patient at this clinic] ->
//   confirm -> booked (or, on a same-instant race with another booking,
//   re-shown fresh availability).
//
// Every POST is verified against X-Hub-Signature-256 (HMAC-SHA256 over the
// raw body, keyed with WHATSAPP_APP_SECRET) before anything in the payload
// is trusted — this is the only thing standing between the public internet
// and writing to the patients/appointments tables, since this function is
// invoked with no user session at all.
//
// NOTE: this file runs on Deno and has not been executed in this sandbox
// (no Deno runtime available here) — it has only been reviewed statically.
// The pure availability math it depends on (_shared/availability.ts) IS
// unit-tested under plain Node (see its test in the PR/commit description);
// the conversation state machine and Cloud API calls in this file still
// need a real run against a Supabase project before relying on them.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { REMINDER_TEMPLATE_BUTTONS } from '../_shared/whatsapp-template.ts'
import { dateKeyInZone, formatDateAr, formatTimeAr, formatWeekdayShortAr } from '../_shared/dates.ts'
import { sendListMessage, sendTextMessage, type ListSection } from '../_shared/whatsapp-send.ts'
import { computeAvailableSlots } from '../_shared/availability.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET')
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN')

const BOOKING_KEYWORDS = ['حجز', 'موعد', 'احجز']
const CANCEL_KEYWORDS = ['إلغاء', 'الغاء', 'كنسل']
const CONFIRM_KEYWORDS = ['تأكيد', 'تاكيد', 'نعم']
const DAYS_AHEAD = 7
// Fixed duration for self-booked slots — asking the patient to also pick a
// duration would add a step for a number the clinic controls anyway; this
// matches the app's own default appointment length.
const SLOT_DURATION_MINUTES = 30
const CONVERSATION_TIMEOUT_MS = 30 * 60_000
const EXCLUSION_VIOLATION_CODE = '23P01'

interface Clinic {
  id: string
  name: string
  timezone: string
  working_hours_start: string
  working_hours_end: string
  reminder_hours_before: number
  whatsapp_phone_number_id: string
}

interface Conversation {
  id: string
  clinic_id: string
  phone: string
  state: 'idle' | 'awaiting_doctor' | 'awaiting_date' | 'awaiting_slot' | 'awaiting_name' | 'awaiting_confirmation'
  doctor_id: string | null
  selected_date: string | null
  slot_starts_at: string | null
  pending_name: string | null
  is_new_patient: boolean
  updated_at: string
}

interface Doctor {
  id: string
  name: string
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text
}

function splitOnce(value: string, sep: string): [string, string] {
  const i = value.indexOf(sep)
  return i === -1 ? [value, ''] : [value.slice(0, i), value.slice(i + 1)]
}

// Pure calendar-day arithmetic (no timezone/DST involved) — used to build
// the day picker from the clinic's *local* today, not the server's.
function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

// Noon UTC on a given calendar day is a safe instant to format a weekday
// label from in any real timezone (max UTC offset is +14/-12), without
// needing the actual wall-clock time this day's slots start at.
function noonAnchor(ymd: string): string {
  return `${ymd}T12:00:00Z`
}

async function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): Promise<boolean> {
  if (!signatureHeader?.startsWith('sha256=')) return false
  const expectedHex = signatureHeader.slice('sha256='.length).toLowerCase()

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const computedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  if (computedHex.length !== expectedHex.length) return false
  let diff = 0
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i)
  }
  return diff === 0
}

async function getClinicByPhoneNumberId(supabase: SupabaseClient, phoneNumberId: string): Promise<Clinic | null> {
  const { data } = await supabase
    .from('clinics')
    .select('id, name, timezone, working_hours_start, working_hours_end, reminder_hours_before, whatsapp_phone_number_id')
    .eq('whatsapp_phone_number_id', phoneNumberId)
    .maybeSingle()
  return (data as Clinic | null) ?? null
}

async function getDoctor(supabase: SupabaseClient, clinicId: string, doctorId: string): Promise<Doctor | null> {
  const { data } = await supabase.from('doctors').select('id, name').eq('clinic_id', clinicId).eq('id', doctorId).maybeSingle()
  return (data as Doctor | null) ?? null
}

async function getConversation(supabase: SupabaseClient, clinicId: string, phone: string): Promise<Conversation> {
  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('phone', phone)
    .maybeSingle()

  if (existing) {
    const staleMs = Date.now() - new Date(existing.updated_at).getTime()
    if (staleMs > CONVERSATION_TIMEOUT_MS && existing.state !== 'idle') {
      return resetConversationToIdle(supabase, existing.id)
    }
    return existing as Conversation
  }

  const { data: created } = await supabase
    .from('whatsapp_conversations')
    .insert({ clinic_id: clinicId, phone })
    .select('*')
    .single()
  return created as Conversation
}

async function updateConversation(supabase: SupabaseClient, id: string, patch: Record<string, unknown>): Promise<void> {
  await supabase.from('whatsapp_conversations').update(patch).eq('id', id)
}

async function resetConversationToIdle(supabase: SupabaseClient, id: string): Promise<Conversation> {
  const { data } = await supabase
    .from('whatsapp_conversations')
    .update({
      state: 'idle',
      doctor_id: null,
      selected_date: null,
      slot_starts_at: null,
      pending_name: null,
      is_new_patient: false,
    })
    .eq('id', id)
    .select('*')
    .single()
  return data as Conversation
}

async function logMessage(
  supabase: SupabaseClient,
  clinicId: string,
  phone: string,
  body: string,
  direction: 'outbound' | 'inbound',
  status: 'sent' | 'received' | 'failed',
): Promise<void> {
  await supabase.from('messages_log').insert({ clinic_id: clinicId, patient_phone: phone, body, direction, status })
}

async function reply(supabase: SupabaseClient, clinic: Clinic, phone: string, body: string): Promise<void> {
  await sendTextMessage(clinic.whatsapp_phone_number_id, phone, body)
  await logMessage(supabase, clinic.id, phone, body, 'outbound', 'sent')
}

async function replyList(
  supabase: SupabaseClient,
  clinic: Clinic,
  phone: string,
  opts: { header?: string; body: string; buttonLabel: string; sections: ListSection[] },
): Promise<void> {
  await sendListMessage(clinic.whatsapp_phone_number_id, phone, opts)
  await logMessage(supabase, clinic.id, phone, `${opts.header ? opts.header + ' — ' : ''}${opts.body}`, 'outbound', 'sent')
}

// --- Booking flow steps ------------------------------------------------

async function sendDoctorPicker(supabase: SupabaseClient, clinic: Clinic, phone: string, doctors: Doctor[]): Promise<void> {
  await replyList(supabase, clinic, phone, {
    header: 'حجز موعد جديد',
    body: 'مع أي طبيب تودّ حجز الموعد؟',
    buttonLabel: 'اختر الطبيب',
    sections: [{ title: 'الأطباء', rows: doctors.map((d) => ({ id: `doctor:${d.id}`, title: truncate(d.name, 24) })) }],
  })
}

async function sendDatePicker(supabase: SupabaseClient, clinic: Clinic, phone: string, doctor: Doctor): Promise<void> {
  const todayYmd = dateKeyInZone(new Date().toISOString(), clinic.timezone)
  const rows = Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const ymd = addDaysToYmd(todayYmd, i)
    const weekday = formatWeekdayShortAr(noonAnchor(ymd), clinic.timezone)
    const label = i === 0 ? `اليوم — ${weekday}` : i === 1 ? `غداً — ${weekday}` : weekday
    return { id: `date:${ymd}`, title: truncate(label, 24) }
  })
  await replyList(supabase, clinic, phone, {
    header: truncate(`الحجز مع ${doctor.name}`, 60),
    body: 'اختر اليوم المناسب لموعدك',
    buttonLabel: 'اختر اليوم',
    sections: [{ title: 'الأيام المتاحة', rows }],
  })
}

async function computeSlotsForDoctorDay(supabase: SupabaseClient, clinic: Clinic, doctorId: string, ymd: string): Promise<string[]> {
  const { data: existingAppts } = await supabase
    .from('appointments')
    .select('starts_at, duration_minutes')
    .eq('doctor_id', doctorId)
    .neq('status', 'cancelled')

  return computeAvailableSlots({
    dateYmd: ymd,
    workingHoursStart: clinic.working_hours_start,
    workingHoursEnd: clinic.working_hours_end,
    timeZone: clinic.timezone,
    slotDurationMinutes: SLOT_DURATION_MINUTES,
    existingBookings: (existingAppts ?? []).map((a: { starts_at: string; duration_minutes: number }) => ({
      startsAt: a.starts_at,
      durationMinutes: a.duration_minutes,
    })),
    now: new Date(),
  })
}

async function sendSlotPicker(
  supabase: SupabaseClient,
  clinic: Clinic,
  phone: string,
  doctor: Doctor,
  ymd: string,
  slots: string[],
): Promise<void> {
  const morning: { id: string; title: string }[] = []
  const afternoon: { id: string; title: string }[] = []
  for (const iso of slots) {
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', { timeZone: clinic.timezone, hour: '2-digit', hourCycle: 'h23' }).format(new Date(iso)),
    )
    const row = { id: `slot:${iso}`, title: formatTimeAr(iso, clinic.timezone) }
    ;(hour < 12 ? morning : afternoon).push(row)
  }
  const sections: ListSection[] = []
  if (morning.length) sections.push({ title: 'صباحاً', rows: morning.slice(0, 10) })
  if (afternoon.length) sections.push({ title: 'مساءً', rows: afternoon.slice(0, 10) })

  await replyList(supabase, clinic, phone, {
    header: truncate(`مواعيد ${formatWeekdayShortAr(noonAnchor(ymd), clinic.timezone)}`, 60),
    body: `اختر الوقت المناسب مع ${doctor.name}`,
    buttonLabel: 'اختر الوقت',
    sections,
  })
}

async function startBookingFlow(supabase: SupabaseClient, clinic: Clinic, phone: string, conversation: Conversation): Promise<void> {
  const { data: doctors } = await supabase.from('doctors').select('id, name').eq('clinic_id', clinic.id).eq('active', true).order('name')
  const activeDoctors = (doctors ?? []) as Doctor[]

  if (activeDoctors.length === 0) {
    await reply(supabase, clinic, phone, 'عذراً، لا يوجد أطباء متاحون حالياً لحجز موعد. الرجاء الاتصال بالعيادة مباشرة.')
    return
  }
  if (activeDoctors.length === 1) {
    await updateConversation(supabase, conversation.id, { state: 'awaiting_date', doctor_id: activeDoctors[0].id })
    await sendDatePicker(supabase, clinic, phone, activeDoctors[0])
    return
  }
  await updateConversation(supabase, conversation.id, { state: 'awaiting_doctor' })
  await sendDoctorPicker(supabase, clinic, phone, activeDoctors)
}

async function handleDoctorSelected(supabase: SupabaseClient, clinic: Clinic, phone: string, conversation: Conversation, doctorId: string): Promise<void> {
  const doctor = await getDoctor(supabase, clinic.id, doctorId)
  if (!doctor) {
    await reply(supabase, clinic, phone, 'حدث خطأ، الرجاء البدء من جديد بإرسال "حجز".')
    await resetConversationToIdle(supabase, conversation.id)
    return
  }
  await updateConversation(supabase, conversation.id, { state: 'awaiting_date', doctor_id: doctor.id })
  await sendDatePicker(supabase, clinic, phone, doctor)
}

async function handleDateSelected(supabase: SupabaseClient, clinic: Clinic, phone: string, conversation: Conversation, ymd: string): Promise<void> {
  if (!conversation.doctor_id) return
  const doctor = await getDoctor(supabase, clinic.id, conversation.doctor_id)
  if (!doctor) return

  const slots = await computeSlotsForDoctorDay(supabase, clinic, doctor.id, ymd)
  if (slots.length === 0) {
    await reply(supabase, clinic, phone, `لا توجد أوقات متاحة يوم ${formatWeekdayShortAr(noonAnchor(ymd), clinic.timezone)}. الرجاء اختيار يوم آخر.`)
    await sendDatePicker(supabase, clinic, phone, doctor)
    return
  }
  await updateConversation(supabase, conversation.id, { state: 'awaiting_slot', selected_date: ymd })
  await sendSlotPicker(supabase, clinic, phone, doctor, ymd, slots)
}

async function sendConfirmationSummary(
  supabase: SupabaseClient,
  clinic: Clinic,
  phone: string,
  doctor: Doctor,
  slotIso: string,
  name: string,
): Promise<void> {
  const body = [
    'تأكيد الحجز:',
    `الاسم: ${name}`,
    `الطبيب: ${doctor.name}`,
    `التاريخ: ${formatDateAr(slotIso, clinic.timezone)}`,
    `الوقت: ${formatTimeAr(slotIso, clinic.timezone)}`,
    '',
    'أرسل "تأكيد" للتأكيد أو "إلغاء" للتراجع.',
  ].join('\n')
  await reply(supabase, clinic, phone, body)
}

async function handleSlotSelected(supabase: SupabaseClient, clinic: Clinic, phone: string, conversation: Conversation, slotIso: string): Promise<void> {
  if (!conversation.doctor_id) return
  const doctor = await getDoctor(supabase, clinic.id, conversation.doctor_id)
  if (!doctor) return

  const { data: existingPatient } = await supabase
    .from('patients')
    .select('id, name')
    .eq('clinic_id', clinic.id)
    .eq('phone', phone)
    .maybeSingle()

  if (existingPatient) {
    await updateConversation(supabase, conversation.id, { state: 'awaiting_confirmation', slot_starts_at: slotIso, is_new_patient: false })
    await sendConfirmationSummary(supabase, clinic, phone, doctor, slotIso, existingPatient.name)
  } else {
    await updateConversation(supabase, conversation.id, { state: 'awaiting_name', slot_starts_at: slotIso, is_new_patient: true })
    await reply(supabase, clinic, phone, 'يبدو أنك تحجز لأول مرة! ما اسمك الكامل؟')
  }
}

async function handleNameProvided(supabase: SupabaseClient, clinic: Clinic, phone: string, conversation: Conversation, text: string): Promise<void> {
  const name = text.trim()
  if (name.length < 2) {
    await reply(supabase, clinic, phone, 'الرجاء إرسال اسمك الكامل (حرفين على الأقل).')
    return
  }
  if (!conversation.doctor_id || !conversation.slot_starts_at) return
  const doctor = await getDoctor(supabase, clinic.id, conversation.doctor_id)
  if (!doctor) return

  await updateConversation(supabase, conversation.id, { state: 'awaiting_confirmation', pending_name: name })
  await sendConfirmationSummary(supabase, clinic, phone, doctor, conversation.slot_starts_at, name)
}

// Commits the booking: creates the patient row if this is a first-time
// caller, inserts the appointment, and schedules its reminder — the exact
// same tables and the exact same doctor-overlap exclusion constraint
// (migration 0002) that protect staff bookings from the calendar UI protect
// this path too, since it's the same INSERT into `appointments`. A 23P01
// here means someone else took the slot in the instant between it being
// offered and confirmed; the patient is shown fresh availability instead
// of a raw error.
async function commitBooking(supabase: SupabaseClient, clinic: Clinic, phone: string, conversation: Conversation): Promise<void> {
  const { doctor_id: doctorId, slot_starts_at: slotIso, pending_name: pendingName, is_new_patient: isNewPatient } = conversation
  if (!doctorId || !slotIso) {
    await reply(supabase, clinic, phone, 'حدث خطأ، الرجاء البدء من جديد بإرسال "حجز".')
    await resetConversationToIdle(supabase, conversation.id)
    return
  }

  let patientId: string
  if (isNewPatient) {
    const { data: createdPatient, error: patientError } = await supabase
      .from('patients')
      .insert({ clinic_id: clinic.id, name: pendingName, phone })
      .select('id')
      .single()
    if (patientError || !createdPatient) {
      await reply(supabase, clinic, phone, 'حدث خطأ أثناء تسجيل بياناتك، الرجاء المحاولة لاحقاً أو الاتصال بالعيادة.')
      await resetConversationToIdle(supabase, conversation.id)
      return
    }
    patientId = createdPatient.id
  } else {
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id')
      .eq('clinic_id', clinic.id)
      .eq('phone', phone)
      .maybeSingle()
    if (!existingPatient) {
      await reply(supabase, clinic, phone, 'حدث خطأ، الرجاء البدء من جديد بإرسال "حجز".')
      await resetConversationToIdle(supabase, conversation.id)
      return
    }
    patientId = existingPatient.id
  }

  const { data: inserted, error: insertError } = await supabase
    .from('appointments')
    .insert({
      clinic_id: clinic.id,
      patient_id: patientId,
      doctor_id: doctorId,
      starts_at: slotIso,
      duration_minutes: SLOT_DURATION_MINUTES,
      visit_type: isNewPatient ? 'checkup' : 'followup',
      status: 'scheduled',
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    if (insertError?.code === EXCLUSION_VIOLATION_CODE && conversation.selected_date) {
      const doctor = await getDoctor(supabase, clinic.id, doctorId)
      if (doctor) {
        await reply(supabase, clinic, phone, 'عذراً، تم حجز هذا الوقت للتو من قبل شخص آخر. إليك الأوقات المتاحة الآن.')
        const freshSlots = await computeSlotsForDoctorDay(supabase, clinic, doctorId, conversation.selected_date)
        if (freshSlots.length > 0) {
          await updateConversation(supabase, conversation.id, { state: 'awaiting_slot', slot_starts_at: null })
          await sendSlotPicker(supabase, clinic, phone, doctor, conversation.selected_date, freshSlots)
          return
        }
        await reply(supabase, clinic, phone, 'لا توجد أوقات أخرى متاحة في هذا اليوم. الرجاء اختيار يوم آخر.')
        await updateConversation(supabase, conversation.id, { state: 'awaiting_date', slot_starts_at: null })
        await sendDatePicker(supabase, clinic, phone, doctor)
        return
      }
    }
    await reply(supabase, clinic, phone, 'حدث خطأ أثناء الحجز، الرجاء المحاولة لاحقاً أو الاتصال بالعيادة.')
    await resetConversationToIdle(supabase, conversation.id)
    return
  }

  const scheduledFor = new Date(new Date(slotIso).getTime() - clinic.reminder_hours_before * 3_600_000)
  if (scheduledFor.getTime() > Date.now()) {
    await supabase
      .from('reminders')
      .insert({ clinic_id: clinic.id, appointment_id: inserted.id, status: 'pending', scheduled_for: scheduledFor.toISOString() })
  }

  const doctor = await getDoctor(supabase, clinic.id, doctorId)
  await reply(
    supabase,
    clinic,
    phone,
    `تم حجز موعدك بنجاح.\nمع ${doctor?.name ?? ''} يوم ${formatDateAr(slotIso, clinic.timezone)} الساعة ${formatTimeAr(slotIso, clinic.timezone)}.\nسيصلك تذكير قبل الموعد.`,
  )
  await resetConversationToIdle(supabase, conversation.id)
}

async function handleCancel(supabase: SupabaseClient, clinic: Clinic, phone: string, conversation: Conversation): Promise<void> {
  await resetConversationToIdle(supabase, conversation.id)
  await reply(supabase, clinic, phone, 'تم إلغاء الحجز. يمكنك البدء من جديد بإرسال كلمة "حجز" في أي وقت.')
}

async function handleTextMessage(supabase: SupabaseClient, clinic: Clinic, phone: string, conversation: Conversation, text: string): Promise<void> {
  const normalized = text.trim()
  await logMessage(supabase, clinic.id, phone, normalized, 'inbound', 'received')

  if (conversation.state !== 'idle' && CANCEL_KEYWORDS.some((k) => normalized.includes(k))) {
    await handleCancel(supabase, clinic, phone, conversation)
    return
  }

  switch (conversation.state) {
    case 'idle':
      if (BOOKING_KEYWORDS.some((k) => normalized.includes(k))) {
        await startBookingFlow(supabase, clinic, phone, conversation)
      } else {
        await reply(supabase, clinic, phone, `مرحباً بك في ${clinic.name}! للحجز عبر واتساب أرسل كلمة "حجز".`)
      }
      break
    case 'awaiting_name':
      await handleNameProvided(supabase, clinic, phone, conversation, normalized)
      break
    case 'awaiting_confirmation':
      if (CONFIRM_KEYWORDS.some((k) => normalized.includes(k))) {
        await commitBooking(supabase, clinic, phone, conversation)
      } else {
        await reply(supabase, clinic, phone, 'أرسل "تأكيد" لتأكيد الحجز أو "إلغاء" للتراجع.')
      }
      break
    case 'awaiting_doctor':
    case 'awaiting_date':
    case 'awaiting_slot':
      await reply(supabase, clinic, phone, 'الرجاء الاختيار من القائمة أعلاه، أو أرسل "إلغاء" لإلغاء الحجز.')
      break
  }
}

async function handleListReply(supabase: SupabaseClient, clinic: Clinic, phone: string, conversation: Conversation, replyId: string): Promise<void> {
  const [kind, value] = splitOnce(replyId, ':')
  await logMessage(supabase, clinic.id, phone, replyId, 'inbound', 'received')

  if (kind === 'doctor' && conversation.state === 'awaiting_doctor') {
    await handleDoctorSelected(supabase, clinic, phone, conversation, value)
  } else if (kind === 'date' && conversation.state === 'awaiting_date') {
    await handleDateSelected(supabase, clinic, phone, conversation, value)
  } else if (kind === 'slot' && conversation.state === 'awaiting_slot') {
    await handleSlotSelected(supabase, clinic, phone, conversation, value)
  } else {
    // A tap on a list from a step the conversation has already moved past
    // (e.g. a stale message reopened after starting over).
    await reply(supabase, clinic, phone, 'يبدو أن هذا الخيار لم يعد صالحاً. أرسل "حجز" لبدء حجز جديد.')
    await resetConversationToIdle(supabase, conversation.id)
  }
}

// --- Existing reminder quick-reply handling (confirm / reschedule) -----

function extractButtonReply(message: Record<string, unknown>): string | null {
  const button = message.button as { text?: string } | undefined
  return button?.text ?? null
}

async function handleReminderButtonReply(supabase: SupabaseClient, clinic: Clinic, phone: string, buttonText: string): Promise<void> {
  const newStatus =
    buttonText === REMINDER_TEMPLATE_BUTTONS[0] ? 'confirmed' : buttonText === REMINDER_TEMPLATE_BUTTONS[1] ? 'reschedule_requested' : null
  if (!newStatus) return

  // Map the reply back to an appointment, scoped to this clinic: this
  // phone's patient record here, then the most recently sent reminder
  // among their appointments at this clinic specifically — a phone shared
  // across two different clinics on this platform must not cross-match.
  const { data: patients } = await supabase.from('patients').select('id').eq('clinic_id', clinic.id).eq('phone', phone)
  const patientIds = (patients ?? []).map((p: { id: string }) => p.id)
  if (patientIds.length === 0) return

  const { data: appointments } = await supabase.from('appointments').select('id').eq('clinic_id', clinic.id).in('patient_id', patientIds)
  const appointmentIds = (appointments ?? []).map((a: { id: string }) => a.id)
  if (appointmentIds.length === 0) return

  const { data: reminders } = await supabase
    .from('reminders')
    .select('id, appointment_id, sent_at')
    .in('appointment_id', appointmentIds)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(1)
  const reminder = (reminders ?? [])[0] as { id: string; appointment_id: string } | undefined
  if (!reminder) return

  await supabase.from('appointments').update({ status: newStatus }).eq('id', reminder.appointment_id)
  await logMessage(supabase, clinic.id, phone, buttonText, 'inbound', 'received')

  if (newStatus === 'confirmed') {
    await reply(supabase, clinic, phone, 'تم تأكيد موعدك، نراك قريباً!')
  } else {
    await reply(supabase, clinic, phone, 'تم استلام طلب التأجيل، سيتواصل معك فريق العيادة لتحديد موعد جديد.')
  }
}

// --- Entry point ---------------------------------------------------------

Deno.serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    if (mode === 'subscribe' && VERIFY_TOKEN && token === VERIFY_TOKEN) {
      return new Response(challenge ?? '', { status: 200 })
    }
    return new Response('forbidden', { status: 403 })
  }

  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  if (!APP_SECRET) {
    console.error('whatsapp-webhook: WHATSAPP_APP_SECRET is not set — refusing to process')
    return new Response('server misconfigured', { status: 500 })
  }

  const rawBody = await req.text()
  const signatureValid = await verifySignature(rawBody, req.headers.get('X-Hub-Signature-256'), APP_SECRET)
  if (!signatureValid) {
    return new Response('invalid signature', { status: 401 })
  }

  let payload: {
    entry?: Array<{
      changes?: Array<{ value?: { metadata?: { phone_number_id?: string }; messages?: Record<string, unknown>[] } }>
    }>
  }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('bad request', { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const clinicCache = new Map<string, Clinic | null>()

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id
      const messages = change.value?.messages ?? []
      if (!phoneNumberId || messages.length === 0) continue

      if (!clinicCache.has(phoneNumberId)) {
        clinicCache.set(phoneNumberId, await getClinicByPhoneNumberId(supabase, phoneNumberId))
      }
      const clinic = clinicCache.get(phoneNumberId)
      if (!clinic) {
        console.error('whatsapp-webhook: no clinic configured for phone_number_id', phoneNumberId)
        continue
      }

      for (const message of messages) {
        const fromDigits = message.from as string | undefined
        if (!fromDigits) continue
        const phone = `+${fromDigits}`

        if (message.type === 'button') {
          const buttonText = extractButtonReply(message)
          if (buttonText) await handleReminderButtonReply(supabase, clinic, phone, buttonText)
          continue
        }

        const conversation = await getConversation(supabase, clinic.id, phone)

        if (message.type === 'interactive') {
          const interactive = message.interactive as { type?: string; list_reply?: { id?: string } } | undefined
          const replyId = interactive?.type === 'list_reply' ? interactive.list_reply?.id : undefined
          if (replyId) await handleListReply(supabase, clinic, phone, conversation, replyId)
        } else if (message.type === 'text') {
          const body = (message.text as { body?: string } | undefined)?.body
          if (body) await handleTextMessage(supabase, clinic, phone, conversation, body)
        }
      }
    }
  }

  return new Response('ok', { status: 200 })
})
