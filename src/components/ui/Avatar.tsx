// 40px initials circle — M3 list-item leading element.
export default function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initial = (name.trim()[0] ?? '؟').toUpperCase()
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-primary-container font-semibold text-on-primary-container"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  )
}
