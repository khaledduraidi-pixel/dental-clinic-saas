// WhatsApp Cloud API integration — mock layer.
//
// The real Cloud API is only ever called from the send-reminders Edge
// Function (server-side, triggered by pg_cron — see supabase/functions).
// The client never talks to Meta directly. What lives here is:
//   1. the approved message template, rendered identically by both the
//      mock path (this file) and the live path (the Edge Function), and
//   2. the mock "send" used while VITE_WHATSAPP_MOCK is on, which logs the
//      rendered message to messages_log and marks the reminder sent instead
//      of calling Meta — so the whole pipeline is demoable with zero setup.
//
// IMPORTANT: REMINDER_TEMPLATE_BODY must byte-for-byte match the template
// approved in Meta Business Manager (category: Utility, language: ar).
// Editing this string requires re-submitting the template and waiting for
// re-approval — never change it casually.
export const REMINDER_TEMPLATE_NAME = 'appointment_reminder_ar'

export const REMINDER_TEMPLATE_BODY =
  'مرحباً {{1}}، هذا تذكير بموعدك في {{2}} يوم {{3}} الساعة {{4}}. للتأكيد اضغط "تأكيد الموعد"، ولطلب التأجيل اضغط "أريد التأجيل".'

export const REMINDER_TEMPLATE_BUTTONS = ['تأكيد الموعد', 'أريد التأجيل'] as const

export interface ReminderMessageParams {
  patientName: string
  clinicName: string
  dateLabel: string
  timeLabel: string
}

export function renderReminderMessage(params: ReminderMessageParams): string {
  return REMINDER_TEMPLATE_BODY.replace('{{1}}', params.patientName)
    .replace('{{2}}', params.clinicName)
    .replace('{{3}}', params.dateLabel)
    .replace('{{4}}', params.timeLabel)
}

// Default true: mock mode is the safe default until Meta credentials exist.
export function isWhatsAppMockMode(): boolean {
  return import.meta.env.VITE_WHATSAPP_MOCK !== 'false'
}
