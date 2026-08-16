// Shared class fragments for Input / Select / Textarea so the three
// primitives render one consistent 8-state contract (default · hover ·
// focus · active · disabled · loading · error · success). Border-width is
// always 1px — every state change goes to background-color / outline /
// border-color, never geometry (no-layout-shift rule).
export function controlClasses(hasError: boolean) {
  return [
    'block w-full rounded-xl border bg-surface px-3 text-sm text-text transition-colors',
    'placeholder:text-text-muted/70',
    'outline outline-2 outline-offset-1 outline-transparent',
    'hover:bg-bg',
    'focus:outline-focus',
    'disabled:cursor-not-allowed disabled:opacity-55',
    hasError ? 'border-error focus:border-error' : 'border-border focus:border-primary/60',
  ].join(' ')
}

export const labelClasses = 'mb-1.5 flex items-baseline gap-1.5 text-sm font-medium text-text'
export const helperClasses = 'mt-1.5 min-h-5 text-xs text-text-muted'
export const errorClasses = 'mt-1.5 min-h-5 text-xs font-medium text-error'
