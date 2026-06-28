import type { CardsData } from '../types'

const COL_CLASS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

export function CardsBlock({ data }: { data: CardsData }) {
  const cols = data.columns ?? 3
  return (
    <div className={`grid gap-4 ${COL_CLASS[cols]}`}>
      {data.items.map((item, i) => (
        <div
          key={i}
          className="rounded-2xl p-6 flex flex-col gap-3"
          style={{
            backgroundColor: item.color ? `${item.color}10` : '#f8fafc',
            border: `1.5px solid ${item.color ? `${item.color}30` : '#e2e8f0'}`,
          }}
        >
          {item.emoji && (
            <span className="text-3xl leading-none">{item.emoji}</span>
          )}
          <p className="font-bold text-sm" style={{ color: '#0f172a' }}>
            {item.title}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
            {item.body}
          </p>
        </div>
      ))}
    </div>
  )
}
