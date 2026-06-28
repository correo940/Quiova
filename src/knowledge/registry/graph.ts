/**
 * Knowledge Graph Registry
 *
 * Índice unificado de aristas derivado de todas las entidades registradas.
 * No es una fuente primaria: las relaciones se declaran en QKU, AQU y MQU.
 * Este módulo las agrega y las expone para traversal eficiente.
 *
 * Construcción lazy: el índice se construye la primera vez que se consulta.
 * Llama a invalidateGraphIndex() si registras entidades dinámicamente en tests.
 */

import { getAllSlugs as getAllQKUSlugs, getQKU } from '@/qku/registry'
import { getAllAQUSlugs, getAQU } from './aqu'
import { getAllMQUSlugs, getMQU } from './mqu'
import type { GraphEdge, EntityRef, EntityType, TraversalOptions, GraphSubgraph } from '../types/graph'

// ── Edge store ─────────────────────────────────────────────────────────────────
const _edges: GraphEdge[] = []
let _built = false

export function invalidateGraphIndex(): void {
  _edges.length = 0
  _built = false
}

function ensureBuilt(): void {
  if (_built) return
  _built = true
  buildEdges()
}

// ── Index builder ──────────────────────────────────────────────────────────────
function buildEdges(): void {
  // ── QKU relations (QKU → QKU) ───────────────────────────────────────────────
  for (const slug of getAllQKUSlugs()) {
    const qku = getQKU(slug)!
    for (const rel of qku.relations) {
      // QKU.relations are QKU-to-QKU only. Target type is always 'qku'.
      _edges.push({
        from: { type: 'qku', slug },
        to:   { type: 'qku', slug: rel.targetSlug },
        type: rel.type,
        note: rel.note,
      })
    }
  }

  // ── AQU relations ────────────────────────────────────────────────────────────
  for (const slug of getAllAQUSlugs()) {
    const aqu = getAQU(slug)!

    // Explicit peer relations (AQU ↔ AQU or AQU → QKU)
    for (const rel of aqu.relations) {
      _edges.push({
        from: { type: 'aqu', slug },
        to:   { type: rel.targetType, slug: rel.targetSlug },
        type: rel.type,
        note: rel.note,
      })
    }

    // Shorthand: groundedIn → QKU 'explains' AQU
    for (const qkuSlug of aqu.groundedIn) {
      _edges.push({
        from: { type: 'qku', slug: qkuSlug },
        to:   { type: 'aqu', slug },
        type: 'explains',
        weight: 1.0,
      })
    }

    // Shorthand: affectsMetrics → AQU 'affects' MQU
    for (const mquSlug of aqu.affectsMetrics) {
      _edges.push({
        from: { type: 'aqu', slug },
        to:   { type: 'mqu', slug: mquSlug },
        type: 'affects',
        weight: 1.0,
      })
    }
  }

  // ── MQU relations ────────────────────────────────────────────────────────────
  for (const slug of getAllMQUSlugs()) {
    const mqu = getMQU(slug)!

    // Explicit MQU ↔ MQU relations
    for (const rel of mqu.relations) {
      _edges.push({
        from: { type: 'mqu', slug },
        to:   { type: rel.targetType, slug: rel.targetSlug },
        type: rel.type,
        note: rel.note,
      })
    }

    // Shorthand: explainedBy → QKU 'explains' MQU
    for (const qkuSlug of mqu.explainedBy) {
      _edges.push({
        from: { type: 'qku', slug: qkuSlug },
        to:   { type: 'mqu', slug },
        type: 'explains',
        weight: 1.0,
      })
    }

    // Shorthand: improvedBy (inverse index — AQU→MQU already added from AQU side;
    // we skip re-adding to avoid duplicates. improvedBy is for query convenience only.)
  }
}

// ── Edge queries ───────────────────────────────────────────────────────────────

export function getEdgesFrom(ref: EntityRef, opts?: Pick<TraversalOptions, 'relationTypes' | 'targetTypes'>): GraphEdge[] {
  ensureBuilt()
  return _edges.filter(e => {
    if (e.from.type !== ref.type || e.from.slug !== ref.slug) return false
    if (opts?.relationTypes && !opts.relationTypes.includes(e.type)) return false
    if (opts?.targetTypes && !opts.targetTypes.includes(e.to.type)) return false
    return true
  })
}

export function getEdgesTo(ref: EntityRef, opts?: Pick<TraversalOptions, 'relationTypes' | 'targetTypes'>): GraphEdge[] {
  ensureBuilt()
  return _edges.filter(e => {
    if (e.to.type !== ref.type || e.to.slug !== ref.slug) return false
    if (opts?.relationTypes && !opts.relationTypes.includes(e.type)) return false
    if (opts?.targetTypes && !opts.targetTypes.includes(e.from.type)) return false
    return true
  })
}

/**
 * Devuelve todas las aristas donde ambos extremos están en el conjunto dado.
 * Usado para construir el subgrafo de un resultado del engine.
 */
export function getEdgesBetween(slugs: string[]): GraphEdge[] {
  ensureBuilt()
  const set = new Set(slugs)
  return _edges.filter(e => set.has(e.from.slug) && set.has(e.to.slug))
}

export function getAllEdges(): GraphEdge[] {
  ensureBuilt()
  return [..._edges]
}

// ── BFS traversal ──────────────────────────────────────────────────────────────
/**
 * Recorre el grafo en anchura desde un nodo semilla.
 * Devuelve el subgrafo alcanzable con las opciones dadas.
 */
export function traverse(seed: EntityRef, opts: TraversalOptions = {}): GraphSubgraph {
  ensureBuilt()
  const { direction = 'both', maxDepth = 2 } = opts

  const visited = new Set<string>()
  const resultNodes: EntityRef[] = []
  const resultEdges: GraphEdge[] = []

  const toKey = (ref: EntityRef) => `${ref.type}:${ref.slug}`
  const queue: Array<{ ref: EntityRef; depth: number }> = [{ ref: seed, depth: 0 }]

  while (queue.length > 0) {
    const item = queue.shift()!
    const key = toKey(item.ref)
    if (visited.has(key)) continue
    visited.add(key)
    resultNodes.push(item.ref)

    if (item.depth >= maxDepth) continue

    const neighbors: GraphEdge[] = []
    if (direction !== 'inbound') neighbors.push(...getEdgesFrom(item.ref, opts))
    if (direction !== 'outbound') neighbors.push(...getEdgesTo(item.ref, opts))

    for (const edge of neighbors) {
      const next = edge.from.slug === item.ref.slug && edge.from.type === item.ref.type
        ? edge.to
        : edge.from

      resultEdges.push(edge)
      if (!visited.has(toKey(next))) {
        queue.push({ ref: next, depth: item.depth + 1 })
      }
    }
  }

  return { nodes: resultNodes, edges: resultEdges }
}

// ── Validation (dev only) ──────────────────────────────────────────────────────
export function validateGraph(): { slug: string; errors: string[] }[] {
  ensureBuilt()
  const report: { slug: string; errors: string[] }[] = []

  for (const edge of _edges) {
    const errors: string[] = []
    const fromExists = entityExists(edge.from)
    const toExists = entityExists(edge.to)

    if (!fromExists) errors.push(`from "${edge.from.type}:${edge.from.slug}" no existe en ningún registro`)
    if (!toExists) errors.push(`to "${edge.to.type}:${edge.to.slug}" no existe en ningún registro`)

    if (errors.length) {
      report.push({ slug: `${edge.from.slug}→${edge.to.slug}`, errors })
    }
  }

  return report
}

function entityExists(ref: EntityRef): boolean {
  switch (ref.type) {
    case 'qku': return !!getQKU(ref.slug)
    case 'aqu': return !!getAQU(ref.slug)
    case 'mqu': return !!getMQU(ref.slug)
  }
}
