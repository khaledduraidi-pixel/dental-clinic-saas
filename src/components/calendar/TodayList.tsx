import ar from '../../i18n/ar'
import Avatar from '../ui/Avatar'
import ListItem from '../ui/ListItem'
import StatusChip from '../ui/StatusChip'
import { formatTimeAr } from '../../lib/dates'
import { visitTypeLabel } from '../../lib/visitTypes'
import type { AppointmentWithRelations } from '../../hooks/useAppointments'

// Mobile day view. A phone cannot usefully render a multi-doctor time grid, so
// the same data becomes a chronological list; the desktop grid is unchanged.
interface TodayListProps {
  appointments: AppointmentWithRelations[]
  timeZone: string
  onOpen: (a: AppointmentWithRelations) => void
}

export default function TodayList({ appointments, timeZone, onOpen }: TodayListProps) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-md bg-surface-low px-4 py-10 text-center">
        <p className="text-title font-semibold text-on-surface">{ar.today_none}</p>
        <p className="mt-1 text-body-sm text-on-surface-variant">{ar.today_noneHint}</p>
      </div>
    )
  }

  const ordered = [...appointments].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  )

  return (
    <ul className="flex flex-col gap-2">
      {ordered.map((a) => (
        <li key={a.id}>
          <ListItem
            onClick={() => onOpen(a)}
            leading={<Avatar name={a.patients?.name ?? '؟'} />}
            headline={a.patients?.name ?? '—'}
            supporting={
              <>
                <span className="tnum" dir="ltr">{formatTimeAr(a.starts_at, timeZone)}</span>
                {' · '}
                {visitTypeLabel(a.visit_type)}
                {a.doctors?.name && ` · ${a.doctors.name}`}
              </>
            }
            trailing={<StatusChip status={a.status} />}
          />
        </li>
      ))}
    </ul>
  )
}
