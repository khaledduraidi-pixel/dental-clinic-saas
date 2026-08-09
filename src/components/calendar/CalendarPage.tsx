import { useMemo, useState } from 'react'
import { addDays, addWeeks, format, startOfDay, startOfWeek, subDays, subWeeks } from 'date-fns'
import { ar as arLocale } from 'date-fns/locale'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import Skeleton from '../layout/Skeleton'
import { useClinic } from '../../hooks/useClinic'
import { useDoctors } from '../../hooks/useDoctors'
import { usePatients } from '../../hooks/usePatients'
import { useAppointments, type AppointmentWithRelations } from '../../hooks/useAppointments'
import { useReminderAutoProcessor, useReminders } from '../../hooks/useReminders'
import DoctorFilterChips from './DoctorFilterChips'
import DayView from './DayView'
import WeekView from './WeekView'
import AppointmentModal from './AppointmentModal'
import AppointmentDetailPanel from './AppointmentDetailPanel'
import type { SlotParts } from './TimeGrid'

type ViewMode = 'day' | 'week'

function ChevronIcon({ direction }: { direction: 'start' | 'end' }) {
  // "start" points toward the reading-start side (right, in RTL) — used for
  // "previous". "end" points toward the reading-end side (left) — "next".
  // These are the RTL-mirrored equivalents of the LTR back/forward chevrons.
  const path = direction === 'start' ? 'M12.5 15L7.5 10L12.5 5' : 'M7.5 15L12.5 10L7.5 5'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d={path} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function CalendarPage() {
  const { clinic } = useClinic()
  const { doctors, loading: doctorsLoading } = useDoctors()
  const { patients, createPatient } = usePatients()

  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<Set<string> | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<AppointmentWithRelations | null>(null)
  const [initialDoctorId, setInitialDoctorId] = useState<string | null>(null)
  const [initialSlot, setInitialSlot] = useState<SlotParts | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null)

  const activeDoctors = useMemo(() => doctors.filter((d) => d.active), [doctors])
  const visibleDoctors = useMemo(
    () => activeDoctors.filter((d) => selectedDoctorIds === null || selectedDoctorIds.has(d.id)),
    [activeDoctors, selectedDoctorIds],
  )

  const rangeStart = useMemo(
    () => (viewMode === 'day' ? startOfDay(anchorDate) : startOfWeek(anchorDate, { weekStartsOn: 0 })),
    [viewMode, anchorDate],
  )
  const rangeEnd = useMemo(
    () => (viewMode === 'day' ? addDays(rangeStart, 1) : addDays(rangeStart, 7)),
    [viewMode, rangeStart],
  )

  const { appointments, loading, createAppointment, updateAppointment, setAppointmentStatus } =
    useAppointments(rangeStart, rangeEnd, clinic)
  const { resendReminder } = useReminders()
  useReminderAutoProcessor(clinic)

  const startHour = clinic ? Number(clinic.working_hours_start.slice(0, 2)) : 8
  const endHour = clinic ? Number(clinic.working_hours_end.slice(0, 2)) : 20
  const timezone = clinic?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  function goToday() {
    setAnchorDate(new Date())
  }
  function goPrevious() {
    setAnchorDate((d) => (viewMode === 'day' ? subDays(d, 1) : subWeeks(d, 1)))
  }
  function goNext() {
    setAnchorDate((d) => (viewMode === 'day' ? addDays(d, 1) : addWeeks(d, 1)))
  }

  function openNewAppointment(doctorId: string | null, slot: SlotParts | null) {
    setEditingAppointment(null)
    setInitialDoctorId(doctorId)
    setInitialSlot(slot)
    setModalOpen(true)
  }

  function openEditAppointment(appointment: AppointmentWithRelations) {
    setSelectedAppointment(null)
    setEditingAppointment(appointment)
    setInitialDoctorId(null)
    setInitialSlot(null)
    setModalOpen(true)
  }

  async function handleSave(input: Parameters<typeof createAppointment>[0]) {
    if (editingAppointment) return updateAppointment(editingAppointment.id, input)
    return createAppointment(input)
  }

  const rangeLabel =
    viewMode === 'day'
      ? format(anchorDate, 'EEEE d MMMM yyyy', { locale: arLocale })
      : `${format(rangeStart, 'd MMM', { locale: arLocale })} — ${format(addDays(rangeStart, 6), 'd MMM yyyy', { locale: arLocale })}`

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-text">{ar.calendar_title}</h1>
        <Button onClick={() => openNewAppointment(null, null)}>{ar.calendar_newAppointment}</Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="h-9 px-3 text-xs" onClick={goToday}>
            {ar.calendar_today}
          </Button>
          <Button variant="ghost" className="h-9 w-9 px-0" onClick={goPrevious} aria-label={ar.common_previous}>
            <ChevronIcon direction="start" />
          </Button>
          <Button variant="ghost" className="h-9 w-9 px-0" onClick={goNext} aria-label={ar.common_next}>
            <ChevronIcon direction="end" />
          </Button>
          <span className="ms-2 text-sm font-medium text-text">{rangeLabel}</span>
        </div>

        <div className="flex overflow-hidden rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={'px-4 py-2 text-sm font-medium ' + (viewMode === 'day' ? 'bg-primary-soft text-primary-dark' : 'text-text-muted')}
          >
            {ar.calendar_dayView}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={'px-4 py-2 text-sm font-medium ' + (viewMode === 'week' ? 'bg-primary-soft text-primary-dark' : 'text-text-muted')}
          >
            {ar.calendar_weekView}
          </button>
        </div>
      </div>

      <div className="mt-4">
        {doctorsLoading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <DoctorFilterChips
            doctors={activeDoctors}
            selectedIds={selectedDoctorIds}
            onChange={setSelectedDoctorIds}
          />
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        {loading || doctorsLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : viewMode === 'day' ? (
          <DayView
            date={anchorDate}
            doctors={visibleDoctors}
            appointments={appointments}
            startHour={startHour}
            endHour={endHour}
            timeZone={timezone}
            onSlotClick={(doctorId, slot) => openNewAppointment(doctorId, slot)}
            onAppointmentClick={setSelectedAppointment}
          />
        ) : (
          <WeekView
            date={anchorDate}
            doctors={visibleDoctors}
            appointments={appointments}
            startHour={startHour}
            endHour={endHour}
            timeZone={timezone}
            onSlotClick={(_dayKey, slot) => openNewAppointment(null, slot)}
            onAppointmentClick={setSelectedAppointment}
          />
        )}
      </div>

      <AppointmentModal
        open={modalOpen}
        appointment={editingAppointment}
        initialDoctorId={initialDoctorId}
        initialSlot={initialSlot}
        clinicTimezone={timezone}
        doctors={activeDoctors}
        patients={patients}
        onCreatePatient={createPatient}
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
      />

      <AppointmentDetailPanel
        appointment={selectedAppointment}
        clinicTimezone={timezone}
        onClose={() => setSelectedAppointment(null)}
        onEdit={openEditAppointment}
        onChangeStatus={setAppointmentStatus}
        onCancel={(id) =>
          setAppointmentStatus(id, 'cancelled', selectedAppointment?.starts_at)
        }
        onResendReminder={
          clinic ? (appointment) => resendReminder(appointment, clinic) : undefined
        }
      />
    </div>
  )
}
