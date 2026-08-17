// Inline SVG icon set. Never emoji (see design.md §10). 24px default per M3
// `md-comp-fab: icon-size`; 18px inside buttons.
export type IconName =
  | 'calendar' | 'users' | 'chart' | 'settings' | 'plus' | 'search'
  | 'phone' | 'check' | 'back' | 'whatsapp' | 'close' | 'clock'
  | 'upload' | 'trash' | 'edit' | 'alert' | 'chevronDown' | 'logout'

const P: Record<IconName, React.ReactNode> = {
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 11.2a3 3 0 100-6" /><path d="M17.5 20c0-2.4-.9-4.2-2.3-5.2" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  settings: <><path d="M4 7h16M4 12h16M4 17h16" /><circle cx="15" cy="7" r="2.2" /><circle cx="9" cy="12" r="2.2" /><circle cx="16" cy="17" r="2.2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  phone: <path d="M6 3h3l2 5-2.5 1.5a12 12 0 006 6L16 13l5 2v3a2 2 0 01-2 2A16 16 0 014 5a2 2 0 012-2z" />,
  check: <path d="M4 12.5l5 5L20 6.5" />,
  // "back" points toward the reading start — right, in RTL
  back: <path d="M10 6l6 6-6 6" />,
  whatsapp: <><path d="M12 3a9 9 0 00-7.7 13.6L3 21l4.5-1.2A9 9 0 1012 3z" /><path d="M8.6 9.2c.3 2.6 3.6 5.9 6.2 6.2l1-1.4-2-.9-.9 1a7 7 0 01-3-3l1-.9-.9-2z" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  upload: <><path d="M12 16V4M7.5 8.5L12 4l4.5 4.5" /><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  edit: <><path d="M4 20h4L20 8l-4-4L4 16v4z" /><path d="M14 6l4 4" /></>,
  alert: <><path d="M12 4l9 16H3l9-16z" /><path d="M12 10v4M12 17h.01" /></>,
  chevronDown: <path d="M6 10l6 6 6-6" />,
  logout: <><path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4" /><path d="M10 12H3M6.5 8.5L3 12l3.5 3.5" /></>,
}

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

export default function Icon({ name, size = 24, className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={'shrink-0 ' + className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {P[name]}
    </svg>
  )
}
