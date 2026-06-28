/**
 * Knowledge Engine v1
 *
 * Capa de decisión pura. Sin conocimiento propio. Sin UI. Sin IA.
 *
 * Responde tres preguntas:
 *   1. ¿Qué conocimiento (QKU) necesito para este contexto?
 *   2. ¿Qué acciones (AQU) debo recomendar?
 *   3. ¿Qué métricas (MQU) debo mostrar o rastrear?
 *
 * Todas las funciones son puras (no hay estado interno).
 * El estado vive en los registries; el engine solo lee de ellos.
 */

import { getPublishable, getByPillar, getByDomain, getByTag, getQKU } from '@/qku/registry'
import {
  getAllAQUs, getAQUsByPillar, getAQUsByDomain, getAQUsByMaxMinutes, getAQU,
} from '../registry/aqu'
import {
  getAllMQUs, getMQUsByPillar, getMQUsByDomain, getMQU,
} from '../registry/mqu'
import {
  getEdgesFrom, getEdgesTo, getEdgesBetween, traverse,
} from '../registry/graph'

import type { QKU, QKUComplexity } from '@/qku/types'
import type { AQU } from '../types/aqu'
import type { MQU } from '../types/mqu'
import type { EntityType, GraphEdge } from '../types/graph'
import type {
  KnowledgeQuery, KnowledgeResult, RelatedResult, RankedAQU,
} from './types'

// ── Main entry point ───────────────────────────────────────────────────────────
/**
 * Query principal del engine.
 *
 * Uso desde una Guía Viva:
 *   const result = query({ context: { pillar: 'cuerpo', domain: 'sueno' } })
 *
 * Uso con semilla (expandir desde un nodo):
 *   const result = query({ context: {}, seedSlug: 'melatonina-pico-nocturno', seedType: 'qku' })
 */
export function query(q: KnowledgeQuery): KnowledgeResult {
  const {
    context,
    include = ['knowledge', 'actions', 'metrics'],
    publishedOnly = true,
    seedSlug,
    seedType,
  } = q

  let knowledge: QKU[] = []
  let actions: AQU[] = []
  let metrics: MQU[] = []

  if (seedSlug && seedType) {
    // ── Seed mode: expand from a single node ──────────────────────────────────
    const subgraph = traverse({ type: seedType, slug: seedSlug }, { maxDepth: 2 })

    for (const node of subgraph.nodes) {
      if (node.type === 'qku' && include.includes('knowledge')) {
        const e = getQKU(node.slug)
        if (e && isPublishable(e.evidence.status, publishedOnly)) knowledge.push(e)
      }
      if (node.type === 'aqu' && include.includes('actions')) {
        const e = getAQU(node.slug)
        if (e) actions.push(e)
      }
      if (node.type === 'mqu' && include.includes('metrics')) {
        const e = getMQU(node.slug)
        if (e) metrics.push(e)
      }
    }
  } else {
    // ── Context mode: filter by context fields ────────────────────────────────
    if (include.includes('knowledge')) {
      knowledge = selectKnowledge(context, publishedOnly)
    }
    if (include.includes('actions')) {
      actions = selectActions(context)
    }
    if (include.includes('metrics')) {
      metrics = selectMetrics(context)
    }
  }

  // Apply limits
  if (q.limit?.knowledge) knowledge = knowledge.slice(0, q.limit.knowledge)
  if (q.limit?.actions)   actions   = actions.slice(0,   q.limit.actions)
  if (q.limit?.metrics)   metrics   = metrics.slice(0,   q.limit.metrics)

  const roots = [
    ...knowledge.map(e => e.identity.slug),
    ...actions.map(e => e.slug),
    ...metrics.map(e => e.slug),
  ]

  const edges = getEdgesBetween(roots)

  return {
    knowledge,
    actions,
    metrics,
    edges,
    roots,
    meta: {
      totalNodes: roots.length,
      totalEdges: edges.length,
      executedAt: new Date().toISOString(),
      context,
    },
  }
}

// ── Related ────────────────────────────────────────────────────────────────────
/**
 * Devuelve todas las entidades directamente conectadas a un nodo.
 * Útil para el panel "relacionado" de una Guía o para la IA.
 */
export function getRelated(slug: string, type: EntityType): RelatedResult {
  const outEdges = getEdgesFrom({ type, slug })
  const inEdges  = getEdgesTo({ type, slug })
  const allEdges = dedupeEdges([...outEdges, ...inEdges])

  const knowledge: QKU[] = []
  const actions: AQU[]   = []
  const metrics: MQU[]   = []

  for (const edge of allEdges) {
    const neighbor = edge.from.slug === slug ? edge.to : edge.from
    if (neighbor.type === 'qku') { const e = getQKU(neighbor.slug); if (e) knowledge.push(e) }
    if (neighbor.type === 'aqu') { const e = getAQU(neighbor.slug); if (e) actions.push(e) }
    if (neighbor.type === 'mqu') { const e = getMQU(neighbor.slug); if (e) metrics.push(e) }
  }

  return {
    knowledge: dedupeBy(knowledge, e => e.identity.slug),
    actions:   dedupeBy(actions,   e => e.slug),
    metrics:   dedupeBy(metrics,   e => e.slug),
    edges:     allEdges,
  }
}

// ── Rank actions ───────────────────────────────────────────────────────────────
/**
 * Ordena AQUs por relevancia para el contexto dado.
 *
 * Factores de scoring (todos 0-1, combinados linealmente):
 *   - timefit:    la acción cabe en el tiempo disponible
 *   - difficulty: la acción está dentro de la dificultad tolerable
 *   - impact:     la acción mejora métricas actualmente desviadas del óptimo
 *
 * No implementa IA — el ranking es determinista y auditable.
 */
export function rankActions(actions: AQU[], context: KnowledgeQuery['context']): RankedAQU[] {
  return actions
    .map(aqu => scoreAction(aqu, context))
    .sort((a, b) => b.score - a.score)
}

function scoreAction(aqu: AQU, context: KnowledgeQuery['context']): RankedAQU {
  let score = 0.5
  const reasons: string[] = []

  // Time fit
  if (context.timeAvailableMinutes !== undefined) {
    if (aqu.duration.minutes <= context.timeAvailableMinutes) {
      score += 0.2
      reasons.push('cabe en el tiempo disponible')
    } else {
      score -= 0.3
      reasons.push('requiere más tiempo del disponible')
    }
  }

  // Difficulty
  if (context.maxDifficulty !== undefined) {
    if (aqu.difficulty <= context.maxDifficulty) {
      score += 0.15
      reasons.push(`dificultad ${aqu.difficulty} dentro del límite`)
    } else {
      score -= 0.25
      reasons.push(`dificultad ${aqu.difficulty} supera el límite`)
    }
  }

  // Metric deviation boost
  if (context.currentMetrics) {
    for (const item of aqu.expectedImpact.items) {
      const current = context.currentMetrics[item.mquSlug]
      const mqu = getMQU(item.mquSlug)
      if (current !== undefined && mqu) {
        const range = mqu.recommendedRange
        const isDeviating =
          (range.min !== undefined && current < range.min) ||
          (range.max !== undefined && current > range.max)
        if (isDeviating && item.direction === 'improve') {
          score += 0.15
          reasons.push(`mejora métrica desviada: ${mqu.name}`)
        }
      }
    }
  }

  return { aqu, score: Math.max(0, Math.min(1, score)), reasons }
}

// ── Private selectors ──────────────────────────────────────────────────────────

function selectKnowledge(context: KnowledgeQuery['context'], publishedOnly: boolean): QKU[] {
  let result = publishedOnly ? getPublishable() : []
  if (context.pillar)     result = result.filter(q => q.classification.pillar === context.pillar)
  if (context.domain)     result = result.filter(q => q.classification.domain === context.domain)
  if (context.complexity) result = result.filter(q => q.classification.complexity <= (context.complexity as QKUComplexity))
  if (context.tags?.length) {
    result = result.filter(q => context.tags!.some(t => q.classification.tags.includes(t)))
  }
  return result
}

function selectActions(context: KnowledgeQuery['context']): AQU[] {
  let result = context.pillar ? getAQUsByPillar(context.pillar) : getAllAQUs()
  if (context.domain) result = result.filter(a => a.domain === context.domain)
  if (context.timeAvailableMinutes !== undefined) {
    result = result.filter(a => a.duration.minutes <= (context.timeAvailableMinutes ?? Infinity))
  }
  if (context.maxDifficulty !== undefined) {
    result = result.filter(a => a.difficulty <= (context.maxDifficulty ?? 3))
  }
  if (context.tags?.length) {
    result = result.filter(a => context.tags!.some(t => a.tags.includes(t)))
  }
  return result
}

function selectMetrics(context: KnowledgeQuery['context']): MQU[] {
  let result = context.pillar ? getMQUsByPillar(context.pillar) : getAllMQUs()
  if (context.domain) result = result.filter(m => m.domain === context.domain)
  if (context.tags?.length) {
    result = result.filter(m => context.tags!.some(t => m.tags.includes(t)))
  }
  return result
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function isPublishable(status: string, publishedOnly: boolean): boolean {
  if (!publishedOnly) return true
  return status === 'validated' || status === 'contested'
}

function dedupeBy<T>(arr: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return arr.filter(item => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function dedupeEdges(edges: GraphEdge[]): GraphEdge[] {
  const seen = new Set<string>()
  return edges.filter(e => {
    const k = `${e.from.type}:${e.from.slug}→${e.to.type}:${e.to.slug}:${e.type}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
