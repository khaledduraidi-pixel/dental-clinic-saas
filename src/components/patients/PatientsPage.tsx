import ar from '../../i18n/ar'

export default function PatientsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-text">{ar.patients_title}</h1>
      <p className="mt-2 text-sm text-text-muted">
        سيتم بناء صفحة المرضى في الخطوة الرابعة من خطة التنفيذ.
      </p>
    </div>
  )
}
