import { addDays, format, startOfWeek } from 'date-fns'
import { ar as arLocale } from 'date-fns/locale'
import TimeGrid, { type GridColumn, type SlotParts } from './TimeGrid'
import { dateKeyInZone, dateKeyLocal } from '../../lib/dates'
import type { AppointmentWithRelations } from '../../hooks/useAppointments'
import type { Doctor } from '../../types'

interface WeekViewProps {
  date: Date
  doctors: Doctor[]
  appointments: AppointmentWithRelations[]
  startHour: number
  endHour: number
  timeZone: string
  onSlotClick: (dayKey: string, slot: SlotParts) => void
  onAppointmentClick: (appointment: AppointmentWithRelations) => void
}

// One column per day of the week, with every visible doctor's appointments
// merged into that day — a receptionist scanning the week wants the shape
// of the whole week, not a wall of per-doctor sub-columns.
export default function WeekView({
  date,
  doctors,
  appointments,
  startHour,
  endHour,
  timeZone,
  onSlotClick,
  onAppointmentClick,
}: WeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 })
  const doctorIds = new Set(doctors.map((d) => d.id))

  const columns: GridColumn[] = Array.from({ length: 7 }).map((_, i) => {
    const day = addDays(weekStart, i)
    const dayKey = dateKeyLocal(day)
    return {
      key: dayKey,
      date: day,
      header: (
        <div className="text-sm">
          <div className="font-medium text-on-surface">{format(day, 'EEEE', { locale: arLocale })}</div>
          <div className="text-xs text-on-surface-variant">{format(day, 'd MMM', { locale: arLocale })}</div>
        </div>
      ),
      // Matched by the appointment's calendar day *in the clinic's timezone*,
      // not the browser's — otherwise a late-evening appointment could land
      // in the wrong day column whenever the two zones disagree near midnight.
      appointments: appointments.filter(
        (a) => dateKeyInZone(a.starts_at, timeZone) === dayKey && doctorIds.has(a.doctor_id),
      ),
    }
  })

  return (
    <TimeGrid
      columns={columns}
      startHour={startHour}
      endHour={endHour}
      slotMinutes={30}
      timeZone={timeZone}
      onSlotClick={onSlotClick}
      onAppointmentClick={onAppointmentClick}
    />
  )
}
