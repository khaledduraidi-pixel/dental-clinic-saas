import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import Input from '../ui/Input'
import TimeWheelPicker from '../ui/TimeWheelPicker'
import { useClinic } from '../../hooks/useClinic'
import { useDoctorAvailability, type AvailabilityDayInput } from '../../hooks/useDoctorAvailability'
import type { Doctor } from '../../types'

// A curated categorical palette (same L/C discipline as the brand tokens,
// hues spread evenly around the wheel) — for telling doctors apart on the
// calendar, not a brand decoration, so it lives outside the theme tokens.
const COLOR_PALETTE = [
  '#007C72', // teal
  '#9B532A', // terracotta
  '#4268A8', // indigo
  '#924D7D', // rose
  '#AA7E00', // gold
  '#007694', // sky
  '#786900', // olive
  '#73599E', // plum
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface-high p-6"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-title-lg font-normal text-on-surface">
              {doctor ? ar.doctor_editTitle : ar.doctor_addTitle}
            </h2>

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <Input
                id="doctorName"
                label={ar.doctor_name}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <div>
                <span className="mb-1.5 block text-sm font-medium text-on-surface">{ar.doctor_color}</span>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-label={c}
                      aria-pressed={color === c}
                      className={
                        'h-8 w-8 rounded-full outline outline-2 outline-offset-2 outline-transparent ring-offset-2 transition-shadow focus-visible:outline-primary ' +
                        (color === c ? 'ring-2 ring-on-surface' : '')
                      }
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {doctor && (
                <div className="rounded-xl border border-outline-variant p-3">
                  <label className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-sm font-medium text-on-surface">{ar.doctor_useCustomHours}</span>
                      <span className="block text-xs text-on-surface-variant">{ar.doctor_useCustomHoursHelp}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={useCustomHours}
                      onChange={(e) => setUseCustomHours(e.target.checked)}
                      className="h-5 w-5 accent-primary outline-2 outline-offset-2 outline-primary focus-visible:outline"
                    />
                  </label>

                  {useCustomHours && (
                    <div className="mt-3 space-y-2 border-t border-outline-variant pt-3">
                      {DAYS.map((d) => (
                        <div key={d} className="flex flex-wrap items-center gap-2">
                          <label className="flex w-24 items-center gap-2 text-sm text-on-surface">
                            <input
                              type="checkbox"
                              checked={schedule[d]?.enabled ?? false}
                              onChange={(e) => updateDay(d, { enabled: e.target.checked })}
                              className="h-4 w-4 accent-primary outline-2 outline-offset-2 outline-primary focus-visible:outline"
                            />
                            {ar.doctor_days[d]}
                          </label>
                          {schedule[d]?.enabled ? (
                            <div className="flex items-center gap-2">
                              <TimeWheelPicker
                                value={schedule[d].start}
                                onChange={(v) => updateDay(d, { start: v })}
                              />
                              <span className="text-xs text-on-surface-variant">{ar.settings_workingHoursTo}</span>
                              <TimeWheelPicker value={schedule[d].end} onChange={(v) => updateDay(d, { end: v })} />
                            </div>
                          ) : (
                            <span className="text-xs text-on-surface-variant">{ar.doctor_dayOff}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p role="alert" className="rounded-xl bg-error-container px-3 py-2.5 text-sm text-error">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="text" onClick={onClose}>
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
