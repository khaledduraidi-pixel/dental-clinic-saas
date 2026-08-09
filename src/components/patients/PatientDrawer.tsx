import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import Skeleton from '../layout/Skeleton'
import StatusChip from '../ui/StatusChip'
import ConfirmDialog from '../layout/ConfirmDialog'
import { supabase } from '../../lib/supabase'
import { formatDateTimeAr } from '../../lib/dates'
import { visitTypeLabel } from '../../lib/visitTypes'
import { useClinic } from '../../hooks/useClinic'
import type { Appointment, Patient } from '../../types'

interface AppointmentHistoryRow extends Appointment {
  doctors: { name: string; color: string } | null
}

interface PatientDrawerProps {
  patient: Patient | null
  onClose: () => void
  onEdit: (patient: Patient) => void
  onDelete: (patient: Patient) => Promise<{ error: string | null }>
}

export default function PatientDrawer({ patient, onClose, onEdit, onDelete }: PatientDrawerProps) {
  const { clinic } = useClinic()
  const [history, setHistory] = useState<AppointmentHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    if (!patient) return
    let cancelled = false
    setLoading(true)

    supabase
      .from('appointments')
      .select('*, doctors(name, color)')
      .eq('patient_id', patient.id)
      .order('starts_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setHistory((data as AppointmentHistoryRow[] | null) ?? [])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [patient])

  return (
    <AnimatePresence>
      {patient && (
        <motion.div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.aside
            className="fixed inset-y-0 end-0 flex w-full max-w-md flex-col bg-surface shadow-2xl"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border p-6">
              <div>
                <h2 className="text-lg font-bold text-text">{patient.name}</h2>
                <p className="mt-1 text-sm text-text-muted" dir="ltr">
                  {patient.phone}
                </p>
              </div>
              <Button variant="ghost" onClick={onClose} className="h-9 w-9 px-0">
                ✕
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text">{ar.patients_history}</h3>
                <Link to="/">
                  <Button variant="secondary" className="h-9 px-3 text-xs">
                    {ar.patients_newAppointmentForPatient}
                  </Button>
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {loading &&
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}

                {!loading && history.length === 0 && (
                  <p className="py-8 text-center text-sm text-text-muted">{ar.patients_noHistory}</p>
                )}

                {!loading &&
                  history.map((appt) => (
                    <div key={appt.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text">
                          {formatDateTimeAr(appt.starts_at, clinic?.timezone)}
                        </span>
                        <StatusChip status={appt.status} />
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-text-muted">
                        {appt.doctors && (
                          <span className="flex items-center gap-1">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: appt.doctors.color }}
                            />
                            {appt.doctors.name}
                          </span>
                        )}
                        <span>·</span>
                        <span>{visitTypeLabel(appt.visit_type)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border p-6">
              <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>
                {ar.common_delete}
              </Button>
              <Button variant="secondary" onClick={() => onEdit(patient)}>
                {ar.patients_edit}
              </Button>
            </div>
          </motion.aside>

          <ConfirmDialog
            open={deleteConfirmOpen}
            title={ar.patients_confirmDeleteTitle}
            body={ar.patients_confirmDeleteBody}
            onCancel={() => setDeleteConfirmOpen(false)}
            onConfirm={async () => {
              setDeleteConfirmOpen(false)
              await onDelete(patient)
              onClose()
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
