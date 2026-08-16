import ar from '../../i18n/ar'
import Skeleton from '../layout/Skeleton'
import { useMessagesLog } from '../../hooks/useMessagesLog'
import { useClinic } from '../../hooks/useClinic'
import { formatDateTimeAr } from '../../lib/dates'

const STATUS_STYLES: Record<string, string> = {
  sent: 'bg-success-soft text-success',
  failed: 'bg-error-soft text-error',
  received: 'bg-primary-soft text-primary-dark',
}

const STATUS_LABELS: Record<string, string> = {
  sent: 'مُرسلة',
  failed: 'فشلت',
  received: 'مستلمة',
}

export default function MessagesLog() {
  const { clinic } = useClinic()
  const { messages, loading, error } = useMessagesLog()

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-sm font-bold text-text">{ar.whatsapp_messagesLog}</h2>

      <div className="mt-4 space-y-2">
        {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}

        {!loading && error && (
          <p role="alert" className="rounded-xl bg-error-soft px-3 py-2.5 text-sm text-error">
            {ar.common_error}
          </p>
        )}

        {!loading && !error && messages.length === 0 && (
          <p className="py-6 text-center text-sm text-text-muted">{ar.whatsapp_messagesLogEmpty}</p>
        )}

        {!loading &&
          !error &&
          messages.map((m) => (
            <div key={m.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-medium text-text" dir="ltr">
                  {m.patient_phone}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">
                    {formatDateTimeAr(m.created_at, clinic?.timezone)}
                  </span>
                  <span
                    className={
                      'rounded-full px-2 py-0.5 text-xs ' + (STATUS_STYLES[m.status] ?? 'bg-border text-text-muted')
                    }
                  >
                    {STATUS_LABELS[m.status] ?? m.status}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm text-text-muted">{m.body}</p>
            </div>
          ))}
      </div>
    </section>
  )
}
