import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion } from 'framer-motion'
import Icon, { type IconName } from './Icon'

// M3 filled-tonal button: container-height 40px, corner-full,
// label-large 14px/600. State is a translucent overlay, never a hue swap.
type Variant = 'tonal' | 'filled' | 'text' | 'danger'

type Conflicting =
  | 'onDrag' | 'onDragStart' | 'onDragEnd'
  | 'onAnimationStart' | 'onAnimationEnd' | 'className'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, Conflicting> {
  variant?: Variant
  loading?: boolean
  icon?: IconName
  children: ReactNode
  className?: string
}

const variants: Record<Variant, string> = {
  tonal: 'bg-primary-container text-on-primary-container hover:brightness-[.97]',
  filled: 'bg-primary text-on-primary hover:brightness-110',
  text: 'bg-transparent text-primary hover:bg-primary/8',
  danger: 'bg-error-container text-on-error-container hover:brightness-[.97]',
}

export default function Button({
  variant = 'tonal',
  loading = false,
  disabled,
  icon,
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
        'inline-flex h-10 items-center justify-center gap-2 rounded-full px-4',
        'text-label font-semibold transition-[filter,background-color]',
        'outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-primary',
        'disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} />}
          {children}
        </>
      )}
    </motion.button>
  )
}
