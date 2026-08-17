import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const ITEM_HEIGHT = 36
const VISIBLE_ROWS = 5
const VIEWPORT_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS
const PADDING = (VIEWPORT_HEIGHT - ITEM_HEIGHT) / 2

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1) // 1-12
const MINUTES = Array.from({ length: 60 }, (_, i) => i) // 0-59

interface TimeWheelPickerProps {
  id?: string
  value: string // 'HH:MM', 24-hour
  onChange: (value: string) => void
}

function to12Hour(hour24: number): { hour12: number; period: 'ص' | 'م' } {
  const period = hour24 < 12 ? 'ص' : 'م'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { hour12, period }
}

function to24Hour(hour12: number, period: 'ص' | 'م'): number {
  if (period === 'ص') return hour12 === 12 ? 0 : hour12
  return hour12 === 12 ? 12 : hour12 + 12
}

function formatDisplay(value: string): string {
  const [h, m] = value.split(':').map(Number)
  const { hour12, period } = to12Hour(h)
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
}

// A single native-scroll wheel: browser-driven momentum + scroll-snap gives
// real inertial physics for free, so the JS side only has to track which
// row is centered (via scroll position) and reflect that in the styling —
// no hand-rolled pointer/velocity code needed for the scroll itself.
function Wheel({
  items,
  selectedIndex,
  onSelect,
  format,
}: {
  items: number[]
  selectedIndex: number
  onSelect: (index: number) => void
  format: (item: number) => string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const suppressScroll = useRef(false)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    suppressScroll.current = true
    el.scrollTop = selectedIndex * ITEM_HEIGHT
    const t = setTimeout(() => {
      suppressScroll.current = false
    }, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleScroll() {
    const el = ref.current
    if (!el || suppressScroll.current) return
    const index = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_HEIGHT)))
    if (index !== selectedIndex) onSelect(index)

    // Snap precisely once the user stops scrolling, so a mid-flick release
    // never leaves the wheel resting between two rows.
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      el.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' })
    }, 120)
  }

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="h-[180px] w-14 snap-y snap-mandatory overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ paddingBlock: PADDING }}
    >
      {items.map((item, i) => (
        <button
          key={item}
          type="button"
          onClick={() => {
            onSelect(i)
            ref.current?.scrollTo({ top: i * ITEM_HEIGHT, behavior: 'smooth' })
          }}
          className={
            'flex h-9 w-full snap-center items-center justify-center text-lg tabular-nums transition-all duration-150 ' +
            (i === selectedIndex ? 'font-bold text-on-surface' : 'text-on-surface-variant/40')
          }
        >
          {format(item)}
        </button>
      ))}
    </div>
  )
}

export default function TimeWheelPicker({ id, value, onChange }: TimeWheelPickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const [hour24, minute] = value.split(':').map(Number)
  const { hour12, period } = to12Hour(hour24)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function commitHour(hour12Value: number) {
    onChange(`${String(to24Hour(hour12Value, period)).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
  }
  function commitMinute(minuteValue: number) {
    onChange(`${String(hour24).padStart(2, '0')}:${String(minuteValue).padStart(2, '0')}`)
  }
  function commitPeriod(nextPeriod: 'ص' | 'م') {
    onChange(`${String(to24Hour(hour12, nextPeriod)).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        dir="ltr"
        className="flex w-full items-center justify-between rounded-xl border border-outline-variant px-3 py-2.5 text-start text-sm tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {formatDisplay(value)}
        <svg className="h-4 w-4 text-on-surface-variant" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            style={{ transformOrigin: 'top' }}
            dir="ltr"
            className="absolute z-30 mt-2 rounded-md bg-surface-high p-3 shadow-[0_1px_3px_rgba(0,0,0,.15),0_4px_8px_3px_rgba(0,0,0,.15)]"
          >
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-x-0 -z-10 top-1/2 h-9 -translate-y-1/2 rounded-lg bg-primary-container" />
              <Wheel
                items={HOURS}
                selectedIndex={hour12 - 1}
                onSelect={(i) => commitHour(HOURS[i])}
                format={(h) => String(h).padStart(2, '0')}
              />
              <span className="px-1 text-lg font-bold text-on-surface-variant">:</span>
              <Wheel
                items={MINUTES}
                selectedIndex={minute}
                onSelect={(i) => commitMinute(MINUTES[i])}
                format={(m) => String(m).padStart(2, '0')}
              />
              <div className="ms-2 flex flex-col gap-1">
                {(['ص', 'م'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => commitPeriod(p)}
                    className={
                      'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ' +
                      (period === p ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface-variant hover:text-on-surface')
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 w-full rounded-lg py-1.5 text-center text-sm font-medium text-primary hover:bg-primary-container"
            >
              تم
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
