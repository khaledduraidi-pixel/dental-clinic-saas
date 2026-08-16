import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion } from 'framer-motion'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

type ConflictingHandlers =
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'className'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, ConflictingHandlers> {
  variant?: Variant
  loading?: boolean
  children: ReactNode
  className?: string
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-primary-ink hover:bg-primary-dark',
  secondary: 'bg-surface text-primary-dark border border-primary/40 hover:bg-primary-soft',
  ghost: 'bg-transparent text-text-muted hover:bg-bg hover:text-text',
  danger: 'bg-error text-primary-ink hover:opacity-90',
}

// Press feedback fires on pointer-down (whileTap), settles with a critically
// damped spring on release — never a fixed-duration CSS transition, so a fast
// double-press never has to wait one animation out before the next begins.
export default function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
      disabled={disabled || loading}
      className={[
        'flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors',
        'outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-focus',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </motion.button>
  )
}
