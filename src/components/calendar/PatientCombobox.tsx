import { useEffect, useRef, useState } from 'react'
import ar from '../../i18n/ar'
import { controlClasses } from '../ui/fieldStyles'
import type { Patient } from '../../types'

interface PatientComboboxProps {
  patients: Patient[]
  selectedPatientId: string | null
  onSelect: (patient: Patient) => void
  onAddNew: (initialName: string) => void
}

export default function PatientCombobox({
  patients,
  selectedPatientId,
  onSelect,
  onAddNew,
}: PatientComboboxProps) {
  const selected = patients.find((p) => p.id === selectedPatientId) ?? null
  const [query, setQuery] = useState(selected?.name ?? '')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(selected?.name ?? '')
    // Only re-sync when the selected patient changes externally (e.g. the
    // form resets for a different appointment), not while the user types.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const q = query.trim().toLowerCase()
  const qDigits = q.replace(/\D/g, '')
  const matches = q
    ? patients.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || (qDigits !== '' && p.phone.replace(/\D/g, '').includes(qDigits)),
      )
    : patients

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={query}
        placeholder={ar.appt_searchPatient}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        className={`h-11 ${controlClasses(false)}`}
      />

      {open && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-outline-variant bg-surface-low shadow-lg">
          {matches.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p)
                setQuery(p.name)
                setOpen(false)
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-start text-sm outline -outline-offset-2 outline-2 outline-transparent hover:bg-surface focus-visible:outline-primary"
            >
              <span className="font-medium text-on-surface">{p.name}</span>
              <span className="font-mono text-xs text-on-surface-variant" dir="ltr">
                {p.phone}
              </span>
            </button>
          ))}

          {matches.length === 0 && (
            <p className="px-3 py-2 text-sm text-on-surface-variant">{ar.appt_noPatientsFound}</p>
          )}

          <button
            type="button"
            onClick={() => {
              onAddNew(query.trim())
              setOpen(false)
            }}
            className="flex w-full items-center gap-1.5 border-t border-outline-variant px-3 py-2 text-start text-sm font-medium text-on-primary-container outline -outline-offset-2 outline-2 outline-transparent hover:bg-primary-container focus-visible:outline-primary"
          >
            + {ar.appt_addNewPatient}
          </button>
        </div>
      )}
    </div>
  )
}
