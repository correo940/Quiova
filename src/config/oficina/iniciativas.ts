export type EstadoIniciativa = 'activa' | 'pausa' | 'pendiente' | 'completada';
export type PrioridadIniciativa = 'alta' | 'media' | 'baja';

export interface Iniciativa {
    id: number;
    nombre: string;
    descripcion: string;
    estado: EstadoIniciativa;
    prioridad: PrioridadIniciativa;
    progreso: number;
}

export const INICIATIVAS: Iniciativa[] = [
    {
        id: 1,
        nombre: 'Oficina Quioba',
        descripcion: 'Panel de dirección estratégica para gestionar objetivos, iniciativas y el estado del negocio.',
        estado: 'activa',
        prioridad: 'alta',
        progreso: 20,
    },
    {
        id: 2,
        nombre: 'El Campus',
        descripcion: 'Plataforma académica para alumnos, familias y profesores. Primera app con propuesta de valor clara hacia usuarios externos.',
        estado: 'activa',
        prioridad: 'alta',
        progreso: 35,
    },
    {
        id: 3,
        nombre: 'Captación de usuarios',
        descripcion: 'Estrategia para conseguir los primeros usuarios activos fuera del equipo fundador y validar el producto.',
        estado: 'pendiente',
        prioridad: 'alta',
        progreso: 5,
    },
    {
        id: 4,
        nombre: 'Contenido',
        descripcion: 'Plan editorial para generar contenido propio que atraiga y retenga usuarios en Quioba y El Campus.',
        estado: 'pendiente',
        prioridad: 'media',
        progreso: 0,
    },
    {
        id: 5,
        nombre: 'Monetización',
        descripcion: 'Definir y activar el modelo de negocio: pricing, marketplace de apps y primera conversión real.',
        estado: 'pausa',
        prioridad: 'media',
        progreso: 10,
    },
];
