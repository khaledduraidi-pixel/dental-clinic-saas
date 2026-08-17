import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion } from 'framer-motion'
import Icon, { type IconName } from './Icon'

// M3 extended FAB: 56px tall, corner-large 16px, container-elevation level3.
// The FAB is the ONE place this system uses elevation — M3's own exception.
type Conflicting =
  | 'onDrag' | 'onDragStart' | 'onDragEnd'
  | 'onAnimationStart' | 'onAnimationEnd' | 'className'

interface FabProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, Conflicting> {
  icon?: IconName
  children: ReactNode
  className?: string
}

export default function Fab({ icon = 'plus', children, className = '', ...rest }: FabProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
      className={[
        'inline-flex h-14 items-center gap-3 rounded-lg bg-primary-container px-5',
        'text-label font-semibold text-on-primary-container',
        'shadow-[0_1px_3px_rgba(0,0,0,.15),0_4px_8px_3px_rgba(0,0,0,.15)]',
        'active:shadow-[0_1px_2px_rgba(0,0,0,.15),0_2px_6px_2px_rgba(0,0,0,.15)]',
        'outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-primary',
        className,
      ].join(' ')}
      {...rest}
    >
      <Icon name={icon} size={24} />
      {children}
    </motion.button>
  )
}
