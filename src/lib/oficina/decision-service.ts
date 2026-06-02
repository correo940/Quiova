import type { Decision, DecisionStatus, ExecutiveBrief } from './domain';

function genId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDecision(
    executiveBrief: ExecutiveBrief,
    opts?: { status?: DecisionStatus; responsable?: string; fecha?: string; title?: string; description?: string },
): Decision {
    const fecha = opts?.fecha ?? new Date().toISOString().slice(0, 10);
    return {
        id: genId('decision'),
        executiveBriefId: executiveBrief.id,
        title: opts?.title ?? 'Decisión operativa derivada del informe oficial',
        description: opts?.description ?? executiveBrief.summary,
        status: opts?.status ?? 'propuesta',
        responsable: opts?.responsable ?? 'Director General',
        fecha,
    };
}
