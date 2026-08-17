import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import Skeleton from '../layout/Skeleton'
import StatusChip from '../ui/StatusChip'
import Textarea from '../ui/Textarea'
import ConfirmDialog from '../layout/ConfirmDialog'
import { supabase } from '../../lib/supabase'
import { formatDateAr } from '../../lib/dates'
import { visitTypeLabel } from '../../lib/visitTypes'
import { useClinic } from '../../hooks/useClinic'
import type { Appointment, Patient } from '../../types'

interface AppointmentHistoryRow extends Appointment {
  doctors: { name: string; color: string } | null
}

interface PatientDrawerProps {
  patient: Patient | null
  onClose: () => void
  onEdit: (patient: Patient) => void
  onDelete: (patient: Patient) => Promise<{ error: string | null }>
  onSavePlan: (id: string, plan: string) => Promise<{ error: string | null }>
}

export default function PatientDrawer({
  patient,
  onClose,
  onEdit,
  onDelete,
  onSavePlan,
}: PatientDrawerProps) {
  const { clinic } = useClinic()
  const [history, setHistory] = useState<AppointmentHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState(false)
  const [planDraft, setPlanDraft] = useState('')
  const [savingPlan, setSavingPlan] = useState(false)

  useEffect(() => {
    if (!patient) return
    setEditingPlan(false)
    setPlanDraft(patient.treatment_plan ?? '')
    let cancelled = false
    setLoading(true)

    supabase
      .from('appointments')
      .select('*, doctors(name, color)')
      .eq('patient_id', patient.id)
      .order('starts_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setHistory((data as AppointmentHistoryRow[] | null) ?? [])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [patient])

  async function handleSavePlan() {
    if (!patient) return
    setSavingPlan(true)
    const { error } = await onSavePlan(patient.id, planDraft)
    setSavingPlan(false)
    if (!error) setEditingPlan(false)
  }

  const now = Date.now()

  return (
    <AnimatePresence>
      {patient && (
        <motion.div
          className="fixed inset-0 z-40 bg-black/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          {/* full screen on a phone, side sheet on desktop */}
          <motion.aside
            className="fixed inset-0 flex flex-col bg-surface sm:inset-y-0 sm:start-0 sm:end-auto sm:w-full sm:max-w-md"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* top app bar 64px */}
            <div className="flex h-16 shrink-0 items-center gap-2 px-2">
              <button
                type="button"
                onClick={onClose}
                aria-label={ar.common_cancel}
                className="flex h-12 w-12 items-center justify-center rounded-full text-on-surface-variant outline outline-2 outline-offset-2 outline-transparent hover:bg-surface-high focus-visible:outline-primary"
              >
                <Icon name="back" />
              </button>
              <h2 className="truncate text-title-lg font-normal text-on-surface">{patient.name}</h2>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-6">
              <p className="tnum text-body-sm text-on-surface-variant" dir="ltr">
                {patient.phone}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button icon="edit" onClick={() => onEdit(patient)}>
                  {ar.patients_edit}
                </Button>
                <Button
                  variant="text"
                  icon="whatsapp"
                  onClick={() => {
                    window.open(`https://wa.me/${patient.phone.replace(/\D/g, '')}`, '_blank', 'noopener')
                  }}
                >
                  واتساب
                </Button>
              </div>

              {/* the plan — the first thing anyone booking this patient needs */}
              <section>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-title font-semibold text-on-surface">{ar.patient_plan}</h3>
                  {!editingPlan && (
                    <Button variant="text" icon="edit" onClick={() => setEditingPlan(true)}>
                      {ar.patient_planEdit}
                    </Button>
                  )}
                </div>

                {editingPlan ? (
                  <div className="space-y-3">
                    <Textarea
                      id="plan"
                      value={planDraft}
                      onChange={(e) => setPlanDraft(e.target.value)}
                      placeholder={ar.patient_planPlaceholder}
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button variant="filled" loading={savingPlan} onClick={handleSavePlan}>
                        {ar.common_save}
                      </Button>
                      <Button
                        variant="text"
                        onClick={() => {
                          setPlanDraft(patient.treatment_plan ?? '')
                          setEditingPlan(false)
                        }}
                      >
                        {ar.common_cancel}
                      </Button>
                    </div>
                  </div>
                ) : patient.treatment_plan ? (
                  <div className="rounded-md bg-primary-container p-4 text-on-primary-container">
                    <p className="text-label-sm font-semibold opacity-80">{ar.patient_planNextStep}</p>
                    <p className="mt-1 whitespace-pre-line text-title font-semibold">
                      {patient.treatment_plan}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md bg-surface-low p-4">
                    <p className="text-body-sm font-semibold text-on-surface">{ar.patient_planEmpty}</p>
                    <p className="mt-1 text-body-sm text-on-surface-variant">{ar.patient_planEmptyHint}</p>
                  </div>
                )}
              </section>

              {/* visit history as a timeline */}
              <section>
                <h3 className="mb-2 text-title font-semibold text-on-surface">{ar.patient_visits}</h3>

                {loading && (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                )}

                {!loading && history.length === 0 && (
                  <p className="rounded-md bg-surface-low px-4 py-8 text-center text-body-sm text-on-surface-variant">
                    {ar.patients_noHistory}
                  </p>
                )}

                {!loading && history.length > 0 && (
                  <ol className="relative ms-1.5 space-y-1 border-s-2 border-outline-variant ps-5">
                    {history.map((appt) => (
                      <li key={appt.id} className="relative py-2">
                        <span className="absolute -start-[27px] top-4 h-3 w-3 rounded-full border-2 border-surface bg-primary-container" />
                        <p className="text-label-sm text-on-surface-variant">
                          {formatDateAr(appt.starts_at, clinic?.timezone)}
                          {new Date(appt.starts_at).getTime() > now && ` · ${ar.patient_upcoming}`}
                        </p>
                        <p className="text-title font-semibold text-on-surface">
                          {visitTypeLabel(appt.visit_type)}
                        </p>
                        <p className="flex flex-wrap items-center gap-2 text-body-sm text-on-surface-variant">
                          {appt.doctors?.name}
                          <StatusChip status={appt.status} />
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <div className="pt-2">
                <Button variant="danger" icon="trash" onClick={() => setDeleteConfirmOpen(true)}>
                  {ar.common_delete}
                </Button>
              </div>
            </div>
          </motion.aside>

          <ConfirmDialog
            open={deleteConfirmOpen}
            title={ar.patients_confirmDeleteTitle}
            body={ar.patients_confirmDeleteBody}
            onCancel={() => setDeleteConfirmOpen(false)}
            onConfirm={async () => {
              setDeleteConfirmOpen(false)
              await onDelete(patient)
              onClose()
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
