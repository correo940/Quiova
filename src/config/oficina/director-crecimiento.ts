import { CONTEXTO_EMPRESA } from './contexto-empresa';

export type NivelDiagnostico = 'critico' | 'alerta' | 'neutro';
export type NivelImpacto = 'alto' | 'medio' | 'bajo';
export type NivelEsfuerzo = 'bajo' | 'medio' | 'alto';
export type NivelRiesgoCrecimiento = 'critico' | 'alto' | 'medio';

export interface DiagnosticoItem {
    id: number;
    titulo: string;
    descripcion: string;
    tipo: NivelDiagnostico;
}

export interface Oportunidad {
    id: number;
    titulo: string;
    descripcion: string;
    impacto: NivelImpacto;
    esfuerzo: NivelEsfuerzo;
}

export interface RiesgoCrecimiento {
    id: number;
    titulo: string;
    descripcion: string;
    nivel: NivelRiesgoCrecimiento;
}

export interface AccionProxima {
    titulo: string;
    descripcion: string;
    plazo: string;
    razon: string;
}

export interface BriefingCrecimiento {
    saludo: string;
    mensaje: string;
    diagnostico: DiagnosticoItem[];
    oportunidades: Oportunidad[];
    riesgos: RiesgoCrecimiento[];
    proximaAccion: AccionProxima;
}

export const CRECIMIENTO: BriefingCrecimiento = {
    saludo: 'Sin usuarios externos, tenemos un prototipo con opiniones.',
    mensaje:
        `Mi trabajo no es conseguir tráfico ni construir embudos de conversión. Mi trabajo es encontrar las primeras personas que usarían ${CONTEXTO_EMPRESA.nombre} aunque estuviera roto. Esas personas son el producto real. Todo lo demás, ahora mismo, es decoración.`,

    diagnostico: [
        {
            id: 1,
            titulo: 'Fase 0 de tracción',
            descripcion: `${CONTEXTO_EMPRESA.nombre} no tiene ningún usuario activo fuera del equipo fundador. No hay datos de uso real, no hay señal externa de que el producto resuelva un problema para alguien que no lo haya construido.`,
            tipo: 'critico',
        },
        {
            id: 2,
            titulo: 'ICP sin definir',
            descripcion: `"Personas y familias" es un target demasiado amplio para validar. Sin un perfil concreto de usuario ideal, cada feature puede estar apuntando a nadie en particular.`,
            tipo: 'critico',
        },
        {
            id: 3,
            titulo: 'Funnel de activación sin mapear',
            descripcion: `No tenemos documentado qué pasos sigue un usuario desde que llega a ${CONTEXTO_EMPRESA.nombre} hasta que consigue su primer valor real. Sin ese mapa, no sabemos dónde falla la experiencia.`,
            tipo: 'alerta',
        },
        {
            id: 4,
            titulo: `${CONTEXTO_EMPRESA.iniciativaPrioritaria.nombre} como hipótesis, no como certeza`,
            descripcion: `${CONTEXTO_EMPRESA.iniciativaPrioritaria.razon} Pero sigue siendo una hipótesis hasta que alguien de fuera lo confirme con su comportamiento, no con palabras.`,
            tipo: 'alerta',
        },
    ],

    oportunidades: [
        {
            id: 1,
            titulo: 'Outreach directo esta semana',
            descripcion: `El canal más rápido en fase 0. Escribir personalmente a 10 personas de la red cercana, no para vender sino para pedir 20 minutos de conversación sobre sus problemas de organización. Sin pitch, solo escuchar.`,
            impacto: 'alto',
            esfuerzo: 'bajo',
        },
        {
            id: 2,
            titulo: `${CONTEXTO_EMPRESA.iniciativaPrioritaria.nombre} como puerta de entrada`,
            descripcion: `Tiene una audiencia más concreta que ${CONTEXTO_EMPRESA.nombre} general. Usarlo como gancho inicial reduce la fricción de captación y permite hacer pruebas de propuesta de valor más rápido.`,
            impacto: 'alto',
            esfuerzo: 'medio',
        },
        {
            id: 3,
            titulo: 'Entrevistas de problema, no de producto',
            descripcion: `Antes de mostrar ${CONTEXTO_EMPRESA.nombre}, entender el problema. 5 conversaciones de 15 minutos sobre cómo gestionan su organización personal generan más aprendizaje que 50 horas de desarrollo.`,
            impacto: 'alto',
            esfuerzo: 'bajo',
        },
        {
            id: 4,
            titulo: 'Onboarding como primer experimento',
            descripcion: `Documentar cada punto de fricción en el flujo de primer uso. El objetivo: que un usuario nuevo llegue a su primer momento de valor en menos de 5 minutos sin ayuda de nadie.`,
            impacto: 'medio',
            esfuerzo: 'medio',
        },
    ],

    riesgos: [
        {
            id: 1,
            titulo: 'Construir sin señal externa',
            descripcion: `${CONTEXTO_EMPRESA.principalBloqueador.descripcion} El riesgo no es técnico: es construir algo que nadie necesita.`,
            nivel: 'critico',
        },
        {
            id: 2,
            titulo: 'Confundir velocidad de desarrollo con tracción',
            descripcion: `Lanzar features no es crecer. En fase 0, el progreso real se mide en conversaciones con usuarios, no en commits. Mientras no haya 10 personas que usen ${CONTEXTO_EMPRESA.nombre} semanalmente, el único KPI que importa es el número de entrevistas realizadas.`,
            nivel: 'alto',
        },
        {
            id: 3,
            titulo: 'Propuesta de valor demasiado amplia',
            descripcion: `${CONTEXTO_EMPRESA.nombre} resuelve muchas cosas para mucha gente. Eso es una trampa. La propuesta de valor tiene que ser tan específica que el usuario ideal sienta que fue construida exactamente para él.`,
            nivel: 'alto',
        },
        {
            id: 4,
            titulo: 'Onboarding como filtro de abandono',
            descripcion: 'Si el primer usuario externo no entiende qué hace la plataforma en los primeros 3 minutos, se va. No por falta de producto, sino por falta de claridad.',
            nivel: 'medio',
        },
    ],

    proximaAccion: {
        titulo: '5 conversaciones antes del viernes',
        descripcion: `Identificar 5 personas fuera del equipo, contactarlas hoy, y mantener una conversación de 15-20 minutos sobre sus problemas reales de organización. Sin mostrar ${CONTEXTO_EMPRESA.nombre}. Sin pitch. Solo escuchar y anotar.`,
        plazo: `Antes de ${CONTEXTO_EMPRESA.proximaRevision.fecha}`,
        razon: 'No hay sustituto para hablar con usuarios en fase 0. Cada semana sin hacerlo es una semana construyendo sobre suposiciones.',
    },
};
