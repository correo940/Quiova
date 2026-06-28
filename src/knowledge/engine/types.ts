/**
 * Knowledge Engine — tipos de query y resultado
 *
 * El engine NO contiene conocimiento ni UI.
 * Solo toma decisiones: qué mostrar, en qué orden, con qué profundidad.
 *
 * Cualquier módulo (Guía, IA, App móvil) formula una KnowledgeQuery
 * y recibe un KnowledgeResult con los nodos y aristas relevantes.
 */

import type { QKU, Pillar, QKUComplexity } from '@/qku/types'
import type { AQU, AQUDifficulty } from '../types/aqu'
import type { MQU } from '../types/mqu'
import type { GraphEdge, EntityType } from '../types/graph'

// ── Context ────────────────────────────────────────────────────────────────────
/**
 * Lo que el módulo consumidor sabe sobre el usuario o la situación.
 * Todos los campos son opcionales: el engine opera con lo que tenga.
 */
export interface KnowledgeContext {
  pillar?: Pillar
  /** Sub-dominio, alineado con classification.domain. */
  domain?: string
  /** Tags para filtrado semántico adicional. */
  tags?: string[]
  /** Nivel máximo de complejidad que el usuario puede manejar. */
  complexity?: QKUComplexity
  /** Minutos disponibles para ejecutar acciones hoy. */
  timeAvailableMinutes?: number
  /** Dificultad máxima de acción tolerable. */
  maxDifficulty?: AQUDifficulty
  /** Lo que el usuario quiere conseguir (texto libre, para ranking futuro con IA). */
  goals?: string[]
  /**
   * Valores actuales de métricas (mquSlug → valor).
   * Permite al engine priorizar acciones sobre las métricas más desviadas.
   */
  currentMetrics?: Record<string, number>
}

// ── Query ──────────────────────────────────────────────────────────────────────
export type IncludeEntity = 'knowledge' | 'actions' | 'metrics'

export interface KnowledgeQuery {
  context: KnowledgeContext
  /** Qué tipos de entidad incluir en el resultado. Por defecto: todos. */
  include?: IncludeEntity[]
  /** Límite de resultados por tipo. */
  limit?: Partial<Record<IncludeEntity, number>>
  /**
   * Si true (por defecto), solo devuelve entidades en estado 'validated' o 'contested'.
   * Poner false solo en admin/preview.
   */
  publishedOnly?: boolean
  /**
   * Si se provee, el engine hace un traversal desde este nodo como semilla
   * en lugar de un filtro por contexto.
   * Útil para "dame todo lo relacionado con esta QKU específica".
   */
  seedSlug?: string
  seedType?: EntityType
}

// ── Result ─────────────────────────────────────────────────────────────────────
export interface KnowledgeResult {
  knowledge: QKU[]
  actions: AQU[]
  metrics: MQU[]
  /**
   * Subgrafo de aristas que conectan los nodos devueltos entre sí.
   * Permite al consumidor renderizar el grafo, calcular path, etc.
   */
  edges: GraphEdge[]
  /**
   * Slugs de las entidades que matchearon el query directamente
   * (raíces), antes de expandir por relaciones.
   */
  roots: string[]
  /** Metadatos de la query para debugging y telemetría. */
  meta: {
    totalNodes: number
    totalEdges: number
    executedAt: string   // ISO 8601
    context: KnowledgeContext
  }
}

// ── Related result ─────────────────────────────────────────────────────────────
/** Resultado simplificado para queries de "¿qué hay relacionado con X?". */
export interface RelatedResult {
  knowledge: QKU[]
  actions: AQU[]
  metrics: MQU[]
  edges: GraphEdge[]
}

// ── Ranked action ──────────────────────────────────────────────────────────────
export interface RankedAQU {
  aqu: AQU
  /** Score 0-1 calculado por el engine según el contexto. */
  score: number
  /** Por qué este score: qué factores lo subieron o bajaron. */
  reasons: string[]
}
