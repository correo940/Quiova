import { CONTEXTO_EMPRESA } from './contexto-empresa';

export type Urgencia = 'inmediata' | 'esta-semana' | 'este-mes';
export type EstadoAccion = 'pendiente' | 'en-progreso' | 'completada';
export type PrioridadTarea = 'alta' | 'media' | 'baja';

export interface PrioridadRecibida {
    id: number;
    texto: string;
    urgencia: Urgencia;
}

export interface AccionPlan {
    id: number;
    objetivo: string;
    accion: string;
    plazo: string;
    estado: EstadoAccion;
}

export interface TareaRecomendada {
    id: number;
    texto: string;
    contexto: string;
    prioridad: PrioridadTarea;
}

export interface BriefingGabinete {
    saludo: string;
    mensaje: string;
    prioridadesRecibidas: PrioridadRecibida[];
    planAccion: AccionPlan[];
    tareasRecomendadas: TareaRecomendada[];
}

export const GABINETE: BriefingGabinete = {
    saludo: 'He recibido el informe del Director General.',
    mensaje:
        'Mi trabajo es convertir esa estrategia en pasos concretos y ejecutables. He revisado las directrices, identificado las acciones prioritarias y preparado un plan de acción para esta semana. La brecha entre tener una visión y ejecutarla es donde más proyectos fallan. Aquí no.',

    prioridadesRecibidas: [
        {
            id: 1,
            texto: 'Conseguir al menos 3 usuarios externos que prueben Quioba esta semana.',
            urgencia: 'inmediata',
        },
        {
            id: 2,
            texto: 'Definir en una frase qué es Quioba y para quién es.',
            urgencia: 'inmediata',
        },
        {
            id: 3,
            texto: 'Elegir un único proyecto como prioridad absoluta de Q2.',
            urgencia: 'esta-semana',
        },
        {
            id: 4,
            texto: 'Publicar el primer contenido de El Campus antes del viernes.',
            urgencia: 'esta-semana',
        },
        {
            id: 5,
            texto: 'Revisar el flujo de onboarding como nuevo usuario.',
            urgencia: 'este-mes',
        },
    ],

    planAccion: [
        {
            id: 1,
            objetivo: 'Validación externa',
            accion: 'Identificar 5 contactos reales (familia, amigos, conocidos) y enviarles el enlace de Quioba con una nota personal pidiendo 15 minutos de feedback.',
            plazo: 'Martes',
            estado: 'pendiente',
        },
        {
            id: 2,
            objetivo: 'Propuesta de valor',
            accion: 'Escribir 3 versiones de "Quioba es para personas que..." y elegir la más clara con alguien fuera del proyecto.',
            plazo: 'Miércoles',
            estado: 'pendiente',
        },
        {
            id: 3,
            objetivo: 'Foco Q2',
            accion: 'Tomar la decisión: El Campus o Mi Hogar. Documentarla en Director General y pausar el resto hasta julio.',
            plazo: 'Jueves',
            estado: 'pendiente',
        },
        {
            id: 4,
            objetivo: `Contenido ${CONTEXTO_EMPRESA.iniciativaPrioritaria.nombre}`,
            accion: `Publicar la primera lección o módulo de ${CONTEXTO_EMPRESA.iniciativaPrioritaria.nombre}, aunque sea básico. Hecho es mejor que perfecto.`,
            plazo: 'Viernes',
            estado: 'pendiente',
        },
        {
            id: 5,
            objetivo: 'Onboarding',
            accion: 'Entrar en Quioba desde modo incógnito y documentar cada punto de fricción del flujo de registro y primer uso.',
            plazo: 'Esta semana',
            estado: 'pendiente',
        },
    ],

    tareasRecomendadas: [
        {
            id: 1,
            texto: 'Abrir un documento y escribir "Quioba es para..." sin borrarlo hasta tener una versión que suene natural.',
            contexto: 'La propuesta de valor no existe hasta que se puede decir en voz alta sin dudar.',
            prioridad: 'alta',
        },
        {
            id: 2,
            texto: 'Enviar hoy el primer mensaje a un posible usuario externo. No mañana.',
            contexto: 'Cada día sin feedback externo es un día construyendo sobre suposiciones.',
            prioridad: 'alta',
        },
        {
            id: 3,
            texto: 'Revisar el roadmap y tachar todo lo que no sea El Campus o Mi Hogar.',
            contexto: 'La dispersión es el principal enemigo de una startup con un solo desarrollador.',
            prioridad: 'media',
        },
        {
            id: 4,
            texto: 'Preparar una checklist de 5 preguntas para los usuarios de prueba.',
            contexto: 'Sin preguntas claras, el feedback no sirve para tomar decisiones.',
            prioridad: 'media',
        },
    ],
};
