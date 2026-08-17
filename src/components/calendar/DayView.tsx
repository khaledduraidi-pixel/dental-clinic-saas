import TimeGrid, { type GridColumn, type SlotParts } from './TimeGrid'
import { computeOffHoursRanges, doctorHoursForDay } from '../../lib/doctorSchedule'
import type { AppointmentWithRelations } from '../../hooks/useAppointments'
import type { Doctor, DoctorAvailability } from '../../types'

interface DayViewProps {
  date: Date
  doctors: Doctor[]
  appointments: AppointmentWithRelations[]
  availabilityByDoctor: Record<string, DoctorAvailability[]>
  clinicWorkingHoursStart: string
  clinicWorkingHoursEnd: string
  startHour: number
  endHour: number
  timeZone: string
  onSlotClick: (doctorId: string, slot: SlotParts) => void
  onAppointmentClick: (appointment: AppointmentWithRelations) => void
}

// One column per visible doctor — a receptionist scanning a single day wants
// to see every doctor's chair at once, so blocks never need to fight over
// horizontal space within a doctor's own column.
export default function DayView({
  date,
  doctors,
  appointments,
  availabilityByDoctor,
  clinicWorkingHoursStart,
  clinicWorkingHoursEnd,
  startHour,
  endHour,
  timeZone,
  onSlotClick,
  onAppointmentClick,
}: DayViewProps) {
  // `date` is a plain calendar-navigation marker (never a real instant), so
  // a local getDay() is the right tool here, same as the rest of this file.
  const dayOfWeek = date.getDay()

  const columns: GridColumn[] = doctors.map((doctor) => {
    const hours = doctorHoursForDay(
      availabilityByDoctor[doctor.id] ?? [],
      dayOfWeek,
      clinicWorkingHoursStart,
      clinicWorkingHoursEnd,
    )
    return {
      key: doctor.id,
      date,
      header: (
        <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-on-surface">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: doctor.color }} />
          {doctor.name}
        </div>
      ),
      appointments: appointments.filter((a) => a.doctor_id === doctor.id),
      offHoursRanges: computeOffHoursRanges(hours, startHour, endHour),
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
