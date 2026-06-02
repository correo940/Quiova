export type FaseProducto =
    | 'pre-lanzamiento'
    | 'funcional'
    | 'validacion'
    | 'crecimiento';

export type EstadoMonetizacion =
    | 'no-definida'
    | 'explorando'
    | 'primera-conversion'
    | 'activa';

export interface AppActiva {
    id: string;
    nombre: string;
    descripcion: string;
}

export const APPS_QUIOBA: AppActiva[] = [
    { id: 'el-campus',      nombre: 'El Campus',       descripcion: 'Plataforma académica' },
    { id: 'mi-hogar',       nombre: 'Mi Hogar',        descripcion: 'Organización del hogar' },
    { id: 'pausas-activas', nombre: 'Pausas Activas',  descripcion: 'Bienestar físico' },
    { id: 'oficina',        nombre: 'Oficina',         descripcion: 'Dirección estratégica' },
    { id: 'journal',        nombre: 'Diario',          descripcion: 'Reflexión personal' },
    { id: 'farmacia',       nombre: 'Farmacia',        descripcion: 'Gestión de medicamentos' },
];

export const FASE_META: Record<FaseProducto, { label: string; descripcion: string }> = {
    'pre-lanzamiento': {
        label: 'Pre-lanzamiento',
        descripcion: 'El producto existe pero no está listo para usuarios externos.',
    },
    'funcional': {
        label: 'Funcional',
        descripcion: 'El producto funciona. No hay usuarios externos todavía.',
    },
    'validacion': {
        label: 'Validación',
        descripcion: 'Primeros usuarios externos dando feedback real.',
    },
    'crecimiento': {
        label: 'Crecimiento',
        descripcion: 'Tracción validada. Expandiendo base de usuarios.',
    },
};

export const MONETIZACION_META: Record<EstadoMonetizacion, { label: string; descripcion: string }> = {
    'no-definida': {
        label: 'No definida',
        descripcion: 'Sin modelo de negocio activo todavía.',
    },
    'explorando': {
        label: 'Explorando',
        descripcion: 'Estamos probando hipótesis de monetización.',
    },
    'primera-conversion': {
        label: 'Primera conversión',
        descripcion: 'Hemos tenido ingresos reales, aunque mínimos.',
    },
    'activa': {
        label: 'Activa',
        descripcion: 'Monetización funcionando con conversiones regulares.',
    },
};

export interface FundacionQuioba {
    version: 1;
    completada: boolean;
    saltada?: boolean;
    fechaISO: string;

    // Paso 1 — Estado del proyecto
    faseProducto: FaseProducto;
    descripcionEstado: string;

    // Paso 2 — Usuarios
    usuariosReales: number;
    descripcionUsuarios: string;

    // Paso 3 — Monetización
    estadoMonetizacion: EstadoMonetizacion;
    descripcionMonetizacion: string;

    // Paso 4 — Recursos
    horasSemanales: number;

    // Paso 5 — Aplicaciones activas
    appsActivas: string[];

    // Paso 6 — Prioridades del trimestre
    trimestreLabel: string;
    prioridad1: string;
    prioridad2: string;
    prioridad3: string;
}

export const FUNDACION_DEFAULT: Omit<FundacionQuioba, 'fechaISO'> = {
    version: 1,
    completada: false,
    faseProducto: 'funcional',
    descripcionEstado: '',
    usuariosReales: 0,
    descripcionUsuarios: '',
    estadoMonetizacion: 'no-definida',
    descripcionMonetizacion: '',
    horasSemanales: 20,
    appsActivas: ['el-campus', 'mi-hogar', 'pausas-activas', 'oficina'],
    trimestreLabel: 'Q2 2026',
    prioridad1: '',
    prioridad2: '',
    prioridad3: '',
};
