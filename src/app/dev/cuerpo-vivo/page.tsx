'use client'

import { useState } from 'react'
import { CuerpoVivo } from '@/components/cuerpo-vivo'
import { deriveBodyState } from '@/components/cuerpo-vivo'
import type { BodySystem } from '@/components/cuerpo-vivo'

// ── Types ──────────────────────────────────────────────────────────────────────

interface LabState {
  timeOfDay:       number  // 0–24
  energyLevel:     number  // 0–1
  alertness:       number  // 0–1
  cortisol:        number  // 0–1
  melatonin:       number  // 0–1
  bodyTemperature: number  // 35.5–37.5 °C
}

// ── Presets ────────────────────────────────────────────────────────────────────

const PRESETS: { label: string; state: LabState }[] = [
  { label: 'Amanecer',  state: { timeOfDay: 6,    energyLevel: 0.40, alertness: 0.45, cortisol: 0.70, melatonin: 0.40, bodyTemperature: 36.3 } },
  { label: 'Mañana',   state: { timeOfDay: 9,    energyLevel: 0.75, alertness: 0.80, cortisol: 0.80, melatonin: 0.10, bodyTemperature: 36.6 } },
  { label: 'Mediodía', state: { timeOfDay: 13,   energyLevel: 0.85, alertness: 0.90, cortisol: 0.50, melatonin: 0.05, bodyTemperature: 37.0 } },
  { label: 'Tarde',    state: { timeOfDay: 16,   energyLevel: 0.60, alertness: 0.65, cortisol: 0.30, melatonin: 0.10, bodyTemperature: 36.8 } },
  { label: 'Atardecer',state: { timeOfDay: 19,   energyLevel: 0.40, alertness: 0.45, cortisol: 0.20, melatonin: 0.40, bodyTemperature: 36.4 } },
  { label: 'Noche',    state: { timeOfDay: 22,   energyLevel: 0.20, alertness: 0.20, cortisol: 0.10, melatonin: 0.80, bodyTemperature: 36.1 } },
  { label: 'Madrugada',state: { timeOfDay: 3,    energyLevel: 0.05, alertness: 0.05, cortisol: 0.10, melatonin: 0.95, bodyTemperature: 35.7 } },
]

// ── Systems ────────────────────────────────────────────────────────────────────

const SYSTEMS: { id: BodySystem; label: string }[] = [
  { id: 'brain',   label: 'Cerebro'   },
  { id: 'heart',   label: 'Corazón'   },
  { id: 'liver',   label: 'Hígado'    },
  { id: 'gut',     label: 'Intestino' },
  { id: 'muscles', label: 'Músculos'  },
]

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CuerpoVivoLab() {
  const [lab, setLab] = useState<LabState>(PRESETS[1].state)
  const [systems, setSystems] = useState<Set<BodySystem>>(new Set())

  const derived = deriveBodyState(lab)

  function patch<K extends keyof LabState>(key: K, value: LabState[K]) {
    setLab(prev => ({ ...prev, [key]: value }))
  }

  function toggleSystem(id: BodySystem) {
    setSystems(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-base font-semibold text-neutral-900">
          Laboratorio — Cuerpo Vivo
        </h1>
        <p className="text-xs font-mono text-neutral-400 mt-0.5">/dev/cuerpo-vivo</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-10 items-start">

        {/* ── Preview ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-4 flex-shrink-0 self-center lg:self-start lg:sticky lg:top-10">
          <CuerpoVivo
            {...lab}
            highlightedSystems={[...systems]}
            size="lg"
            animated
          />
          <p className="text-xs text-neutral-400 font-mono">{formatHour(lab.timeOfDay)}</p>
        </div>

        {/* ── Controls ─────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-8 min-w-0">

          {/* Quick presets */}
          <section>
            <SectionLabel>Momento del día</SectionLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESETS.map(({ label, state }) => (
                <button
                  key={label}
                  onClick={() => setLab(state)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-neutral-200 bg-white
                             hover:bg-neutral-100 text-neutral-700 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Sliders */}
          <section>
            <SectionLabel>Parámetros fisiológicos</SectionLabel>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <Slider
                label="Hora"
                value={lab.timeOfDay} min={0} max={23.99} step={0.25}
                display={formatHour(lab.timeOfDay)}
                onChange={v => patch('timeOfDay', v)}
              />
              <Slider
                label="Energía"
                value={lab.energyLevel} min={0} max={1} step={0.01}
                display={pct(lab.energyLevel)}
                onChange={v => patch('energyLevel', v)}
              />
              <Slider
                label="Estado de alerta"
                value={lab.alertness} min={0} max={1} step={0.01}
                display={pct(lab.alertness)}
                onChange={v => patch('alertness', v)}
              />
              <Slider
                label="Cortisol"
                value={lab.cortisol} min={0} max={1} step={0.01}
                display={pct(lab.cortisol)}
                onChange={v => patch('cortisol', v)}
              />
              <Slider
                label="Melatonina"
                value={lab.melatonin} min={0} max={1} step={0.01}
                display={pct(lab.melatonin)}
                onChange={v => patch('melatonin', v)}
              />
              <Slider
                label="Temperatura corporal"
                value={lab.bodyTemperature} min={35.5} max={37.5} step={0.1}
                display={`${lab.bodyTemperature.toFixed(1)} °C`}
                onChange={v => patch('bodyTemperature', v)}
              />
            </div>
          </section>

          {/* Systems checkboxes */}
          <section>
            <SectionLabel>Sistemas destacados</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-4">
              {SYSTEMS.map(({ id, label }) => (
                <label key={id} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={systems.has(id)}
                    onChange={() => toggleSystem(id)}
                    className="w-4 h-4 accent-indigo-500"
                  />
                  <span className="text-sm text-neutral-700">{label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Debug panel */}
          <section>
            <SectionLabel>Estado derivado</SectionLabel>
            <div className="mt-2 rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs space-y-1.5">
              <DebugRow k="hora"        v={formatHour(lab.timeOfDay)} />
              <DebugRow k="fase"        v={derived.circadianPhase} />
              <DebugRow k="energía"     v={derived.energyPhase} />
              <DebugRow k="glow"        v={derived.glowIntensity.toFixed(2)} />
              <DebugRow k="pulso"       v={derived.pulseSpeed} />
              <DebugRow k="cortisol"    v={pct(lab.cortisol)} />
              <DebugRow k="melatonina"  v={pct(lab.melatonin)} />
              <DebugRow k="temp"        v={`${lab.bodyTemperature.toFixed(1)} °C`} />
              <DebugRow k="tone"        v={derived.bodyTone} />
              <DebugRow k="sistemas"    v={systems.size > 0 ? [...systems].join(', ') : '—'} />
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
      {children}
    </p>
  )
}

function Slider({
  label, value, min, max, step, display, onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-sm text-neutral-600">{label}</span>
        <span className="text-sm font-mono text-neutral-900 tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 accent-indigo-500 cursor-pointer"
      />
    </div>
  )
}

function DebugRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-neutral-500 w-24 flex-shrink-0">{k}</span>
      <span className="text-emerald-400 truncate">{v}</span>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatHour(h: number): string {
  const hh = Math.floor(h)
  const mm  = Math.round((h - hh) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function pct(v: number): string {
  return `${Math.round(v * 100)} %`
}
