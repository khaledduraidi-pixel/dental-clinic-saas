import ar from '../../i18n/ar'
import Button from '../ui/Button'
import { formatTimeAr } from '../../lib/dates'
import { visitTypeLabel } from '../../lib/visitTypes'
import type { AppointmentWithRelations } from '../../hooks/useAppointments'

// The daily driver: who is arriving, when, and the two actions a front desk
// actually performs. This replaced the no-show KPI that used to lead this
// screen — that figure is a monthly owner metric and lives in Reports now.
interface NextUpCardProps {
  appointment: AppointmentWithRelations
  timeZone: string
  onMarkArrived: (id: string) => void
  onOpen: (a: AppointmentWithRelations) => void
}

export default function NextUpCard({ appointment, timeZone, onMarkArrived, onOpen }: NextUpCardProps) {
  const minutesAway = Math.round((new Date(appointment.starts_at).getTime() - Date.now()) / 60_000)
  const when =
    minutesAway <= 0
      ? ar.today_now
      : ar.today_inMinutes.replace('{n}', String(minutesAway))

  return (
    <section className="rounded-md bg-surface-high p-4">
      <p className="text-label-sm font-semibold text-primary">
        {when} · <span className="tnum" dir="ltr">{formatTimeAr(appointment.starts_at, timeZone)}</span>
      </p>
      <button
        type="button"
        onClick={() => onOpen(appointment)}
        className="mt-1 block rounded-xs text-start text-title-lg font-semibold text-on-surface outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-primary"
      >
        {appointment.patients?.name ?? '—'}
      </button>
      <p className="mt-0.5 text-body-sm text-on-surface-variant">
        {visitTypeLabel(appointment.visit_type)}
        {appointment.doctors?.name && ` · ${appointment.doctors.name}`}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button icon="check" onClick={() => onMarkArrived(appointment.id)}>
          {ar.today_arrived}
        </Button>
        {appointment.patients?.phone && (
          <Button variant="text" icon="phone" onClick={() => { window.location.href = `tel:${appointment.patients!.phone}` }}>
            {ar.today_call}
          </Button>
        )}
      </div>
    </section>
  )
}
