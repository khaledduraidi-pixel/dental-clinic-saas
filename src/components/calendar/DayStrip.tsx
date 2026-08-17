import { addDays, format, isSameDay, startOfDay } from 'date-fns'
import { ar as arLocale } from 'date-fns/locale'

// Horizontal day pills, M3 corner-full. The selected day uses `primary`
// (not primary-container) so it reads as the one committed choice.
interface DayStripProps {
  anchor: Date
  onSelect: (d: Date) => void
  daysBefore?: number
  count?: number
}

export default function DayStrip({ anchor, onSelect, daysBefore = 1, count = 7 }: DayStripProps) {
  const today = startOfDay(new Date())
  const first = addDays(today, -daysBefore)

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-2 pb-1">
        {Array.from({ length: count }).map((_, i) => {
          const d = addDays(first, i)
          const selected = isSameDay(d, anchor)
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(d)}
              aria-current={selected ? 'date' : undefined}
              className={
                'flex min-w-[56px] shrink-0 flex-col items-center rounded-full px-2 py-2 text-label-sm font-semibold ' +
                'outline outline-2 outline-offset-2 outline-transparent transition-colors focus-visible:outline-primary ' +
                (selected
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-low text-on-surface-variant hover:bg-surface-high')
              }
            >
              {format(d, 'EEE', { locale: arLocale })}
              <span className="tnum mt-0.5 text-title font-semibold">{format(d, 'd')}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
