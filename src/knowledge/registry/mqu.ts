import type { MQU, MQUCalculationMethod, MQUUpdateFrequency } from '../types/mqu'
import type { Pillar } from '@/qku/types'

const _registry = new Map<string, MQU>()

export function registerMQU(mqu: MQU): void {
  if (_registry.has(mqu.slug)) {
    throw new Error(`[MQU] Slug ya registrado: "${mqu.slug}".`)
  }
  _registry.set(mqu.slug, mqu)
}

export function getMQU(slug: string): MQU | undefined {
  return _registry.get(slug)
}

export function requireMQU(slug: string): MQU {
  const mqu = _registry.get(slug)
  if (!mqu) throw new Error(`[MQU] Slug no encontrado: "${slug}"`)
  return mqu
}

// ── Queries ────────────────────────────────────────────────────────────────────

export function getMQUsByPillar(pillar: Pillar): MQU[] {
  return [..._registry.values()].filter(m => m.pillar === pillar)
}

export function getMQUsByDomain(domain: string): MQU[] {
  return [..._registry.values()].filter(m => m.domain === domain)
}

export function getMQUsByMethod(method: MQUCalculationMethod): MQU[] {
  return [..._registry.values()].filter(m => m.calculationMethod === method)
}

export function getMQUsByFrequency(frequency: MQUUpdateFrequency): MQU[] {
  return [..._registry.values()].filter(m => m.updateFrequency === frequency)
}

/** Métricas explicadas por una QKU concreta. */
export function getMQUsExplainedBy(qkuSlug: string): MQU[] {
  return [..._registry.values()].filter(m => m.explainedBy.includes(qkuSlug))
}

/** Métricas mejoradas por una AQU concreta. */
export function getMQUsImprovedBy(aquSlug: string): MQU[] {
  return [..._registry.values()].filter(m => m.improvedBy.includes(aquSlug))
}

export function getAllMQUSlugs(): string[] {
  return [..._registry.keys()]
}

export function getAllMQUs(): MQU[] {
  return [..._registry.values()]
}

export function size(): number {
  return _registry.size
}
