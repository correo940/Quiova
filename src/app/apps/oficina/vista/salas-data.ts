// ─── Datos editables de La Oficina ───────────────────────────────────────────
// Cambia nombres, colores, agentes y estados aquí sin tocar el resto.

export type EstadoAgente = 'trabajando' | 'libre';
export type TipoAgente = 'coordinacion' | 'manager' | 'especialista';

export interface Agente {
    nombre: string;
    estado: EstadoAgente;
    tipo: TipoAgente;
    rol: string; // descripción corta inyectada en el prompt del agente
}

export interface Sala {
    id: string; // slug estable, usado como carpeta: oficina-output/<id>/
    nombre: string;
    color: string; // color de suelo suave, hex
    agentes: Agente[];
}

export const SALAS: Sala[] = [
    {
        id: 'recepcion', nombre: 'Recepción', color: '#e8f6fa', agentes: [
            { nombre: 'Coordinación', estado: 'libre', tipo: 'coordinacion', rol: 'recibes encargos y los ejecutas o resumes con claridad' },
        ],
    },
    {
        id: 'desarrollo', nombre: 'Desarrollo', color: '#eef2f9', agentes: [
            { nombre: 'Bruno', estado: 'libre', tipo: 'manager', rol: 'desarrollador: escribes código y scripts limpios y directos' },
            { nombre: 'Max', estado: 'libre', tipo: 'especialista', rol: 'desarrollador de apoyo: implementas y pruebas piezas concretas' },
        ],
    },
    {
        id: 'contenido', nombre: 'Contenido', color: '#f0f7ee', agentes: [
            { nombre: 'Dana', estado: 'libre', tipo: 'manager', rol: 'redactora: escribes guiones, emails y copy con buen tono' },
        ],
    },
    {
        id: 'datos', nombre: 'Datos', color: '#fdf4ec', agentes: [
            { nombre: 'Rita', estado: 'libre', tipo: 'especialista', rol: 'analista de datos: si falta un dato lo dices, no lo inventas' },
        ],
    },
    {
        id: 'automatizacion', nombre: 'Automatización', color: '#e9f4f1', agentes: [
            { nombre: 'Sara', estado: 'libre', tipo: 'especialista', rol: 'automatizaciones: montas procesos y scripts que se ejecutan solos' },
        ],
    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normaliza un nombre a slug estable (minúsculas, sin acentos, guiones). */
export function slugSala(nombre: string): string {
    return nombre
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function getSala(salaId: string): Sala | undefined {
    return SALAS.find(s => s.id === salaId);
}

export function agenteEnSala(salaId: string, nombreAgente: string): Agente | undefined {
    return getSala(salaId)?.agentes.find(a => a.nombre === nombreAgente);
}

/** Prompt de rol puro (sin efectos) — reutilizado por la API y testeable. */
export function construirPrompt(sala: Sala, agente: Agente, encargo: string): string {
    return [
        `Eres ${agente.nombre}, ${agente.rol} en el departamento de ${sala.nombre}.`,
        `Trabajas para Quioba. Produce el entregable pedido, no una conversación.`,
        `Si generas archivos, créalos en el directorio actual.`,
        ``,
        `Encargo: ${encargo}`,
    ].join('\n');
}
