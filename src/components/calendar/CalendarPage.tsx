import { useMemo, useState } from 'react'
import { addDays, format, startOfDay, startOfWeek } from 'date-fns'
import { ar as arLocale } from 'date-fns/locale'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import Skeleton from '../layout/Skeleton'
import { useClinic } from '../../hooks/useClinic'
import { useDoctors } from '../../hooks/useDoctors'
import { useAllDoctorAvailability } from '../../hooks/useAllDoctorAvailability'
import { usePatients } from '../../hooks/usePatients'
import { useAppointments, type AppointmentWithRelations } from '../../hooks/useAppointments'
import { useReminderAutoProcessor, useReminders } from '../../hooks/useReminders'
import DoctorFilterChips from './DoctorFilterChips'
import DayStrip from './DayStrip'
import NextUpCard from './NextUpCard'
import TodayList from './TodayList'
import Fab from '../ui/Fab'
import DayView from './DayView'
import WeekView from './WeekView'
import AppointmentModal from './AppointmentModal'
import AppointmentDetailPanel from './AppointmentDetailPanel'
import type { SlotParts } from './TimeGrid'

type ViewMode = 'day' | 'week'

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
  const activeDoctorIds = useMemo(() => activeDoctors.map((d) => d.id), [activeDoctors])
  const { availabilityByDoctor } = useAllDoctorAvailability(activeDoctorIds)
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

  // The next appointment still ahead of now, today only — drives the hero card.
  const nextUp = useMemo(() => {
    const now = Date.now()
    return [...appointments]
      .filter((a) => a.status !== 'cancelled' && new Date(a.starts_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0]
  }, [appointments])

  return (
    <div className="pb-2">
      <DayStrip anchor={anchorDate} onSelect={setAnchorDate} />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-headline font-normal text-on-surface">{rangeLabel}</h1>
        <div className="hidden items-center gap-2 sm:flex">
          <div className="flex gap-1 rounded-full bg-surface-low p-1">
            {(['day', 'week'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                aria-pressed={viewMode === m}
                className={
                  'rounded-full px-4 py-1.5 text-label font-semibold outline outline-2 outline-offset-2 outline-transparent transition-colors focus-visible:outline-primary ' +
                  (viewMode === m
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-high')
                }
              >
                {m === 'day' ? ar.calendar_dayView : ar.calendar_weekView}
              </button>
            ))}
          </div>
          <Button variant="tonal" icon="plus" onClick={() => openNewAppointment(null, null)}>
            {ar.calendar_newAppointment}
          </Button>
        </div>
      </div>

      {/* doctor filter: the desktop grid has a column per doctor, so filtering
          matters there. The mobile list is chronological and short — the chips
          would be clutter. */}
      <div className="mt-4 hidden sm:block">
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

      {/* mobile: next-up + chronological list */}
      <div className="mt-4 space-y-5 sm:hidden">
        {loading || doctorsLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            {nextUp && (
              <NextUpCard
                appointment={nextUp}
                timeZone={timezone}
                onMarkArrived={(id) => void setAppointmentStatus(id, 'completed')}
                onOpen={setSelectedAppointment}
              />
            )}
            <div>
              <h2 className="mb-2 text-title font-semibold text-on-surface">{ar.today_appointments}</h2>
              <TodayList
                appointments={appointments}
                timeZone={timezone}
                onOpen={setSelectedAppointment}
              />
            </div>
          </>
        )}
      </div>

      {/* desktop: multi-doctor time grid */}
      <div className="mt-4 hidden rounded-md bg-surface-low p-4 sm:block">
        {loading || doctorsLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : viewMode === 'day' ? (
          <DayView
            date={anchorDate}
            doctors={visibleDoctors}
            appointments={appointments}
            availabilityByDoctor={availabilityByDoctor}
            clinicWorkingHoursStart={clinic?.working_hours_start ?? '08:00:00'}
            clinicWorkingHoursEnd={clinic?.working_hours_end ?? '20:00:00'}
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

      {/* extended FAB — mobile only; desktop has the tonal button in the header */}
      <div className="fixed bottom-24 end-4 z-30 sm:hidden">
        <Fab onClick={() => openNewAppointment(null, null)}>{ar.calendar_newAppointment}</Fab>
      </div>

      <AppointmentModal
        open={modalOpen}
        appointment={editingAppointment}
        initialDoctorId={initialDoctorId}
        initialSlot={initialSlot}
        clinicTimezone={timezone}
        doctors={activeDoctors}
        patients={patients}
        availabilityByDoctor={availabilityByDoctor}
        clinicWorkingHoursStart={clinic?.working_hours_start ?? '08:00:00'}
        clinicWorkingHoursEnd={clinic?.working_hours_end ?? '20:00:00'}
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
