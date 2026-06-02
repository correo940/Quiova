// Fuente única de verdad para los datos estratégicos de la empresa.
// Director General, Sala de Guerra y Jefe de Gabinete leen desde aquí.

export type Tendencia = 'subiendo' | 'bajando' | 'estable';

export interface ObjetivoEmpresa {
    etiqueta?: string;
    texto: string;
    progreso: number;
    tendencia: Tendencia;
    nota: string;
}

export interface IniciativaPrioritaria {
    id: number;
    nombre: string;
    razon: string;
}

export interface BloqueadorPrincipal {
    titulo: string;
    descripcion: string;
    impacto: 'alto' | 'medio' | 'bajo';
}

export interface RevisionEmpresa {
    fecha: string;
    hora: string;
    agenda: string[];
}

export interface ContextoEmpresa {
    nombre: string;
    vision: string;
    mision: string;
    objetivoAnual: ObjetivoEmpresa;
    objetivoTrimestral: ObjetivoEmpresa;
    iniciativaPrioritaria: IniciativaPrioritaria;
    principalBloqueador: BloqueadorPrincipal;
    estadoActual: string;
    proximaRevision: RevisionEmpresa;
}

export const CONTEXTO_EMPRESA: ContextoEmpresa = {
    nombre: 'Quioba',

    vision: 'Convertir Quioba en la plataforma de referencia para la organización personal y familiar.',

    mision: 'Dar a las personas y familias herramientas digitales integradas que simplifiquen su vida cotidiana.',

    objetivoAnual: {
        texto: 'Convertir Quioba en una plataforma de referencia para la organización personal y familiar.',
        progreso: 12,
        tendencia: 'subiendo',
        nota: 'Fase fundacional. Indicador clave: primeros usuarios activos recurrentes fuera del equipo.',
    },

    objetivoTrimestral: {
        etiqueta: 'Q2 · Abr–Jun 2026',
        texto: 'Preparar Quioba para sus primeros usuarios activos reales: producto estable, accesible y con valor demostrable.',
        progreso: 30,
        tendencia: 'subiendo',
        nota: 'Foco en estabilidad, onboarding claro y al menos una app con propuesta de valor validada.',
    },

    iniciativaPrioritaria: {
        id: 2,
        nombre: 'El Campus',
        razon: 'Primera app con propuesta de valor clara hacia usuarios externos. Prioridad absoluta de Q2.',
    },

    principalBloqueador: {
        titulo: 'Sin usuarios externos activos',
        descripcion: 'Quioba aún no tiene usuarios fuera del equipo fundador. Sin validación real del producto, cada decisión de producto es una suposición.',
        impacto: 'alto',
    },

    estadoActual: 'Quioba está operativa y en construcción activa. La arquitectura es sólida, las aplicaciones principales funcionan y la sede corporativa empieza a tomar forma. Sin embargo, el producto aún no ha llegado a manos de usuarios reales fuera del equipo fundador.',

    proximaRevision: {
        fecha: 'Lunes, 2 junio 2026',
        hora: '09:00',
        agenda: [
            'Revisión estado Oficina y Director General',
            'Decisión sobre primeros usuarios para validación',
            'Priorización: ¿El Campus o Mi Hogar primero?',
            'Definir siguiente hito medible del trimestre',
        ],
    },
};
