import ar from '../../i18n/ar'

interface ConfirmDialogProps {
  open: boolean
  title: string
  body: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  body,
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-text">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">{body}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text hover:bg-bg"
          >
            {ar.common_no}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              'rounded-xl px-4 py-2 text-sm font-medium text-white ' +
              (danger ? 'bg-error hover:opacity-90' : 'bg-primary hover:bg-primary-dark')
            }
          >
            {ar.common_yes}
          </button>
        </div>
      </div>
    </div>
  )
}
