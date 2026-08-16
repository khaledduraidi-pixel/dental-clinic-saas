import { useEffect, useState, type FormEvent } from 'react'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Skeleton from '../layout/Skeleton'
import { useClinic } from '../../hooks/useClinic'
import { isWhatsAppMockMode, renderReminderMessage } from '../../lib/whatsapp'
import { formatDateAr, formatTimeAr } from '../../lib/dates'
import type { WhatsAppMode } from '../../types'

// isWhatsAppMockMode() reflects this *deployment's* build-time env
// (VITE_WHATSAPP_MOCK) — whether Meta credentials have been configured for
// the app at all. clinic.whatsapp_mode is the *per-clinic* switch that
// actually decides which pipeline sends a given clinic's reminders (see
// useReminders.ts). A clinic can only go live once the deployment itself
// has live credentials configured.
export default function WhatsAppSettings() {
  const { clinic, loading, updateClinic } = useClinic()
  const [mode, setMode] = useState<WhatsAppMode>('mock')
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const deploymentSupportsLive = !isWhatsAppMockMode()

  useEffect(() => {
    if (!clinic) return
    setMode(clinic.whatsapp_mode)
    setPhoneNumberId(clinic.whatsapp_phone_number_id ?? '')
  }, [clinic])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setSaving(true)
    const { error: saveError } = await updateClinic({
      whatsapp_mode: mode,
      whatsapp_phone_number_id: phoneNumberId || null,
    })
    setSaving(false)
    if (saveError) {
      setError(saveError)
      return
    }
    setSaved(true)
  }

  const connected = clinic?.whatsapp_mode === 'live' && Boolean(clinic.whatsapp_phone_number_id)

  const sampleDate = new Date(Date.now() + 24 * 3_600_000).toISOString()
  const previewBody = renderReminderMessage({
    patientName: ar.whatsapp_sampleName,
    clinicName: clinic?.name ?? ar.appName,
    dateLabel: formatDateAr(sampleDate, clinic?.timezone),
    timeLabel: formatTimeAr(sampleDate, clinic?.timezone),
  })

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-text">{ar.settings_whatsapp}</h2>
        {!loading && clinic && (
          <span
            className={
              'rounded-full px-2.5 py-1 text-xs font-medium ' +
              (connected ? 'bg-success-soft text-success' : 'bg-border text-text-muted')
            }
          >
            {connected ? ar.whatsapp_connected : ar.whatsapp_notConnected}
          </span>
        )}
      </div>

      {loading && (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!loading && clinic && (
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <Select
            id="whatsappMode"
            label={ar.whatsapp_mode}
            className="max-w-xs"
            value={mode}
            onChange={(e) => setMode(e.target.value as WhatsAppMode)}
            disabled={!deploymentSupportsLive}
            helperText={!deploymentSupportsLive ? ar.whatsapp_liveUnavailable : undefined}
          >
            <option value="mock">{ar.whatsapp_modeMockOption}</option>
            <option value="live">{ar.whatsapp_modeLiveOption}</option>
          </Select>

          <Input
            id="whatsappPhoneNumberId"
            label={ar.whatsapp_phoneNumberId}
            type="text"
            dir="ltr"
            className="font-mono"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            disabled={mode !== 'live'}
            helperText={ar.whatsapp_phoneNumberIdHelp}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">{ar.whatsapp_templatePreview}</label>
            <p className="rounded-xl bg-bg px-3 py-2.5 text-sm text-text">{previewBody}</p>
          </div>

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
