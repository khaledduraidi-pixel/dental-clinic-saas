import { useCountUp } from '../../hooks/useCountUp'

interface StatCardProps {
  label: string
  value: number
}

export default function StatCard({ label, value }: StatCardProps) {
  const displayValue = useCountUp(value)
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-text">{displayValue}</p>
    </div>
  )
}
