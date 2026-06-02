import { CONTEXTO_EMPRESA } from './contexto-empresa';

export type NivelRiesgo = 'critico' | 'alto' | 'medio';

export interface Riesgo {
    id: number;
    titulo: string;
    descripcion: string;
    nivel: NivelRiesgo;
}

export interface BriefingEjecutivo {
    saludo: string;
    mensaje: string;
    informe: {
        estadoGeneral: string;
        situacionActual: string;
        avancesRecientes: string[];
    };
    riesgos: Riesgo[];
    recomendaciones: string[];
}

export const BRIEFING: BriefingEjecutivo = {
    saludo: 'Buenos días.',
    mensaje:
        'He revisado la situación actual de Quioba y este es mi informe ejecutivo. La plataforma avanza con solidez técnica, pero nos encontramos en un momento crítico: tenemos producto, no tenemos usuarios externos. Esa es la única métrica que importa ahora mismo.',

    informe: {
        estadoGeneral: CONTEXTO_EMPRESA.estadoActual,

        situacionActual:
            'Estamos en la fase de transición entre construcción y validación. El riesgo principal no es técnico: es la ausencia de retroalimentación externa. Cada semana que pasa sin usuarios reales es una semana construyendo sobre suposiciones.',

        avancesRecientes: [
            'Oficina rediseñada como sede corporativa virtual.',
            'El Campus en beta pública con estructura académica completa.',
            'App móvil Capacitor estabilizada para iOS y Android.',
            'Sistema de marketplace de apps implementado y funcional.',
            'Panel de Director General con briefing ejecutivo operativo.',
        ],
    },

    riesgos: [
        {
            id: 1,
            titulo: CONTEXTO_EMPRESA.principalBloqueador.titulo,
            descripcion:
                'No existe evidencia externa de que el producto resuelva un problema real. Todo el feedback hasta ahora es interno. Esto invalida cualquier decisión de producto.',
            nivel: 'critico',
        },
        {
            id: 2,
            titulo: 'Propuesta de valor no probada',
            descripcion:
                'No hemos podido comunicar en una frase clara qué es Quioba y para quién es. Sin eso, la captación es imposible.',
            nivel: 'alto',
        },
        {
            id: 3,
            titulo: 'Dispersión entre proyectos',
            descripcion:
                'Oficina, El Campus, Mi Hogar, la app móvil y el marketplace compiten por el mismo tiempo de desarrollo. Sin foco explícito, ninguno avanza lo suficiente.',
            nivel: 'alto',
        },
        {
            id: 4,
            titulo: 'Sin estrategia de contenidos activa',
            descripcion:
                'La captación orgánica requiere contenido. No hay plan editorial en marcha ni responsable asignado.',
            nivel: 'medio',
        },
    ],

    recomendaciones: [
        'Conseguir esta semana al menos 3 personas externas que prueben Quioba y den feedback real.',
        'Escribir en una frase qué es Quioba y para quién es. Testear esa frase con alguien fuera del proyecto.',
        'Elegir un único proyecto como prioridad absoluta de Q2 y pausar el resto.',
        'Publicar el primer contenido de El Campus antes del viernes.',
        'Revisar el flujo de onboarding como si fuera la primera vez que entras en la plataforma.',
    ],
};
