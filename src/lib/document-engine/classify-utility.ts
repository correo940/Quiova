export const UTILITY_TYPE_CATALOG = {
  electricity: 'Electricidad',
  water:       'Agua',
  gas:         'Gas',
  internet:    'Internet',
  mobile:      'Telefonía Móvil',
  other:       'Otro Suministro',
} as const;

export type UtilityTypeKey = keyof typeof UTILITY_TYPE_CATALOG;

export const CANONICAL_UTILITY_TYPES = Object.keys(UTILITY_TYPE_CATALOG) as UtilityTypeKey[];

// Orden por especificidad: mobile antes de internet (facturas móvil mencionan "internet")
const RULES: [RegExp, UtilityTypeKey][] = [
  [/m[oó]vil|tarifa\s+m[oó]vil|\bgb\b|\bsim\b|telefon[ií]a\s+m[oó]vil/i, 'mobile'],
  [/internet|fibra|adsl|\bwifi\b|broadband|banda\s+ancha/i,               'internet'],
  [/\bgas\b|gas\s+natural|butano|propano/i,                                'gas'],
  [/\bagua\b|suministro\s+de\s+agua|depuradora|canal\s+de\s+isabel/i,     'water'],
  [/\bluz\b|electricidad|el[eé]ctric|kwh|endesa|iberdrola|naturgy/i,      'electricity'],
];

export function classifyUtilityType(text: string): UtilityTypeKey {
  const normalized = text.trim().toLowerCase();
  for (const [pattern, key] of RULES) {
    if (pattern.test(normalized)) return key;
  }
  return 'other';
}

export function labelForUtilityType(key: string): string {
  return UTILITY_TYPE_CATALOG[key as UtilityTypeKey] ?? UTILITY_TYPE_CATALOG.other;
}

export function isCanonicalUtilityType(key: string | undefined | null): key is UtilityTypeKey {
  return typeof key === 'string' && key in UTILITY_TYPE_CATALOG;
}
