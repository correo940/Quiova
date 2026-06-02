import { CONTEXTO_EMPRESA } from './contexto-empresa';

export type NivelAlerta = 'critico' | 'alto' | 'medio';

export interface Decision {
    id: number;
    texto: string;
    fecha: string;
    autor: string;
}

export interface SalaGuerra {
    objetivoPrincipal: {
        texto: string;
        progreso: number;
        tendencia: 'subiendo' | 'estable' | 'bajando';
    };
    iniciativaPrioritaria: {
        nombre: string;
        accionInmediata: string;
    };
    horasDisponibles: number;
    riesgoPrincipal: {
        titulo: string;
        descripcion: string;
        nivel: NivelAlerta;
    };
    proximaRevision: {
        fecha: string;
        hora: string;
        tipo: string;
    };
    ultimasDecisiones: Decision[];
}

export const SALA_GUERRA: SalaGuerra = {
    objetivoPrincipal: {
        texto: 'Conseguir los primeros 3 usuarios externos validados de Quioba.',
        progreso: 0,
        tendencia: 'estable',
    },

    iniciativaPrioritaria: {
        nombre: CONTEXTO_EMPRESA.iniciativaPrioritaria.nombre,
        accionInmediata: 'Identificar y contactar esta semana a 5 personas externas para una prueba de 15 minutos.',
    },

    horasDisponibles: 20,

    riesgoPrincipal: {
        titulo: CONTEXTO_EMPRESA.principalBloqueador.titulo,
        descripcion: CONTEXTO_EMPRESA.principalBloqueador.descripcion,
        nivel: 'critico',
    },

    proximaRevision: {
        fecha: CONTEXTO_EMPRESA.proximaRevision.fecha,
        hora: CONTEXTO_EMPRESA.proximaRevision.hora,
        tipo: 'Revisión semanal de operaciones',
    },

    ultimasDecisiones: [
        {
            id: 1,
            texto: 'El Campus es la prioridad absoluta de Q2. El resto de apps entran en modo mantenimiento.',
            fecha: '28 may 2026',
            autor: 'Director General',
        },
        {
            id: 2,
            texto: 'Congelar nuevas features en Mi Hogar hasta julio.',
            fecha: '28 may 2026',
            autor: 'Director General',
        },
        {
            id: 3,
            texto: 'Oficina pasa a ser la sede corporativa virtual. Rediseño completado.',
            fecha: '30 may 2026',
            autor: 'Jefe de Gabinete',
        },
        {
            id: 4,
            texto: 'Revisión de métricas establecida cada lunes a las 09:00.',
            fecha: '28 may 2026',
            autor: 'Director General',
        },
    ],
};
