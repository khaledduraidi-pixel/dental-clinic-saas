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
