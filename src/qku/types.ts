/**
 * QKU v1 — QUIOBA Knowledge Unit
 *
 * Contrato definitivo para toda unidad de conocimiento de QUIOBA.
 * Una QKU es la fuente única de verdad que consumen:
 *   - La IA (chat, asistente, voz)
 *   - Las Guías Vivas (motor de bloques)
 *   - Los Artículos
 *   - Cualquier módulo futuro
 *
 * Nunca dupliques conocimiento fuera de este esquema.
 * Si un módulo necesita un dato científico, lo lee de aquí.
 */

// ── Pillar ─────────────────────────────────────────────────────────────────────
// Re-exportado para que los consumidores importen desde un único lugar.
export type Pillar = 'cuerpo' | 'mente' | 'finanzas'

// ── Evidence level ─────────────────────────────────────────────────────────────
/**
 * Jerarquía estándar de evidencia científica (adaptada de Oxford CEBM):
 *
 * I   → Meta-análisis y revisiones sistemáticas de RCTs
 * II  → RCTs individuales bien diseñados (≥ doble ciego)
 * III → Estudios de cohorte prospectivos o caso-control
 * IV  → Consenso experto / guías clínicas institucionales
 * V   → Opinión experta / razonamiento mecanístico / modelos animales
 */
export type EvidenceLevel = 'I' | 'II' | 'III' | 'IV' | 'V'

// ── Validation status ──────────────────────────────────────────────────────────
/**
 * Estado del ciclo de vida de la QKU dentro de QUIOBA:
 *
 * draft      → En investigación. No mostrar en producción.
 * review     → Enviada a revisión científica interna. Bloquear UI de producción.
 * validated  → Aprobada. Puede mostrarse en producción.
 * deprecated → Obsoleta. Reemplazada por otra QKU (ver identity.deprecatedBy).
 * contested  → Debate científico activo. Mostrar con caveats obligatorios.
 */
export type ValidationStatus =
  | 'draft'
  | 'review'
  | 'validated'
  | 'deprecated'
  | 'contested'

// ── Source ─────────────────────────────────────────────────────────────────────
export interface QKUSource {
  title: string
  authors?: string[]
  year?: number
  /** DOI canónico. Preferir sobre URL cuando existe. */
  doi?: string
  url?: string
  /** Nivel de evidencia de ESTA fuente específica (puede diferir del overall). */
  evidenceLevel: EvidenceLevel
}

// ── Evidence block ─────────────────────────────────────────────────────────────
export interface QKUEvidence {
  /** Nivel consolidado de la QKU, considerando el conjunto de fuentes. */
  overallLevel: EvidenceLevel
  status: ValidationStatus
  sources: QKUSource[]
  /**
   * Limitaciones, poblaciones estudiadas, o contexto necesario para
   * interpretar correctamente la evidencia.
   * La IA DEBE incluir esto si está presente y el usuario pregunta en detalle.
   */
  caveats?: string
  /** DOI o nota sobre evidencia contradictoria activa (obligatorio si status === 'contested'). */
  contestedBy?: string
}

// ── Identity ───────────────────────────────────────────────────────────────────
export interface QKUIdentity {
  /**
   * UUID v4 inmutable. Nunca cambia aunque el slug cambie.
   * Permite referencias estables entre sistemas.
   */
  id: string

  /**
   * Identificador legible. URL-safe, kebab-case, único en el registro.
   * Ejemplo: 'melatonina-pico-nocturno', 'efecto-compuesto-interes'
   */
  slug: string

  /**
   * Semver: MAJOR.MINOR.PATCH
   * PATCH → corrección tipográfica o de fuente sin cambio de claim
   * MINOR → ampliación del kernel (nuevo glossary, nueva fuente) sin cambio de claim
   * MAJOR → cambio en el claim (rompe cualquier caché que lo cite textualmente)
   */
  version: string

  createdAt: string    // ISO 8601
  updatedAt: string    // ISO 8601
  /** Fecha de la última revisión científica formal. */
  reviewedAt?: string  // ISO 8601

  /** Slug de la QKU que la reemplaza (obligatorio si status === 'deprecated'). */
  deprecatedBy?: string
}

// ── Classification ─────────────────────────────────────────────────────────────
/**
 * Nivel de complejidad para filtrado y secuenciación:
 * 1 → Concepto básico (sin prerrequisitos)
 * 2 → Intermedio (requiere otras QKUs como contexto)
 * 3 → Avanzado (mecanismos detallados, datos técnicos)
 */
export type QKUComplexity = 1 | 2 | 3

export interface QKUClassification {
  pillar: Pillar
  /**
   * Sub-dominio dentro del pilar.
   * Ejemplos: 'sueno', 'nutricion', 'concentracion', 'inversion', 'habitos'
   * Kebab-case, lowercase.
   */
  domain: string
  /** Tags libres para búsqueda semántica y filtrado de UI. */
  tags: string[]
  complexity: QKUComplexity
}

// ── Knowledge Kernel ───────────────────────────────────────────────────────────
/**
 * El núcleo de conocimiento.
 * Independiente del formato, del idioma de presentación y de la UI.
 * Todo lo que está aquí es la "verdad" que todos los formatos deben representar
 * fielmente sin añadir ni quitar.
 */
export interface QKUKernel {
  /**
   * El ÚNICO claim falsificable que esta QKU representa.
   * Reglas:
   *   - Una sola oración declarativa
   *   - Presente activo ("La melatonina…", "El interés compuesto…")
   *   - Sin jerga innecesaria
   *   - Sin hedges ("podría", "parece que") salvo que la evidencia lo exija
   *
   * Ejemplo: "La melatonina se libera al oscurecer y alcanza su pico entre las 2 y las 4 am."
   */
  claim: string

  /**
   * Expansión del claim en 1-3 oraciones.
   * Contextualiza sin ser exhaustiva. Base para audio TTS si audio.script no existe.
   * Disponible en tooltips, previews de búsqueda y cards de relación.
   */
  explanation: string

  /**
   * Versión ultra-compacta (≤ 120 caracteres) para inyección en prompts de IA.
   * La IA construye sus respuestas sobre esto cuando el usuario pregunta sobre este tema.
   * No incluye metadatos (el adapter los añade automáticamente).
   */
  aiSummary: string

  /**
   * Términos clave con sus definiciones en español claro.
   * Usados por:
   *   - La IA, para responder preguntas de vocabulario con precisión
   *   - La UI, para glosario en hover/tooltip
   *   - Los quizzes, para preguntas de definición
   */
  glossary: Record<string, string>
}

// ── Relations ──────────────────────────────────────────────────────────────────
export type QKURelationType =
  | 'requires'     // esta QKU presupone comprensión de la target
  | 'extends'      // esta QKU profundiza un aspecto de la target
  | 'related'      // conexión conceptual sin dependencia directa
  | 'supports'     // esta QKU aporta evidencia adicional a la target
  | 'contradicts'  // esta QKU contradice o matiza la target

export interface QKURelation {
  /** Slug de la QKU relacionada. Debe existir en el registro. */
  targetSlug: string
  type: QKURelationType
  /** Explica por qué existe la relación. Usada por la IA y el grafo de conocimiento. */
  note?: string
}

// ── Format Slots ───────────────────────────────────────────────────────────────
/**
 * Estado de cada slot de formato:
 * pending     → planificado pero aún no producido
 * available   → producido y listo para usar
 * unavailable → descartado para esta QKU (por diseño, no por falta de tiempo)
 */
export type SlotStatus = 'pending' | 'available' | 'unavailable'

/** Prosa editorial en Markdown. El formato más completo; puede ampliar el kernel. */
export interface TextSlot {
  status: SlotStatus
  content?: string          // Markdown
  readingMinutes?: number
}

/** Componente visual interactivo (SVG animado, diagrama, timeline). */
export interface InfographicSlot {
  status: SlotStatus
  /** Clave en GuiaBundle.components. El componente recibe { data: { qku } }. */
  componentKey?: string
  /** Descripción accesible obligatoria cuando status === 'available'. */
  accessibilityDescription?: string
}

/** Representación auditiva. Script derivado de kernel.explanation si no se provee. */
export interface AudioSlot {
  status: SlotStatus
  script?: string           // TTS-optimized, puede diferir de la prosa editorial
  assetUrl?: string
  durationSeconds?: number
  voiceId?: string          // ID del servicio TTS (ElevenLabs, Google, etc.)
}

/** Vídeo explicativo o animación. */
export interface VideoSlot {
  status: SlotStatus
  script?: string           // Narración / guión
  assetUrl?: string
  durationSeconds?: number
  captions?: string         // SRT o WebVTT
}

/**
 * Herramienta interactiva que permite al usuario EXPERIMENTAR el concepto,
 * no solo leerlo o escucharlo.
 * Ejemplos: simulador circadiano, calculadora de interés compuesto, test de reacción.
 */
export interface ExperimentSlot {
  status: SlotStatus
  componentKey?: string
  /** Qué hipótesis o fenómeno demuestra el experimento. */
  description?: string
  requiresAuth?: boolean
}

export interface QuizQuestion {
  id: string
  stem: string
  options: readonly string[]
  correctIndex: number
  /**
   * Por qué esa respuesta es correcta.
   * Debe referenciar el claim o la evidencia de la QKU.
   */
  explanation: string
}

/** Preguntas de auto-evaluación sobre el conocimiento de la QKU. */
export interface QuizSlot {
  status: SlotStatus
  questions?: QuizQuestion[]
  requiresAuth?: boolean
}

export interface QKUFormats {
  text:        TextSlot
  infographic: InfographicSlot
  audio:       AudioSlot
  video:       VideoSlot
  experiment:  ExperimentSlot
  quiz:        QuizSlot
}

// ── Usage index ────────────────────────────────────────────────────────────────
/**
 * Índice de qué partes de la app consumen esta QKU.
 * Se actualiza al construir guías y artículos; nunca manualmente.
 */
export interface QKUUsage {
  /** Slugs de Guías Vivas que referencian esta QKU en al menos un bloque. */
  guides: string[]
  /** Slugs de artículos que citan esta QKU. */
  articles: string[]
}

// ── QKU ───────────────────────────────────────────────────────────────────────
/**
 * La unidad de conocimiento completa.
 *
 * Invariantes que deben cumplirse:
 *   1. identity.slug es único en el registro
 *   2. Si evidence.status === 'deprecated', identity.deprecatedBy no puede estar vacío
 *   3. Si evidence.status === 'contested', evidence.contestedBy no puede estar vacío
 *   4. Si infographic.status || experiment.status === 'available', componentKey es obligatorio
 *   5. Todos los targetSlug en relations deben existir en el registro
 */
export interface QKU {
  identity:       QKUIdentity
  classification: QKUClassification
  kernel:         QKUKernel
  evidence:       QKUEvidence
  relations:      QKURelation[]
  formats:        QKUFormats
  usage:          QKUUsage
}

// ── Schema version ─────────────────────────────────────────────────────────────
/** Versión del esquema QKU. Incrementar al hacer cambios que rompan compatibilidad. */
export const QKU_SCHEMA_VERSION = '1' as const
