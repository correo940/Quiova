import type { ConsensusAgreement, ConsensusResult, ExecutiveBrief } from './domain';
import {
    MAX_ACCIONES,
    MAX_EXECUTIVE_LINE_LENGTH,
    MAX_PRIORIDADES,
    MAX_RIESGOS,
    limitarItems,
    toSingleLine,
} from './rules';
import { SECCIONES, buildConsensusResult, parsearSeccion, similitudCombinada } from './consensus-service';

interface ParseableReport {
    id: string;
    contenido: string;
    remitente: string;
}

export interface LegacyActionDraft {
    titulo: string;
    urgencia: 'inmediata' | 'esta-semana' | 'este-mes';
    estado: 'pendiente' | 'en-progreso' | 'completada';
    contexto: string;
}

function genId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function clampExecutiveLine(text: string): string {
    const single = toSingleLine(text);
    if (single.length <= MAX_EXECUTIVE_LINE_LENGTH) return single;
    return single.slice(0, MAX_EXECUTIVE_LINE_LENGTH).trim();
}

function normalizeForMatch(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

type Topic =
    | 'validacion-usuarios'
    | 'mvp-reducido'
    | 'arquitectura-base'
    | 'contenido-interactivo'
    | 'onboarding'
    | 'metricas'
    | 'monetizacion'
    | 'riesgo-operativo'
    | 'foco-general';

function inferTopic(seed: string): Topic {
    const n = normalizeForMatch(seed);
    if (/(usuario|captacion|alpha|validacion externa|feedback|entrevista)/.test(n)) return 'validacion-usuarios';
    if (/(mvp|alcance|foco|prioridad producto|producto)/.test(n)) return 'mvp-reducido';
    if (/(groq|arquitectura|infraestructura|tecnica|estabilidad|deploy|movil|pc)/.test(n)) return 'arquitectura-base';
    if (/(contenido|editorial|articulo|tematica|publicacion)/.test(n)) return 'contenido-interactivo';
    if (/(onboarding|registro|primer uso|activacion)/.test(n)) return 'onboarding';
    if (/(metrica|kpi|analytics|seguimiento|conversion)/.test(n)) return 'metricas';
    if (/(monetizacion|pricing|precio|ingreso|revenue)/.test(n)) return 'monetizacion';
    if (/(riesgo|bloqueo|dependencia|retraso)/.test(n)) return 'riesgo-operativo';
    return 'foco-general';
}

function lineFromAgreement(agreement: ConsensusAgreement, kind: 'prioridad' | 'accion' | 'riesgo'): string {
    const topic = inferTopic(`${agreement.theme} ${agreement.text}`);
    return clampExecutiveLine(concreteLineForTopic(topic, kind));
}

function deduplicar(items: string[]): string[] {
    const out: string[] = [];
    for (const item of items) {
        if (!out.some(r => similitudCombinada(r, item) >= 0.7)) out.push(item);
    }
    return out;
}

function bySection(consensusResult: ConsensusResult, section: string): ConsensusAgreement[] {
    return consensusResult.agreements.filter(a => a.section === section);
}

function fallbackSectionItems(aceptados: ParseableReport[], sectionRe: string): string[] {
    return deduplicar(aceptados.flatMap(inf => parsearSeccion(inf.contenido, sectionRe)));
}

function fallbackToExecutiveLines(items: string[], kind: 'prioridad' | 'accion' | 'riesgo'): string[] {
    return items.map(item => {
        const topic = inferTopic(item);
        return clampExecutiveLine(concreteLineForTopic(topic, kind));
    });
}

function concreteLineForTopic(topic: Topic, kind: 'prioridad' | 'accion' | 'riesgo'): string {
    if (kind === 'prioridad') {
        if (topic === 'mvp-reducido') return 'Definir MVP de maximo 3 aplicaciones';
        if (topic === 'validacion-usuarios') return 'Conseguir 10 usuarios de prueba';
        if (topic === 'arquitectura-base') return 'Garantizar estabilidad de Groq y adaptación PC/Móvil';
        if (topic === 'contenido-interactivo') return 'Lanzar plantilla base para articulos interactivos';
        if (topic === 'onboarding') return 'Reducir abandono en el onboarding inicial';
        if (topic === 'metricas') return 'Definir 3 metricas semanales de adopcion';
        if (topic === 'monetizacion') return 'Definir oferta inicial de monetizacion';
        if (topic === 'riesgo-operativo') return 'Eliminar bloqueadores operativos criticos';
        return 'Definir objetivo semanal medible';
    }
    if (kind === 'accion') {
        if (topic === 'mvp-reducido') return 'Recortar funcionalidades fuera del MVP esta semana';
        if (topic === 'validacion-usuarios') return 'Contactar hoy a 10 usuarios de prueba';
        if (topic === 'arquitectura-base') return 'Verificar estabilidad de Groq y adaptación PC/Móvil';
        if (topic === 'contenido-interactivo') return 'Crear plantilla base para articulos interactivos';
        if (topic === 'onboarding') return 'Probar onboarding completo en PC y móvil';
        if (topic === 'metricas') return 'Publicar dashboard con 3 metricas semanales';
        if (topic === 'monetizacion') return 'Definir precio inicial y regla de cobro';
        if (topic === 'riesgo-operativo') return 'Cerrar esta semana el bloqueo operativo principal';
        return 'Programar bloque semanal para la accion principal';
    }

    if (topic === 'mvp-reducido') return 'Evitar ampliar alcance fuera del MVP';
    if (topic === 'validacion-usuarios') return 'Evitar decisiones sin feedback de usuarios reales';
    if (topic === 'arquitectura-base') return 'Evitar cambios de arquitectura sin pruebas de estabilidad';
    if (topic === 'contenido-interactivo') return 'Evitar publicar contenido sin plantilla validada';
    if (topic === 'onboarding') return 'Evitar pasos innecesarios en el onboarding inicial';
    if (topic === 'metricas') return 'Evitar operar sin metricas semanales visibles';
    if (topic === 'monetizacion') return 'Evitar cambios de precio sin criterio definido';
    if (topic === 'riesgo-operativo') return 'Evitar dependencias criticas sin plan de respaldo';
    return 'Evitar trabajo sin objetivo semanal definido';
}

export function buildExecutiveBrief(consensusResult: ConsensusResult, aceptados: ParseableReport[]): ExecutiveBrief {
    const sources = [...new Set(aceptados.map(i => i.remitente))];

    const priorityAgreements = bySection(consensusResult, 'Prioridades');
    const actionAgreements = bySection(consensusResult, 'Acciones');
    const riskAgreements = bySection(consensusResult, 'Riesgos');

    const priorities = priorityAgreements.length
        ? priorityAgreements.map(a => lineFromAgreement(a, 'prioridad'))
        : fallbackToExecutiveLines(fallbackSectionItems(aceptados, 'prioridades?'), 'prioridad');
    const actions = actionAgreements.length
        ? actionAgreements.map(a => lineFromAgreement(a, 'accion'))
        : fallbackToExecutiveLines(fallbackSectionItems(aceptados, 'acciones?'), 'accion');
    const risks = riskAgreements.length
        ? riskAgreements.map(a => lineFromAgreement(a, 'riesgo'))
        : fallbackToExecutiveLines(fallbackSectionItems(aceptados, 'riesgos?'), 'riesgo');

    const finalPriorities = limitarItems([...new Set(priorities)], MAX_PRIORIDADES);
    const finalActions = limitarItems([...new Set(actions)], MAX_ACCIONES);
    const finalRisks = limitarItems([...new Set(risks)], MAX_RIESGOS);

    const summary = clampExecutiveLine(
        consensusResult.agreements.length === 0
            ? 'Sin consenso suficiente; elevar validacion antes de aprobar nuevas decisiones.'
            : `Consenso operativo en ${consensusResult.agreements.length} frentes entre ${sources.join(', ')}.`,
    );

    const strategicContext = consensusResult.differences
        .slice(0, 5)
        .map(d => clampExecutiveLine(`Diferencia abierta: ${inferTopic(`${d.section} ${d.text}`)} (${d.source})`))
        .join('\n');

    const date = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    return {
        id: genId('brief'),
        createdAt: new Date().toISOString(),
        status: 'borrador',
        consensusId: consensusResult.id,
        title: `Informe Ejecutivo Oficial — ${date}`,
        summary,
        priorities: finalPriorities,
        actions: finalActions,
        risks: finalRisks,
        strategicContext,
        sources,
    };
}

export function buildLegacyOfficialReport(brief: ExecutiveBrief): { titulo: string; contenido: string; acciones: LegacyActionDraft[] } {
    const lines: string[] = [];
    lines.push('Consejo Estratégico · Informe Ejecutivo');
    lines.push(`Fuentes: ${brief.sources.join(', ')} · ${new Date(brief.createdAt).toLocaleDateString('es-ES')}`);
    lines.push('');
    lines.push('## Decisión Ejecutiva');
    lines.push(brief.summary);
    lines.push('');
    if (brief.priorities.length) {
        lines.push('## Prioridades');
        brief.priorities.forEach(p => lines.push(`- ${clampExecutiveLine(p)}`));
        lines.push('');
    }
    if (brief.actions.length) {
        lines.push('## Acciones');
        brief.actions.forEach(a => lines.push(`- ${clampExecutiveLine(a)}`));
        lines.push('');
    }
    if (brief.risks.length) {
        lines.push('## Riesgos');
        brief.risks.forEach(r => lines.push(`- ${clampExecutiveLine(r)}`));
        lines.push('');
    }
    if (brief.strategicContext.trim()) {
        lines.push('## Contexto estratégico');
        lines.push(brief.strategicContext);
    }

    const acciones: LegacyActionDraft[] = brief.actions.map(t => ({
        titulo: t,
        urgencia: 'esta-semana',
        estado: 'pendiente',
        contexto: 'Informe Ejecutivo Oficial',
    }));

    return { titulo: brief.title, contenido: lines.join('\n'), acciones };
}

export function generarInformeOficial(aceptados: ParseableReport[]) {
    const consensusResult = buildConsensusResult(aceptados);
    const executiveBrief = buildExecutiveBrief(consensusResult, aceptados);
    const legacy = buildLegacyOfficialReport(executiveBrief);
    return { ...legacy, consensusResult, executiveBrief };
}

export { SECCIONES };
