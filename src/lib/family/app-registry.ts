// src/lib/family/app-registry.ts
// NOTA: 'mi-hogar.confessions' se excluye deliberadamente. Confesiones es un
// sistema anónimo de mensajes 1:1 (no datos de hogar) y queda fuera del
// modelo de permisos familiares (ver Task 19 del plan).
export const FAMILY_APP_REGISTRY = [
  { category: 'Mi Hogar', slug: 'mi-hogar.pharmacy', label: 'Botiquín' },
  { category: 'Mi Hogar', slug: 'mi-hogar.garage', label: 'Garaje' },
  { category: 'Mi Hogar', slug: 'mi-hogar.tasks', label: 'Tareas' },
  { category: 'Mi Hogar', slug: 'mi-hogar.roster', label: 'Turnos' },
  { category: 'Mi Hogar', slug: 'mi-hogar.shopping', label: 'Lista de la compra' },
  { category: 'Mi Hogar', slug: 'mi-hogar.savings', label: 'Ahorros' },
  { category: 'Mi Hogar', slug: 'mi-hogar.insurance', label: 'Seguros' },
  { category: 'Mi Hogar', slug: 'mi-hogar.warranties', label: 'Garantías' },
  { category: 'Mi Hogar', slug: 'mi-hogar.documents', label: 'Documentos' },
  { category: 'Mi Hogar', slug: 'mi-hogar.passwords', label: 'Contraseñas' },
  { category: 'Mi Hogar', slug: 'mi-hogar.manuals', label: 'Manuales' },
  { category: 'Mi Hogar', slug: 'mi-hogar.recipes', label: 'Recetas' },
  { category: 'Mi Hogar', slug: 'mi-hogar.asistente', label: 'Asistente' },
  { category: 'Mi Hogar', slug: 'mi-hogar.expenses', label: 'Gastos' },
  { category: 'Mi Hogar', slug: 'mi-hogar.workspace', label: 'Workspace' },
  { category: 'Mi Hogar', slug: 'mi-hogar.meditation', label: 'Meditación' },
  { category: 'Mi Hogar', slug: 'mi-hogar.tiempo', label: 'Tiempo' },
  { category: 'Otras', slug: 'mi-viaje', label: 'Mi Viaje' },
  { category: 'Otras', slug: 'huerto', label: 'Huerto' },
] as const;

export type FamilyAppSlug = typeof FAMILY_APP_REGISTRY[number]['slug'];
export type PermissionLevel = 'none' | 'view' | 'full';
