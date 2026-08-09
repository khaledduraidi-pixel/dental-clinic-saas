// Single place for all date/time formatting. Everything is stored in UTC;
// every display function takes an optional IANA timeZone (the clinic's) and
// falls back to the browser's zone only when the clinic hasn't loaded yet.

const LOCALE = 'ar'

export function formatDateAr(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    numberingSystem: 'latn',
    timeZone,
  }).format(new Date(iso))
}

export function formatShortDateAr(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    month: 'short',
    day: 'numeric',
    numberingSystem: 'latn',
    timeZone,
  }).format(new Date(iso))
}

export function formatTimeAr(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    numberingSystem: 'latn',
    timeZone,
  }).format(new Date(iso))
}

export function formatDateTimeAr(iso: string, timeZone?: string): string {
  return `${formatDateAr(iso, timeZone)} — ${formatTimeAr(iso, timeZone)}`
}

export function formatWeekdayAr(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    numberingSystem: 'latn',
    timeZone,
  }).format(new Date(iso))
}

// How far `timeZone`'s wall clock is ahead of UTC at the instant `date`
// represents, in milliseconds (positive east of UTC).
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

// The inverse of the display formatters above: takes a wall-clock date/time
// meant to be read in the clinic's timezone (e.g. "the receptionist picked
// 5pm on the calendar") and returns the UTC instant to store. Naively doing
// `new Date(y, m, d, h, min)` instead would silently use the *browser's*
// timezone, which is exactly the bug this file exists to prevent — a clinic
// whose staff laptop clock is set to a different zone than the clinic would
// have every reminder fire at the wrong hour.
export function zonedWallTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute)
  // Two passes converge even across a DST boundary; the offset used on the
  // first pass is only a guess, so we recompute it from a closer instant.
  let utc = naiveUtc
  for (let i = 0; i < 2; i++) {
    const offset = timeZoneOffsetMs(new Date(utc), timeZone)
    utc = naiveUtc - offset
  }
  return new Date(utc)
}

// The reverse of zonedWallTimeToUtc: given a stored UTC instant, returns its
// wall-clock date/time in the clinic's timezone as native <input> value
// strings, so editing an appointment shows the time the receptionist
// actually meant, not whatever the browser's local zone happens to be.
export function toZonedInputParts(iso: string, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(iso))

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

// 'YYYY-MM-DD' of a stored UTC instant, as read in the clinic's timezone —
// for matching an appointment to the calendar day column it belongs on.
export function dateKeyInZone(iso: string, timeZone: string): string {
  return toZonedInputParts(iso, timeZone).date
}

// Minutes since midnight of a stored UTC instant, in the clinic's timezone —
// for vertical position on the calendar grid. Using the instant's raw
// getHours()/getTime() instead (i.e. the browser's zone) is exactly the bug
// this file exists to prevent: a block would land on the wrong row whenever
// the browser's zone differs from the clinic's.
export function minutesOfDayInZone(iso: string, timeZone: string): number {
  const { time } = toZonedInputParts(iso, timeZone)
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

// 'YYYY-MM-DD' of a plain calendar-navigation Date (e.g. a week-view day
// column) — these are never real instants, just "which day is this column
// for", so plain local getters are the right (and only sensible) tool.
export function dateKeyLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
