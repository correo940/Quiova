// Catálogo canónico de tipos de seguro para QUIOBA.
// Fuente de verdad para clasificación: MDU, alta manual e importaciones futuras.

export const INSURANCE_TYPE_CATALOG = {
  home:      'Seguro de Hogar',
  vehicle:   'Seguro de Vehículo',
  health:    'Seguro de Salud',
  life:      'Seguro de Vida',
  pet:       'Seguro de Mascotas',
  travel:    'Seguro de Viaje',
  community: 'Seguro de Comunidad',
  liability: 'Seguro de Responsabilidad Civil',
  other:     'Otro Seguro',
} as const;

export type InsuranceTypeKey = keyof typeof INSURANCE_TYPE_CATALOG;

export const CANONICAL_INSURANCE_TYPES = Object.keys(INSURANCE_TYPE_CATALOG) as InsuranceTypeKey[];

// Reglas en orden de especificidad descendente.
// Se evalúan sobre (insurance_type + name) concatenados para máxima señal.
const RULES: [RegExp, InsuranceTypeKey][] = [
  [/responsabilidad\s*civil|liability/i,             'liability'],
  [/comunidad|community|vecino/i,                    'community'],
  [/mascota|pet\b|animal/i,                          'pet'],
  [/viaje|travel|vacacion/i,                         'travel'],
  [/salud|m[eé]dic|health|cl[ií]nica|hospital/i,    'health'],
  [/hogar|casa\b|vivienda|home/i,                    'home'],
  [/coche|auto[^r]|veh[ií]culo|moto\b|car\b|vehicle/i, 'vehicle'],
  [/\bvida\b|life\s+insur/i,                         'life'],
];

/**
 * Clasifica texto libre en una clave canónica de tipo de seguro.
 * Acepta cualquier combinación de nombre + tipo del documento.
 */
export function classifyInsuranceType(text: string): InsuranceTypeKey {
  const normalized = text.trim().toLowerCase();
  for (const [pattern, key] of RULES) {
    if (pattern.test(normalized)) return key;
  }
  return 'other';
}

/** Devuelve la etiqueta legible para una clave canónica. */
export function labelForInsuranceType(key: string): string {
  return INSURANCE_TYPE_CATALOG[key as InsuranceTypeKey] ?? INSURANCE_TYPE_CATALOG.other;
}

/** Devuelve true si la clave ya es canónica (no necesita reclasificación). */
export function isCanonicalInsuranceType(key: string): key is InsuranceTypeKey {
  return key in INSURANCE_TYPE_CATALOG;
}
