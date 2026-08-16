import { useEffect, useState, type FormEvent } from 'react'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Skeleton from '../layout/Skeleton'
import TimeWheelPicker from '../ui/TimeWheelPicker'
import { useClinic } from '../../hooks/useClinic'

const REMINDER_OPTIONS: (12 | 24 | 48)[] = [12, 24, 48]

export default function ClinicInfoSettings() {
  const { clinic, loading, updateClinic } = useClinic()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [hoursStart, setHoursStart] = useState('')
  const [hoursEnd, setHoursEnd] = useState('')
  const [reminderHours, setReminderHours] = useState<12 | 24 | 48>(24)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!clinic) return
    setName(clinic.name)
    setPhone(clinic.phone ?? '')
    setHoursStart(clinic.working_hours_start.slice(0, 5))
    setHoursEnd(clinic.working_hours_end.slice(0, 5))
    setReminderHours(clinic.reminder_hours_before)
  }, [clinic])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setSaving(true)
    const { error: saveError } = await updateClinic({
      name,
      phone,
      working_hours_start: hoursStart,
      working_hours_end: hoursEnd,
      reminder_hours_before: reminderHours,
    })
    setSaving(false)
    if (saveError) {
      setError(saveError)
      return
    }
    setSaved(true)
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-sm font-bold text-text">{ar.settings_clinicInfo}</h2>

      {loading && (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!loading && clinic && (
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="clinicInfoName"
              label={ar.settings_clinicNameLabel}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              id="clinicInfoPhone"
              label={ar.settings_clinicPhoneLabel}
              type="tel"
              className="font-mono"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">{ar.settings_workingHours}</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-text-muted" htmlFor="workingHoursStart">
                  {ar.settings_workingHoursFrom}
                </label>
                <TimeWheelPicker id="workingHoursStart" value={hoursStart} onChange={setHoursStart} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-muted" htmlFor="workingHoursEnd">
                  {ar.settings_workingHoursTo}
                </label>
                <TimeWheelPicker id="workingHoursEnd" value={hoursEnd} onChange={setHoursEnd} />
              </div>
            </div>
          </div>

          <Select
            id="reminderTiming"
            label={ar.settings_reminderTiming}
            helperText={ar.settings_reminderTimingHelp}
            className="max-w-[10rem]"
            value={reminderHours}
            onChange={(e) => setReminderHours(Number(e.target.value) as 12 | 24 | 48)}
          >
            {REMINDER_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {h} {ar.settings_reminderTimingHours}
              </option>
            ))}
          </Select>

          {error && (
            <p role="alert" className="rounded-xl bg-error-soft px-3 py-2.5 text-sm text-error">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" loading={saving}>
              {ar.settings_save}
            </Button>
            {saved && <span className="text-sm text-success">{ar.settings_saved}</span>}
          </div>
        </form>
      )}
    </section>
  )
}
