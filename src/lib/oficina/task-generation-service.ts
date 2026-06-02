import type { Decision, ExecutionTask } from './domain';
import { MAX_ACCIONES, clampTaskLength, ensureVerbStart, startsWithVerb } from './rules';

interface LegacyActionTask {
    titulo: string;
    urgencia: 'inmediata' | 'esta-semana' | 'este-mes';
    estado: 'pendiente' | 'en-progreso' | 'completada';
    contexto: string;
}

function genId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeForMatch(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function stripNoise(text: string): string {
    return text
        .replace(/[“”"']/g, '')
        .replace(/\.\.\.+/g, ' ')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/^[-*•]\s*/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractPrimaryClause(text: string): string {
    const firstSentence = text.split(/[.;:]/)[0]?.trim() ?? text.trim();
    const byConjunction = firstSentence.split(/\s+y\s+/i)[0]?.trim() ?? firstSentence;
    return byConjunction || firstSentence;
}

function extractUsersTarget(raw: string): number {
    const m = raw.match(/\b(\d{1,3})\b/);
    if (!m) return 10;
    const n = Number(m[1]);
    if (Number.isNaN(n) || n <= 0) return 10;
    return n;
}

function strategicActionToExecutableTask(action: string): string {
    const cleaned = stripNoise(action);
    const norm = normalizeForMatch(cleaned);

    if (/(foco.*producto|producto.*foco|reduccion.*alcance|alcance.*reduc|mvp)/.test(norm)) {
        return 'Definir MVP de maximo 3 aplicaciones';
    }
    if (/(arquitectura|base tecnica|infraestructura|stack tecnico|tecnica base)/.test(norm)) {
        if (/\bgroq\b/.test(norm)) return 'Verificar estabilidad de Groq';
        return 'Verificar estabilidad de la arquitectura base';
    }
    if (/(contenido|editorial|tematic|articul|plantilla)/.test(norm)) {
        return 'Crear plantilla base para articulos interactivos';
    }
    if (/(captacion|primeros usuarios|usuarios alpha|usuarios de prueba|adquisicion)/.test(norm)) {
        const target = extractUsersTarget(cleaned);
        return `Conseguir ${target} usuarios de prueba`;
    }
    if (/(metric|kpi|indicador|analit|analytics)/.test(norm)) {
        return 'Definir 3 metricas clave de seguimiento';
    }
    if (/(onboarding|registro|primer uso|activacion)/.test(norm)) {
        return 'Probar flujo de onboarding completo';
    }

    return ensureVerbStart(extractPrimaryClause(cleaned));
}

function normalizeExecutionTaskTitle(text: string): string {
    return clampTaskLength(strategicActionToExecutableTask(text));
}

function normalizeParsedTaskTitle(text: string): string {
    return clampTaskLength(ensureVerbStart(text));
}

export function buildExecutionTasksFromDecision(decision: Decision, actions: string[]): ExecutionTask[] {
    return actions
        .slice(0, MAX_ACCIONES)
        .map(action => normalizeExecutionTaskTitle(action))
        .filter(title => Boolean(title) && startsWithVerb(title))
        .map(title => ({
            id: genId('task'),
            decisionId: decision.id,
            title,
            urgencia: 'esta-semana',
            estado: 'pendiente',
            contexto: '',
            fechaRegistro: new Date().toISOString(),
        }));
}

export function toLegacyActionTasks(tasks: ExecutionTask[]): LegacyActionTask[] {
    return tasks.map(t => ({
        titulo: t.title,
        urgencia: t.urgencia,
        estado: t.estado,
        contexto: t.contexto,
    }));
}

function getBloqueAcciones(texto: string, nombreRe: string): string | null {
    const re = new RegExp(`(?:^|\\n)[ \\t]*(?:#{1,6}[ \\t]+)?(?:${nombreRe})[ \\t]*:?[ \\t]*(?=\\r?\\n|$)`, 'i');
    const m = re.exec(texto);
    if (!m) return null;
    const rest = texto.slice(m.index + m[0].length);
    const end = rest.search(/^\s*(?:#{1,6}[ \t]|[\wáéíóúüñÁÉÍÓÚÜÑ ]+:\s*$|[A-ZÁÉÍÓÚÜÑ]{3,}\s*$)/m);
    return end >= 0 ? rest.slice(0, end) : rest;
}

export function parsearAcciones(texto: string): LegacyActionTask[] {
    const result: LegacyActionTask[] = [];
    const bloque = getBloqueAcciones(texto, 'acciones?') ?? texto;

    for (const line of bloque.split('\n')) {
        const t = line.trim();
        if (!t) continue;
        if (/^#{1,6}\s/.test(t) || /^[A-ZÁÉÍÓÚÜÑ]{3,}:?\s*$/.test(t)) continue;

        let estado: LegacyActionTask['estado'] = 'pendiente';
        if (/\[[xX✓]\]/.test(t) || /\bhecha\b/i.test(t)) estado = 'completada';
        else if (/\[-\]|\[~\]/.test(t) || /\ben[\s-]progreso\b/i.test(t)) estado = 'en-progreso';

        let urgencia: LegacyActionTask['urgencia'] = 'esta-semana';
        if (/[(\[]\s*alta\s*[)\]]/i.test(t)) urgencia = 'inmediata';
        else if (/[(\[]\s*baja\s*[)\]]/i.test(t)) urgencia = 'este-mes';

        const cleanTitle = t
            .replace(/^[-*•]\s*/, '')
            .replace(/^\d+[.)]\s*/, '')
            .replace(/\[[\sxX✓\-~]\]/g, '')
            .replace(/[(\[]\s*(alta|media|baja)\s*[)\]]/gi, '')
            .replace(/\b(hecha|completada|pendiente|en[\s-]progreso)\b\s*/gi, '')
            .trim();

        if (cleanTitle.length <= 4) continue;
        const finalTitle = normalizeParsedTaskTitle(cleanTitle);
        if (!startsWithVerb(finalTitle)) continue;
        result.push({ titulo: finalTitle, urgencia, estado, contexto: 'Analizado desde informe estrategico' });
    }

    return result;
}
