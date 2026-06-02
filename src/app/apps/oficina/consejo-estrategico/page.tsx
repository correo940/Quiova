'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ChevronLeft, Scale, Plus, X, Check, XCircle,
    Clock, Trash2, ChevronDown, ChevronUp,
    AlertTriangle, CheckCircle2, GitMerge,
} from 'lucide-react';
import { useOficinaRegistros, type InformeConsejo, type TareaGabinete } from '@/hooks/useOficinaRegistros';
import {
    generarInformeOficial as generarInformeOficialServicio,
    analizarConsenso as analizarConsensoServicio,
    buildExecutionTasksFromDecision,
    createDecision,
} from '@/lib/oficina';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';
const REMITENTES = ['ChatGPT', 'Claude', 'Gemini', 'NotebookLM', 'Otro'] as const;
const SECCIONES = [
    { re: 'prioridades?',           label: 'Prioridades'    },
    { re: 'acciones?',              label: 'Acciones'       },
    { re: 'métricas?|metricas?',    label: 'Métricas'       },
    { re: 'riesgos?',               label: 'Riesgos'        },
    { re: 'observaciones?',         label: 'Observaciones'  },
] as const;

// ── Parsers ───────────────────────────────────────────────────────────────────

// Regex que reconoce CUALQUIER cabecera de sección conocida como límite de bloque.
// Cuanto más secciones se añadan a SECCIONES, más preciso se vuelve el corte.
const CUALQUIER_SECCION = /^[ \t]*(?:#{1,6}[ \t]+)?(?:prioridades?|acciones?|m[eé]tricas?|metricas?|riesgos?|observaciones?|recomendaciones?|conclusiones?|resumen|siguientes?(?:[ \t]+pasos?)?)[ \t]*:?[ \t]*$/i;

// Enfoque línea a línea: más tolerante a saltos de línea mixtos (\r\n / \n)
// y a espacios/tabulaciones antes o después de la cabecera.
function getBloque(texto: string, nombreRe: string): string | null {
    // Coincidencia exacta de línea: acepta ##/### opcionales, nombre, dos puntos opcionales
    const headerRe = new RegExp(
        `^[ \\t]*(?:#{1,6}[ \\t]+)?(?:${nombreRe})[ \\t]*:?[ \\t]*$`,
        'i',
    );
    const lines = texto.split(/\r?\n/);

    // Buscar la línea que actúa de cabecera
    let startIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (headerRe.test(lines[i])) { startIdx = i + 1; break; }
    }
    if (startIdx === -1) return null;

    // Buscar el inicio de la siguiente sección (usando CUALQUIER_SECCION)
    let endIdx = lines.length;
    for (let i = startIdx; i < lines.length; i++) {
        if (CUALQUIER_SECCION.test(lines[i]) && !headerRe.test(lines[i])) {
            endIdx = i; break;
        }
    }

    return lines.slice(startIdx, endIdx).join('\n');
}

// Solo para diagnóstico — replica la lógica de getBloque exponiendo los pasos internos
function debugGetBloque(texto: string, nombreRe: string) {
    const headerRe = new RegExp(
        `^[ \\t]*(?:#{1,6}[ \\t]+)?(?:${nombreRe})[ \\t]*:?[ \\t]*$`,
        'i',
    );
    const lines = texto.split(/\r?\n/);
    let startIdx = -1;
    let lineaTexto: string | null = null;
    for (let i = 0; i < lines.length; i++) {
        if (headerRe.test(lines[i])) { startIdx = i; lineaTexto = lines[i]; break; }
    }
    if (startIdx === -1) {
        // Devolver las primeras 15 líneas para inspeccionarlas
        return {
            patron: headerRe.source,
            lineaIdx: -1,
            lineaTexto: null as string | null,
            bloque: null as string | null,
            primeras: lines.slice(0, 15),
        };
    }
    let endIdx = lines.length;
    for (let i = startIdx + 1; i < lines.length; i++) {
        if (CUALQUIER_SECCION.test(lines[i]) && !headerRe.test(lines[i])) { endIdx = i; break; }
    }
    const bloque = lines.slice(startIdx + 1, endIdx).join('\n');
    return { patron: headerRe.source, lineaIdx: startIdx, lineaTexto, bloque, primeras: [] as string[] };
}

function parsearSeccion(texto: string, sectionRe: string): string[] {
    const bloque = getBloque(texto, sectionRe);
    if (!bloque) return [];
    return bloque.split('\n')
        .map(l => l.trim())
        .filter(l => l && !/^#{1,6}/.test(l) && !/^[A-ZÁÉÍÓÚÜÑ]{3,}:?\s*$/.test(l))
        .map(l =>
            l.replace(/^[-*•]\s*/, '')
             .replace(/^\d+[.)]\s*/, '')
             .replace(/[(\[]\s*(alta|media|baja)\s*[)\]]/gi, '')
             .trim(),
        )
        .filter(l => l.length > 4);
}

// ── Análisis de consenso semántico ───────────────────────────────────────────
//
// Cada ítem se mapea a campos semánticos (conceptos) en lugar de comparar
// palabras literales. Dos ítems de distintas fuentes se agrupan como CONSENSO
// si comparten al menos un campo semántico o tienen similitud léxica ≥ 0.35.

// [id, etiqueta visible, keywords normalizadas (sin tildes)]
const CAMPOS: [string, string, string[]][] = [
    ['usuarios',     'Validación con usuarios',
     ['usuario', 'usuarios', 'cliente', 'clientes', 'persona', 'personas',
      'externo', 'externos', 'real', 'reales', 'tester', 'beta', 'early',
      'adopter', 'validar', 'validacion', 'probar', 'prueba', 'testear',
      'feedback', 'entrevista', 'encuesta', 'comentario', 'opinion', 'recibir']],

    ['aprendizaje',  'Aprendizaje de usuario',
     ['aprender', 'aprendizaje', 'observar', 'observacion', 'insight',
      'descubrir', 'investigar', 'investigacion', 'entender', 'conocer',
      'escuchar', 'recoger', 'recogida', 'entrevista']],

    ['propuesta',    'Propuesta de valor',
     ['propuesta', 'valor', 'nucleo', 'mensaje', 'diferencial', 'diferenciacion',
      'beneficio', 'ventaja', 'solucion', 'utilidad', 'piloto', 'frase',
      'posicionamiento', 'comunicar', 'definir', 'principal', 'unico', 'clave']],

    ['lanzamiento',  'Lanzamiento',
     ['lanzar', 'lanzamiento', 'publicar', 'publicacion', 'version', 'estable',
      'demo', 'preparar', 'mvp', 'release', 'deploy', 'estrenar', 'presentar',
      'landing', 'pagina', 'web', 'sitio']],

    ['contenido',    'Contenido',
     ['contenido', 'video', 'post', 'articulo', 'reel', 'story', 'editorial',
      'canal', 'youtube', 'tiktok', 'instagram', 'red', 'social', 'publicar',
      'escribir', 'crear', 'grabar']],

    ['crecimiento',  'Crecimiento',
     ['crecer', 'crecimiento', 'traccion', 'audiencia', 'alcance', 'visibilidad',
      'captacion', 'conseguir', 'atraer', 'ganar', 'aumentar', 'escalar',
      'primeros', 'nuevos']],

    ['metricas',     'Métricas',
     ['metrica', 'metricas', 'kpi', 'dato', 'datos', 'analytics', 'seguimiento',
      'medir', 'medicion', 'conversion', 'retention', 'churn', 'funnel',
      'resultado', 'revisar', 'revision']],

    ['monetizacion', 'Monetización',
     ['monetizar', 'monetizacion', 'precio', 'pricing', 'pago', 'suscripcion',
      'revenue', 'ingreso', 'venta', 'cobrar', 'facturar', 'modelo', 'negocio']],

    ['producto',     'Producto',
     ['producto', 'app', 'aplicacion', 'plataforma', 'feature', 'funcionalidad',
      'mejora', 'bug', 'interfaz', 'ux', 'diseno', 'flujo', 'modulo',
      'componente', 'pantalla']],

    ['estrategia',   'Estrategia',
     ['estrategia', 'plan', 'roadmap', 'objetivo', 'meta', 'vision', 'prioridad',
      'foco', 'enfoque', 'decision', 'establecer', 'definir', 'trimestre']],

    ['marca',        'Marca y comunidad',
     ['marca', 'identidad', 'reputacion', 'comunidad', 'presencia', 'imagen',
      'branding', 'reconocimiento', 'awareness', 'nombre']],
];

function normTexto(s: string): string {
    return s.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s]/g, '');
}

function camposSemanticos(s: string): Set<string> {
    const norm = normTexto(s);
    const result = new Set<string>();
    for (const [id, , keywords] of CAMPOS) {
        for (const kw of keywords) {
            // Coincidencia exacta de substring o prefijo (cubre plurales/conjugaciones)
            if (norm.includes(kw) || norm.split(/\s+/).some(w => w.length >= 5 && w.startsWith(kw.slice(0, 5)))) {
                result.add(id);
                break;
            }
        }
    }
    return result;
}

function similitudLexica(a: string, b: string): number {
    const STOP = new Set(['de', 'la', 'el', 'en', 'que', 'con', 'por', 'para', 'una', 'un', 'los', 'las', 'del', 'al', 'se', 'y', 'o', 'a', 'es', 'su', 'lo', 'no', 'mas', 'sus', 'son', 'como', 'pero', 'si', 'ya']);
    const palabras = (s: string) => new Set(normTexto(s).split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)));
    const wa = palabras(a);
    const wb = palabras(b);
    if (!wa.size || !wb.size) return 0;
    let shared = 0;
    for (const w of wa) if (wb.has(w)) shared++;
    return shared / Math.min(wa.size, wb.size);
}

function similitudSemantica(a: string, b: string): number {
    const ca = camposSemanticos(a);
    const cb = camposSemanticos(b);
    if (!ca.size || !cb.size) return 0;
    let shared = 0;
    for (const c of ca) if (cb.has(c)) shared++;
    return shared / Math.max(ca.size, cb.size);
}

// Combina léxica y semántica; la semántica tiene peso ligeramente menor
// para evitar falsos positivos por campo muy genérico.
function similitudCombinada(a: string, b: string): number {
    return Math.max(similitudLexica(a, b), similitudSemantica(a, b) * 0.9);
}

function derivarTema(items: ItemAnalizado[]): string {
    // Campos presentes en ítems de 2+ fuentes distintas
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
    // Fallback: campo más detectado en el grupo
    const top = [...campoFuentes.entries()].sort((a, b) => b[1].size - a[1].size)[0];
    return top ? (CAMPOS.find(c => c[0] === top[0])?.[1] ?? 'Punto común') : 'Punto común';
}

interface ItemAnalizado { texto: string; remitente: string; seccion: string }

function analizarConsenso(aceptados: InformeConsejo[]) {
    const todos: ItemAnalizado[] = [];
    for (const inf of aceptados) {
        for (const { re, label } of SECCIONES) {
            for (const texto of parsearSeccion(inf.contenido, re)) {
                todos.push({ texto, remitente: inf.remitente, seccion: label });
            }
        }
    }

    const usados = new Set<number>();
    const consenso: { items: ItemAnalizado[]; fuentes: string[]; tema: string }[] = [];
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

// ── Generar Informe Oficial ───────────────────────────────────────────────────

function deduplicar(items: string[]): string[] {
    const out: string[] = [];
    for (const item of items) {
        if (!out.some(r => similitudCombinada(r, item) >= 0.7)) out.push(item);
    }
    return out;
}

type AccionParseada = Pick<TareaGabinete, 'titulo' | 'urgencia' | 'estado' | 'contexto'>;

function generarInformeOficial(aceptados: InformeConsejo[]): { titulo: string; contenido: string; acciones: AccionParseada[] } {
    const fuentes = [...new Set(aceptados.map(i => i.remitente))];
    const fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const titulo = `Informe Oficial del Consejo Estratégico — ${fecha}`;

    const { consenso, diferencias } = analizarConsenso(aceptados);

    // Sección dominante de un grupo = la más frecuente entre sus ítems
    function seccionDominante(items: ItemAnalizado[]): string {
        const freq = new Map<string, number>();
        for (const item of items) freq.set(item.seccion, (freq.get(item.seccion) || 0) + 1);
        return [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? items[0].seccion;
    }

    // Agrupar consenso por sección; usar el primer ítem como texto representativo
    const consensoPorSeccion: Record<string, string[]> = {};
    for (const grupo of consenso) {
        const sec = seccionDominante(grupo.items);
        (consensoPorSeccion[sec] ??= []).push(grupo.items[0].texto);
    }

    // Agrupar diferencias por fuente
    const difPorFuente: Record<string, string[]> = {};
    for (const d of diferencias) {
        (difPorFuente[d.remitente] ??= []).push(d.texto);
    }

    const partes: string[] = [];
    const accionesRaw: string[] = [];

    // ── Cabecera ─────────────────────────────────────────────────────────────
    partes.push(`Consejo Estratégico · Informe Oficial`);
    partes.push(`Fuentes: ${fuentes.join(', ')} · ${fecha}`);
    partes.push('');

    // ── Secciones consensuadas ────────────────────────────────────────────────
    let hayConsensado = false;
    for (const { label } of SECCIONES) {
        const items = consensoPorSeccion[label];
        if (!items?.length) continue;
        hayConsensado = true;
        partes.push(`## ${label}`);
        items.forEach(t => partes.push(`- ${t}`));
        partes.push('');
        if (label === 'Acciones') accionesRaw.push(...items);
    }

    // Fallback: si no hubo ningún consenso, fusionar con deduplicación simple
    if (!hayConsensado) {
        for (const { re, label } of SECCIONES) {
            const items = deduplicar(aceptados.flatMap(inf => parsearSeccion(inf.contenido, re)));
            if (!items.length) continue;
            partes.push(`## ${label}`);
            items.forEach(t => partes.push(`- ${t}`));
            partes.push('');
            if (re === 'acciones?') accionesRaw.push(...items);
        }
    }

    // ── Perspectivas únicas ───────────────────────────────────────────────────
    if (diferencias.length > 0) {
        partes.push('## Perspectivas únicas');
        for (const [fuente, items] of Object.entries(difPorFuente)) {
            items.slice(0, 4).forEach(t => partes.push(`- ${t} (${fuente})`));
        }
        partes.push('');
    }

    // ── Decisión Oficial — máx. 10 líneas ────────────────────────────────────
    partes.push('## Decisión Oficial');
    partes.push('');
    const priori   = consensoPorSeccion['Prioridades']    ?? [];
    const acs      = consensoPorSeccion['Acciones']       ?? [];
    const riesgos  = consensoPorSeccion['Riesgos']        ?? [];

    if (consenso.length === 0) {
        partes.push('Sin consenso detectado. Revisar perspectivas individuales antes de tomar decisiones.');
    } else {
        const lineas: string[] = [];
        lineas.push(`Revisados ${aceptados.length} informes de ${fuentes.join(', ')}. ${consenso.length} punto${consenso.length !== 1 ? 's' : ''} acordado${consenso.length !== 1 ? 's' : ''}.`);
        if (priori.length)       lineas.push(`Prioridad principal: ${priori[0]}.`);
        if (priori.length > 1)   lineas.push(`Otras prioridades: ${priori.slice(1, 3).join('; ')}.`);
        if (acs.length)          lineas.push(`Acción inmediata: ${acs[0]}.`);
        if (acs.length > 1)      lineas.push(`Acciones de seguimiento: ${acs.slice(1, 4).join('; ')}.`);
        if (riesgos.length)      lineas.push(`Riesgo principal: ${riesgos[0]}.`);
        if (diferencias.length)  lineas.push(`${diferencias.length} perspectiva${diferencias.length !== 1 ? 's' : ''} única${diferencias.length !== 1 ? 's' : ''} — ver sección Perspectivas únicas.`);
        partes.push(...lineas.slice(0, 10));
    }

    const tareaAcciones: AccionParseada[] = accionesRaw.map(t => ({
        titulo: t,
        urgencia: 'esta-semana' as TareaGabinete['urgencia'],
        estado: 'pendiente' as TareaGabinete['estado'],
        contexto: 'Informe Oficial del Consejo Estratégico',
    }));

    return { titulo, contenido: partes.join('\n'), acciones: tareaAcciones };
}

// ── Helpers UI ────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function EstadoBadge({ estado }: { estado: InformeConsejo['estado'] }) {
    if (estado === 'aceptado') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Aceptado</span>;
    if (estado === 'rechazado') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 line-through">Rechazado</span>;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">Pendiente</span>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConsejoEstrategicoPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const {
        consejo, cargando,
        agregarInformeConsejo, cambiarEstadoInformeConsejo, eliminarInformeConsejo,
        analizarYGuardarInforme,
    } = useOficinaRegistros();

    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState({ titulo: '', contenido: '', remitente: 'ChatGPT' });
    const [err, setErr] = useState('');
    const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
    const [fusionOk, setFusionOk] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    if (loading || cargando || !user || user.email !== ADMIN_EMAIL) return null;

    const aceptados = consejo.filter(i => i.estado === 'aceptado');
    const analisis = aceptados.length >= 2 ? analizarConsensoServicio(aceptados) : { consenso: [], diferencias: [] };
    const remitentes = [...new Set(consejo.map(i => i.remitente))];

    // ── Debug data ───────────────────────────────────────────────────────────
    const debugItems: { texto: string; remitente: string; seccion: string; campos: string[] }[] = [];
    for (const inf of aceptados) {
        for (const { re, label } of SECCIONES) {
            for (const texto of parsearSeccion(inf.contenido, re)) {
                const ids = [...camposSemanticos(texto)];
                const labels = ids.map(id => CAMPOS.find(c => c[0] === id)?.[1] ?? id);
                debugItems.push({ texto, remitente: inf.remitente, seccion: label, campos: labels });
            }
        }
    }
    const debugPares: { rA: string; a: string; rB: string; b: string; lexica: number; semantica: number; combinada: number }[] = [];
    for (let i = 0; i < debugItems.length; i++) {
        for (let j = i + 1; j < debugItems.length; j++) {
            if (debugItems[i].remitente === debugItems[j].remitente) continue;
            debugPares.push({
                rA: debugItems[i].remitente, a: debugItems[i].texto,
                rB: debugItems[j].remitente, b: debugItems[j].texto,
                lexica:    similitudLexica(debugItems[i].texto, debugItems[j].texto),
                semantica: similitudSemantica(debugItems[i].texto, debugItems[j].texto),
                combinada: similitudCombinada(debugItems[i].texto, debugItems[j].texto),
            });
        }
    }

    function submit() {
        // Diagnóstico temporal: ver exactamente qué se va a guardar
        console.log('[Consejo] submit — length:', form.contenido.length);
        console.log('[Consejo] submit — JSON:', JSON.stringify(form.contenido.slice(0, 300)));
        if (!form.titulo.trim()) { setErr('El título es obligatorio.'); return; }
        if (!form.contenido.trim()) { setErr('El contenido es obligatorio.'); return; }
        agregarInformeConsejo({ titulo: form.titulo.trim(), contenido: form.contenido.trim(), remitente: form.remitente });
        setForm({ titulo: '', contenido: '', remitente: 'ChatGPT' });
        setErr('');
        setFormOpen(false);
    }

    function toggleExpand(id: string) {
        setExpandidos(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function fusionar() {
        if (aceptados.length < 2) return;
        const { titulo, contenido, acciones, consensusResult, executiveBrief } = generarInformeOficialServicio(aceptados);
        const briefPublicado = { ...executiveBrief, status: 'publicado' as const };
        const decision = createDecision(briefPublicado, {
            status: 'aprobada',
            responsable: 'Director General',
        });
        const executionTasks = buildExecutionTasksFromDecision(decision, briefPublicado.actions);
        analizarYGuardarInforme(
            { titulo, contenido, remitente: 'Consejo Estratégico' },
            acciones,
            {
                consensusResult,
                executiveBrief: briefPublicado,
                decision,
                executionTasks,
            },
        );
        setFusionOk(true);
        setTimeout(() => setFusionOk(false), 4000);
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-6 animate-in fade-in duration-500">

            <Link href="/apps/oficina" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" /> Oficina
            </Link>

            {/* Header */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950 p-8 md:p-10 shadow-xl">
                <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, #8b5cf6 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                <div className="relative space-y-4">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-400/70 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                        <Scale className="w-3.5 h-3.5" /> Despacho 05 · Consejo Estratégico
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">Consejo<br />Estratégico</h1>
                    <p className="text-violet-200/40 text-xs font-mono">
                        Síntesis de inteligencias · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Registrar informe */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setFormOpen(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-violet-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Registrar informe</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{formOpen ? '▲' : '▼'}</span>
                </button>

                {formOpen && (
                    <div className="border-t border-border/40 p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Remitente</label>
                                <select
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                                    value={form.remitente}
                                    onChange={e => setForm(f => ({ ...f, remitente: e.target.value }))}
                                >
                                    {REMITENTES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Título</label>
                                <input
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                                    placeholder="Ej: Diagnóstico Q2 2026"
                                    value={form.titulo}
                                    onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Contenido</label>
                            <textarea
                                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                                rows={10}
                                placeholder="Pega aquí el informe completo..."
                                value={form.contenido}
                                onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))}
                            />
                        </div>
                        {/* Diagnóstico pre-guardado */}
                        {form.contenido.length > 0 && (
                            <div className="font-mono text-[10px] bg-black/5 dark:bg-white/5 rounded-xl p-3 space-y-1 border border-border/30">
                                <p className="font-bold text-muted-foreground uppercase tracking-wider">Diagnóstico pre-guardado</p>
                                <p className="text-muted-foreground">length: {form.contenido.length}</p>
                                <p className="text-muted-foreground">
                                    \n count: {(form.contenido.match(/\n/g) || []).length} &nbsp;|&nbsp;
                                    \r count: {(form.contenido.match(/\r/g) || []).length}
                                </p>
                                <p className="break-all text-foreground leading-relaxed">
                                    {JSON.stringify(form.contenido.slice(0, 300))}
                                </p>
                            </div>
                        )}

                        {err && <p className="text-xs text-red-500">{err}</p>}
                        <div className="flex gap-2">
                            <button onClick={submit} className="flex-1 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-bold transition-colors">
                                Registrar informe
                            </button>
                            <button onClick={() => { setFormOpen(false); setErr(''); }} className="p-2.5 rounded-xl bg-muted hover:bg-muted/70 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Informes por remitente */}
            {consejo.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border/60 p-10 text-center space-y-3">
                    <Scale className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                    <p className="font-semibold text-muted-foreground">Sin informes registrados</p>
                    <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto leading-relaxed">
                        Registra informes de distintas IAs para activar el análisis comparativo y la fusión.
                    </p>
                </div>
            ) : (
                remitentes.map(remitente => {
                    const items = consejo.filter(i => i.remitente === remitente);
                    const nAceptados = items.filter(i => i.estado === 'aceptado').length;
                    return (
                        <div key={remitente} className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{remitente}</span>
                                    <span className="text-[10px] text-muted-foreground">{items.length} informe{items.length > 1 ? 's' : ''}</span>
                                </div>
                                {nAceptados > 0 && (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                        {nAceptados} aceptado{nAceptados > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <ul className="divide-y divide-border/40">
                                {items.map(inf => (
                                    <li key={inf.id} className={inf.estado === 'rechazado' ? 'opacity-50' : ''}>
                                        <div className="p-4 flex items-start gap-3">
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-semibold">{inf.titulo}</span>
                                                    <EstadoBadge estado={inf.estado} />
                                                </div>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {fmtFecha(inf.fecha)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => cambiarEstadoInformeConsejo(inf.id, inf.estado === 'aceptado' ? 'pendiente' : 'aceptado')}
                                                    className={`p-1.5 rounded-lg transition-colors ${inf.estado === 'aceptado' ? 'bg-emerald-500/15 text-emerald-500' : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10'}`}
                                                    title={inf.estado === 'aceptado' ? 'Quitar aceptación' : 'Aceptar'}
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => cambiarEstadoInformeConsejo(inf.id, inf.estado === 'rechazado' ? 'pendiente' : 'rechazado')}
                                                    className={`p-1.5 rounded-lg transition-colors ${inf.estado === 'rechazado' ? 'bg-red-500/15 text-red-500' : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'}`}
                                                    title={inf.estado === 'rechazado' ? 'Quitar rechazo' : 'Rechazar'}
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpand(inf.id)}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                                    title={expandidos.has(inf.id) ? 'Colapsar' : 'Ver contenido'}
                                                >
                                                    {expandidos.has(inf.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => eliminarInformeConsejo(inf.id)}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {expandidos.has(inf.id) && (
                                            <div className="px-5 pb-4 pt-2 border-t border-border/40 space-y-3">
                                                {SECCIONES.map(({ re, label }) => {
                                                    const secItems = parsearSeccion(inf.contenido, re);
                                                    if (!secItems.length) return null;
                                                    return (
                                                        <div key={label}>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                                                            <ul className="space-y-0.5">
                                                                {secItems.map((item, idx) => (
                                                                    <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                                                                        {item}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    );
                                                })}
                                                {SECCIONES.every(({ re }) => !parsearSeccion(inf.contenido, re).length) && (
                                                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{inf.contenido}</p>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })
            )}

            {/* Análisis comparativo — solo con 2+ aceptados */}
            {aceptados.length >= 2 && (
                <>
                    {/* CONSENSO */}
                    <div className="bg-card border border-emerald-500/20 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Consenso</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {analisis.consenso.length} punto{analisis.consenso.length !== 1 ? 's' : ''} compartido{analisis.consenso.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        {analisis.consenso.length === 0 ? (
                            <p className="p-5 text-xs text-muted-foreground">No se detectaron coincidencias entre los informes aceptados.</p>
                        ) : (
                            <ul className="divide-y divide-border/40">
                                {analisis.consenso.map((grupo, idx) => (
                                    <li key={idx} className="p-4 space-y-2.5">
                                        {/* Tema semántico */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{grupo.tema}</span>
                                            <span className="text-[10px] text-muted-foreground">· {grupo.items[0].seccion}</span>
                                        </div>
                                        {/* Una fila por IA */}
                                        <div className="space-y-1.5">
                                            {grupo.items.map((item, i) => (
                                                <div key={i} className="flex items-start gap-2.5">
                                                    <span className="text-[10px] font-bold text-muted-foreground/70 shrink-0 pt-0.5 min-w-[52px]">{item.remitente}</span>
                                                    <span className="text-sm leading-snug">{item.texto}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* DIFERENCIAS */}
                    {analisis.diferencias.length > 0 && (
                        <div className="bg-card border border-amber-500/20 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Diferencias</p>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {analisis.diferencias.length} punto{analisis.diferencias.length !== 1 ? 's' : ''} único{analisis.diferencias.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="p-4 space-y-4">
                                {[...new Set(analisis.diferencias.map(d => d.remitente))].map(rem => {
                                    const difsRem = analisis.diferencias.filter(d => d.remitente === rem);
                                    return (
                                        <div key={rem}>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{rem}</p>
                                            <ul className="space-y-1">
                                                {difsRem.map((item, idx) => (
                                                    <li key={idx} className="flex items-start gap-1.5">
                                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-500/50 shrink-0" />
                                                        <span className="text-xs flex-1">{item.texto}</span>
                                                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{item.seccion}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Fusionar → Director General */}
                    <div className="bg-card border border-violet-500/20 rounded-2xl p-5 space-y-3 shadow-sm">
                        <div className="space-y-1">
                            <p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Decisión Oficial</p>
                            <p className="text-xs text-muted-foreground">
                                Fusionar {aceptados.length} informe{aceptados.length > 1 ? 's' : ''} aceptado{aceptados.length > 1 ? 's' : ''} en un Informe Oficial y enviarlo al Director General.
                            </p>
                        </div>
                        {fusionOk ? (
                            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-4 h-4" />
                                Informe Oficial enviado al Director General · Tareas creadas en Jefe de Gabinete
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={fusionar}
                                className="w-full py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                <GitMerge className="w-4 h-4" />
                                Fusionar informes → Director General
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* DEBUG CONSENSO */}
            {aceptados.length >= 1 && (
                <details className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
                    <summary className="px-5 py-3 cursor-pointer select-none text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-2">
                        ⚙ Debug Consenso
                    </summary>
                    <div className="px-5 pb-5 pt-4 space-y-5 font-mono text-xs border-t border-border/40">

                        {/* 0 — Contenido raw */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">0 — Contenido almacenado (raw)</p>
                            {aceptados.map(inf => (
                                <div key={inf.id} className="space-y-1">
                                    <p className="font-bold text-violet-500">{inf.remitente}</p>
                                    <p className="text-muted-foreground">length: {inf.contenido.length}</p>
                                    <p className="text-foreground break-all bg-black/10 dark:bg-white/5 rounded p-2 leading-relaxed">
                                        {JSON.stringify(inf.contenido.slice(0, 200))}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* 0.5 — Debug getBloque() línea a línea */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">0.5 — Debug getBloque() por sección</p>
                            {aceptados.map(inf => (
                                <div key={inf.id} className="space-y-2">
                                    <p className="font-bold text-violet-500">
                                        {inf.remitente} — {inf.contenido.split(/\n/).length} líneas totales
                                    </p>
                                    {SECCIONES.map(({ re, label }) => {
                                        const d = debugGetBloque(inf.contenido, re);
                                        return (
                                            <div key={label} className={`p-2 rounded border space-y-1 ${d.lineaIdx >= 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                                <p className="font-bold">{label}</p>
                                                <p className="text-muted-foreground break-all">patrón: /{d.patron}/i</p>
                                                {d.lineaIdx >= 0 ? (
                                                    <>
                                                        <p className="text-emerald-500">
                                                            ✓ línea {d.lineaIdx}: {JSON.stringify(d.lineaTexto)}
                                                        </p>
                                                        <p className="break-all">
                                                            bloque ({d.bloque?.length ?? 0} chars): {JSON.stringify((d.bloque ?? '').slice(0, 200))}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-red-500 font-bold">✗ Cabecera no encontrada</p>
                                                        <p className="text-muted-foreground">Primeras 15 líneas del informe:</p>
                                                        {d.primeras.map((l, i) => (
                                                            <p key={i} className="break-all text-muted-foreground">
                                                                <span className="text-muted-foreground/50 mr-1">{i}:</span>
                                                                {JSON.stringify(l)}
                                                            </p>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        {/* 1 — Secciones detectadas por informe */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">1 — Secciones detectadas por informe</p>
                            {aceptados.map(inf => (
                                <div key={inf.id} className="space-y-1">
                                    <p className="font-bold text-violet-500">{inf.remitente}</p>
                                    {SECCIONES.map(({ re, label }) => {
                                        const items = parsearSeccion(inf.contenido, re);
                                        return (
                                            <div key={label} className="pl-3 flex items-baseline gap-2">
                                                {items.length > 0 ? (
                                                    <>
                                                        <span className="text-emerald-500 shrink-0">✓</span>
                                                        <span className="text-foreground">{label} ({items.length}): &quot;{items[0]}&quot;</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-red-500 shrink-0">✗</span>
                                                        <span className="text-muted-foreground">{label}: no encontrado</span>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {SECCIONES.every(({ re }) => !parsearSeccion(inf.contenido, re).length) && (
                                        <div className="pl-3 text-amber-500 space-y-0.5">
                                            <p>⚠ Ninguna sección reconocida.</p>
                                            <p>Cabeceras válidas: &quot;Acciones&quot;, &quot;Acciones:&quot;, &quot;## Acciones&quot;, &quot;ACCIONES&quot;</p>
                                            <p>Primeros 100 chars del contenido:</p>
                                            <p className="text-muted-foreground break-all">&quot;{inf.contenido.slice(0, 100)}&quot;</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* 2 — Ítems con campos semánticos */}
                        {debugItems.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">2 — Ítems extraídos y campos detectados</p>
                                {Object.entries(
                                    debugItems.reduce<Record<string, typeof debugItems>>((acc, item) => {
                                        (acc[item.remitente] ??= []).push(item);
                                        return acc;
                                    }, {})
                                ).map(([rem, items]) => (
                                    <div key={rem} className="space-y-1">
                                        <p className="font-bold text-violet-500">{rem}</p>
                                        {items.map((item, i) => (
                                            <div key={i} className="pl-3 border-l-2 border-border/60 space-y-0.5">
                                                <p className="text-foreground">&quot;{item.texto}&quot;</p>
                                                <p className="text-muted-foreground">
                                                    campos: {item.campos.length ? item.campos.join(', ') : '—ninguno—'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 2 — Comparaciones entre fuentes */}
                        {debugPares.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    3 — Comparaciones entre fuentes ({debugPares.length} pares · umbral ≥ 0.35)
                                </p>
                                {debugPares.map((par, idx) => {
                                    const ok = par.combinada >= 0.35;
                                    return (
                                        <div key={idx} className={`p-2.5 rounded-lg border space-y-0.5 ${ok ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/40'}`}>
                                            <p className="text-muted-foreground">{par.rA}: &quot;{par.a}&quot;</p>
                                            <p className="text-muted-foreground">{par.rB}: &quot;{par.b}&quot;</p>
                                            <p className="text-foreground">
                                                lex:{par.lexica.toFixed(2)} · sem:{par.semantica.toFixed(2)} · comb:{par.combinada.toFixed(2)}
                                                <span className={ok ? ' text-emerald-500 font-bold' : ' text-muted-foreground'}>
                                                    {ok ? ' ✓ CONSENSO' : ' ✗'}
                                                </span>
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {debugItems.length > 0 && debugPares.length === 0 && (
                            <p className="text-amber-500">⚠ Hay ítems pero todos son del mismo remitente — no hay pares entre fuentes distintas.</p>
                        )}
                    </div>
                </details>
            )}

        </div>
    );
}
