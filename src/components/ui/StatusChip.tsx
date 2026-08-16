import ar from '../../i18n/ar'
import type { AppointmentStatus } from '../../types'

// Exact mapping from the product spec: scheduled=gray, confirmed=green,
// reschedule_requested=amber, no_show=red, completed=blue. cancelled isn't
// in the spec's list; treated as a muted, struck-through gray.
const statusStyles: Record<AppointmentStatus, string> = {
  scheduled: 'bg-bg text-text-muted',
  confirmed: 'bg-success-soft text-success',
  reschedule_requested: 'bg-warning-soft text-warning',
  no_show: 'bg-error-soft text-error',
  completed: 'bg-primary-soft text-primary-dark',
  cancelled: 'bg-bg text-text-muted/70 line-through',
}

export const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: ar.status_scheduled,
  confirmed: ar.status_confirmed,
  reschedule_requested: ar.status_reschedule_requested,
  no_show: ar.status_no_show,
  completed: ar.status_completed,
  cancelled: ar.status_cancelled,
}

export default function StatusChip({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ' +
        statusStyles[status]
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabels[status]}
    </span>
  )
}
