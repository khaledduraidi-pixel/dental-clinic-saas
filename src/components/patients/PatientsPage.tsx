import { useMemo, useState } from 'react'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import Skeleton from '../layout/Skeleton'
import { controlClasses } from '../ui/fieldStyles'
import { usePatients, type PatientWithStats } from '../../hooks/usePatients'
import { useClinic } from '../../hooks/useClinic'
import { formatDateAr } from '../../lib/dates'
import PatientFormModal from './PatientFormModal'
import PatientDrawer from './PatientDrawer'
import type { Patient } from '../../types'

export default function PatientsPage() {
  const { clinic } = useClinic()
  const { patients, loading, error, createPatient, updatePatient, deletePatient } = usePatients()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<PatientWithStats | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return patients
    const qDigits = q.replace(/\D/g, '')
    return patients.filter(
      (p) => p.name.toLowerCase().includes(q) || (qDigits !== '' && p.phone.replace(/\D/g, '').includes(qDigits)),
    )
  }, [patients, search])

  function openNewPatientForm() {
    setEditingPatient(null)
    setFormOpen(true)
  }

  function openEditForm(patient: Patient) {
    setSelectedPatient(null)
    setEditingPatient(patient)
    setFormOpen(true)
  }

  async function handleSave(name: string, phone: string, notes: string) {
    if (editingPatient) {
      return updatePatient(editingPatient.id, name, phone, notes)
    }
    return createPatient(name, phone, notes)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-text">{ar.patients_title}</h1>
        <Button onClick={openNewPatientForm}>{ar.patients_newPatient}</Button>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={ar.patients_search}
        aria-label={ar.patients_search}
        className={`mt-4 h-11 max-w-sm ${controlClasses(false)}`}
      />

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-start text-sm">
          <thead>
            <tr className="border-b border-border bg-bg text-xs font-medium tracking-wide text-text-muted">
              <th className="px-4 py-3 text-start font-medium">{ar.patients_name}</th>
              <th className="px-4 py-3 text-start font-medium">{ar.patients_phone}</th>
              <th className="px-4 py-3 text-start font-medium">{ar.patients_lastVisit}</th>
              <th className="px-4 py-3 text-start font-medium">{ar.patients_nextAppointment}</th>
              <th className="px-4 py-3 text-start font-medium">{ar.patients_totalVisits}</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3" colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))}

            {!loading && error && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-error" colSpan={5}>
                  {ar.common_error}
                </td>
              </tr>
            )}

            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-text-muted" colSpan={5}>
                  {ar.patients_noneFound}
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              filtered.map((patient) => (
                <tr
                  key={patient.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPatient(patient)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedPatient(patient)
                    }
                  }}
                  className="cursor-pointer border-b border-border outline -outline-offset-2 outline-2 outline-transparent transition-colors last:border-0 hover:bg-bg focus-visible:outline-focus"
                >
                  <td className="px-4 py-3 font-medium text-text">{patient.name}</td>
                  <td className="px-4 py-3 font-mono text-text-muted" dir="ltr">
                    {patient.phone}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {patient.lastVisit ? formatDateAr(patient.lastVisit, clinic?.timezone) : ar.patients_never}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {patient.nextAppointment
                      ? formatDateAr(patient.nextAppointment, clinic?.timezone)
                      : ar.patients_never}
                  </td>
                  <td className="px-4 py-3 font-mono text-text-muted">{patient.totalVisits}</td>
                </tr>
              ))}
          </tbody>
        </table>
        </div>
      </div>

      <PatientFormModal
        open={formOpen}
        patient={editingPatient}
        onSave={handleSave}
        onClose={() => setFormOpen(false)}
      />

      <PatientDrawer
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
        onEdit={openEditForm}
        onDelete={(p) => deletePatient(p.id)}
      />
    </div>
  )
}
