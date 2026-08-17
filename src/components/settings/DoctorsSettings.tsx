import { useState } from 'react'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import Skeleton from '../layout/Skeleton'
import { useDoctors } from '../../hooks/useDoctors'
import DoctorFormModal from './DoctorFormModal'
import type { Doctor } from '../../types'

export default function DoctorsSettings() {
  const { doctors, loading, error, createDoctor, updateDoctor, setDoctorActive } = useDoctors()
  const [formOpen, setFormOpen] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)

  function openAddForm() {
    setEditingDoctor(null)
    setFormOpen(true)
  }

  function openEditForm(doctor: Doctor) {
    setEditingDoctor(doctor)
    setFormOpen(true)
  }

  async function handleSave(name: string, color: string) {
    if (editingDoctor) return updateDoctor(editingDoctor.id, name, color)
    return createDoctor(name, color)
  }

  return (
    <section className="rounded-md bg-surface-low p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-title font-semibold text-on-surface">{ar.settings_doctors}</h2>
        <Button variant="text" className="h-9 px-3 text-xs" onClick={openAddForm}>
          {ar.settings_addDoctor}
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}

        {!loading && error && (
          <p role="alert" className="rounded-xl bg-error-container px-3 py-2.5 text-sm text-error">
            {ar.common_error}
          </p>
        )}

        {!loading &&
          !error &&
          doctors.map((doctor) => (
            <div
              key={doctor.id}
              className="flex items-center justify-between rounded-xl border border-outline-variant px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: doctor.color }} />
                <span className={'text-sm font-medium ' + (doctor.active ? 'text-on-surface' : 'text-on-surface-variant line-through')}>
                  {doctor.name}
                </span>
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-xs ' +
                    (doctor.active ? 'bg-success-container text-success' : 'bg-outline-variant text-on-surface-variant')
                  }
                >
                  {doctor.active ? ar.doctor_active : ar.doctor_inactive}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="text" className="h-8 px-3 text-xs" onClick={() => openEditForm(doctor)}>
                  {ar.common_edit}
                </Button>
                <Button
                  variant="text"
                  className="h-8 px-3 text-xs"
                  onClick={() => setDoctorActive(doctor.id, !doctor.active)}
                >
                  {doctor.active ? ar.doctor_deactivate : ar.doctor_activate}
                </Button>
              </div>
            </div>
          ))}
      </div>

      <DoctorFormModal
        open={formOpen}
        doctor={editingDoctor}
        onSave={handleSave}
        onClose={() => setFormOpen(false)}
      />
    </section>
  )
}
