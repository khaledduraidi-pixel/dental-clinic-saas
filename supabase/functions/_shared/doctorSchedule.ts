// Deno-compatible duplicate of src/lib/doctorSchedule.ts's doctorHoursForDay
// — Edge Functions can't import from src/. Only the one function the
// booking flow needs is duplicated here (the UI-only shading/warning
// helpers stay client-side).
export interface DoctorAvailabilityRow {
  day_of_week: number
  start_time: string
  end_time: string
}

// The doctor's working window for one day, or null if they're off that
// day. A doctor with zero availability rows falls back to the clinic's
// hours every day; once they have any rows, only the days present work.
export function doctorHoursForDay(
  rows: DoctorAvailabilityRow[],
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
