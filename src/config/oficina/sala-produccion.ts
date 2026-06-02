export type FasePieza = 'idea' | 'guion' | 'grabado' | 'publicado';
export type CategoriaProduccion = 'quioba' | 'cuerpo' | 'mente' | 'finanzas';
export type FormatoProduccion = 'corto' | 'largo' | 'tutorial' | 'historia' | 'opinion';
export type ObjetivoProduccion = 'alcance' | 'captacion' | 'marca' | 'conversion';

export interface PiezaContenido {
    id: number;
    titulo: string;
    categoria: CategoriaProduccion;
    formato: FormatoProduccion;
    objetivo: ObjetivoProduccion;
    fase: FasePieza;
    fecha: string;
    nota?: string;
    vistas?: string;
}

export const PIEZAS: PiezaContenido[] = [

    // ── Ideas ─────────────────────────────────────────────────────────────────

    {
        id: 1,
        titulo: 'Qué hace diferente a Quioba de otras apps de productividad',
        categoria: 'quioba',
        formato: 'opinion',
        objetivo: 'alcance',
        fase: 'idea',
        fecha: '30 may 2026',
    },
    {
        id: 2,
        titulo: '5 señales de que necesitas organizar tu mente, no tu agenda',
        categoria: 'mente',
        formato: 'corto',
        objetivo: 'alcance',
        fase: 'idea',
        fecha: '29 may 2026',
    },
    {
        id: 3,
        titulo: 'Cómo ahorrar 200€ al mes con una sola regla',
        categoria: 'finanzas',
        formato: 'corto',
        objetivo: 'alcance',
        fase: 'idea',
        fecha: '28 may 2026',
    },
    {
        id: 4,
        titulo: 'Estiramientos de 5 minutos para el cierre del día de trabajo',
        categoria: 'cuerpo',
        formato: 'tutorial',
        objetivo: 'alcance',
        fase: 'idea',
        fecha: '28 may 2026',
    },

    // ── Guiones ───────────────────────────────────────────────────────────────

    {
        id: 5,
        titulo: 'Por qué dejé Notion para organizar mi vida personal',
        categoria: 'quioba',
        formato: 'opinion',
        objetivo: 'alcance',
        fase: 'guion',
        fecha: '27 may 2026',
        nota: 'Buscar datos de uso de Notion en España para el arranque.',
    },
    {
        id: 6,
        titulo: 'El método de las 3 respiraciones para cortar la espiral de ansiedad',
        categoria: 'mente',
        formato: 'corto',
        objetivo: 'alcance',
        fase: 'guion',
        fecha: '25 may 2026',
    },
    {
        id: 7,
        titulo: 'Cómo organizo el presupuesto familiar con 3 cuentas',
        categoria: 'finanzas',
        formato: 'tutorial',
        objetivo: 'captacion',
        fase: 'guion',
        fecha: '24 may 2026',
        nota: 'Incluir capturas de pantalla de la app en el vídeo.',
    },

    // ── Grabados ──────────────────────────────────────────────────────────────

    {
        id: 8,
        titulo: 'Pausas activas que puedes hacer sin levantarte de la silla',
        categoria: 'cuerpo',
        formato: 'tutorial',
        objetivo: 'alcance',
        fase: 'grabado',
        fecha: '22 may 2026',
        nota: 'Pendiente de edición y subtítulos.',
    },
    {
        id: 9,
        titulo: 'Así organizo mi semana antes de empezar el lunes',
        categoria: 'quioba',
        formato: 'historia',
        objetivo: 'marca',
        fase: 'grabado',
        fecha: '20 may 2026',
        nota: 'En edición. Subtítulos y música pendientes.',
    },

    // ── Publicados ────────────────────────────────────────────────────────────

    {
        id: 10,
        titulo: 'La app que uso para no quedarme sin dinero antes de fin de mes',
        categoria: 'finanzas',
        formato: 'corto',
        objetivo: 'conversion',
        fase: 'publicado',
        fecha: '15 may 2026',
        vistas: '1.2K',
    },
    {
        id: 11,
        titulo: 'Cómo meditar cuando tienes ADHD',
        categoria: 'mente',
        formato: 'tutorial',
        objetivo: 'alcance',
        fase: 'publicado',
        fecha: '10 may 2026',
        vistas: '3.4K',
    },
    {
        id: 12,
        titulo: 'Quioba: tu espacio personal para organizarlo todo',
        categoria: 'quioba',
        formato: 'corto',
        objetivo: 'marca',
        fase: 'publicado',
        fecha: '5 may 2026',
        vistas: '5.1K',
    },
];
