import { useMemo, useState } from 'react'
import ar from '../../i18n/ar'
import Avatar from '../ui/Avatar'
import Fab from '../ui/Fab'
import Icon from '../ui/Icon'
import ListItem from '../ui/ListItem'
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
  const {
    patients,
    loading,
    error,
    createPatient,
    updatePatient,
    updateTreatmentPlan,
    deletePatient,
  } = usePatients()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<PatientWithStats | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return patients
    const qDigits = q.replace(/\D/g, '')
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (qDigits !== '' && p.phone.replace(/\D/g, '').includes(qDigits)),
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
    if (editingPatient) return updatePatient(editingPatient.id, name, phone, notes)
    return createPatient(name, phone, notes)
  }

  // The list row's supporting line answers "who is this?" at a glance: the
  // plan if there is one (what they still need), otherwise the last visit.
  function supportingFor(p: PatientWithStats) {
    if (p.treatment_plan) return p.treatment_plan
    if (p.lastVisit) return `${ar.patients_lastVisit}: ${formatDateAr(p.lastVisit, clinic?.timezone)}`
    return ar.appt_firstVisit
  }

  return (
    <div className="pb-2">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <h1 className="text-headline font-normal text-on-surface">{ar.patients_title}</h1>
        {!loading && !error && (
          <p className="tnum text-body-sm text-on-surface-variant">
            {filtered.length} {ar.patient_count}
          </p>
        )}
      </div>

      {/* M3 docked search bar — 56px, corner-full */}
      <div className="relative mt-4">
        <span className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-on-surface-variant">
          <Icon name="search" size={22} />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ar.patients_search}
          aria-label={ar.patients_search}
          className={`h-14 rounded-full !bg-surface-high ps-12 ${controlClasses(false)} border-transparent`}
        />
      </div>

      <div className="mt-5">
        {loading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full" />
            ))}
          </div>
        )}

        {!loading && error && (
          <p role="alert" className="rounded-md bg-error-container px-4 py-3 text-body-sm text-on-error-container">
            {ar.common_error}
          </p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="rounded-md bg-surface-low px-4 py-10 text-center text-body-sm text-on-surface-variant">
            {ar.patients_noneFound}
          </p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <ul className="flex flex-col gap-2">
            {filtered.map((patient) => (
              <li key={patient.id}>
                <ListItem
                  onClick={() => setSelectedPatient(patient)}
                  leading={<Avatar name={patient.name} />}
                  headline={patient.name}
                  supporting={supportingFor(patient)}
                  trailing={<Icon name="back" size={18} className="text-on-surface-variant" />}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="fixed bottom-24 end-4 z-30 sm:bottom-6">
        <Fab onClick={openNewPatientForm}>{ar.patients_newPatient}</Fab>
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
        onSavePlan={updateTreatmentPlan}
      />
    </div>
  )
}
