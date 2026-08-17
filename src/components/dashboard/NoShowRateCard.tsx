import ar from '../../i18n/ar'
import { useCountUp } from '../../hooks/useCountUp'

// The owner's headline metric. It lives here, on Reports — not on the home
// screen, where a receptionist needs "who is next", not a monthly percentage.
export default function NoShowRateCard({ thisWeek, lastWeek }: { thisWeek: number; lastWeek: number }) {
  const now = Math.round(thisWeek)
  const prev = Math.round(lastWeek)
  const display = useCountUp(now)

  const trend = now < prev ? 'improvement' : now > prev ? 'worsening' : 'noChange'
  const trendLabel = {
    improvement: ar.dashboard_improvement,
    worsening: ar.dashboard_worsening,
    noChange: ar.dashboard_noChange,
  }[trend]
  const trendColor = {
    improvement: 'text-success',
    worsening: 'text-error',
    noChange: 'text-on-surface-variant',
  }[trend]

  return (
    <section className="rounded-md bg-primary-container p-5 text-on-primary-container sm:p-6">
      <p className="text-body-sm font-semibold opacity-80">{ar.dashboard_noShowRateTitle}</p>
      <p className="tnum mt-1 text-display font-semibold leading-none">{display}%</p>
      <p className={'mt-3 text-body-sm font-semibold ' + trendColor}>{trendLabel}</p>

      <div className="mt-5 space-y-3">
        <Bar label={ar.dashboard_thisWeek} value={now} />
        <Bar label={ar.dashboard_lastWeek} value={prev} />
      </div>
    </section>
  )
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-label-sm">
        <span>{label}</span>
        <span className="tnum">{value}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-on-primary-container/15">
        <div
          className="h-full rounded-full bg-on-primary-container"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}
