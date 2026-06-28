/**
 * AQU v1 — QUIOBA Action Unit
 *
 * Representa una acción concreta que el usuario puede realizar.
 * Siempre está fundamentada en al menos una QKU (groundedIn).
 * Siempre apunta a al menos una MQU que puede mejorar (affectsMetrics).
 *
 * Regla: una AQU no contiene conocimiento propio.
 * El "por qué" vive en las QKUs; la AQU solo responde "qué hacer".
 */

import type { Pillar, EvidenceLevel, ValidationStatus, QKUSource } from '@/qku/types'

// ── Difficulty ─────────────────────────────────────────────────────────────────
/**
 * 1 → Fácil. Sin fricción, sin habilidad previa, sin coste.
 * 2 → Moderado. Requiere ajuste de rutina o esfuerzo consciente.
 * 3 → Difícil. Cambio significativo; puede requerir apoyo profesional.
 */
export type AQUDifficulty = 1 | 2 | 3

// ── Frequency ──────────────────────────────────────────────────────────────────
export type AQUFrequency =
  | 'daily'       // una vez al día
  | 'morning'     // específicamente por la mañana
  | 'nightly'     // específicamente por la noche
  | 'weekly'      // una o varias veces por semana
  | 'once'        // acción de setup, no recurrente
  | 'as-needed'   // según contexto

// ── Duration ───────────────────────────────────────────────────────────────────
export type AQUDurationType =
  | 'setup'         // tiempo único para configurar el hábito
  | 'per-session'   // duración de cada ejecución
  | 'total-daily'   // tiempo total comprometido al día

export interface AQUDuration {
  minutes: number
  type: AQUDurationType
}

// ── Expected impact ────────────────────────────────────────────────────────────
export type ImpactMagnitude = 'small' | 'moderate' | 'large'
export type ImpactDirection = 'improve' | 'maintain' | 'reduce'

export interface AQUImpactItem {
  /** Slug de la MQU que esta acción modifica. */
  mquSlug: string
  direction: ImpactDirection
  magnitude: ImpactMagnitude
  /** Tiempo estimado para observar el impacto. Ej: '2-4 semanas'. */
  timeframe: string
}

export interface AQUExpectedImpact {
  /** Resumen prose del impacto esperado. Consumido por la IA y UI de preview. */
  summary: string
  items: AQUImpactItem[]
}

// ── Evidence (estructura propia; reutiliza tipos de QKU) ───────────────────────
export interface AQUEvidence {
  overallLevel: EvidenceLevel
  status: ValidationStatus
  sources: QKUSource[]
  /** Limitaciones o contexto sobre la evidencia de esta acción específica. */
  caveats?: string
}

// ── Contraindications ──────────────────────────────────────────────────────────
export interface AQUContraindication {
  /** Condición o perfil de usuario al que aplica. */
  condition: string
  severity: 'caution' | 'avoid'
  note?: string
}

// ── Relations (AQU ↔ AQU o AQU → QKU) ────────────────────────────────────────
/**
 * Tipos de relación que una AQU puede declarar:
 * requires    → esta AQU presupone haber completado otra (orden)
 * supports    → potencia el efecto de otra AQU si se combinan
 * related     → conexión conceptual sin dependencia
 * contradicts → conflicto (no hacer A y B simultáneamente)
 */
export type AQURelationType = 'requires' | 'supports' | 'related' | 'contradicts'

export interface AQURelation {
  targetSlug: string
  targetType: 'aqu' | 'qku'
  type: AQURelationType
  note?: string
}

// ── AQU ───────────────────────────────────────────────────────────────────────
export interface AQU {
  // ── Identity ────────────────────────────────────────────────────────────────
  id: string              // UUID v4 inmutable
  slug: string            // kebab-case, único en el registro
  version: string         // semver
  createdAt: string       // ISO 8601
  updatedAt: string       // ISO 8601

  // ── Classification ──────────────────────────────────────────────────────────
  pillar: Pillar
  /** Sub-dominio, alineado con QKU.classification.domain. Ej: 'sueno', 'nutricion'. */
  domain: string
  tags: string[]

  // ── Content ─────────────────────────────────────────────────────────────────
  /** Nombre corto de la acción. Ej: 'Exponerse a luz natural matutina'. */
  title: string
  /** Explicación del qué y el cómo. Sin el porqué — eso está en las QKUs. */
  description: string
  /** Pasos concretos ordenados. Lista ejecutable sin contexto adicional. */
  instructions: string[]

  // ── Parameters ──────────────────────────────────────────────────────────────
  difficulty: AQUDifficulty
  frequency: AQUFrequency
  duration: AQUDuration

  // ── Impact & evidence ───────────────────────────────────────────────────────
  expectedImpact: AQUExpectedImpact
  evidence: AQUEvidence
  contraindications: AQUContraindication[]

  // ── Graph connections ────────────────────────────────────────────────────────
  /**
   * QKU slugs que explican el mecanismo de esta acción.
   * El grafo deriva aristas QKU→AQU 'explains' desde este campo.
   * Mínimo 1 requerido.
   */
  groundedIn: string[]

  /**
   * MQU slugs que esta acción puede mejorar.
   * El grafo deriva aristas AQU→MQU 'affects' desde este campo.
   * Mínimo 1 requerido.
   */
  affectsMetrics: string[]

  /** Relaciones peer-to-peer (AQU↔AQU o AQU→QKU). */
  relations: AQURelation[]
}

// ── Schema version ─────────────────────────────────────────────────────────────
export const AQU_SCHEMA_VERSION = '1' as const
