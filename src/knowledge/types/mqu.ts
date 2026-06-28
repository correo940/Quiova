/**
 * MQU v1 — QUIOBA Metric Unit
 *
 * Representa algo que QUIOBA puede medir, rastrear o inferir sobre el usuario.
 * Define el CONTRATO de la métrica, no su implementación de cálculo.
 *
 * Regla: una MQU no sabe cómo calcularse en tiempo real.
 * El método de cálculo es una descripción, no código ejecutable.
 * La implementación real llegará en una capa posterior.
 */

import type { Pillar } from '@/qku/types'

// ── Data type ──────────────────────────────────────────────────────────────────
/**
 * Tipo del valor que almacena esta métrica:
 * number      → entero o decimal (genérico)
 * boolean     → sí/no, activado/desactivado
 * duration    → duración en minutos
 * time-of-day → hora del día (HH:MM, 0-1439 minutos desde medianoche)
 * count       → número de ocurrencias
 * percentage  → 0-100
 */
export type MQUDataType =
  | 'number'
  | 'boolean'
  | 'duration'
  | 'time-of-day'
  | 'count'
  | 'percentage'

// ── Calculation method ─────────────────────────────────────────────────────────
/**
 * manual    → el usuario introduce el valor explícitamente
 * automatic → derivado de datos rastreados por el sistema
 * inferred  → estimado a partir de otras métricas relacionadas
 */
export type MQUCalculationMethod = 'manual' | 'automatic' | 'inferred'

// ── Update frequency ───────────────────────────────────────────────────────────
export type MQUUpdateFrequency =
  | 'real-time'   // cada vez que el sistema recibe un dato nuevo
  | 'daily'       // una vez al día (ej. al final del día)
  | 'weekly'      // promedio o resumen semanal
  | 'monthly'     // resumen mensual
  | 'manual'      // solo cuando el usuario lo actualiza

// ── Aggregation ────────────────────────────────────────────────────────────────
/**
 * Cómo combinar múltiples registros del mismo período:
 * average → media aritmética
 * sum     → suma total
 * last    → último valor registrado
 * min     → valor mínimo
 * max     → valor máximo
 * count   → número de registros
 */
export type MQUAggregation = 'average' | 'sum' | 'last' | 'min' | 'max' | 'count'

// ── Recommended range ──────────────────────────────────────────────────────────
export interface MQURange {
  /** Unidad de medida. Ej: 'minutos', 'horas', '%', 'veces/semana'. */
  unit: string
  min?: number
  max?: number
  /**
   * Valor o rango óptimo dentro de [min, max].
   * number   → punto ideal exacto
   * [lo, hi] → ventana óptima
   */
  optimal?: number | [number, number]
  /** Nota sobre el rango. Ej: 'Varía según cronotipo'. */
  note?: string
}

// ── Relations (MQU ↔ MQU) ─────────────────────────────────────────────────────
export type MQURelationType = 'requires' | 'related' | 'contradicts'

export interface MQURelation {
  targetSlug: string
  targetType: 'mqu'
  type: MQURelationType
  note?: string
}

// ── MQU ───────────────────────────────────────────────────────────────────────
export interface MQU {
  // ── Identity ────────────────────────────────────────────────────────────────
  id: string              // UUID v4 inmutable
  slug: string            // kebab-case, único en el registro
  version: string         // semver
  createdAt: string       // ISO 8601
  updatedAt: string       // ISO 8601

  // ── Classification ──────────────────────────────────────────────────────────
  pillar: Pillar
  domain: string
  tags: string[]

  // ── Content ─────────────────────────────────────────────────────────────────
  /** Nombre legible. Ej: 'Regularidad del sueño', 'Hora del primer café'. */
  name: string
  /** Unidad principal. Ej: 'minutos', '%', 'horas'. */
  unit: string
  /** Qué mide esta métrica y por qué importa. 1-3 oraciones. */
  description: string

  // ── Measurement contract ────────────────────────────────────────────────────
  dataType: MQUDataType
  calculationMethod: MQUCalculationMethod
  updateFrequency: MQUUpdateFrequency
  aggregation: MQUAggregation
  recommendedRange: MQURange

  /**
   * Descripción del método de cálculo en lenguaje natural.
   * No es código — es la especificación que la implementación debe cumplir.
   * Ej: 'Media de |hora_acostarse_hoy - hora_acostarse_ayer| en los últimos 7 días.'
   */
  calculationDescription: string

  // ── Graph connections ────────────────────────────────────────────────────────
  /**
   * AQU slugs que pueden mejorar esta métrica.
   * El grafo deriva aristas AQU→MQU 'affects' desde los AQUs correspondientes.
   * Este campo actúa como índice inverso para queries rápidas.
   */
  improvedBy: string[]

  /**
   * QKU slugs que explican qué significa esta métrica y por qué importa medirla.
   * El grafo deriva aristas QKU→MQU 'explains' desde este campo.
   */
  explainedBy: string[]

  /** Relaciones entre métricas (MQU↔MQU). */
  relations: MQURelation[]
}

// ── Schema version ─────────────────────────────────────────────────────────────
export const MQU_SCHEMA_VERSION = '1' as const
