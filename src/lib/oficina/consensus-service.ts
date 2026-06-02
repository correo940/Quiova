import type { ConsensusResult, CouncilReport } from './domain';

export const SECCIONES = [
    { re: 'prioridades?', label: 'Prioridades' },
    { re: 'acciones?', label: 'Acciones' },
    { re: 'm[eé]tricas?|metricas?', label: 'Métricas' },
    { re: 'riesgos?', label: 'Riesgos' },
    { re: 'observaciones?', label: 'Observaciones' },
] as const;

const CUALQUIER_SECCION = /^[ \t]*(?:#{1,6}[ \t]+)?(?:prioridades?|acciones?|m[eé]tricas?|metricas?|riesgos?|observaciones?|recomendaciones?|conclusiones?|resumen|siguientes?(?:[ \t]+pasos?)?)[ \t]*:?[ \t]*$/i;

export const CAMPOS: [string, string, string[]][] = [
    ['usuarios', 'Validación con usuarios', ['usuario', 'usuarios', 'cliente', 'clientes', 'persona', 'personas', 'externo', 'externos', 'real', 'reales', 'tester', 'beta', 'early', 'adopter', 'validar', 'validacion', 'probar', 'prueba', 'testear', 'feedback', 'entrevista', 'encuesta', 'comentario', 'opinion', 'recibir']],
    ['aprendizaje', 'Aprendizaje de usuario', ['aprender', 'aprendizaje', 'observar', 'observacion', 'insight', 'descubrir', 'investigar', 'investigacion', 'entender', 'conocer', 'escuchar', 'recoger', 'recogida', 'entrevista']],
    ['propuesta', 'Propuesta de valor', ['propuesta', 'valor', 'nucleo', 'mensaje', 'diferencial', 'diferenciacion', 'beneficio', 'ventaja', 'solucion', 'utilidad', 'piloto', 'frase', 'posicionamiento', 'comunicar', 'definir', 'principal', 'unico', 'clave']],
    ['lanzamiento', 'Lanzamiento', ['lanzar', 'lanzamiento', 'publicar', 'publicacion', 'version', 'estable', 'demo', 'preparar', 'mvp', 'release', 'deploy', 'estrenar', 'presentar', 'landing', 'pagina', 'web', 'sitio']],
    ['contenido', 'Contenido', ['contenido', 'video', 'post', 'articulo', 'reel', 'story', 'editorial', 'canal', 'youtube', 'tiktok', 'instagram', 'red', 'social', 'publicar', 'escribir', 'crear', 'grabar']],
    ['crecimiento', 'Crecimiento', ['crecer', 'crecimiento', 'traccion', 'audiencia', 'alcance', 'visibilidad', 'captacion', 'conseguir', 'atraer', 'ganar', 'aumentar', 'escalar', 'primeros', 'nuevos']],
    ['metricas', 'Métricas', ['metrica', 'metricas', 'kpi', 'dato', 'datos', 'analytics', 'seguimiento', 'medir', 'medicion', 'conversion', 'retention', 'churn', 'funnel', 'resultado', 'revisar', 'revision']],
    ['monetizacion', 'Monetización', ['monetizar', 'monetizacion', 'precio', 'pricing', 'pago', 'suscripcion', 'revenue', 'ingreso', 'venta', 'cobrar', 'facturar', 'modelo', 'negocio']],
    ['producto', 'Producto', ['producto', 'app', 'aplicacion', 'plataforma', 'feature', 'funcionalidad', 'mejora', 'bug', 'interfaz', 'ux', 'diseno', 'flujo', 'modulo', 'componente', 'pantalla']],
    ['estrategia', 'Estrategia', ['estrategia', 'plan', 'roadmap', 'objetivo', 'meta', 'vision', 'prioridad', 'foco', 'enfoque', 'decision', 'establecer', 'definir', 'trimestre']],
    ['marca', 'Marca y comunidad', ['marca', 'identidad', 'reputacion', 'comunidad', 'presencia', 'imagen', 'branding', 'reconocimiento', 'awareness', 'nombre']],
];

interface ParseableReport {
    id: string;
    contenido: string;
    remitente: string;
}

export interface ItemAnalizado {
    texto: string;
    remitente: string;
    seccion: string;
    reportId: string;
}

export interface GrupoConsenso {
    items: ItemAnalizado[];
    fuentes: string[];
    tema: string;
}

export interface AnalisisConsenso {
    consenso: GrupoConsenso[];
    diferencias: ItemAnalizado[];
}

function genId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getBloque(texto: string, nombreRe: string): string | null {
    const headerRe = new RegExp(`^[ \\t]*(?:#{1,6}[ \\t]+)?(?:${nombreRe})[ \\t]*:?[ \\t]*$`, 'i');
    const lines = texto.split(/\r?\n/);
    let startIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (headerRe.test(lines[i])) { startIdx = i + 1; break; }
    }
    if (startIdx === -1) return null;
    let endIdx = lines.length;
    for (let i = startIdx; i < lines.length; i++) {
        if (CUALQUIER_SECCION.test(lines[i]) && !headerRe.test(lines[i])) {
            endIdx = i;
            break;
        }
    }
    return lines.slice(startIdx, endIdx).join('\n');
}

export function debugGetBloque(texto: string, nombreRe: string) {
    const headerRe = new RegExp(`^[ \\t]*(?:#{1,6}[ \\t]+)?(?:${nombreRe})[ \\t]*:?[ \\t]*$`, 'i');
    const lines = texto.split(/\r?\n/);
    let startIdx = -1;
    let lineaTexto: string | null = null;
    for (let i = 0; i < lines.length; i++) {
        if (headerRe.test(lines[i])) { startIdx = i; lineaTexto = lines[i]; break; }
    }
    if (startIdx === -1) {
        return { patron: headerRe.source, lineaIdx: -1, lineaTexto: null as string | null, bloque: null as string | null, primeras: lines.slice(0, 15) };
    }
    let endIdx = lines.length;
    for (let i = startIdx + 1; i < lines.length; i++) {
        if (CUALQUIER_SECCION.test(lines[i]) && !headerRe.test(lines[i])) { endIdx = i; break; }
    }
    const bloque = lines.slice(startIdx + 1, endIdx).join('\n');
    return { patron: headerRe.source, lineaIdx: startIdx, lineaTexto, bloque, primeras: [] as string[] };
}

export function parsearSeccion(texto: string, sectionRe: string): string[] {
    const bloque = getBloque(texto, sectionRe);
    if (!bloque) return [];
    return bloque
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !/^#{1,6}/.test(l) && !/^[A-ZÁÉÍÓÚÜÑ]{3,}:?\s*$/.test(l))
        .map(l => l.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').replace(/[(\[]\s*(alta|media|baja)\s*[)\]]/gi, '').trim())
        .filter(l => l.length > 4);
}

function normTexto(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '');
}

export function camposSemanticos(s: string): Set<string> {
    const norm = normTexto(s);
    const result = new Set<string>();
    for (const [id, , keywords] of CAMPOS) {
        for (const kw of keywords) {
            if (norm.includes(kw) || norm.split(/\s+/).some(w => w.length >= 5 && w.startsWith(kw.slice(0, 5)))) {
                result.add(id);
                break;
            }
        }
    }
    return result;
}

export function similitudLexica(a: string, b: string): number {
    const STOP = new Set(['de', 'la', 'el', 'en', 'que', 'con', 'por', 'para', 'una', 'un', 'los', 'las', 'del', 'al', 'se', 'y', 'o', 'a', 'es', 'su', 'lo', 'no', 'mas', 'sus', 'son', 'como', 'pero', 'si', 'ya']);
    const palabras = (s: string) => new Set(normTexto(s).split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)));
    const wa = palabras(a);
    const wb = palabras(b);
    if (!wa.size || !wb.size) return 0;
    let shared = 0;
    for (const w of wa) if (wb.has(w)) shared++;
    return shared / Math.min(wa.size, wb.size);
}

export function similitudSemantica(a: string, b: string): number {
    const ca = camposSemanticos(a);
    const cb = camposSemanticos(b);
    if (!ca.size || !cb.size) return 0;
    let shared = 0;
    for (const c of ca) if (cb.has(c)) shared++;
    return shared / Math.max(ca.size, cb.size);
}

export function similitudCombinada(a: string, b: string): number {
    return Math.max(similitudLexica(a, b), similitudSemantica(a, b) * 0.9);
}

function derivarTema(items: ItemAnalizado[]): string {
    const campoFuentes = new Map<string, Set<string>>();
    for (const item of items) {
        for (const campo of camposSemanticos(item.texto)) {
            if (!campoFuentes.has(campo)) campoFuentes.set(campo, new Set());
            campoFuentes.get(campo)!.add(item.remitente);
        }
    }
    const compartidos = [...campoFuentes.entries()]
        .filter(([, fs]) => fs.size >= 2)
        .map(([id]) => CAMPOS.find(c => c[0] === id)?.[1] ?? id);
    if (compartidos.length) return compartidos.slice(0, 2).join(' · ');
    const top = [...campoFuentes.entries()].sort((a, b) => b[1].size - a[1].size)[0];
    return top ? (CAMPOS.find(c => c[0] === top[0])?.[1] ?? 'Punto común') : 'Punto común';
}

export function analizarConsenso(aceptados: ParseableReport[]): AnalisisConsenso {
    const todos: ItemAnalizado[] = [];
    for (const inf of aceptados) {
        for (const { re, label } of SECCIONES) {
            for (const texto of parsearSeccion(inf.contenido, re)) {
                todos.push({ texto, remitente: inf.remitente, seccion: label, reportId: inf.id });
            }
        }
    }

    const usados = new Set<number>();
    const consenso: GrupoConsenso[] = [];
    const diferencias: ItemAnalizado[] = [];

    for (let i = 0; i < todos.length; i++) {
        if (usados.has(i)) continue;
        const grupo = [todos[i]];
        const fuentes = new Set([todos[i].remitente]);
        for (let j = i + 1; j < todos.length; j++) {
            if (usados.has(j) || todos[j].remitente === todos[i].remitente) continue;
            if (similitudCombinada(todos[i].texto, todos[j].texto) >= 0.35) {
                grupo.push(todos[j]);
                fuentes.add(todos[j].remitente);
                usados.add(j);
            }
        }
        usados.add(i);
        if (fuentes.size >= 2) consenso.push({ items: grupo, fuentes: [...fuentes], tema: derivarTema(grupo) });
        else diferencias.push(todos[i]);
    }

    return { consenso, diferencias };
}

export function toCouncilReports(aceptados: ParseableReport[]): CouncilReport[] {
    return aceptados.map(r => ({
        id: r.id,
        title: `Informe ${r.remitente}`,
        content: r.contenido,
        source: r.remitente,
        createdAt: new Date().toISOString(),
        status: 'aceptado',
    }));
}

export function buildConsensusResult(aceptados: ParseableReport[]): ConsensusResult {
    const analysis = analizarConsenso(aceptados);
    const agreements = analysis.consenso.map(g => {
        const sectionFreq = new Map<string, number>();
        for (const item of g.items) sectionFreq.set(item.seccion, (sectionFreq.get(item.seccion) || 0) + 1);
        const section = [...sectionFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? g.items[0].seccion;
        const reportIds = [...new Set(g.items.map(i => i.reportId))];
        return {
            id: genId('agr'),
            theme: g.tema,
            section,
            text: g.items[0].texto,
            sources: g.fuentes,
            reportIds,
        };
    });

    const differences = analysis.diferencias.map(d => ({
        id: genId('dif'),
        section: d.seccion,
        text: d.texto,
        source: d.remitente,
        reportId: d.reportId,
    }));

    return {
        id: genId('consensus'),
        createdAt: new Date().toISOString(),
        reportIds: aceptados.map(r => r.id),
        agreements,
        differences,
    };
}
