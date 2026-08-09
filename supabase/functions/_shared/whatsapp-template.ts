// Deno-compatible duplicate of src/lib/whatsapp.ts's template constants.
// Edge Functions run on Deno and can't import Vite's src/ tree (no
// import.meta.env, different module resolution), so the approved template
// text is intentionally kept in exactly two places. If you change
// REMINDER_TEMPLATE_BODY here, change it in src/lib/whatsapp.ts too, and
// re-submit the template in Meta Business Manager either way.
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

// Deno ships full ICU (same V8 engine as the browser build), so these can
// be identical in behavior to src/lib/dates.ts's formatters — duplicated
// here only because Edge Functions can't import from src/.
export function formatDateAr(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    numberingSystem: 'latn',
    timeZone,
  }).format(new Date(iso))
}

export function formatTimeAr(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('ar', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    numberingSystem: 'latn',
    timeZone,
  }).format(new Date(iso))
}
