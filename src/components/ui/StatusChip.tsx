import ar from '../../i18n/ar'
import type { AppointmentStatus } from '../../types'

// M3 status chip: corner-small 8px, label-medium 12/600. Colour pairs are
// container/on-container so text contrast is guaranteed on every surface.
const styles: Record<AppointmentStatus, string> = {
  scheduled: 'bg-surface-highest text-on-surface-variant',
  confirmed: 'bg-success-container text-on-success-container',
  reschedule_requested: 'bg-warning-container text-on-warning-container',
  no_show: 'bg-error-container text-on-error-container',
  completed: 'bg-primary-container text-on-primary-container',
  cancelled: 'bg-surface-highest text-on-surface-variant line-through',
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
        'inline-block shrink-0 rounded-sm px-2.5 py-1 text-label-sm font-semibold ' + styles[status]
      }
    >
      {statusLabels[status]}
    </span>
  )
}
