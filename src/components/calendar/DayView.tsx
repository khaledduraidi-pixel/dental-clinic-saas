import TimeGrid, { type GridColumn, type SlotParts } from './TimeGrid'
import type { AppointmentWithRelations } from '../../hooks/useAppointments'
import type { Doctor } from '../../types'

interface DayViewProps {
  date: Date
  doctors: Doctor[]
  appointments: AppointmentWithRelations[]
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
  startHour,
  endHour,
  timeZone,
  onSlotClick,
  onAppointmentClick,
}: DayViewProps) {
  const columns: GridColumn[] = doctors.map((doctor) => ({
    key: doctor.id,
    date,
    header: (
      <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-text">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: doctor.color }} />
        {doctor.name}
      </div>
    ),
    appointments: appointments.filter((a) => a.doctor_id === doctor.id),
  }))

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
