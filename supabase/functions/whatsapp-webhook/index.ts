// Handles Meta's webhook for the connected WhatsApp Business number:
//   - GET is the one-time verification handshake Meta performs when you
//     register this URL in the App Dashboard.
//   - POST delivers inbound events. The only ones this MVP acts on are the
//     two quick-reply buttons on the reminder template ("تأكيد الموعد" /
//     "أريد التأجيل"): they confirm the appointment or mark it as a
//     reschedule request.
//
// Every POST is verified against X-Hub-Signature-256 (HMAC-SHA256 over the
// raw body, keyed with WHATSAPP_APP_SECRET) before anything in the payload
// is trusted — this is the only thing standing between the public internet
// and writing to the appointments table, since this function is invoked
// with no user session at all.
//
// NOTE: this file runs on Deno and has not been executed in this sandbox
// (no Deno runtime available here) — it has only been reviewed statically.
// Verify it against a real Supabase project (including the Meta App
// Dashboard's "test" button for the verification handshake) before relying
// on it.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { REMINDER_TEMPLATE_BUTTONS } from '../_shared/whatsapp-template.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET')
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN')

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
  // Constant-time compare — a timing side-channel here would let an
  // attacker brute-force the signature byte by byte.
  let diff = 0
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i)
  }
  return diff === 0
}

function extractButtonReply(message: Record<string, unknown>): string | null {
  const button = message.button as { text?: string } | undefined
  if (button?.text) return button.text
  const interactive = message.interactive as { button_reply?: { title?: string } } | undefined
  if (interactive?.button_reply?.title) return interactive.button_reply.title
  return null
}

async function handleInboundMessage(
  supabase: ReturnType<typeof createClient>,
  message: Record<string, unknown>,
) {
  const fromDigits = message.from as string | undefined
  const buttonText = extractButtonReply(message)
  if (!fromDigits || !buttonText) return

  const newStatus =
    buttonText === REMINDER_TEMPLATE_BUTTONS[0]
      ? 'confirmed'
      : buttonText === REMINDER_TEMPLATE_BUTTONS[1]
        ? 'reschedule_requested'
        : null
  if (!newStatus) return

  const fromE164 = `+${fromDigits}`

  // Map the reply back to an appointment: this phone's patient records,
  // then the most recently sent reminder among their appointments. Two
  // lookups (rather than one embedded-filter query) to keep this
  // unexecutable-in-sandbox code as easy to statically verify as possible.
  const { data: patients } = await supabase.from('patients').select('id').eq('phone', fromE164)
  const patientIds = (patients ?? []).map((p) => (p as { id: string }).id)
  if (patientIds.length === 0) return

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, clinic_id')
    .in('patient_id', patientIds)
  const appointmentIds = (appointments ?? []).map((a) => (a as { id: string }).id)
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

  const appointment = (appointments ?? []).find((a) => (a as { id: string }).id === reminder.appointment_id) as
    | { id: string; clinic_id: string }
    | undefined
  if (!appointment) return

  await supabase.from('appointments').update({ status: newStatus }).eq('id', appointment.id)

  await supabase.from('messages_log').insert({
    clinic_id: appointment.clinic_id,
    reminder_id: reminder.id,
    appointment_id: appointment.id,
    patient_phone: fromE164,
    body: buttonText,
    direction: 'inbound',
    status: 'received',
  })
}

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

  let payload: { entry?: Array<{ changes?: Array<{ value?: { messages?: Record<string, unknown>[] } }> }> }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('bad request', { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        await handleInboundMessage(supabase, message)
      }
    }
  }

  return new Response('ok', { status: 200 })
})
