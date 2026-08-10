import { zonedWallTimeToUtc } from './dates.ts'

export interface ExistingBooking {
  startsAt: string // ISO
  durationMinutes: number
}

export interface ComputeSlotsParams {
  dateYmd: string // 'YYYY-MM-DD', clinic-local calendar date
  workingHoursStart: string // 'HH:MM' or 'HH:MM:SS', clinic-local
  workingHoursEnd: string
  timeZone: string
  slotDurationMinutes: number
  existingBookings: ExistingBooking[] // this doctor's bookings — any date is fine, only overlaps matter
  now: Date
}

// Every open, non-overlapping, non-past slot for one doctor on one day —
// this is the piece of business logic the WhatsApp booking flow needs that
// nothing else in the app computes today (a receptionist just eyeballs the
// calendar grid). Pure function, no Deno/Supabase dependency beyond
// zonedWallTimeToUtc, so it's exercised by a plain Node test alongside the
// Edge Functions that can't be run in this sandbox.
export function computeAvailableSlots(params: ComputeSlotsParams): string[] {
  const [year, month, day] = params.dateYmd.split('-').map(Number)
  const [startH, startM] = params.workingHoursStart.split(':').map(Number)
  const [endH, endM] = params.workingHoursEnd.split(':').map(Number)

  const dayStart = zonedWallTimeToUtc(year, month, day, startH, startM, params.timeZone).getTime()
  const dayEnd = zonedWallTimeToUtc(year, month, day, endH, endM, params.timeZone).getTime()
  const stepMs = params.slotDurationMinutes * 60_000
  const nowMs = params.now.getTime()

  const bookedRanges = params.existingBookings.map((b) => {
    const start = new Date(b.startsAt).getTime()
    return { start, end: start + b.durationMinutes * 60_000 }
  })

  const slots: string[] = []
  for (let t = dayStart; t + stepMs <= dayEnd; t += stepMs) {
    if (t < nowMs) continue
    const overlaps = bookedRanges.some((r) => t < r.end && t + stepMs > r.start)
    if (!overlaps) slots.push(new Date(t).toISOString())
  }
  return slots
}
