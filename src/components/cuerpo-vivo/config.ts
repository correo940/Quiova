import type { CircadianPhase, EnergyPhase, BodySystem, CuerpoVivoSize } from './types'

export interface PhaseColor {
  hue: number
  saturation: number
  lightness: number
}

export const PHASE_COLORS: Record<CircadianPhase, PhaseColor> = {
  dawn:      { hue: 25,  saturation: 70, lightness: 68 },
  morning:   { hue: 45,  saturation: 80, lightness: 64 },
  afternoon: { hue: 210, saturation: 60, lightness: 60 },
  evening:   { hue: 270, saturation: 50, lightness: 54 },
  night:     { hue: 230, saturation: 40, lightness: 34 },
}

// [min, max) inclusive-exclusive
export const ENERGY_PHASE_THRESHOLDS: Record<EnergyPhase, [number, number]> = {
  rest:     [0,    0.15],
  low:      [0.15, 0.35],
  rising:   [0.35, 0.60],
  peak:     [0.60, 0.85],
  declining:[0.85, 1.01],
}

export interface SystemConfig {
  cx: number
  cy: number
  r: number
  color: string
  label: string
}

export const SYSTEM_CONFIG: Record<BodySystem, SystemConfig> = {
  brain:   { cx: 100, cy: 38,  r: 8, color: '#818cf8', label: 'Sistema nervioso central' },
  eyes:    { cx: 100, cy: 61,  r: 5, color: '#60a5fa', label: 'Fotoreceptores' },
  heart:   { cx: 83,  cy: 148, r: 7, color: '#f87171', label: 'Cardiovascular' },
  lungs:   { cx: 117, cy: 148, r: 6, color: '#86efac', label: 'Respiratorio' },
  gut:     { cx: 100, cy: 198, r: 8, color: '#34d399', label: 'Digestivo' },
  liver:   { cx: 116, cy: 180, r: 5, color: '#fb923c', label: 'Metabólico' },
  muscles: { cx: 100, cy: 238, r: 6, color: '#c084fc', label: 'Sistema muscular' },
  skin:    { cx: 100, cy: 100, r: 0, color: '#fbbf24', label: 'Termorregulación' }, // r=0 → full-body overlay
}

export const SIZE_MAP: Record<CuerpoVivoSize, number> = {
  sm: 100,
  md: 160,
  lg: 220,
}

export const ANIMATION_DURATIONS = {
  pulse:      { slow: 4.5, normal: 3.2, fast: 2.0 },  // seconds
  glow:       2.8,
  transition: 1.4,
} as const

export const BODY_TEMPERATURE_RANGE = {
  min:     35.5,
  max:     37.5,
  optimal: 36.6,
} as const

export const GLOW_BLUR = {
  system:  7,
} as const

export const SVG_VIEWBOX = { width: 200, height: 420 } as const
