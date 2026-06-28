import type { QKU, Pillar } from './types'

/**
 * QKU Registry — fuente única de conocimiento de QUIOBA.
 *
 * Reglas de uso:
 *   - Registrar solo QKUs con status 'validated' o 'contested' en producción.
 *   - Nunca usar Map.set directamente fuera de este módulo.
 *   - El registro es inmutable en runtime; se construye al cargar el módulo.
 */
const _registry = new Map<string, QKU>()

export function registerQKU(qku: QKU): void {
  if (_registry.has(qku.identity.slug)) {
    throw new Error(`[QKU] Slug ya registrado: "${qku.identity.slug}". Slugs deben ser únicos.`)
  }
  _registry.set(qku.identity.slug, qku)
}

export function getQKU(slug: string): QKU | undefined {
  return _registry.get(slug)
}

export function requireQKU(slug: string): QKU {
  const qku = _registry.get(slug)
  if (!qku) throw new Error(`[QKU] Slug no encontrado en el registro: "${slug}"`)
  return qku
}

// ── Queries ────────────────────────────────────────────────────────────────────

export function getByPillar(pillar: Pillar): QKU[] {
  return [..._registry.values()].filter(q => q.classification.pillar === pillar)
}

export function getByDomain(domain: string): QKU[] {
  return [..._registry.values()].filter(q => q.classification.domain === domain)
}

export function getByTag(tag: string): QKU[] {
  return [..._registry.values()].filter(q => q.classification.tags.includes(tag))
}

/** Devuelve solo las QKUs publicables (validated + contested). */
export function getPublishable(): QKU[] {
  return [..._registry.values()].filter(
    q => q.evidence.status === 'validated' || q.evidence.status === 'contested'
  )
}

export function getAllSlugs(): string[] {
  return [..._registry.keys()]
}

export function size(): number {
  return _registry.size
}

// ── Validation (dev only) ──────────────────────────────────────────────────────
/**
 * Verifica las invariantes del contrato QKU para todas las QKUs registradas.
 * Llamar al arrancar la app en desarrollo.
 */
export function validateRegistry(): { slug: string; errors: string[] }[] {
  const report: { slug: string; errors: string[] }[] = []

  for (const qku of _registry.values()) {
    const errors: string[] = []
    const { identity, evidence, formats, relations } = qku

    if (evidence.status === 'deprecated' && !identity.deprecatedBy) {
      errors.push('status=deprecated pero identity.deprecatedBy está vacío')
    }
    if (evidence.status === 'contested' && !evidence.contestedBy) {
      errors.push('status=contested pero evidence.contestedBy está vacío')
    }
    if (formats.infographic.status === 'available' && !formats.infographic.componentKey) {
      errors.push('infographic.status=available pero componentKey está vacío')
    }
    if (formats.experiment.status === 'available' && !formats.experiment.componentKey) {
      errors.push('experiment.status=available pero componentKey está vacío')
    }
    for (const rel of relations) {
      if (!_registry.has(rel.targetSlug)) {
        errors.push(`relation.targetSlug "${rel.targetSlug}" no existe en el registro`)
      }
    }

    if (errors.length) report.push({ slug: identity.slug, errors })
  }

  return report
}
