import ar from '../../i18n/ar'
import StatusChip from '../ui/StatusChip'
import { visitTypeLabel } from '../../lib/visitTypes'
import { layoutOverlaps } from '../../lib/calendarLayout'
import { dateKeyInZone, dateKeyLocal, minutesOfDayInZone } from '../../lib/dates'
import type { AppointmentWithRelations } from '../../hooks/useAppointments'

const SLOT_HEIGHT_PX = 48

export interface SlotParts {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
}

export interface GridColumn {
  key: string
  header: React.ReactNode
  date: Date // a plain calendar-navigation marker for "which day is this column" — never read as a real instant
  appointments: AppointmentWithRelations[]
  // Shaded "off" bands, in minutes from the grid's own top edge — purely
  // visual, never a booking restriction (a receptionist can still click
  // and book inside a shaded band; see doctorSchedule.ts).
  offHoursRanges?: { startMinutes: number; endMinutes: number }[]
}

interface TimeGridProps {
  columns: GridColumn[]
  startHour: number
  endHour: number
  slotMinutes: number
  timeZone: string
  onSlotClick: (columnKey: string, slot: SlotParts) => void
  onAppointmentClick: (appointment: AppointmentWithRelations) => void
}

function timeLabel(hour: number, minute: number): string {
  return new Intl.DateTimeFormat('ar', {
    hour: 'numeric',
    minute: minute === 0 ? undefined : '2-digit',
    hour12: true,
    numberingSystem: 'latn',
  }).format(new Date(2000, 0, 1, hour, minute))
}

export default function TimeGrid({
  columns,
  startHour,
  endHour,
  slotMinutes,
  timeZone,
  onSlotClick,
  onAppointmentClick,
}: TimeGridProps) {
  const totalMinutes = (endHour - startHour) * 60
  const slotCount = totalMinutes / slotMinutes
  const pxPerMinute = SLOT_HEIGHT_PX / slotMinutes
  const totalHeight = totalMinutes * pxPerMinute
  const nowIso = new Date().toISOString()
  const todayKey = dateKeyInZone(nowIso, timeZone)
  const nowMinutesOfDay = minutesOfDayInZone(nowIso, timeZone)

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[640px]"
        style={{ gridTemplateColumns: `4rem repeat(${columns.length}, 1fr)` }}
      >
        {/* header row */}
        <div />
        {columns.map((col) => (
          <div key={col.key} className="border-b border-outline-variant px-2 pb-2 text-center">
            {col.header}
          </div>
        ))}

        {/* time gutter */}
        <div style={{ height: totalHeight }} className="relative">
          {Array.from({ length: slotCount }).map((_, i) => {
            const minutesFromStart = i * slotMinutes
            const hour = startHour + Math.floor(minutesFromStart / 60)
            const minute = minutesFromStart % 60
            if (minute !== 0) return null
            return (
              <span
                key={i}
                className="absolute -translate-y-1/2 text-xs text-on-surface-variant"
                style={{ top: minutesFromStart * pxPerMinute, insetInlineEnd: '0.5rem' }}
              >
                {timeLabel(hour, minute)}
              </span>
            )
          })}
        </div>

        {/* day/doctor columns */}
        {columns.map((col) => {
          const laidOut = layoutOverlaps(
            col.appointments,
            (a) => new Date(a.starts_at).getTime(),
            (a) => new Date(a.starts_at).getTime() + a.duration_minutes * 60_000,
          )

          const isToday = dateKeyLocal(col.date) === todayKey
          const nowMinutesFromGridStart = nowMinutesOfDay - startHour * 60
          const showNowLine = isToday && nowMinutesFromGridStart >= 0 && nowMinutesFromGridStart <= totalMinutes

          return (
            <div
              key={col.key}
              className="relative border-s border-outline-variant"
              style={{ height: totalHeight }}
            >
              {col.offHoursRanges?.map((range, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute inset-x-0"
                  style={{
                    top: range.startMinutes * pxPerMinute,
                    height: (range.endMinutes - range.startMinutes) * pxPerMinute,
                    backgroundColor: 'color-mix(in oklch, var(--color-outline-variant) 55%, transparent)',
                    backgroundImage:
                      'repeating-linear-gradient(-45deg, color-mix(in oklch, var(--color-on-surface-variant) 12%, transparent) 0, color-mix(in oklch, var(--color-on-surface-variant) 12%, transparent) 1px, transparent 1px, transparent 8px)',
                  }}
                />
              ))}

              {Array.from({ length: slotCount }).map((_, i) => {
                const minutesFromStart = i * slotMinutes
                const slot: SlotParts = {
                  year: col.date.getFullYear(),
                  month: col.date.getMonth() + 1,
                  day: col.date.getDate(),
                  hour: startHour + Math.floor(minutesFromStart / 60),
                  minute: minutesFromStart % 60,
                }
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSlotClick(col.key, slot)}
                    className="absolute inset-x-0 border-b border-outline-variant/60 outline outline-2 -outline-offset-2 outline-transparent transition-colors hover:bg-primary-container/40 focus-visible:outline-primary"
                    style={{ top: i * SLOT_HEIGHT_PX, height: SLOT_HEIGHT_PX }}
                  />
                )
              })}

              {showNowLine && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 h-px bg-error"
                  style={{ top: nowMinutesFromGridStart * pxPerMinute }}
                >
                  <span className="absolute -top-1 -start-1 h-2 w-2 rounded-full bg-error" />
                </div>
              )}

              {laidOut.map(({ item: appt, column, columnCount }) => {
                const startMinutes = minutesOfDayInZone(appt.starts_at, timeZone) - startHour * 60
                const top = startMinutes * pxPerMinute
                const height = Math.max(appt.duration_minutes * pxPerMinute, 28)
                const widthPct = 100 / columnCount

                return (
                  <button
                    key={appt.id}
                    type="button"
                    onClick={() => onAppointmentClick(appt)}
                    className="absolute z-10 overflow-hidden rounded-lg px-2 py-1 text-start shadow-sm outline outline-2 outline-offset-1 outline-transparent transition-transform hover:z-20 hover:scale-[1.02] focus-visible:outline-primary"
                    style={{
                      top,
                      height,
                      insetInlineStart: `${column * widthPct}%`,
                      width: `calc(${widthPct}% - 4px)`,
                      backgroundColor: (appt.doctors?.color ?? '#00796F') + '1f',
                      borderInlineStart: `3px solid ${appt.doctors?.color ?? '#00796F'}`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-semibold text-on-surface">
                        {appt.patients?.name ?? '—'}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="truncate text-[11px] text-on-surface-variant">
                        {visitTypeLabel(appt.visit_type)}
                      </span>
                    </div>
                    <div className="mt-0.5">
                      <StatusChip status={appt.status} />
                    </div>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
      {columns.every((c) => c.appointments.length === 0) && (
        <p className="py-6 text-center text-sm text-on-surface-variant">{ar.calendar_noAppointments}</p>
      )}
    </div>
  )
}
