import ar from '../../i18n/ar'
import { useCountUp } from '../../hooks/useCountUp'

interface NoShowRateCardProps {
  thisWeek: number
  lastWeek: number
}

// The screen's centerpiece per spec: the number a clinic owner points to
// when justifying the subscription, so it gets the largest type on the
// page and the same red used for the no_show status chip elsewhere.
export default function NoShowRateCard({ thisWeek, lastWeek }: NoShowRateCardProps) {
  const thisRounded = Math.round(thisWeek)
  const lastRounded = Math.round(lastWeek)
  const displayThisRounded = useCountUp(thisRounded)

  const trend = thisRounded < lastRounded ? 'improvement' : thisRounded > lastRounded ? 'worsening' : 'noChange'
  const trendLabel = {
    improvement: ar.dashboard_improvement,
    worsening: ar.dashboard_worsening,
    noChange: ar.dashboard_noChange,
  }[trend]
  const trendColor = {
    improvement: 'text-success',
    worsening: 'text-error',
    noChange: 'text-text-muted',
  }[trend]
  const numberColor = thisRounded >= 20 ? 'text-error' : thisRounded >= 10 ? 'text-warning' : 'text-success'

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-8">
      <p className="text-sm font-medium text-text-muted">{ar.dashboard_noShowRateTitle}</p>
      <p className={'mt-2 font-mono text-6xl font-bold leading-none tabular-nums ' + numberColor}>
        {displayThisRounded}%
      </p>
      <p className={'mt-3 text-sm font-medium ' + trendColor}>{trendLabel}</p>

      <div className="mt-6 max-w-sm space-y-3">
        <BarRow label={ar.dashboard_thisWeek} value={thisRounded} />
        <BarRow label={ar.dashboard_lastWeek} value={lastRounded} />
      </div>
    </div>
  )
}

function BarRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-bg">
        <div className="h-2 rounded-full bg-error" style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  )
}
