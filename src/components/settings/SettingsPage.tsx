import ar from '../../i18n/ar'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-text">{ar.settings_title}</h1>
      <p className="mt-2 text-sm text-text-muted">
        سيتم بناء الإعدادات في الخطوتين الخامسة والتاسعة من خطة التنفيذ.
      </p>
    </div>
  )
}
