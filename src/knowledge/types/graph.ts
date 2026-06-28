/**
 * Knowledge Graph — tipos del grafo
 *
 * El grafo unifica QKU, AQU y MQU en un espacio relacional común.
 * Las aristas son tipadas: cada tipo de relación tiene semántica precisa.
 *
 * Regla de dirección:
 *   QKU  →  explains    →  AQU / MQU
 *   QKU  →  recommends  →  AQU
 *   AQU  →  affects     →  MQU
 *   MQU  →  measures    →  QKU
 *   any  ↔  requires / extends / related / supports / contradicts  ↔  any
 */

// ── Entity reference ───────────────────────────────────────────────────────────
export type EntityType = 'qku' | 'aqu' | 'mqu'

export interface EntityRef {
  type: EntityType
  slug: string
}

// ── Relation types ─────────────────────────────────────────────────────────────
/**
 * Relaciones con semántica específica de dirección y par de entidades:
 *
 * explains     QKU → AQU/MQU   El conocimiento explica por qué existe la acción/métrica.
 * recommends   QKU → AQU       El conocimiento recomienda explícitamente esta acción.
 * affects      AQU → MQU       Realizar esta acción modifica esta métrica.
 * measures     MQU → QKU       Esta métrica operacionaliza un concepto del conocimiento.
 *
 * Relaciones universales (cualquier dirección y cualquier par):
 *
 * requires     any → any       Prerrequisito: sin A no tiene sentido B.
 * extends      any → any       B profundiza o amplía un aspecto de A.
 * related      any → any       Conexión conceptual sin dependencia directa.
 * supports     any → any       A aporta evidencia o fuerza adicional a B.
 * contradicts  any → any       A contradice o entra en conflicto con B.
 */
export type GraphRelationType =
  | 'explains'
  | 'recommends'
  | 'affects'
  | 'measures'
  | 'requires'
  | 'extends'
  | 'related'
  | 'supports'
  | 'contradicts'

// ── Graph edge ─────────────────────────────────────────────────────────────────
export interface GraphEdge {
  from: EntityRef
  to: EntityRef
  type: GraphRelationType
  /**
   * Fuerza de la relación (0-1).
   * Usada por el engine para rankear resultados.
   * 1.0 = relación primaria y bien evidenciada.
   * 0.5 = conexión secundaria o contextual.
   * Si no se especifica, el engine asume 1.0.
   */
  weight?: number
  note?: string
}

// ── Subgraph ───────────────────────────────────────────────────────────────────
/**
 * Subconjunto del grafo devuelto por el Knowledge Engine.
 * Incluye los nodos (referencias) y las aristas que los conectan.
 */
export interface GraphSubgraph {
  nodes: EntityRef[]
  edges: GraphEdge[]
}

// ── Traversal ──────────────────────────────────────────────────────────────────
/** Dirección de traversal desde un nodo dado. */
export type TraversalDirection = 'outbound' | 'inbound' | 'both'

export interface TraversalOptions {
  direction?: TraversalDirection
  /** Tipos de relación a seguir. Si no se especifica, sigue todos. */
  relationTypes?: GraphRelationType[]
  /** Tipos de entidad destino a incluir. Si no se especifica, incluye todos. */
  targetTypes?: EntityType[]
  /** Profundidad máxima de traversal (1 = solo vecinos directos). */
  maxDepth?: number
}
