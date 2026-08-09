import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import PhoneInput from '../ui/PhoneInput'
import type { Patient } from '../../types'

interface PatientFormModalProps {
  open: boolean
  patient: Patient | null
  onSave: (name: string, phone: string, notes: string) => Promise<{ error: string | null }>
  onClose: () => void
}

export default function PatientFormModal({ open, patient, onSave, onClose }: PatientFormModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [phoneValid, setPhoneValid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(patient?.name ?? '')
    setPhone(patient?.phone ?? '')
    setPhoneValid(Boolean(patient?.phone))
    setNotes(patient?.notes ?? '')
    setError(null)
  }, [open, patient])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!phoneValid) {
      setError(ar.common_error)
      return
    }
    setSaving(true)
    const { error: saveError } = await onSave(name.trim(), phone, notes.trim())
    setSaving(false)
    if (saveError) {
      setError(saveError)
      return
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
            className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-text">
              {patient ? ar.patients_editTitle : ar.patients_newPatient}
            </h2>

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="patientName">
                  {ar.patients_name}
                </label>
                <input
                  id="patientName"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="patientPhone">
                  {ar.patients_phone}
                </label>
                <PhoneInput
                  id="patientPhone"
                  value={phone}
                  onChange={(e164) => {
                    setPhoneValid(e164 !== null)
                    if (e164) setPhone(e164)
                  }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="patientNotes">
                  {ar.appt_notes} <span className="text-text-muted">({ar.common_optional})</span>
                </label>
                <textarea
                  id="patientNotes"
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
