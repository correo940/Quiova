export interface AccionEstructurada {
    expediente: { titulo: string; resumen: string };
    decision: { titulo: string; descripcion: string };
    objetivo: {
        titulo: string;
        descripcion: string;
        directorId: string;
        prioridad: 'alta' | 'media' | 'baja';
        fechaObjetivo?: string | null;
    } | null;
    tareas: Array<{
        titulo: string;
        descripcion: string;
        directorId: string;
        urgencia: 'inmediata' | 'esta-semana' | 'este-mes';
    }>;
}

export type CrearExpedienteConDecisionFn = (
    expediente: { titulo: string; resumen: string; directorRevisor: string; conversacionOriginal: string },
    decision: { titulo: string; descripcion: string },
    objetivo: AccionEstructurada['objetivo'],
    tareas: AccionEstructurada['tareas'],
) => void;
