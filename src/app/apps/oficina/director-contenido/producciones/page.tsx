'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ChevronLeft, Film, Clapperboard, ChevronDown, ChevronUp,
    Check, Trash2, Pencil, X, Save, Clock, PlayCircle,
} from 'lucide-react';
import {
    useOficinaRegistros,
    type EstadoProduccionVideo,
    type ProduccionVideo,
} from '@/hooks/useOficinaRegistros';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

type FiltroEstado = EstadoProduccionVideo | 'todos';

const ESTADO_META: Record<EstadoProduccionVideo, { label: string; badge: string; dot: string }> = {
    pendiente:      { label: 'Pendiente',      badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',   dot: 'bg-amber-400' },
    'en-produccion': { label: 'En producción', badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',         dot: 'bg-sky-400' },
    publicado:      { label: 'Publicado',      badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-400' },
};

const ESTADOS: EstadoProduccionVideo[] = ['pendiente', 'en-produccion', 'publicado'];

function nextEstado(estado: EstadoProduccionVideo): EstadoProduccionVideo {
    const idx = ESTADOS.indexOf(estado);
    return ESTADOS[(idx + 1) % ESTADOS.length];
}

// ── Edit form ─────────────────────────────────────────────────────────────────

type EditFields = Pick<ProduccionVideo, 'titulo' | 'descripcion' | 'locucion' | 'promptVisual' | 'duracion' | 'hashtags'>;

function EditForm({
    initial,
    onSave,
    onCancel,
}: {
    initial: EditFields;
    onSave: (f: EditFields) => void;
    onCancel: () => void;
}) {
    const [form, setForm] = useState<EditFields>({ ...initial });
    const set = (k: keyof EditFields, v: string | string[]) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="p-4 space-y-3 border-t border-border/40 bg-muted/20">
            {(
                [
                    { key: 'titulo',       label: 'Título',         rows: 1 },
                    { key: 'descripcion',  label: 'Descripción',    rows: 2 },
                    { key: 'locucion',     label: 'Locución',       rows: 4 },
                    { key: 'promptVisual', label: 'Prompt visual',  rows: 3 },
                    { key: 'duracion',     label: 'Duración',       rows: 1 },
                ] as const
            ).map(({ key, label, rows }) => (
                <div key={key} className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
                    <textarea
                        rows={rows}
                        value={form[key] as string}
                        onChange={e => set(key, e.target.value)}
                        className="w-full text-xs bg-background border border-border/50 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-sky-500/40 leading-relaxed"
                    />
                </div>
            ))}
            <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hashtags (separados por espacio)</label>
                <input
                    type="text"
                    value={form.hashtags.join(' ')}
                    onChange={e => set('hashtags', e.target.value.split(/\s+/).filter(Boolean))}
                    className="w-full text-xs bg-background border border-border/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                />
            </div>
            <div className="flex gap-2 pt-1">
                <button
                    onClick={() => onSave(form)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all"
                >
                    <Save className="w-3.5 h-3.5" /> Guardar
                </button>
                <button
                    onClick={onCancel}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="w-3.5 h-3.5" /> Cancelar
                </button>
            </div>
        </div>
    );
}

// ── Video card ────────────────────────────────────────────────────────────────

function VideoCard({
    video,
    onEstado,
    onEdit,
    onDelete,
}: {
    video: ProduccionVideo;
    onEstado: () => void;
    onEdit: (f: EditFields) => void;
    onDelete: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const meta = ESTADO_META[video.estado];

    return (
        <div className={`rounded-xl border overflow-hidden transition-all ${open ? 'border-sky-500/20 shadow-sm' : 'border-border/30'} bg-card`}>
            {/* Row */}
            <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-[10px] font-black text-muted-foreground/40 w-5 shrink-0 text-right">{video.posicion}</span>
                <div className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                <p className="flex-1 text-sm font-medium leading-snug min-w-0 truncate">{video.titulo}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${meta.badge}`}>{meta.label}</span>
                <button
                    onClick={() => { setOpen(o => !o); setEditing(false); }}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                    {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
            </div>

            {/* Detail */}
            {open && !editing && (
                <div className="border-t border-border/30 divide-y divide-border/20">
                    {video.duracion && (
                        <div className="px-4 py-2.5 flex items-center gap-2">
                            <Clock className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                            <span className="text-xs text-muted-foreground">{video.duracion}</span>
                        </div>
                    )}
                    {[
                        { label: 'Descripción',   value: video.descripcion,  mono: false },
                        { label: 'Locución',      value: video.locucion,     mono: false },
                        { label: 'Prompt visual', value: video.promptVisual, mono: true  },
                    ].filter(f => f.value).map(({ label, value, mono }) => (
                        <div key={label} className="px-4 py-3 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                            <div className={`rounded-lg px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                                mono
                                    ? 'bg-slate-950/60 text-slate-300 font-mono border border-slate-700/40'
                                    : 'bg-muted/40 text-foreground/80'
                            }`}>
                                {value}
                            </div>
                        </div>
                    ))}
                    {video.hashtags.length > 0 && (
                        <div className="px-4 py-3 flex flex-wrap gap-1.5">
                            {video.hashtags.map(h => (
                                <span key={h} className="text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">{h}</span>
                            ))}
                        </div>
                    )}
                    <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                        <button
                            onClick={onEstado}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted border border-border/40 transition-all"
                        >
                            {video.estado === 'publicado'
                                ? <><Clock className="w-3 h-3" /> Marcar pendiente</>
                                : video.estado === 'en-produccion'
                                    ? <><Check className="w-3 h-3 text-emerald-500" /> Marcar publicado</>
                                    : <><PlayCircle className="w-3 h-3 text-sky-500" /> En producción</>
                            }
                        </button>
                        <button
                            onClick={() => setEditing(true)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted/40 transition-all"
                        >
                            <Pencil className="w-3 h-3" /> Editar
                        </button>
                        <button
                            onClick={onDelete}
                            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/60 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-500/5 transition-all ml-auto"
                        >
                            <Trash2 className="w-3 h-3" /> Eliminar
                        </button>
                    </div>
                </div>
            )}

            {/* Edit form */}
            {open && editing && (
                <EditForm
                    initial={{
                        titulo: video.titulo,
                        descripcion: video.descripcion,
                        locucion: video.locucion,
                        promptVisual: video.promptVisual,
                        duracion: video.duracion,
                        hashtags: video.hashtags,
                    }}
                    onSave={f => { onEdit(f); setEditing(false); }}
                    onCancel={() => setEditing(false)}
                />
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProduccionesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { series, producciones, actualizarProduccion, eliminarProduccion, eliminarSerie } = useOficinaRegistros();

    const [filtro, setFiltro] = useState<FiltroEstado>('todos');
    const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    if (loading || !user || user.email !== ADMIN_EMAIL) return null;

    const seriesConVideos = series
        .map(s => ({
            ...s,
            videos: producciones
                .filter(p => p.serieId === s.id)
                .sort((a, b) => a.posicion - b.posicion),
        }))
        .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());

    const seriesFiltradas = filtro === 'todos'
        ? seriesConVideos
        : seriesConVideos.filter(s => s.videos.some(v => v.estado === filtro));

    const toggleSerie = (id: string) => {
        setExpandedSeries(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const totalPendientes = producciones.filter(p => p.estado === 'pendiente').length;
    const totalPublicados = producciones.filter(p => p.estado === 'publicado').length;

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-6 animate-in fade-in duration-500">

            <Link
                href="/apps/oficina/director-contenido"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
                Director de Contenido
            </Link>

            {/* Header */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-sky-950 via-slate-900 to-slate-950 p-8 md:p-10 shadow-xl">
                <div
                    className="absolute inset-0 opacity-[0.06] pointer-events-none"
                    style={{
                        backgroundImage: 'radial-gradient(circle, #38bdf8 1.5px, transparent 1.5px)',
                        backgroundSize: '28px 28px',
                    }}
                />
                <div className="relative space-y-4">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-400/70 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                        <Clapperboard className="w-3.5 h-3.5" />
                        Director de Contenido · Producciones
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                        Producciones
                    </h1>
                    <div className="flex items-center gap-4 text-sky-200/50 text-xs font-mono">
                        <span>{series.length} serie{series.length !== 1 ? 's' : ''}</span>
                        <span>{totalPendientes} pendiente{totalPendientes !== 1 ? 's' : ''}</span>
                        <span>{totalPublicados} publicado{totalPublicados !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-1.5 flex-wrap">
                {(['todos', 'pendiente', 'en-produccion', 'publicado'] as FiltroEstado[]).map(f => {
                    const count = f === 'todos'
                        ? producciones.length
                        : producciones.filter(p => p.estado === f).length;
                    const label = f === 'todos' ? 'Todos' : ESTADO_META[f].label;
                    return (
                        <button
                            key={f}
                            onClick={() => setFiltro(f)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                filtro === f
                                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300'
                                    : 'bg-muted/40 border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
                            }`}
                        >
                            {label}
                            <span className={`text-[10px] font-black ${filtro === f ? 'text-sky-500' : 'text-muted-foreground/50'}`}>{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Lista de series */}
            {seriesFiltradas.length === 0 ? (
                <div className="bg-card border border-border/40 rounded-2xl p-8 text-center space-y-2">
                    <Film className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground/60">
                        {series.length === 0
                            ? 'Todavía no hay series.'
                            : 'No hay vídeos con este estado.'}
                    </p>
                    <p className="text-xs text-muted-foreground/40">
                        {series.length === 0
                            ? 'Genera una serie de vídeos desde el Director de Contenido y pulsa "Guardar en historial".'
                            : 'Cambia el filtro para ver otras series.'}
                    </p>
                    {series.length === 0 && (
                        <Link
                            href="/apps/oficina/director-contenido"
                            className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                        >
                            Ir al Director de Contenido
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {seriesFiltradas.map(serie => {
                        const isOpen = expandedSeries.has(serie.id);
                        const videosFiltrados = filtro === 'todos'
                            ? serie.videos
                            : serie.videos.filter(v => v.estado === filtro);
                        const pendientes = serie.videos.filter(v => v.estado === 'pendiente').length;
                        const publicados = serie.videos.filter(v => v.estado === 'publicado').length;

                        return (
                            <div key={serie.id} className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
                                {/* Serie header */}
                                <button
                                    onClick={() => toggleSerie(serie.id)}
                                    className="w-full text-left px-5 py-4 hover:bg-muted/20 transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                            <p className="font-bold text-base leading-snug">{serie.titulo}</p>
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="text-xs text-muted-foreground">
                                                    {serie.videos.length} vídeo{serie.videos.length !== 1 ? 's' : ''}
                                                </span>
                                                {pendientes > 0 && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                                        {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                {publicados > 0 && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                                        {publicados} publicado{publicados !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-muted-foreground/50 font-mono ml-auto">
                                                    {new Date(serie.fechaCreacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                        {isOpen
                                            ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                                            : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                                        }
                                    </div>
                                </button>

                                {/* Videos */}
                                {isOpen && (
                                    <div className="border-t border-border/30 px-3 py-3 space-y-2">
                                        {videosFiltrados.map(video => (
                                            <VideoCard
                                                key={video.id}
                                                video={video}
                                                onEstado={() => actualizarProduccion(video.id, { estado: nextEstado(video.estado) })}
                                                onEdit={f => actualizarProduccion(video.id, f)}
                                                onDelete={() => eliminarProduccion(video.id)}
                                            />
                                        ))}
                                        <div className="flex justify-end pt-1">
                                            <button
                                                onClick={() => eliminarSerie(serie.id)}
                                                className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-500/5 transition-all"
                                            >
                                                <Trash2 className="w-3 h-3" /> Eliminar serie completa
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
}
