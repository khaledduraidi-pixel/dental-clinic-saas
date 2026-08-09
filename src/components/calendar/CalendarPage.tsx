import ar from '../../i18n/ar'

export default function CalendarPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-text">{ar.calendar_title}</h1>
      <p className="mt-2 text-sm text-text-muted">
        سيتم بناء التقويم في الخطوة السادسة من خطة التنفيذ.
      </p>
    </div>
  )
}
