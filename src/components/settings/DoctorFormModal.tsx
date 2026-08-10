import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import TimeWheelPicker from '../ui/TimeWheelPicker'
import { useClinic } from '../../hooks/useClinic'
import { useDoctorAvailability, type AvailabilityDayInput } from '../../hooks/useDoctorAvailability'
import type { Doctor } from '../../types'

const COLOR_PALETTE = [
  '#0F766E', // teal
  '#B45309', // amber
  '#7C3AED', // violet
  '#BE123C', // rose
  '#1D4ED8', // blue
  '#047857', // emerald
  '#C2410C', // orange
  '#475569', // slate
]

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const

interface DaySchedule {
  enabled: boolean
  start: string
  end: string
}

interface DoctorFormModalProps {
  open: boolean
  doctor: Doctor | null
  onSave: (name: string, color: string) => Promise<{ error: string | null }>
  onClose: () => void
}

export default function DoctorFormModal({ open, doctor, onSave, onClose }: DoctorFormModalProps) {
  const { clinic } = useClinic()
  const { availability, loading: availabilityLoading, saveAvailability } = useDoctorAvailability(doctor?.id ?? null)

  const [name, setName] = useState('')
  const [color, setColor] = useState(COLOR_PALETTE[0])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [useCustomHours, setUseCustomHours] = useState(false)
  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>({})

  const clinicStart = clinic?.working_hours_start.slice(0, 5) ?? '09:00'
  const clinicEnd = clinic?.working_hours_end.slice(0, 5) ?? '17:00'

  useEffect(() => {
    if (!open) return
    setName(doctor?.name ?? '')
    setColor(doctor?.color ?? COLOR_PALETTE[0])
    setError(null)
  }, [open, doctor])

  useEffect(() => {
    if (!open || availabilityLoading) return
    if (availability.length > 0) {
      setUseCustomHours(true)
      const next: Record<number, DaySchedule> = {}
      for (const d of DAYS) {
        const row = availability.find((a) => a.day_of_week === d)
        next[d] = row
          ? { enabled: true, start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5) }
          : { enabled: false, start: clinicStart, end: clinicEnd }
      }
      setSchedule(next)
    } else {
      setUseCustomHours(false)
      const next: Record<number, DaySchedule> = {}
      for (const d of DAYS) next[d] = { enabled: true, start: clinicStart, end: clinicEnd }
      setSchedule(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, availability, availabilityLoading])

  function updateDay(day: number, patch: Partial<DaySchedule>) {
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error: saveError } = await onSave(name.trim(), color)
    if (saveError) {
      setSaving(false)
      setError(saveError)
      return
    }

    if (doctor) {
      const rows: AvailabilityDayInput[] = useCustomHours
        ? DAYS.filter((d) => schedule[d]?.enabled).map((d) => ({
            day_of_week: d,
            start_time: schedule[d].start,
            end_time: schedule[d].end,
          }))
        : []
      const { error: availabilityError } = await saveAvailability(rows)
      setSaving(false)
      if (availabilityError) {
        setError(availabilityError)
        return
      }
    } else {
      setSaving(false)
    }
    onClose()
  }

  return (
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
              {doctor ? ar.doctor_editTitle : ar.doctor_addTitle}
            </h2>

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="doctorName">
                  {ar.doctor_name}
                </label>
                <input
                  id="doctorName"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-text">{ar.doctor_color}</span>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-label={c}
                      className={
                        'h-8 w-8 rounded-full ring-offset-2 transition-shadow ' +
                        (color === c ? 'ring-2 ring-text' : '')
                      }
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {doctor && (
                <div className="rounded-xl border border-border p-3">
                  <label className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-sm font-medium text-text">{ar.doctor_useCustomHours}</span>
                      <span className="block text-xs text-text-muted">{ar.doctor_useCustomHoursHelp}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={useCustomHours}
                      onChange={(e) => setUseCustomHours(e.target.checked)}
                      className="h-5 w-5 accent-primary"
                    />
                  </label>

                  {useCustomHours && (
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      {DAYS.map((d) => (
                        <div key={d} className="flex flex-wrap items-center gap-2">
                          <label className="flex w-24 items-center gap-2 text-sm text-text">
                            <input
                              type="checkbox"
                              checked={schedule[d]?.enabled ?? false}
                              onChange={(e) => updateDay(d, { enabled: e.target.checked })}
                              className="h-4 w-4 accent-primary"
                            />
                            {ar.doctor_days[d]}
                          </label>
                          {schedule[d]?.enabled ? (
                            <div className="flex items-center gap-2">
                              <TimeWheelPicker
                                value={schedule[d].start}
                                onChange={(v) => updateDay(d, { start: v })}
                              />
                              <span className="text-xs text-text-muted">{ar.settings_workingHoursTo}</span>
                              <TimeWheelPicker value={schedule[d].end} onChange={(v) => updateDay(d, { end: v })} />
                            </div>
                          ) : (
                            <span className="text-xs text-text-muted">{ar.doctor_dayOff}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-error">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={onClose}>
                  {ar.common_cancel}
                </Button>
                <Button type="submit" loading={saving}>
                  {ar.common_save}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
