import ar from '../i18n/ar'
import type { VisitType } from '../types'

export const VISIT_TYPES: { value: VisitType; label: string }[] = [
  { value: 'checkup', label: ar.visitType_checkup },
  { value: 'followup', label: ar.visitType_followup },
  { value: 'cleaning', label: ar.visitType_cleaning },
  { value: 'filling', label: ar.visitType_filling },
  { value: 'root_canal', label: ar.visitType_rootCanal },
  { value: 'extraction', label: ar.visitType_extraction },
  { value: 'orthodontics', label: ar.visitType_orthodontics },
  { value: 'prosthetics', label: ar.visitType_prosthetics },
  { value: 'other', label: ar.visitType_other },
]

const VISIT_TYPE_LABELS: Record<VisitType, string> = Object.fromEntries(
  VISIT_TYPES.map((t) => [t.value, t.label]),
) as Record<VisitType, string>

export function visitTypeLabel(type: VisitType): string {
  return VISIT_TYPE_LABELS[type]
}
