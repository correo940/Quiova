export const RATE_TYPE_CATALOG = {
  fixed:   'Tipo Fijo',
  variable: 'Tipo Variable',
  mixed:   'Tipo Mixto',
  unknown: 'Tipo desconocido',
} as const;

export type RateTypeKey = keyof typeof RATE_TYPE_CATALOG;

export const CANONICAL_RATE_TYPES = Object.keys(RATE_TYPE_CATALOG) as RateTypeKey[];

// Orden por especificidad: mixto antes de fijo/variable para evitar falsos positivos.
const RULES: [RegExp, RateTypeKey][] = [
  [/mixto|mixta|periodo\s*fijo\s*[\+y]\s*variable/i, 'mixed'],
  [/tipo\s+fijo|\btasa\s+fija\b|inter[eé]s\s+fijo|\bfijo\b/i, 'fixed'],
  [/variable|euribor|irph|libor/i, 'variable'],
];

export function classifyRateType(text: string): RateTypeKey {
  const normalized = text.trim().toLowerCase();
  for (const [pattern, key] of RULES) {
    if (pattern.test(normalized)) return key;
  }
  return 'unknown';
}

export function labelForRateType(key: string): string {
  return RATE_TYPE_CATALOG[key as RateTypeKey] ?? RATE_TYPE_CATALOG.unknown;
}

export function isCanonicalRateType(key: string | undefined | null): key is RateTypeKey {
  return typeof key === 'string' && key in RATE_TYPE_CATALOG;
}
