const VARIANTS = {
  green: { bg: 'var(--signal-green-bg)', text: 'var(--signal-green)' },
  red: { bg: 'var(--signal-red-bg)', text: 'var(--signal-red)' },
  amber: { bg: 'var(--signal-amber-bg)', text: 'var(--signal-amber)' },
  neutral: { bg: 'var(--paper)', text: 'var(--muted)' },
}

export default function StatusPill({ label, variant = 'neutral' }) {
  const v = VARIANTS[variant] || VARIANTS.neutral
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: v.bg, color: v.text }}
    >
      {label}
    </span>
  )
}
