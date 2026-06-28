import type { AQU, AQUDifficulty, AQUFrequency } from '../types/aqu'
import type { Pillar } from '@/qku/types'

const _registry = new Map<string, AQU>()

export function registerAQU(aqu: AQU): void {
  if (_registry.has(aqu.slug)) {
    throw new Error(`[AQU] Slug ya registrado: "${aqu.slug}".`)
  }
  if (aqu.groundedIn.length === 0) {
    throw new Error(`[AQU] "${aqu.slug}" debe referenciar al menos una QKU en groundedIn.`)
  }
  if (aqu.affectsMetrics.length === 0) {
    throw new Error(`[AQU] "${aqu.slug}" debe referenciar al menos una MQU en affectsMetrics.`)
  }
  _registry.set(aqu.slug, aqu)
}

export function getAQU(slug: string): AQU | undefined {
  return _registry.get(slug)
}

export function requireAQU(slug: string): AQU {
  const aqu = _registry.get(slug)
  if (!aqu) throw new Error(`[AQU] Slug no encontrado: "${slug}"`)
  return aqu
}

// ── Queries ────────────────────────────────────────────────────────────────────

export function getAQUsByPillar(pillar: Pillar): AQU[] {
  return [..._registry.values()].filter(a => a.pillar === pillar)
}

export function getAQUsByDomain(domain: string): AQU[] {
  return [..._registry.values()].filter(a => a.domain === domain)
}

export function getAQUsByDifficulty(max: AQUDifficulty): AQU[] {
  return [..._registry.values()].filter(a => a.difficulty <= max)
}

export function getAQUsByFrequency(frequency: AQUFrequency): AQU[] {
  return [..._registry.values()].filter(a => a.frequency === frequency)
}

export function getAQUsByMaxMinutes(minutes: number): AQU[] {
  return [..._registry.values()].filter(a => a.duration.minutes <= minutes)
}

/** AQUs fundamentadas en una QKU concreta. */
export function getAQUsGroundedIn(qkuSlug: string): AQU[] {
  return [..._registry.values()].filter(a => a.groundedIn.includes(qkuSlug))
}

/** AQUs que afectan a una MQU concreta. */
export function getAQUsAffecting(mquSlug: string): AQU[] {
  return [..._registry.values()].filter(a => a.affectsMetrics.includes(mquSlug))
}

export function getAllAQUSlugs(): string[] {
  return [..._registry.keys()]
}

export function getAllAQUs(): AQU[] {
  return [..._registry.values()]
}

export function size(): number {
  return _registry.size
}
