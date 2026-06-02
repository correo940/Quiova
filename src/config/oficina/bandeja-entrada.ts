export type PrioridadDoc = 'urgente' | 'alta' | 'normal' | 'baja';
export type EstadoDoc = 'nuevo' | 'pendiente' | 'leído' | 'archivado';
export type AutorDoc = 'Director General' | 'Jefe de Gabinete' | 'Sistema';
export type TipoDoc = 'acta' | 'informe' | 'nota' | 'directiva';

export interface Documento {
    id: number;
    titulo: string;
    descripcion: string;
    fecha: string;
    autor: AutorDoc;
    prioridad: PrioridadDoc;
    estado: EstadoDoc;
    tipo: TipoDoc;
}

export const DOCUMENTOS: Documento[] = [
    {
        id: 1,
        titulo: 'Acta de Reunión Semanal — Semana 22',
        descripcion: 'Capacidad: 20h distribuidas en 5 días. Iniciativa principal: Oficina Quioba. Foco en el panel de dirección y primeros accesos externos al producto.',
        fecha: '30 may 2026',
        autor: 'Director General',
        prioridad: 'alta',
        estado: 'nuevo',
        tipo: 'acta',
    },
    {
        id: 2,
        titulo: 'Directiva urgente: captación de primeros usuarios',
        descripcion: 'El objetivo de esta semana es conseguir 3 usuarios externos antes del viernes. Prioridad máxima sobre cualquier desarrollo activo.',
        fecha: '29 may 2026',
        autor: 'Director General',
        prioridad: 'urgente',
        estado: 'nuevo',
        tipo: 'directiva',
    },
    {
        id: 3,
        titulo: 'Nota: Plan de acción El Campus',
        descripcion: 'Prioridades de ejecución para El Campus: flujo de onboarding simplificado, propuesta de valor en una frase y tres bullets, primer usuario externo validado.',
        fecha: '27 may 2026',
        autor: 'Jefe de Gabinete',
        prioridad: 'alta',
        estado: 'pendiente',
        tipo: 'nota',
    },
    {
        id: 4,
        titulo: 'Informe Ejecutivo — Semana 21',
        descripcion: 'Estado de iniciativas activas, riesgos identificados y recomendaciones. Semana del 19 al 23 de mayo. Sin usuarios externos validados: riesgo crítico.',
        fecha: '23 may 2026',
        autor: 'Director General',
        prioridad: 'alta',
        estado: 'leído',
        tipo: 'informe',
    },
    {
        id: 5,
        titulo: 'Nota: Revisión del flujo de onboarding',
        descripcion: 'Recorrer el flujo completo de Quioba como si fuera un usuario nuevo. Identificar fricciones, pasos innecesarios y puntos de abandono antes de la primera reunión con externos.',
        fecha: '22 may 2026',
        autor: 'Jefe de Gabinete',
        prioridad: 'normal',
        estado: 'pendiente',
        tipo: 'nota',
    },
    {
        id: 6,
        titulo: 'Directiva: Congelación de Mi Hogar',
        descripcion: 'El desarrollo activo de Mi Hogar queda suspendido hasta julio 2026 para concentrar todos los recursos disponibles en El Campus y la captación de usuarios.',
        fecha: '20 may 2026',
        autor: 'Director General',
        prioridad: 'normal',
        estado: 'leído',
        tipo: 'directiva',
    },
    {
        id: 7,
        titulo: 'Informe: Estado de iniciativas Q2',
        descripcion: 'Revisión trimestral. Oficina Quioba 20%, El Campus 35%, Captación 5%, Contenido 0%, Monetización 10%. Sin avances externos registrados.',
        fecha: '15 may 2026',
        autor: 'Director General',
        prioridad: 'baja',
        estado: 'archivado',
        tipo: 'informe',
    },
];
