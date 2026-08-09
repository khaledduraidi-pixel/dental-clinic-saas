import ar from '../../i18n/ar'

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-text">{ar.dashboard_title}</h1>
      <p className="mt-2 text-sm text-text-muted">
        سيتم بناء لوحة التحكم في الخطوة الثامنة من خطة التنفيذ.
      </p>
    </div>
  )
}
