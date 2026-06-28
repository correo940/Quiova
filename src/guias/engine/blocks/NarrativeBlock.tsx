import type { NarrativeData } from '../types'

export function NarrativeBlock({ data }: { data: NarrativeData }) {
  return (
    <div className="space-y-5">
      {data.paragraphs.map((p, i) => (
        <p key={i} className="text-base leading-relaxed" style={{ color: '#374151' }}>
          {p}
        </p>
      ))}
    </div>
  )
}
