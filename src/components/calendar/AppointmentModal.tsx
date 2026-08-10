import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import { statusLabels } from '../ui/StatusChip'
import PatientCombobox from './PatientCombobox'
import PatientFormModal from '../patients/PatientFormModal'
import TimeWheelPicker from '../ui/TimeWheelPicker'
import { supabase } from '../../lib/supabase'
import { VISIT_TYPES, visitTypeLabel } from '../../lib/visitTypes'
import { dayOfWeekFromYmd, formatDateAr, toZonedInputParts, zonedWallTimeToUtc } from '../../lib/dates'
import { isWithinDoctorHours } from '../../lib/doctorSchedule'
import type { AppointmentInput, AppointmentWithRelations } from '../../hooks/useAppointments'
import type { SlotParts } from './TimeGrid'
import type { AppointmentStatus, Doctor, DoctorAvailability, Patient, VisitType } from '../../types'

interface LastVisit {
  id: string
  starts_at: string
  visit_type: VisitType
  status: AppointmentStatus
  notes: string | null
}

interface AppointmentModalProps {
  open: boolean
  appointment: AppointmentWithRelations | null
  initialDoctorId: string | null
  initialSlot: SlotParts | null
  clinicTimezone: string
  doctors: Doctor[]
  patients: Patient[]
  availabilityByDoctor: Record<string, DoctorAvailability[]>
  clinicWorkingHoursStart: string
  clinicWorkingHoursEnd: string
  onCreatePatient: (name: string, phone: string, notes: string) => Promise<{ error: string | null; patient?: Patient | null }>
  onSave: (input: AppointmentInput) => Promise<{ error: string | null }>
  onClose: () => void
}

const DURATIONS: (15 | 30 | 45 | 60)[] = [15, 30, 45, 60]

export default function AppointmentModal({
  open,
  appointment,
  initialDoctorId,
  initialSlot,
  clinicTimezone,
  doctors,
  patients,
  availabilityByDoctor,
  clinicWorkingHoursStart,
  clinicWorkingHoursEnd,
  onCreatePatient,
  onSave,
  onClose,
}: AppointmentModalProps) {
  const [patientId, setPatientId] = useState<string | null>(null)
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [dateStr, setDateStr] = useState('')
  const [timeStr, setTimeStr] = useState('')
  const [duration, setDuration] = useState<15 | 30 | 45 | 60>(30)
  const [visitType, setVisitType] = useState<VisitType>('checkup')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [addPatientOpen, setAddPatientOpen] = useState(false)
  const [addPatientInitialName, setAddPatientInitialName] = useState('')
  const [lastVisit, setLastVisit] = useState<LastVisit | null>(null)
  const [lastVisitLoading, setLastVisitLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)

    if (appointment) {
      const { date, time } = toZonedInputParts(appointment.starts_at, clinicTimezone)
      setPatientId(appointment.patient_id)
      setDoctorId(appointment.doctor_id)
      setDateStr(date)
      setTimeStr(time)
      setDuration(appointment.duration_minutes)
      setVisitType(appointment.visit_type)
      setNotes(appointment.notes ?? '')
    } else {
      setPatientId(null)
      setDoctorId(initialDoctorId ?? doctors[0]?.id ?? null)
      if (initialSlot) {
        const { year, month, day, hour, minute } = initialSlot
        setDateStr(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
        setTimeStr(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
      } else {
        // No slot was clicked (e.g. the toolbar's "new appointment" button) —
        // default to today and a sensible time rather than leaving the wheel
        // picker with nothing to display.
        setDateStr(toZonedInputParts(new Date().toISOString(), clinicTimezone).date)
        setTimeStr('09:00')
      }
      setDuration(30)
      setVisitType('checkup')
      setNotes('')
    }
  }, [open, appointment, initialDoctorId, initialSlot, clinicTimezone, doctors])

  // Surfaces the patient's most recent past visit (date, visit type, status,
  // and the free-text notes field) once selected, so a receptionist booking
  // a follow-up sees what happened last time without leaving this modal —
  // none of this is new data collection, it's already-stored, non-medical
  // fields (visit type is a category like "تنظيف", never a diagnosis).
  useEffect(() => {
    if (!open || !patientId) {
      setLastVisit(null)
      return
    }
    let cancelled = false
    setLastVisitLoading(true)

    supabase
      .from('appointments')
      .select('id, starts_at, visit_type, status, notes')
      .eq('patient_id', patientId)
      .lt('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: false })
      .limit(2)
      .then(({ data }) => {
        if (cancelled) return
        const rows = (data as LastVisit[] | null) ?? []
        const filtered = appointment ? rows.filter((r) => r.id !== appointment.id) : rows
        setLastVisit(filtered[0] ?? null)
        setLastVisitLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, patientId, appointment])

  async function handleAddPatientSave(name: string, phone: string, notesValue: string) {
    const result = await onCreatePatient(name, phone, notesValue)
    if (!result.error && result.patient) {
      setPatientId(result.patient.id)
    }
    return { error: result.error }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!patientId || !doctorId || !dateStr || !timeStr) {
      setError(ar.common_error)
      return
    }

    const [year, month, day] = dateStr.split('-').map(Number)
    const [hour, minute] = timeStr.split(':').map(Number)
    const startsAt = zonedWallTimeToUtc(year, month, day, hour, minute, clinicTimezone).toISOString()

    setSaving(true)
    const { error: saveError } = await onSave({
      patientId,
      doctorId,
      startsAt,
      durationMinutes: duration,
      visitType,
      notes,
    })
    setSaving(false)
    if (saveError) {
      setError(saveError)
      return
    }
    onClose()
  }

  // A soft warning only — never blocks saving. A receptionist may
  // legitimately need to book outside a doctor's usual hours (an
  // emergency slot, a one-off exception), so this just flags it rather
  // than the hard doctor-overlap conflict check above, which does block.
  const showsOutsideHoursWarning =
    Boolean(doctorId && dateStr && timeStr) &&
    !isWithinDoctorHours(
      availabilityByDoctor[doctorId!] ?? [],
      dayOfWeekFromYmd(dateStr),
      timeStr,
      clinicWorkingHoursStart,
      clinicWorkingHoursEnd,
    )

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          >
            <motion.div
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-text">
                {appointment ? ar.appt_editTitle : ar.appt_newTitle}
              </h2>

              <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text">{ar.appt_patient}</label>
                  <PatientCombobox
                    patients={patients}
                    selectedPatientId={patientId}
                    onSelect={(p) => setPatientId(p.id)}
                    onAddNew={(initialName) => {
                      setAddPatientInitialName(initialName)
                      setAddPatientOpen(true)
                    }}
                  />
                  {patientId && !lastVisitLoading && (
                    <p className="mt-1.5 rounded-lg bg-bg px-2.5 py-1.5 text-xs text-text-muted">
                      {lastVisit ? (
                        <>
                          {ar.appt_lastVisit}: {formatDateAr(lastVisit.starts_at, clinicTimezone)} —{' '}
                          {visitTypeLabel(lastVisit.visit_type)} · {statusLabels[lastVisit.status]}
                          {lastVisit.notes && <> — {lastVisit.notes}</>}
                        </>
                      ) : (
                        ar.appt_firstVisit
                      )}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="apptDoctor">
                      {ar.appt_doctor}
                    </label>
                    <select
                      id="apptDoctor"
                      required
                      value={doctorId ?? ''}
                      onChange={(e) => setDoctorId(e.target.value)}
                      className="block w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="" disabled>
                        {ar.appt_selectDoctor}
                      </option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="apptDuration">
                      {ar.appt_duration}
                    </label>
                    <select
                      id="apptDuration"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value) as 15 | 30 | 45 | 60)}
                      className="block w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      {DURATIONS.map((d) => (
                        <option key={d} value={d}>
                          {d} {ar.appt_durationMinutes}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="apptDate">
                      {ar.appt_date}
                    </label>
                    <input
                      id="apptDate"
                      type="date"
                      required
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                      className="block w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="apptTime">
                      {ar.appt_time}
                    </label>
                    <TimeWheelPicker id="apptTime" value={timeStr} onChange={setTimeStr} />
                  </div>
                </div>

                {showsOutsideHoursWarning && (
                  <p className="rounded-lg bg-warning-soft px-2.5 py-1.5 text-xs text-warning">
                    {ar.doctor_outsideHoursWarning}
                  </p>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="apptVisitType">
                    {ar.appt_visitType}
                  </label>
                  <select
                    id="apptVisitType"
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value as VisitType)}
                    className="block w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {VISIT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="apptNotes">
                    {ar.appt_notes} <span className="text-text-muted">({ar.common_optional})</span>
                  </label>
                  <textarea
                    id="apptNotes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="block w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {error && <p className="text-sm text-error">{error}</p>}

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="secondary" onClick={onClose}>
                    {ar.common_cancel}
                  </Button>
                  <Button type="submit" loading={saving}>
                    {ar.appt_save}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PatientFormModal
        open={addPatientOpen}
        patient={null}
        initialName={addPatientInitialName}
        onSave={handleAddPatientSave}
        onClose={() => setAddPatientOpen(false)}
      />
    </>
  )
}
