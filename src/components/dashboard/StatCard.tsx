import { useCountUp } from '../../hooks/useCountUp'

interface StatCardProps {
  label: string
  value: number
}

// A stat-strip cell, not a boxed card — four of these sit inside one shared
// band divided by hairlines (see DashboardPage), so the repetition reads as
// one instrument panel instead of four identical bordered tiles.
export default function StatCard({ label, value }: StatCardProps) {
  const displayValue = useCountUp(value)
  return (
    <div className="flex-1 px-5 py-4 first:ps-0 last:pe-0">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-text">{displayValue}</p>
    </div>
  )
}
