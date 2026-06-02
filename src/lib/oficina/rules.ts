export const MAX_PRIORIDADES = 5;
export const MAX_ACCIONES = 10;
export const MAX_RIESGOS = 5;
export const MAX_TASK_LENGTH = 100;
export const MAX_EXECUTIVE_LINE_LENGTH = 120;

const FIRST_WORD_RE = /^([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)/;
const VERB_ENDING_RE = /(ar|er|ir)$/i;

export function limitarItems<T>(items: T[], max: number): T[] {
    return items.slice(0, max);
}

export function startsWithVerb(text: string): boolean {
    const match = text.trim().match(FIRST_WORD_RE);
    if (!match) return false;
    return VERB_ENDING_RE.test(match[1]);
}

export function ensureVerbStart(text: string): string {
    const cleaned = text.trim();
    if (!cleaned) return 'Ejecutar accion pendiente';
    if (startsWithVerb(cleaned)) return cleaned;
    const suffix = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
    return `Ejecutar ${suffix}`;
}

export function clampTaskLength(text: string): string {
    const cleaned = text.trim();
    if (cleaned.length <= MAX_TASK_LENGTH) return cleaned;
    return cleaned.slice(0, MAX_TASK_LENGTH).trim();
}

export function toSingleLine(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}
