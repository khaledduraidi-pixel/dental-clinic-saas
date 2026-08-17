// M3 outlined text field. Border-width never changes between states — the
// focus indicator is an inset box-shadow instead (Primer's explicit rule:
// "use an inset box-shadow instead of a border to prevent layout shift").
export function controlClasses(hasError: boolean) {
  return [
    'block w-full rounded-xs bg-surface px-4 text-body text-on-surface',
    'border border-on-surface-variant/45',
    'placeholder:text-on-surface-variant/70',
    'transition-[background-color,box-shadow]',
    'hover:bg-surface-low',
    'outline-none',
    hasError
      ? 'border-error shadow-[inset_0_0_0_1px_var(--color-error)] focus:shadow-[inset_0_0_0_2px_var(--color-error)]'
      : 'focus:shadow-[inset_0_0_0_2px_var(--color-primary)] focus:border-primary',
    'disabled:cursor-not-allowed disabled:opacity-40',
  ].join(' ')
}

export const labelClasses = 'mb-1.5 flex items-baseline gap-1.5 text-body-sm font-semibold text-on-surface'
export const helperClasses = 'mt-1.5 min-h-5 text-label-sm text-on-surface-variant'
export const errorClasses = 'mt-1.5 min-h-5 text-label-sm font-semibold text-error'
