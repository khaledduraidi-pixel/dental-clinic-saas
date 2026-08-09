import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import StatusChip from '../ui/StatusChip'
import ConfirmDialog from '../layout/ConfirmDialog'
import { formatDateTimeAr } from '../../lib/dates'
import { visitTypeLabel } from '../../lib/visitTypes'
import type { AppointmentWithRelations } from '../../hooks/useAppointments'
import type { AppointmentStatus } from '../../types'

const CHANGEABLE_STATUSES: AppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'reschedule_requested',
  'no_show',
  'completed',
]

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: ar.status_scheduled,
  confirmed: ar.status_confirmed,
  reschedule_requested: ar.status_reschedule_requested,
  no_show: ar.status_no_show,
  completed: ar.status_completed,
  cancelled: ar.status_cancelled,
}

interface AppointmentDetailPanelProps {
  appointment: AppointmentWithRelations | null
  clinicTimezone: string
  onClose: () => void
  onEdit: (appointment: AppointmentWithRelations) => void
  onChangeStatus: (id: string, status: AppointmentStatus) => Promise<{ error: string | null }>
  onCancel: (id: string) => Promise<{ error: string | null }>
  onResendReminder?: (appointment: AppointmentWithRelations) => Promise<{ error: string | null }>
}

export default function AppointmentDetailPanel({
  appointment,
  clinicTimezone,
  onClose,
  onEdit,
  onChangeStatus,
  onCancel,
  onResendReminder,
}: AppointmentDetailPanelProps) {
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    setResendState('idle')
  }, [appointment?.id])

  async function handleResend() {
    if (!appointment || !onResendReminder) return
    setResendState('sending')
    const { error } = await onResendReminder(appointment)
    setResendState(error ? 'error' : 'sent')
  }

  return (
    <AnimatePresence>
      {appointment && (
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
                <h2 className="text-lg font-bold text-text">{appointment.patients?.name ?? '—'}</h2>
                <p className="mt-1 text-sm text-text-muted" dir="ltr">
                  {appointment.patients?.phone}
                </p>
              </div>
              <Button variant="ghost" onClick={onClose} className="h-9 w-9 px-0">
                ✕
              </Button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <StatusChip status={appointment.status} />

              <dl className="space-y-3 text-sm">
                <Row label={ar.appt_doctor}>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: appointment.doctors?.color }}
                    />
                    {appointment.doctors?.name}
                  </span>
                </Row>
                <Row label={ar.appt_date}>{formatDateTimeAr(appointment.starts_at, clinicTimezone)}</Row>
                <Row label={ar.appt_duration}>
                  {appointment.duration_minutes} {ar.appt_durationMinutes}
                </Row>
                <Row label={ar.appt_visitType}>{visitTypeLabel(appointment.visit_type)}</Row>
                {appointment.notes && <Row label={ar.appt_notes}>{appointment.notes}</Row>}
              </dl>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="changeStatus">
                  {ar.appt_changeStatus}
                </label>
                <select
                  id="changeStatus"
                  value={appointment.status}
                  onChange={(e) => onChangeStatus(appointment.id, e.target.value as AppointmentStatus)}
                  disabled={appointment.status === 'cancelled'}
                  className="block w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                >
                  {CHANGEABLE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                  {appointment.status === 'cancelled' && (
                    <option value="cancelled">{ar.status_cancelled}</option>
                  )}
                </select>
              </div>

              {onResendReminder && appointment.status !== 'cancelled' && (
                <div>
                  <Button
                    variant="secondary"
                    className="w-full"
                    loading={resendState === 'sending'}
                    onClick={handleResend}
                  >
                    {ar.appt_resendReminder}
                  </Button>
                  {resendState === 'sent' && (
                    <p className="mt-1.5 text-center text-sm text-success">{ar.appt_reminderResent}</p>
                  )}
                  {resendState === 'error' && (
                    <p className="mt-1.5 text-center text-sm text-error">{ar.common_error}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border p-6">
              {appointment.status !== 'cancelled' && (
                <Button variant="danger" onClick={() => setCancelConfirmOpen(true)}>
                  {ar.appt_cancelAppointment}
                </Button>
              )}
              <Button variant="secondary" onClick={() => onEdit(appointment)}>
                {ar.common_edit}
              </Button>
            </div>
          </motion.aside>

          <ConfirmDialog
            open={cancelConfirmOpen}
            title={ar.appt_confirmCancelTitle}
            body={ar.appt_confirmCancelBody}
            onCancel={() => setCancelConfirmOpen(false)}
            onConfirm={async () => {
              setCancelConfirmOpen(false)
              await onCancel(appointment.id)
              onClose()
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-medium text-text">{children}</dd>
    </div>
  )
}
