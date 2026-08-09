import ar from '../../i18n/ar'
import type { AppointmentStatus } from '../../types'

// Exact mapping from the product spec: scheduled=gray, confirmed=green,
// reschedule_requested=amber, no_show=red, completed=blue. cancelled isn't
// in the spec's list; treated as a muted, struck-through gray.
const statusStyles: Record<AppointmentStatus, string> = {
  scheduled: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-green-100 text-green-700',
  reschedule_requested: 'bg-amber-100 text-amber-700',
  no_show: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-400 line-through',
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
