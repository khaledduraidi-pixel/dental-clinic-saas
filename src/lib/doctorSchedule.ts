import type { DoctorAvailability } from '../types'

// The doctor's working window for one day, or null if they're off that day.
// A doctor with zero availability rows at all falls back to the clinic's
// hours every day (see the migration's comment) — that's the caller's
// `clinicStart`/`clinicEnd` fallback below. Once a doctor has *any* rows,
// only the days present are working days.
export function doctorHoursForDay(
  rows: DoctorAvailability[],
  dayOfWeek: number,
  clinicStart: string,
  clinicEnd: string,
): { start: string; end: string } | null {
  if (rows.length === 0) {
    return { start: clinicStart.slice(0, 5), end: clinicEnd.slice(0, 5) }
  }
  const row = rows.find((r) => r.day_of_week === dayOfWeek)
  return row ? { start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5) } : null
}

export interface OffHoursRange {
  startMinutes: number
  endMinutes: number
}

// Converts a resolved working window (or null = day off) into the shaded
// "off" bands to render on a calendar grid spanning [gridStartHour,
// gridEndHour), in minutes from the grid's own top edge. Used purely for
// the visual shading — never for validation, which stays a soft warning
// elsewhere (a receptionist can always book outside these hours).
export function computeOffHoursRanges(
  hours: { start: string; end: string } | null,
  gridStartHour: number,
  gridEndHour: number,
): OffHoursRange[] {
  const gridStartMin = gridStartHour * 60
  const gridEndMin = gridEndHour * 60
  const totalMin = gridEndMin - gridStartMin
  if (totalMin <= 0) return []

  if (hours === null) {
    return [{ startMinutes: 0, endMinutes: totalMin }]
  }

  const [sh, sm] = hours.start.split(':').map(Number)
  const [eh, em] = hours.end.split(':').map(Number)
  const workStart = clampMinutes(sh * 60 + sm - gridStartMin, 0, totalMin)
  const workEnd = clampMinutes(eh * 60 + em - gridStartMin, 0, totalMin)

  const ranges: OffHoursRange[] = []
  if (workStart > 0) ranges.push({ startMinutes: 0, endMinutes: workStart })
  if (workEnd < totalMin) ranges.push({ startMinutes: workEnd, endMinutes: totalMin })
  return ranges
}

function clampMinutes(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// Whether a specific wall-clock time (from a form field, 'HH:MM') falls
// within the doctor's working window for that day — the check behind the
// soft warning in AppointmentModal.
export function isWithinDoctorHours(
  rows: DoctorAvailability[],
  dayOfWeek: number,
  timeStr: string,
  clinicStart: string,
  clinicEnd: string,
): boolean {
  const hours = doctorHoursForDay(rows, dayOfWeek, clinicStart, clinicEnd)
  if (hours === null) return false
  return timeStr >= hours.start && timeStr < hours.end
}
