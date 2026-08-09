import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
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

interface DoctorFormModalProps {
  open: boolean
  doctor: Doctor | null
  onSave: (name: string, color: string) => Promise<{ error: string | null }>
  onClose: () => void
}

export default function DoctorFormModal({ open, doctor, onSave, onClose }: DoctorFormModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLOR_PALETTE[0])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(doctor?.name ?? '')
    setColor(doctor?.color ?? COLOR_PALETTE[0])
    setError(null)
  }, [open, doctor])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error: saveError } = await onSave(name.trim(), color)
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
