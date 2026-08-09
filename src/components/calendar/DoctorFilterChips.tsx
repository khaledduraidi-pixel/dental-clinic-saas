import { motion } from 'framer-motion'
import ar from '../../i18n/ar'
import type { Doctor } from '../../types'

interface DoctorFilterChipsProps {
  doctors: Doctor[]
  selectedIds: Set<string> | null // null = "الكل" (all)
  onChange: (next: Set<string> | null) => void
}

export default function DoctorFilterChips({ doctors, selectedIds, onChange }: DoctorFilterChipsProps) {
  const allSelected = selectedIds === null

  function toggleDoctor(id: string) {
    if (allSelected) {
      // Leaving "all" narrows the filter to just this one doctor.
      onChange(new Set([id]))
      return
    }
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next.size === 0 ? null : next)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip label={ar.calendar_all} active={allSelected} onClick={() => onChange(null)} />
      {doctors.map((doctor) => (
        <Chip
          key={doctor.id}
          label={doctor.name}
          color={doctor.color}
          active={allSelected || selectedIds!.has(doctor.id)}
          onClick={() => toggleDoctor(doctor.id)}
        />
      ))}
    </div>
  )
}

function Chip({
  label,
  color,
  active,
  onClick,
}: {
  label: string
  color?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
      onClick={onClick}
      className={
        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ' +
        (active
          ? 'border-transparent bg-primary-soft text-primary-dark'
          : 'border-border bg-surface text-text-muted hover:bg-bg')
      }
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </motion.button>
  )
}
