/**
 * QKU Adapters — puentes entre el contrato QKU y los módulos consumidores.
 *
 * Regla: ningún módulo accede al interior de una QKU directamente.
 * Siempre usan el adapter que corresponde a su contexto.
 */

import type { QKU, QKUFormats } from './types'
import type { Block } from '../guias/engine/types'

// ── AI Adapter ─────────────────────────────────────────────────────────────────
/**
 * Convierte una QKU en una línea compacta para inyectar en system prompts de IA.
 *
 * Formato:
 *   QKU[slug|status|NivelX]: aiSummary → tipo:target, tipo:target
 *
 * Ejemplo:
 *   QKU[melatonina-pico-nocturno|validated|NivelII]: La melatonina pica 2-4am,
 *   suprimida por luz azul. → extends:ciclo-sueno-rem, related:cronotipo
 *
 * La IA usa esto para:
 *   1. Responder preguntas con conocimiento validado
 *   2. Saber qué otras QKUs son relevantes al contexto
 *   3. Detectar cuándo la pregunta toca una QKU 'contested' y añadir caveats
 */
export function toAIContext(qku: QKU): string {
  const { identity, kernel, evidence, relations } = qku
  const relStr = relations.length
    ? ' → ' + relations.map(r => `${r.type}:${r.targetSlug}`).join(', ')
    : ''
  return `QKU[${identity.slug}|${evidence.status}|Nivel${evidence.overallLevel}]: ${kernel.aiSummary}${relStr}`
}

/**
 * Agrupa múltiples QKUs en un bloque de texto para el system prompt.
 * Filtra automáticamente las no publicables (draft / review / deprecated).
 *
 * Uso típico:
 *   const context = toAIBatch(getPublishable())
 *   systemPrompt += `\n## Conocimiento validado QUIOBA\n${context}`
 */
export function toAIBatch(qkus: QKU[]): string {
  return qkus
    .filter(q => q.evidence.status === 'validated' || q.evidence.status === 'contested')
    .map(toAIContext)
    .join('\n')
}

/**
 * Devuelve el glosario combinado de un conjunto de QKUs como objeto plano.
 * Útil para que la IA resuelva definiciones sin inventarlas.
 */
export function toAIGlossary(qkus: QKU[]): Record<string, string> {
  return qkus.reduce<Record<string, string>>((acc, qku) => {
    return { ...acc, ...qku.kernel.glossary }
  }, {})
}

// ── Guías Vivas Adapter ────────────────────────────────────────────────────────
/**
 * Formatos que se pueden renderizar como bloques en Guías Vivas.
 * Audio y Video no tienen bloque equivalente en la UI actual.
 */
export type RenderableFormat = 'text' | 'infographic' | 'experiment' | 'quiz'

/**
 * Convierte el slot de un formato QKU en un Block para el motor de Guías.
 * Devuelve null si el slot no está disponible o le falta información.
 *
 * El block resultante lleva qkuSlug para que la UI pueda mostrar
 * insignias de evidencia, "más información" y links a fuentes.
 */
export function qkuToBlock(
  qku: QKU,
  format: RenderableFormat,
  opts: { requiresAuth?: boolean } = {}
): Block | null {
  const { identity, formats } = qku

  if (formats[format].status !== 'available') return null

  const baseId = `${identity.slug}-${format}`
  const qkuSlug = identity.slug

  switch (format) {
    case 'text': {
      const s = formats.text
      if (!s.content) return null
      return {
        id: baseId,
        type: 'narrative',
        data: { paragraphs: s.content.split('\n\n').filter(Boolean) },
        requiresAuth: opts.requiresAuth,
        qkuSlug,
      }
    }

    case 'infographic': {
      const s = formats.infographic
      if (!s.componentKey) return null
      return {
        id: baseId,
        type: 'custom',
        data: { component: s.componentKey, props: { qku } },
        requiresAuth: opts.requiresAuth,
        qkuSlug,
      }
    }

    case 'experiment': {
      const s = formats.experiment
      if (!s.componentKey) return null
      return {
        id: baseId,
        type: 'custom',
        data: { component: s.componentKey, props: { qku } },
        requiresAuth: opts.requiresAuth ?? s.requiresAuth,
        qkuSlug,
      }
    }

    case 'quiz': {
      const s = formats.quiz
      if (!s.questions?.length) return null
      return {
        id: baseId,
        type: 'custom',
        data: {
          component: 'QuizBlock',
          props: { questions: s.questions, qkuSlug },
        },
        requiresAuth: opts.requiresAuth ?? s.requiresAuth,
        qkuSlug,
      }
    }

    default:
      return null
  }
}

/**
 * Convierte múltiples formatos de una QKU en una secuencia de bloques.
 * Omite los formatos no disponibles silenciosamente.
 */
export function qkuToBlocks(
  qku: QKU,
  formats: RenderableFormat[],
  opts: { requiresAuth?: boolean } = {}
): Block[] {
  return formats
    .map(f => qkuToBlock(qku, f, opts))
    .filter((b): b is Block => b !== null)
}

// ── Audio/TTS Adapter ──────────────────────────────────────────────────────────
/**
 * Devuelve el script TTS para una QKU.
 * Usa audio.script si existe; cae a kernel.explanation si no.
 */
export function toAudioScript(qku: QKU): string {
  return qku.formats.audio.script ?? qku.kernel.explanation
}
