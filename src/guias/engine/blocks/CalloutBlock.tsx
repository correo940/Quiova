import type { CalloutData } from '../types'

const VARIANT_STYLES = {
  info: {
    bg: '#eff6ff',
    border: '#bfdbfe',
    titleColor: '#1e40af',
    bodyColor: '#1e3a5f',
    emoji: 'ℹ️',
  },
  insight: {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    titleColor: '#166534',
    bodyColor: '#14532d',
    emoji: '💡',
  },
  warning: {
    bg: '#fffbeb',
    border: '#fde68a',
    titleColor: '#92400e',
    bodyColor: '#78350f',
    emoji: '⚠️',
  },
}

export function CalloutBlock({ data }: { data: CalloutData }) {
  const s = VARIANT_STYLES[data.variant]
  return (
    <div
      className="rounded-2xl px-6 py-5 flex gap-4"
      style={{ backgroundColor: s.bg, border: `1.5px solid ${s.border}` }}
    >
      <span className="text-2xl leading-none mt-0.5 flex-shrink-0">{s.emoji}</span>
      <div className="space-y-1">
        {data.title && (
          <p className="font-bold text-sm" style={{ color: s.titleColor }}>
            {data.title}
          </p>
        )}
        <p className="text-sm leading-relaxed" style={{ color: s.bodyColor }}>
          {data.body}
        </p>
      </div>
    </div>
  )
}
