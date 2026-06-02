export type CouncilReportStatus = 'pendiente' | 'aceptado' | 'rechazado';

export interface CouncilReport {
    id: string;
    title: string;
    content: string;
    source: string;
    createdAt: string;
    status: CouncilReportStatus;
}

export interface ConsensusAgreement {
    id: string;
    theme: string;
    section: string;
    text: string;
    sources: string[];
    reportIds: string[];
}

export interface ConsensusDifference {
    id: string;
    section: string;
    text: string;
    source: string;
    reportId: string;
}

export interface ConsensusResult {
    id: string;
    createdAt: string;
    reportIds: string[];
    agreements: ConsensusAgreement[];
    differences: ConsensusDifference[];
}

export type ExecutiveBriefStatus = 'borrador' | 'publicado';

export interface ExecutiveBrief {
    id: string;
    createdAt: string;
    status: ExecutiveBriefStatus;
    consensusId: string;
    title: string;
    summary: string;
    priorities: string[];
    actions: string[];
    risks: string[];
    strategicContext: string;
    sources: string[];
}

export type DecisionStatus = 'propuesta' | 'aprobada' | 'descartada';

export interface Decision {
    id: string;
    executiveBriefId: string;
    title: string;
    description: string;
    status: DecisionStatus;
    responsable: string;
    fecha: string;
}

export interface ExecutionTask {
    id: string;
    decisionId: string;
    title: string;
    urgencia: 'inmediata' | 'esta-semana' | 'este-mes';
    estado: 'pendiente' | 'en-progreso' | 'completada';
    contexto: string;
    fechaRegistro: string;
}
