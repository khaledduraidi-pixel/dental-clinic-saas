import type { ReactNode } from 'react'

// M3 two-line list item: container-height 72px, corner-medium 12px, tonal
// surface (no border, no shadow), state layer on hover.
interface ListItemProps {
  leading?: ReactNode
  headline: ReactNode
  supporting?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  className?: string
}

export default function ListItem({
  leading,
  headline,
  supporting,
  trailing,
  onClick,
  className = '',
}: ListItemProps) {
  const shell =
    'flex min-h-[72px] w-full items-center gap-4 rounded-md bg-surface-low px-4 py-2 text-start ' +
    'outline outline-2 -outline-offset-2 outline-transparent transition-colors ' +
    className

  const inner = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-title font-semibold text-on-surface">{headline}</span>
        {supporting && (
          <span className="block truncate text-body-sm text-on-surface-variant">{supporting}</span>
        )}
      </span>
      {trailing}
    </>
  )

  if (!onClick) return <div className={shell}>{inner}</div>
  return (
    <button type="button" onClick={onClick} className={shell + ' hover:bg-surface-high focus-visible:outline-primary'}>
      {inner}
    </button>
  )
}
