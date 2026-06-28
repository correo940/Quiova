import type { Pillar } from './types'

export interface PillarTheme {
  color: string        // primary text / icon color
  accent: string       // hover / active state
  bg: string           // section background tint
  border: string       // subtle border
  badge: string        // pill / tag background
  href: string         // back-link destination
  label: string        // human-readable name
}

export const PILLAR_THEME: Record<Pillar, PillarTheme> = {
  cuerpo: {
    color:  '#1a5c2e',
    accent: '#166534',
    bg:     '#f0fdf4',
    border: '#bbf7d0',
    badge:  '#dcfce7',
    href:   '/cuerpo',
    label:  'Cuerpo',
  },
  mente: {
    color:  '#1558a8',
    accent: '#1d4ed8',
    bg:     '#eff6ff',
    border: '#bfdbfe',
    badge:  '#dbeafe',
    href:   '/mente',
    label:  'Mente',
  },
  finanzas: {
    color:  '#92400e',
    accent: '#b45309',
    bg:     '#fffbeb',
    border: '#fde68a',
    badge:  '#fef3c7',
    href:   '/finanzas',
    label:  'Finanzas',
  },
}
