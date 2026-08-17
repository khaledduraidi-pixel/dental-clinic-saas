import { AnimatePresence, motion } from 'framer-motion'
import ar from '../../i18n/ar'
import Button from '../ui/Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  body: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Scrim and panel animate independently so the panel can be interrupted and
// re-targeted (e.g. rapid open/close) without waiting on the scrim's fade.
export default function ConfirmDialog({
  open,
  title,
  body,
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCancel}
        >
          <motion.div
            className="w-full max-w-sm rounded-xl bg-surface-high p-6"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-title-lg font-normal text-on-surface">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{body}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="text" onClick={onCancel}>
                {ar.common_no}
              </Button>
              <Button variant={danger ? 'danger' : 'filled'} onClick={onConfirm}>
                {ar.common_yes}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
