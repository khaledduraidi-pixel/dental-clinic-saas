// Deno-compatible duplicate of src/lib/dates.ts's timezone conversion —
// Edge Functions can't import from src/, so this is intentionally kept in
// sync by hand. See src/lib/dates.ts for the full rationale; this file only
// carries the subset the Edge Functions need (send-reminders and the
// WhatsApp booking flow in whatsapp-webhook).

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - date.getTime()
}

// Converts a wall-clock date/time meant to be read in `timeZone` into the
// UTC instant to store — e.g. "5pm at this clinic" regardless of what
// timezone the server process happens to run in.
export function zonedWallTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute)
  let utc = naiveUtc
  for (let i = 0; i < 2; i++) {
    const offset = timeZoneOffsetMs(new Date(utc), timeZone)
    utc = naiveUtc - offset
  }
  return new Date(utc)
}

// 'YYYY-MM-DD' of a stored UTC instant, as read in `timeZone`.
export function dateKeyInZone(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

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

// Short "الأحد ١٦ أغسطس"-style label for a day-picker list row — deliberately
// omits the year (list rows have a ~24-char limit, and the booking horizon
// never spans a year boundary in practice).
export function formatWeekdayShortAr(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('ar', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    numberingSystem: 'latn',
    timeZone,
  }).format(new Date(iso))
}

// 0=Sunday .. 6=Saturday, matching doctor_availability.day_of_week. Pure
// calendar arithmetic on a 'YYYY-MM-DD' string — no timezone needed.
export function dayOfWeekFromYmd(ymd: string): number {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}
