import { CONTEXTO_EMPRESA } from './contexto-empresa';

export type Tendencia = 'subiendo' | 'bajando' | 'estable';
export type NivelImpacto = 'alto' | 'medio' | 'bajo';
export type CategoriaTarea = 'producto' | 'contenido' | 'negocio' | 'operativo';

export interface ObjetivoConProgreso {
    etiqueta?: string;
    texto: string;
    progreso: number;
    tendencia: Tendencia;
    nota: string;
}

export interface ItemSemanal {
    texto: string;
    hecho: boolean;
}

export interface ObjetivoSemanal {
    etiqueta: string;
    texto: string;
    pendientes: ItemSemanal[];
}

export interface Bloqueador {
    id: number;
    titulo: string;
    descripcion: string;
    impacto: NivelImpacto;
}

export interface ProximaRevision {
    fecha: string;
    hora: string;
    agenda: string[];
}

export interface TareaSemana {
    id: number;
    texto: string;
    categoria: CategoriaTarea;
    hecho: boolean;
}

export interface PlanSemana {
    etiqueta: string;
    horasDisponibles: number;
    prioridad1: string;
    prioridad2: string;
    prioridad3: string;
    tareas: TareaSemana[];
}

// ── Datos ────────────────────────────────────────────────────────────────────

export const OBJETIVO_ANUAL: ObjetivoConProgreso = CONTEXTO_EMPRESA.objetivoAnual;

export const OBJETIVO_TRIMESTRAL: ObjetivoConProgreso = CONTEXTO_EMPRESA.objetivoTrimestral;

export const OBJETIVO_MENSUAL: ObjetivoConProgreso = {
    etiqueta: 'Junio 2026',
    texto: 'Aumentar el contenido disponible en la plataforma, mejorar la experiencia de producto y preparar la primera propuesta de monetización.',
    progreso: 15,
    tendencia: 'estable',
    nota: 'Prioridad: El Campus como primera app con contenido propio publicado.',
};

export const OBJETIVO_SEMANAL: ObjetivoSemanal = {
    etiqueta: 'Semana 23 · 26 mayo – 1 jun',
    texto: 'Avanzar en la sección Oficina, revisar el estado de El Campus y definir la estrategia de primeros usuarios.',
    pendientes: [
        { texto: 'Completar estructura de Oficina v0.1', hecho: true },
        { texto: 'Definir propuesta de valor de El Campus en una frase', hecho: false },
        { texto: 'Identificar 5 usuarios potenciales para validación', hecho: false },
        { texto: 'Revisar flujo de onboarding desde cero como nuevo usuario', hecho: false },
    ],
};

export const BLOQUEADORES: Bloqueador[] = [
    {
        id: 1,
        titulo: CONTEXTO_EMPRESA.principalBloqueador.titulo,
        descripcion: CONTEXTO_EMPRESA.principalBloqueador.descripcion,
        impacto: CONTEXTO_EMPRESA.principalBloqueador.impacto,
    },
    {
        id: 2,
        titulo: 'Propuesta de valor no validada',
        descripcion: 'No hay evidencia externa de que el producto resuelva un problema real para terceros.',
        impacto: 'alto',
    },
    {
        id: 3,
        titulo: 'Sin estrategia de contenidos activa',
        descripcion: 'El Campus y otras apps necesitan contenido propio para atraer y retener usuarios. Aún sin plan editorial.',
        impacto: 'medio',
    },
    {
        id: 4,
        titulo: 'Monetización sin definir',
        descripcion: 'El modelo de negocio existe a nivel técnico (marketplace) pero no hay estrategia de conversión ni pricing validado.',
        impacto: 'medio',
    },
];

export const PROXIMA_REVISION: ProximaRevision = CONTEXTO_EMPRESA.proximaRevision;

export const PLAN_SEMANA: PlanSemana = {
    etiqueta: 'Semana 23 · 26 mayo – 1 jun 2026',
    horasDisponibles: 20,
    prioridad1: 'Avanzar en Oficina hasta tener un panel de dirección funcional y coherente.',
    prioridad2: 'Definir la propuesta de valor de El Campus y redactar su página de inicio.',
    prioridad3: 'Identificar 3 usuarios potenciales y preparar un primer mensaje de presentación.',
    tareas: [
        { id: 1, texto: 'Completar sección "Plan de la Semana" en Director General', categoria: 'producto', hecho: false },
        { id: 2, texto: 'Revisar flujo de onboarding de Quioba como nuevo usuario', categoria: 'producto', hecho: false },
        { id: 3, texto: 'Redactar propuesta de valor de El Campus (1 frase + 3 bullets)', categoria: 'contenido', hecho: false },
        { id: 4, texto: 'Publicar al menos 1 pieza de contenido sobre Quioba', categoria: 'contenido', hecho: false },
        { id: 5, texto: 'Listar 3 perfiles de usuario ideal y sus problemas', categoria: 'negocio', hecho: false },
        { id: 6, texto: 'Revisar estructura de precios del marketplace', categoria: 'negocio', hecho: false },
        { id: 7, texto: 'Actualizar roadmap Q3 con las prioridades actuales', categoria: 'operativo', hecho: false },
        { id: 8, texto: 'Revisión semanal: qué avanzó, qué se bloqueó', categoria: 'operativo', hecho: false },
    ],
};
