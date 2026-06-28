import type { ComponentType } from 'react'

// ── Pillar ─────────────────────────────────────────────────────────────────────
export type Pillar = 'cuerpo' | 'mente' | 'finanzas'

// ── Block data shapes ──────────────────────────────────────────────────────────

export interface NarrativeData {
  paragraphs: string[]
}

export interface CalloutData {
  variant: 'info' | 'insight' | 'warning'
  title?: string
  body: string
}

export interface CardItem {
  title: string
  body: string
  emoji?: string
  color?: string
}

export interface CardsData {
  items: CardItem[]
  columns?: 2 | 3 | 4
}

// Custom blocks reference a component key that lives in GuiaBundle.components.
// Data is whatever the component needs — typed per-component at the guide level.
export interface CustomData {
  component: string
  props?: Record<string, unknown>
}

export type BlockData = NarrativeData | CalloutData | CardsData | CustomData

// ── Block ──────────────────────────────────────────────────────────────────────
export type BlockType = 'narrative' | 'callout' | 'cards' | 'custom'

export interface Block {
  id: string
  type: BlockType
  data: BlockData
  requiresAuth?: boolean
  /** Slug de la QKU que origina este bloque. Habilita insignias de evidencia y citas. */
  qkuSlug?: string
}

// ── Section ────────────────────────────────────────────────────────────────────
export interface Section {
  id: string
  label: string
  icon?: string        // any emoji or lucide icon name string (guide decides)
  blocks: Block[]
  requiresAuth?: boolean
}

// ── Guide config ───────────────────────────────────────────────────────────────
export interface GuiaConfig {
  slug: string
  pillar: Pillar
  title: string
  subtitle: string
  readingMinutes?: number
  heroImage?: string
  sections: Section[]
  meta: {
    description: string
    keywords?: string[]
  }
}

// ── Bundle ─────────────────────────────────────────────────────────────────────
// A bundle pairs the declarative config with any custom components it needs.
// This is the single object the engine receives — guides add new bundles
// in src/guias/configs/index.ts without touching the engine.
export type BlockComponent = ComponentType<{ data: Record<string, unknown> }>

export interface GuiaBundle {
  config: GuiaConfig
  components?: Record<string, BlockComponent>
}
