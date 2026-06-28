import type { CuerpoVivoProps, CuerpoVivoState, CircadianPhase, EnergyPhase, CuerpoVivoSize } from './types'
import { PHASE_COLORS, ENERGY_PHASE_THRESHOLDS, SIZE_MAP, BODY_TEMPERATURE_RANGE } from './config'

export function deriveCircadianPhase(timeOfDay: number): CircadianPhase {
  const h = ((timeOfDay % 24) + 24) % 24
  if (h >= 5  && h < 8)  return 'dawn'
  if (h >= 8  && h < 14) return 'morning'
  if (h >= 14 && h < 19) return 'afternoon'
  if (h >= 19 && h < 22) return 'evening'
  return 'night'
}

export function deriveEnergyPhase(energyLevel: number): EnergyPhase {
  const e = clamp(energyLevel)
  for (const [phase, [lo, hi]] of Object.entries(ENERGY_PHASE_THRESHOLDS) as [EnergyPhase, [number, number]][]) {
    if (e >= lo && e < hi) return phase
  }
  return 'rest'
}

export function normalizeSize(size: CuerpoVivoSize | number | undefined): number {
  if (size === undefined) return SIZE_MAP.md
  if (typeof size === 'number') return size
  return SIZE_MAP[size]
}

export function deriveBodyState(props: Pick<
  CuerpoVivoProps,
  'timeOfDay' | 'energyLevel' | 'alertness' | 'melatonin' | 'cortisol' | 'bodyTemperature'
>): CuerpoVivoState {
  const now = new Date()
  const timeOfDay = props.timeOfDay ?? now.getHours() + now.getMinutes() / 60
  const energyLevel = clamp(props.energyLevel ?? 0.5)
  const alertness   = clamp(props.alertness   ?? 0.5)
  const melatonin   = clamp(props.melatonin   ?? 0.3)
  const cortisol    = clamp(props.cortisol    ?? 0.4)
  const temp        = props.bodyTemperature   ?? BODY_TEMPERATURE_RANGE.optimal

  const circadianPhase = deriveCircadianPhase(timeOfDay)
  const energyPhase    = deriveEnergyPhase(energyLevel)
  const phase          = PHASE_COLORS[circadianPhase]

  // High melatonin nudges hue warmer (sunset/night tones)
  const ambientHue        = phase.hue + (melatonin - 0.5) * 18
  const ambientSaturation = phase.saturation
  const ambientLightness  = phase.lightness + (energyLevel - 0.5) * 10

  // Activation = alertness + cortisol drives glow intensity
  const glowIntensity = clamp(alertness * 0.6 + cortisol * 0.4)

  const pulseSpeed: CuerpoVivoState['pulseSpeed'] =
    energyLevel > 0.7 ? 'fast' : energyLevel < 0.3 ? 'slow' : 'normal'

  // Temperature shifts body tone saturation (warmer when higher)
  const tempNorm = (temp - BODY_TEMPERATURE_RANGE.min) /
    (BODY_TEMPERATURE_RANGE.max - BODY_TEMPERATURE_RANGE.min)
  const toneSat  = ambientSaturation * 0.22 + tempNorm * 8
  const bodyTone = `hsl(${Math.round(ambientHue)}, ${Math.round(toneSat)}%, ${Math.round(ambientLightness * 0.84)}%)`

  return {
    circadianPhase,
    energyPhase,
    ambientHue:        Math.round(ambientHue),
    ambientSaturation,
    ambientLightness,
    glowIntensity,
    pulseSpeed,
    bodyTone,
  }
}

function clamp(v: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, v))
}
