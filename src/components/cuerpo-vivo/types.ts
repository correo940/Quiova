import type React from 'react'

export type BodySystem = 'brain' | 'eyes' | 'heart' | 'lungs' | 'gut' | 'liver' | 'muscles' | 'skin'

export type CircadianPhase = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night'

export type EnergyPhase = 'rest' | 'low' | 'rising' | 'peak' | 'declining'

export type CuerpoVivoSize = 'sm' | 'md' | 'lg'

export interface CuerpoVivoProps {
  timeOfDay?: number          // 0–24 hours (defaults to current hour)
  energyLevel?: number        // 0–1
  alertness?: number          // 0–1
  melatonin?: number          // 0–1 normalized
  cortisol?: number           // 0–1 normalized
  bodyTemperature?: number    // actual °C (35.5–37.5)
  highlightedSystems?: BodySystem[]
  size?: CuerpoVivoSize | number  // named size or pixel width
  variant?: 'light' | 'dark'
  animated?: boolean
  className?: string
  style?: React.CSSProperties
}

export interface CuerpoVivoState {
  circadianPhase: CircadianPhase
  energyPhase: EnergyPhase
  ambientHue: number
  ambientSaturation: number
  ambientLightness: number
  glowIntensity: number         // 0–1
  pulseSpeed: 'slow' | 'normal' | 'fast'
  bodyTone: string              // hsl() string for body fill
}
