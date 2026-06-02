'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ElementType } from 'react';
import Link from 'next/link';
import {
    ChevronLeft, User, Crown, Briefcase, TrendingUp, Film,
    Bot, Sparkles, Star, BookOpen, Plus, X, Trash2, Inbox
} from 'lucide-react';
import {
    useOficinaRegistros,
    type TipoDocumento,
    type EstadoDocumento,
    type DocumentoBandeja,
} from '@/hooks/useOficinaRegistros';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

// ── Autores predefinidos ──────────────────────────────────────────────────────

const AUTORES_PREDEFINIDOS = [
    'Director General',
    'Jefe de Gabinete',
    'Director de Crecimiento',
    'Director de Contenido',
    'ChatGPT',
    'Claude',
    'Gemini',
    'NotebookLM',
    'Otro',
] as const;

interface AutorMeta { icono: ElementType; color: string; bg: string; }

const AUTOR_META: Record<string, AutorMeta> = {
    'Director General':        { icono: Crown,      color: 'text-amber-500',   bg: 'bg-amber-500/15' },
    'Jefe de Gabinete':        { icono: Briefcase,  color: 'text-teal-500',    bg: 'bg-teal-500/15' },
    'Director de Crecimiento': { icono: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/15' },
    'Director de Contenido':   { icono: Film,       color: 'text-sky-500',     bg: 'bg-sky-500/15' },
    'ChatGPT':                 { icono: Bot,        color: 'text-teal-600',    bg: 'bg-teal-600/15' },
    'Claude':                  { icono: Sparkles,   color: 'text-orange-500',  bg: 'bg-orange-500/15' },
    'Gemini':                  { icono: Star,       color: 'text-blue-500',    bg: 'bg-blue-500/15' },
    'NotebookLM':              { icono: BookOpen,   color: 'text-indigo-500',  bg: 'bg-indigo-500/15' },
};
const AUTOR_DEFAULT: AutorMeta = { icono: User, color: 'text-slate-500', bg: 'bg-slate-500/15' };

function getAutorMeta(autor: string): AutorMeta {
    return AUTOR_META[autor] ?? AUTOR_DEFAULT;
}

// ── Helpers visuales ──────────────────────────────────────────────────────────

const TIPO_LABEL: Record<TipoDocumento, string> = {
    informe:   'Informe',
    acta:      'Acta',
    análisis:  'Análisis',
    plan:      'Plan',
    nota:      'Nota',
    directiva: 'Directiva',
};

const TIPO_CLS: Record<TipoDocumento, string> = {
    informe:   'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    acta:      'bg-violet-500/10 text-violet-700 dark:text-violet-400',
    análisis:  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    plan:      'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    nota:      'bg-teal-500/10 text-teal-700 dark:text-teal-400',
    directiva: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
};

const ESTADO_OPTS: { value: EstadoDocumento; label: string }[] = [
    { value: 'nuevo',     label: '● Nuevo' },
    { value: 'leido',     label: '○ Leído' },
    { value: 'archivado', label: '▾ Archivado' },
];

const ESTADO_CLS: Record<EstadoDocumento, string> = {
    nuevo:     'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
    leido:     'bg-muted text-muted-foreground',
    archivado: 'bg-muted/40 text-muted-foreground/50',
};

function fmtFecha(iso: string) {
    const d = new Date(iso);
    const hoy = new Date();
    const diffH = Math.floor((hoy.getTime() - d.getTime()) / 3600000);
    if (diffH < 1) return 'hace unos minutos';
    if (diffH < 24) return `hace ${diffH}h`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

type Filtro = 'todos' | EstadoDocumento;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MiDespachoPagina() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { documentos, cargando, agregarDocumento, cambiarEstadoDocumento, eliminarDocumento } = useOficinaRegistros();

    const [filtro, setFiltro] = useState<Filtro>('todos');
    const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState({
        tipo: 'informe' as TipoDocumento,
        titulo: '',
        contenido: '',
        autor: 'Director General',
        autorCustom: '',
    });
    const [err, setErr] = useState('');

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    if (loading || cargando || !user || user.email !== ADMIN_EMAIL) return null;

    function submit() {
        const autorFinal = form.autor === 'Otro' ? form.autorCustom.trim() || 'Sin especificar' : form.autor;
        if (!form.titulo.trim()) { setErr('El título es obligatorio.'); return; }
        agregarDocumento({ tipo: form.tipo, titulo: form.titulo.trim(), contenido: form.contenido.trim(), autor: autorFinal, estado: 'nuevo' });
        setForm({ tipo: 'informe', titulo: '', contenido: '', autor: 'Director General', autorCustom: '' });
        setErr('');
        setFormOpen(false);
    }

    function toggleExpandido(id: string) {
        setExpandidos(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    const nuevos = documentos.filter(d => d.estado === 'nuevo').length;
    const docs = filtro === 'todos' ? documentos : documentos.filter(d => d.estado === filtro);

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-6 animate-in fade-in duration-500">

            <Link href="/apps/oficina" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" /> Oficina
            </Link>

            {/* Header */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-8 md:p-10 shadow-xl">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #6366f1 1px, transparent 1px), radial-gradient(circle at 80% 20%, #8b5cf6 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                <div className="relative space-y-4">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400/70 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                        <User className="w-3.5 h-3.5" />
                        Centro de recepción · Quioba
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">Mi<br />Despacho</h1>
                    <div className="flex items-center gap-3 pt-1">
                        {nuevos > 0 ? (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                {nuevos} {nuevos === 1 ? 'informe nuevo' : 'informes nuevos'}
                            </div>
                        ) : documentos.length > 0 ? (
                            <p className="text-xs text-slate-500 font-mono">Todo leído</p>
                        ) : (
                            <p className="text-xs text-slate-500 font-mono">Sin informes pendientes</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Registrar informe recibido */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setFormOpen(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Registrar informe recibido</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{formOpen ? '▲' : '▼'}</span>
                </button>
                {formOpen && (
                    <div className="border-t border-border/40 p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Remitente</label>
                                <select
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={form.autor}
                                    onChange={e => setForm(f => ({ ...f, autor: e.target.value, autorCustom: '' }))}
                                >
                                    {AUTORES_PREDEFINIDOS.map(a => (
                                        <option key={a} value={a}>{a}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tipo</label>
                                <select
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={form.tipo}
                                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoDocumento }))}
                                >
                                    <option value="informe">Informe</option>
                                    <option value="acta">Acta</option>
                                    <option value="análisis">Análisis</option>
                                    <option value="plan">Plan</option>
                                    <option value="nota">Nota</option>
                                    <option value="directiva">Directiva</option>
                                </select>
                            </div>
                        </div>

                        {form.autor === 'Otro' && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nombre del remitente</label>
                                <input
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Ej: Equipo de diseño"
                                    value={form.autorCustom}
                                    onChange={e => setForm(f => ({ ...f, autorCustom: e.target.value }))}
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Título</label>
                            <input
                                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Ej: Estado Q2 — Mayo 2026"
                                value={form.titulo}
                                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Contenido</label>
                            <textarea
                                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                                rows={6}
                                placeholder="Pega aquí el informe, análisis o resumen recibido..."
                                value={form.contenido}
                                onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))}
                            />
                        </div>
                        {err && <p className="text-xs text-red-500">{err}</p>}
                        <div className="flex gap-2">
                            <button onClick={submit} className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold transition-colors">
                                Guardar en el despacho
                            </button>
                            <button onClick={() => { setFormOpen(false); setErr(''); }} className="p-2.5 rounded-xl bg-muted hover:bg-muted/70 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Filtros */}
            {documentos.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                    {([
                        { key: 'todos',     label: 'Todos',      count: documentos.length },
                        { key: 'nuevo',     label: 'Nuevos',     count: documentos.filter(d => d.estado === 'nuevo').length },
                        { key: 'leido',     label: 'Leídos',     count: documentos.filter(d => d.estado === 'leido').length },
                        { key: 'archivado', label: 'Archivados', count: documentos.filter(d => d.estado === 'archivado').length },
                    ] as const).map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFiltro(f.key as Filtro)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                filtro === f.key
                                    ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-700 dark:text-indigo-300'
                                    : 'bg-muted/40 border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
                            }`}
                        >
                            {f.label}
                            <span className={`text-[10px] font-black ${filtro === f.key ? 'text-indigo-500' : 'text-muted-foreground/60'}`}>
                                {f.count}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Lista */}
            {documentos.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border/60 p-10 text-center space-y-3">
                    <Inbox className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                    <p className="font-semibold text-muted-foreground">No hay informes pendientes en tu despacho</p>
                    <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto leading-relaxed">
                        Aquí llegarán los informes de tu equipo y de las herramientas de IA. Registra el primero cuando lo recibas.
                    </p>
                </div>
            ) : docs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground/50 text-sm">
                    No hay informes en esta categoría.
                </div>
            ) : (
                <div className="space-y-3">
                    {docs.map(doc => {
                        const meta = getAutorMeta(doc.autor);
                        const Icono = meta.icono;
                        const esNuevo = doc.estado === 'nuevo';
                        const esArchivado = doc.estado === 'archivado';
                        const esExpandido = expandidos.has(doc.id);
                        const tieneInforme = Boolean(doc.informeId);

                        return (
                            <div
                                key={doc.id}
                                className={`relative rounded-2xl border overflow-hidden transition-all ${
                                    esNuevo
                                        ? 'bg-card border-indigo-500/25 shadow-md'
                                        : esArchivado
                                        ? 'bg-muted/10 border-border/30 opacity-60'
                                        : 'bg-card border-border/40'
                                }`}
                            >
                                {esNuevo && <div className="absolute left-0 inset-y-0 w-0.5 bg-indigo-500 rounded-l-2xl" />}

                                <div className="p-5 space-y-3">
                                    {/* Remitente + fecha */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${meta.bg}`}>
                                                <Icono className={`w-4 h-4 ${meta.color}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-sm font-bold leading-none">{doc.autor}</span>
                                                    {tieneInforme && (
                                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                                                            Director 01
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TIPO_CLS[doc.tipo]}`}>
                                                        {TIPO_LABEL[doc.tipo]}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {esNuevo && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
                                            <span className="text-[11px] text-muted-foreground font-mono">{fmtFecha(doc.fecha)}</span>
                                        </div>
                                    </div>

                                    {/* Título — clicable para expandir */}
                                    <button
                                        onClick={() => toggleExpandido(doc.id)}
                                        className="w-full text-left group"
                                    >
                                        <p className={`font-bold text-sm leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors ${esArchivado ? 'text-muted-foreground' : ''}`}>
                                            {doc.titulo}
                                        </p>
                                        {doc.contenido && !esExpandido && (
                                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2 whitespace-pre-line">
                                                {doc.contenido}
                                            </p>
                                        )}
                                    </button>

                                    {/* Contenido expandido */}
                                    {doc.contenido && esExpandido && (
                                        <div className="bg-muted/30 rounded-xl p-4 border border-border/30">
                                            <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                                {doc.contenido}
                                            </p>
                                            <button
                                                onClick={() => toggleExpandido(doc.id)}
                                                className="mt-3 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                ▲ Cerrar
                                            </button>
                                        </div>
                                    )}

                                    {/* Acciones */}
                                    <div className="flex items-center justify-between pt-1 border-t border-border/30">
                                        <select
                                            value={doc.estado}
                                            onChange={e => cambiarEstadoDocumento(doc.id, e.target.value as EstadoDocumento)}
                                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border-0 outline-none cursor-pointer ${ESTADO_CLS[doc.estado]}`}
                                        >
                                            {ESTADO_OPTS.map(o => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => eliminarDocumento(doc.id)}
                                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
}
