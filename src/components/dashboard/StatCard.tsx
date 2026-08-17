import { useCountUp } from '../../hooks/useCountUp'

// Tonal stat tile: surface-low, corner-medium, no border, no shadow.
export default function StatCard({ label, value }: { label: string; value: number }) {
  const display = useCountUp(value)
  return (
    <div className="rounded-md bg-surface-low p-4">
      <p className="text-body-sm text-on-surface-variant">{label}</p>
      <p className="tnum mt-1 text-headline font-semibold text-on-surface">{display}</p>
    </div>
  )
}
