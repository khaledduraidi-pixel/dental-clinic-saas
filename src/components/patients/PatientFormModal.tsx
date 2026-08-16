import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import PhoneInput from '../ui/PhoneInput'
import type { Patient } from '../../types'

interface PatientFormModalProps {
  open: boolean
  patient: Patient | null
  // Pre-fills the name field for a brand-new patient (e.g. what the
  // receptionist already typed into the appointment modal's search box)
  // without turning this into edit mode — only used when patient is null.
  initialName?: string
  onSave: (name: string, phone: string, notes: string) => Promise<{ error: string | null }>
  onClose: () => void
}

export default function PatientFormModal({
  open,
  patient,
  initialName,
  onSave,
  onClose,
}: PatientFormModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [phoneValid, setPhoneValid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(patient?.name ?? initialName ?? '')
    setPhone(patient?.phone ?? '')
    setPhoneValid(Boolean(patient?.phone))
    setNotes(patient?.notes ?? '')
    setError(null)
  }, [open, patient, initialName])

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
              <Input
                id="patientName"
                label={ar.patients_name}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
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
              <Textarea
                id="patientNotes"
                label={ar.appt_notes}
                optionalHint={ar.common_optional}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              {error && (
                <p role="alert" className="rounded-xl bg-error-soft px-3 py-2.5 text-sm text-error">
                  {error}
                </p>
              )}

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
