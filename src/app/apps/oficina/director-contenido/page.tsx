'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ChevronLeft, Film, Lock,
    BookOpen, FlaskConical, Calendar,
    TrendingUp, Crown, MessageSquare, Send, Copy, Check,
    ChevronDown, ChevronUp, Trash2, Clock, History, Sparkles,
    Target, CheckCircle2, AlertTriangle, FileText, Layers
} from 'lucide-react';
import {
    generarConsultaContenido,
    type TipoEntrega,
    type PlataformaContenido,
    type OrientacionContenido,
    type EstiloVisualContenido,
} from '@/config/oficina/consulta-contenido-generator';
import { analizarPeticion, type DecisionesEditoriales } from '@/config/oficina/analisis-peticion';
import { useHistorialContenido, type EntradaHistorial } from '@/hooks/useHistorialContenido';
import type { CategoriaContenido, ObjetivoContenido, FormatoContenido } from '@/config/oficina/director-contenido';
import { useFundacionQuioba } from '@/hooks/useFundacionQuioba';
import { useOficinaRegistros } from '@/hooks/useOficinaRegistros';
import { FASE_META } from '@/config/oficina/fundacion-schema';
import { parsearSerie, tieneMultiplesVideos } from '@/lib/oficina/parser-series';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

// ── Helpers ───────────────────────────────────────────────────────────────────


const PLATAFORMA_LABEL: Record<PlataformaContenido, string> = {
    tiktok: 'TikTok',
    reels: 'Reels',
    shorts: 'Shorts',
    youtube: 'YouTube',
};

const ORIENTACION_LABEL: Record<OrientacionContenido, string> = {
    'vertical-9-16': 'Vertical 9:16',
    'horizontal-16-9': 'Horizontal 16:9',
    'cuadrado-1-1': 'Cuadrado 1:1',
};

const ESTILO_VISUAL_LABEL: Record<EstiloVisualContenido, string> = {
    'realista-ia': 'Realista IA',
    'dibujo-lapiz': 'Dibujo a lapiz',
    cinematografico: 'Cinematografico',
    animacion: 'Animacion',
};

const CATEGORIA_LABEL: Record<CategoriaContenido, string> = {
    quioba: 'Quioba',
    cuerpo: 'Cuerpo',
    mente: 'Mente',
    finanzas: 'Finanzas',
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DirectorContenidoPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { fundacion } = useFundacionQuioba();
    const { executiveBriefs, decisionesEjecutivas, crearSerie } = useOficinaRegistros();
    const [serieCreada, setSerieCreada] = useState<number | null>(null);
    const [consulta, setConsulta] = useState('');
    const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('ideas');
    const [contextoGenerado, setContextoGenerado] = useState('');
    const [respuesta, setRespuesta] = useState('');
    const [copiado, setCopiado] = useState<'claude' | 'chatgpt' | 'gemini' | null>(null);
    const [guardado, setGuardado] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const { historial, guardar, eliminar } = useHistorialContenido();
    const [modoDirector, setModoDirector] = useState(true);
    const [peticion, setPeticion] = useState('');
    const [decisiones, setDecisiones] = useState<DecisionesEditoriales | null>(null);
    const [categoriaProduccion, setCategoriaProduccion] = useState<CategoriaContenido>('quioba');
    const [plataforma, setPlataforma] = useState<PlataformaContenido>('tiktok');
    const [orientacion, setOrientacion] = useState<OrientacionContenido>('vertical-9-16');
    const [estiloVisual, setEstiloVisual] = useState<EstiloVisualContenido>('realista-ia');

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) {
            router.replace('/');
        }
    }, [user, loading, router]);

    if (loading || !user || user.email !== ADMIN_EMAIL) return null;

    const handlePreparar = () => {
        if (!consulta.trim()) return;
        setContextoGenerado(generarConsultaContenido(consulta.trim(), tipoEntrega, {
            categoria: CATEGORIA_LABEL[categoriaProduccion],
            plataforma: PLATAFORMA_LABEL[plataforma],
            orientacion: ORIENTACION_LABEL[orientacion],
            estiloVisual: ESTILO_VISUAL_LABEL[estiloVisual],
        }));
        setRespuesta('');
        setCopiado(null);
    };

    const handleAnalizar = () => {
        if (!peticion.trim()) return;
        const analisis = analizarPeticion(peticion.trim());
        setDecisiones(analisis);
        setCategoriaProduccion(analisis.categoria);
    };

    const handlePrepararDirector = () => {
        if (!peticion.trim() || !decisiones) return;
        const CLABEL: Record<string, string> = { quioba: 'Quioba', cuerpo: 'Cuerpo', mente: 'Mente', finanzas: 'Finanzas' };
        const FLABEL: Record<string, string> = { corto: 'Corto', largo: 'Largo', tutorial: 'Tutorial', historia: 'Historia', opinion: 'Opinión' };
        const OLABEL: Record<string, string> = { alcance: 'Alcance', captacion: 'Captación', marca: 'Marca', conversion: 'Conversión' };
        setContextoGenerado(generarConsultaContenido(peticion.trim(), decisiones.tipoEntrega, {
            categoria: CLABEL[decisiones.categoria] ?? decisiones.categoria,
            formato:   FLABEL[decisiones.formato]   ?? decisiones.formato,
            objetivo:  OLABEL[decisiones.objetivo]  ?? decisiones.objetivo,
            plataforma: PLATAFORMA_LABEL[plataforma],
            orientacion: ORIENTACION_LABEL[orientacion],
            estiloVisual: ESTILO_VISUAL_LABEL[estiloVisual],
        }));
        setRespuesta('');
        setCopiado(null);
    };

    const handleGuardar = () => {
        const textConsulta = modoDirector ? peticion.trim() : consulta.trim();
        if (!textConsulta || !contextoGenerado || !respuesta.trim()) return;
        guardar({ consulta: textConsulta, briefing: contextoGenerado, respuesta: respuesta.trim() });

        if (tieneMultiplesVideos(respuesta)) {
            const parsed = parsearSerie(respuesta, textConsulta);
            if (parsed) {
                crearSerie(
                    { titulo: parsed.titulo, categoria: categoriaProduccion, plataforma, orientacion },
                    parsed.videos.map(v => ({
                        posicion: v.posicion,
                        titulo: v.titulo,
                        descripcion: v.descripcion,
                        locucion: v.locucion,
                        promptVisual: v.promptVisual,
                        duracion: v.duracion,
                        hashtags: v.hashtags,
                        categoria: categoriaProduccion,
                        plataforma,
                        orientacion,
                        estado: 'pendiente' as const,
                    })),
                );
                setSerieCreada(parsed.videos.length);
                setTimeout(() => setSerieCreada(null), 5000);
            }
        }

        setGuardado(true);
        setTimeout(() => setGuardado(false), 2000);
    };

    const handleCopiar = async (target: 'claude' | 'chatgpt' | 'gemini') => {
        try {
            await navigator.clipboard.writeText(contextoGenerado);
        } catch {
            const el = document.createElement('textarea');
            el.value = contextoGenerado;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        setCopiado(target);
        setTimeout(() => setCopiado(null), 2000);
    };

    const briefsPublicados = executiveBriefs.filter(b => b.status === 'publicado');
    const decisionesAprobadas = decisionesEjecutivas.filter(d => d.status === 'aprobada');

    const oportunidades: { titulo: string; origen: string; tipo: 'accion' | 'decision' }[] = [
        ...briefsPublicados.flatMap(b => b.actions).slice(0, 5).map(a => ({
            titulo: a, origen: 'Informe ejecutivo', tipo: 'accion' as const,
        })),
        ...decisionesAprobadas.slice(0, 5).map(d => ({
            titulo: d.title, origen: 'Decisión aprobada', tipo: 'decision' as const,
        })),
    ].slice(0, 8);

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-6 animate-in fade-in duration-500">

            {/* Back */}
            <Link
                href="/apps/oficina"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
                Oficina
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
                        <Film className="w-3.5 h-3.5" />
                        Despacho 04 · Director de Contenido
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                        Director de<br />Contenido
                    </h1>
                    <p className="text-sky-200/40 text-xs font-mono">
                        Ideas · Plan editorial · Vídeos · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Contexto Estratégico — Fundación Quioba */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-sky-500/10 to-transparent px-5 py-3 border-b border-border/40">
                    <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-sky-500" />
                        <p className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                            Fundación Quioba
                        </p>
                    </div>
                </div>
                {!fundacion ? (
                    <div className="p-6 text-center space-y-1">
                        <p className="text-sm text-muted-foreground/60">Fundación no configurada.</p>
                        <p className="text-xs text-muted-foreground/40">Completa la Fundación Quioba para ver el contexto estratégico aquí.</p>
                    </div>
                ) : (
                    <div className="p-5 space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-400">
                                {FASE_META[fundacion.faseProducto].label}
                            </span>
                            {fundacion.usuariosReales > 0 && (
                                <span className="text-xs text-muted-foreground">
                                    {fundacion.usuariosReales} usuario{fundacion.usuariosReales !== 1 ? 's' : ''} real{fundacion.usuariosReales !== 1 ? 'es' : ''}
                                </span>
                            )}
                            <span className="text-xs text-muted-foreground/50 font-mono ml-auto">{fundacion.trimestreLabel}</span>
                        </div>
                        {[fundacion.prioridad1, fundacion.prioridad2, fundacion.prioridad3].filter(Boolean).length > 0 && (
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prioridades del trimestre</p>
                                <ul className="space-y-1">
                                    {[fundacion.prioridad1, fundacion.prioridad2, fundacion.prioridad3]
                                        .filter(Boolean)
                                        .map((p, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                <span className="text-sky-500 font-black text-xs mt-0.5">{i + 1}.</span>
                                                <span className="text-foreground/80">{p}</span>
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Decisiones del Director General */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Director General
                    </p>
                    {briefsPublicados.length > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground/60">{briefsPublicados.length}</span>
                    )}
                </div>
                {briefsPublicados.length === 0 ? (
                    <div className="bg-card border border-border/40 rounded-2xl p-5 text-center space-y-1">
                        <p className="text-sm text-muted-foreground/60">No hay informes ejecutivos publicados.</p>
                        <p className="text-xs text-muted-foreground/40">Los informes publicados en el Consejo Estratégico aparecerán aquí.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {briefsPublicados.slice(0, 3).map(brief => (
                            <div key={brief.id} className="bg-card border border-border/40 rounded-2xl overflow-hidden">
                                <div className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm font-bold leading-snug">{brief.title}</p>
                                        <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0">
                                            {new Date(brief.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                    {brief.priorities.length > 0 && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prioridades</p>
                                            <ul className="space-y-0.5">
                                                {brief.priorities.slice(0, 3).map((p, i) => (
                                                    <li key={i} className="text-xs text-muted-foreground/80 flex gap-1.5">
                                                        <span className="text-sky-500/70">·</span>{p}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Oportunidades de Contenido */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Oportunidades de Contenido
                    </p>
                    {oportunidades.length > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground/60">{oportunidades.length}</span>
                    )}
                </div>
                {oportunidades.length === 0 ? (
                    <div className="bg-card border border-border/40 rounded-2xl p-5 text-center space-y-1">
                        <p className="text-sm text-muted-foreground/60">No hay oportunidades disponibles.</p>
                        <p className="text-xs text-muted-foreground/40">Se generan automáticamente desde informes ejecutivos y decisiones aprobadas en el Director General.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {oportunidades.map((op, i) => (
                            <div key={i} className="bg-card border border-border/40 rounded-xl p-4 flex items-start gap-3">
                                {op.tipo === 'accion'
                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                                    : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                }
                                <div className="min-w-0 flex-1 space-y-0.5">
                                    <p className="text-sm font-medium leading-snug">{op.titulo}</p>
                                    <p className="text-[10px] text-muted-foreground/50">{op.origen}</p>
                                </div>
                                <button
                                    onClick={() => { setPeticion(op.titulo); setDecisiones(null); setModoDirector(true); }}
                                    className="text-[10px] font-bold text-sky-500 hover:text-sky-400 shrink-0 px-2 py-1 rounded-lg hover:bg-sky-500/5 transition-all"
                                >
                                    Producir
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Consultar al Director de Contenido ── */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                {/* Header con toggle de modo */}
                <div className="bg-gradient-to-r from-sky-500/10 to-transparent px-5 py-3 border-b border-border/40">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-sky-500" />
                            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                                Consultar al Director de Contenido
                            </p>
                        </div>
                        <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5 border border-border/40">
                            <button
                                onClick={() => setModoDirector(true)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                    modoDirector ? 'bg-sky-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Sparkles className="w-3 h-3" />
                                Modo Director
                            </button>
                            <button
                                onClick={() => setModoDirector(false)}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                    !modoDirector ? 'bg-card text-foreground shadow-sm border border-border/40' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Manual
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-5 space-y-4">
                {modoDirector ? (

                    /* ── Modo Director ─────────────────────────────────── */
                    <div className="space-y-4">

                        {/* Petición natural */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground">
                                ¿Qué quieres producir?
                            </label>
                            <textarea
                                value={peticion}
                                onChange={e => { setPeticion(e.target.value); setDecisiones(null); }}
                                placeholder="Escribe en lenguaje natural lo que necesitas…"
                                rows={3}
                                className="w-full text-sm bg-muted/40 border border-border/50 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/50 placeholder:text-muted-foreground/50 transition-all leading-relaxed"
                            />
                        </div>

                        {/* Ejemplos director */}
                        <div className="flex gap-2 flex-wrap">
                            {[
                                'Quiero hacer un vídeo sobre ciclos circadianos.',
                                'Necesito un vídeo para atraer usuarios a Quioba.',
                                'Explica El Campus en menos de 60 segundos.',
                                'Dame una idea de vídeo para finanzas familiares.',
                            ].map(ej => (
                                <button
                                    key={ej}
                                    onClick={() => { setPeticion(ej); setDecisiones(null); }}
                                    className="text-[11px] px-3 py-1.5 rounded-full bg-muted/60 border border-border/50 text-muted-foreground hover:text-foreground hover:border-sky-500/40 hover:bg-sky-500/5 transition-all"
                                >
                                    {ej}
                                </button>
                            ))}
                        </div>

                        {/* Botón analizar */}
                        {!decisiones && (
                            <button
                                onClick={handleAnalizar}
                                disabled={!peticion.trim()}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-all shadow-sm shadow-sky-500/20"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                Analizar petición
                            </button>
                        )}

                        {/* Tarjeta de decisiones editoriales */}
                        {decisiones && (
                            <div className="rounded-2xl border border-sky-500/20 overflow-hidden">
                                <div className="bg-gradient-to-r from-sky-500/10 to-transparent px-4 py-3 border-b border-border/40 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">Decisiones editoriales</p>
                                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Detectadas automáticamente · ajusta si lo necesitas</p>
                                    </div>
                                    <button
                                        onClick={() => setDecisiones(null)}
                                        className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/40"
                                    >
                                        Editar petición
                                    </button>
                                </div>
                                <div className="divide-y divide-border/30">
                                    {([
                                        {
                                            label: 'Categoría',
                                            value: decisiones.categoria,
                                            options: [
                                                { value: 'quioba',   label: 'Quioba' },
                                                { value: 'cuerpo',   label: 'Cuerpo' },
                                                { value: 'mente',    label: 'Mente' },
                                                { value: 'finanzas', label: 'Finanzas' },
                                            ],
                                            onChange: (v: string) => {
                                                setDecisiones({ ...decisiones, categoria: v as DecisionesEditoriales['categoria'] });
                                                setCategoriaProduccion(v as CategoriaContenido);
                                            },
                                        },
                                        {
                                            label: 'Formato',
                                            value: decisiones.formato,
                                            options: [
                                                { value: 'corto',    label: 'Corto' },
                                                { value: 'tutorial', label: 'Tutorial' },
                                                { value: 'historia', label: 'Historia' },
                                                { value: 'opinion',  label: 'Opinión' },
                                                { value: 'largo',    label: 'Largo' },
                                            ],
                                            onChange: (v: string) => setDecisiones({ ...decisiones, formato: v as DecisionesEditoriales['formato'] }),
                                        },
                                        {
                                            label: 'Objetivo',
                                            value: decisiones.objetivo,
                                            options: [
                                                { value: 'alcance',    label: 'Alcance' },
                                                { value: 'captacion',  label: 'Captación' },
                                                { value: 'marca',      label: 'Marca' },
                                                { value: 'conversion', label: 'Conversión' },
                                            ],
                                            onChange: (v: string) => setDecisiones({ ...decisiones, objetivo: v as DecisionesEditoriales['objetivo'] }),
                                        },
                                        {
                                            label: 'Entrega',
                                            value: decisiones.tipoEntrega,
                                            options: [
                                                { value: 'ideas',               label: 'Ideas' },
                                                { value: 'guion',               label: 'Guion' },
                                                { value: 'produccion-completa', label: 'Producción Completa' },
                                            ],
                                            onChange: (v: string) => setDecisiones({ ...decisiones, tipoEntrega: v as TipoEntrega }),
                                        },
                                        {
                                            label: 'Plataforma',
                                            value: plataforma,
                                            options: [
                                                { value: 'tiktok',  label: 'TikTok' },
                                                { value: 'reels',   label: 'Reels' },
                                                { value: 'shorts',  label: 'Shorts' },
                                                { value: 'youtube', label: 'YouTube' },
                                            ],
                                            onChange: (v: string) => setPlataforma(v as PlataformaContenido),
                                        },
                                        {
                                            label: 'Orientacion',
                                            value: orientacion,
                                            options: [
                                                { value: 'vertical-9-16',   label: 'Vertical 9:16' },
                                                { value: 'horizontal-16-9', label: 'Horizontal 16:9' },
                                                { value: 'cuadrado-1-1',    label: 'Cuadrado 1:1' },
                                            ],
                                            onChange: (v: string) => setOrientacion(v as OrientacionContenido),
                                        },
                                        {
                                            label: 'Estilo visual',
                                            value: estiloVisual,
                                            options: [
                                                { value: 'realista-ia',     label: 'Realista IA' },
                                                { value: 'dibujo-lapiz',    label: 'Dibujo a lapiz' },
                                                { value: 'cinematografico', label: 'Cinematografico' },
                                                { value: 'animacion',       label: 'Animacion' },
                                            ],
                                            onChange: (v: string) => setEstiloVisual(v as EstiloVisualContenido),
                                        },
                                    ]).map(row => (
                                        <div key={row.label} className="flex items-center justify-between px-4 py-3">
                                            <p className="text-xs font-semibold text-muted-foreground w-20 shrink-0">{row.label}</p>
                                            <div className="flex-1 flex justify-end">
                                                <select
                                                    value={row.value}
                                                    onChange={e => row.onChange(e.target.value)}
                                                    className="text-xs font-bold bg-transparent border-none focus:outline-none cursor-pointer text-right text-foreground appearance-none pr-4 relative"
                                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0 center' }}
                                                >
                                                    {row.options.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Botón preparar briefing */}
                                <div className="px-4 py-3 border-t border-border/40">
                                    <button
                                        onClick={handlePrepararDirector}
                                        className={`flex items-center gap-2 w-full justify-center px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all shadow-sm ${
                                            decisiones.tipoEntrega === 'produccion-completa'
                                                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                                                : 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/20'
                                        }`}
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        Preparar briefing
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>

                ) : (

                    /* ── Manual ────────────────────────────────────────── */
                    <div className="space-y-4">

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground">¿Qué quieres consultar?</label>
                            <textarea
                                value={consulta}
                                onChange={e => setConsulta(e.target.value)}
                                placeholder="Escribe aquí tu consulta al Director de Contenido…"
                                rows={3}
                                className="w-full text-sm bg-muted/40 border border-border/50 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/50 placeholder:text-muted-foreground/50 transition-all leading-relaxed"
                            />
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            {['Quiero hacer un vídeo sobre los ciclos circadianos.', 'Dame ideas para Quioba.', 'Necesito un vídeo de finanzas.'].map(ej => (
                                <button key={ej} onClick={() => setConsulta(ej)} className="text-[11px] px-3 py-1.5 rounded-full bg-muted/60 border border-border/50 text-muted-foreground hover:text-foreground hover:border-sky-500/40 hover:bg-sky-500/5 transition-all">{ej}</button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">Tipo de entrega</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {([
                                    { key: 'ideas', label: 'Ideas', desc: 'Propuestas y ángulos editoriales' },
                                    { key: 'guion', label: 'Guion', desc: 'Texto completo listo para grabar' },
                                    { key: 'produccion-completa', label: 'Producción Completa', desc: 'Escenas, prompts, publicación y más' },
                                ] as const).map(tipo => {
                                    const activo = tipoEntrega === tipo.key;
                                    const esPro = tipo.key === 'produccion-completa';
                                    return (
                                        <button key={tipo.key} onClick={() => setTipoEntrega(tipo.key)}
                                            className={`flex flex-col items-start gap-0.5 px-3.5 py-3 rounded-xl border text-left transition-all ${activo ? (esPro ? 'border-amber-500/50 bg-amber-500/10 shadow-sm' : 'border-sky-500/50 bg-sky-500/10 shadow-sm') : 'border-border/40 bg-muted/30 hover:border-border hover:bg-muted/50'}`}>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-xs font-black ${activo ? (esPro ? 'text-amber-700 dark:text-amber-300' : 'text-sky-700 dark:text-sky-300') : 'text-foreground'}`}>{tipo.label}</span>
                                                {esPro && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activo ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground/60'}`}>PRO</span>}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground/70 leading-snug">{tipo.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {tipoEntrega === 'produccion-completa' && (
                            <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-3">
                                <p className="text-xs font-semibold text-muted-foreground">Parametros de produccion</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <select
                                        value={categoriaProduccion}
                                        onChange={e => setCategoriaProduccion(e.target.value as CategoriaContenido)}
                                        className="text-xs font-semibold bg-muted/50 border border-border/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                                    >
                                        <option value="quioba">Categoría · Quioba</option>
                                        <option value="mente">Categoría · Mente</option>
                                        <option value="cuerpo">Categoría · Cuerpo</option>
                                        <option value="finanzas">Categoría · Finanzas</option>
                                    </select>
                                    <select
                                        value={plataforma}
                                        onChange={e => setPlataforma(e.target.value as PlataformaContenido)}
                                        className="text-xs font-semibold bg-muted/50 border border-border/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                                    >
                                        <option value="tiktok">Plataforma · TikTok</option>
                                        <option value="reels">Plataforma · Reels</option>
                                        <option value="shorts">Plataforma · Shorts</option>
                                        <option value="youtube">Plataforma · YouTube</option>
                                    </select>
                                    <select
                                        value={orientacion}
                                        onChange={e => setOrientacion(e.target.value as OrientacionContenido)}
                                        className="text-xs font-semibold bg-muted/50 border border-border/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                                    >
                                        <option value="vertical-9-16">Orientacion · Vertical 9:16</option>
                                        <option value="horizontal-16-9">Orientacion · Horizontal 16:9</option>
                                        <option value="cuadrado-1-1">Orientacion · Cuadrado 1:1</option>
                                    </select>
                                    <select
                                        value={estiloVisual}
                                        onChange={e => setEstiloVisual(e.target.value as EstiloVisualContenido)}
                                        className="text-xs font-semibold bg-muted/50 border border-border/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                                    >
                                        <option value="realista-ia">Estilo · Realista IA</option>
                                        <option value="dibujo-lapiz">Estilo · Dibujo a lapiz</option>
                                        <option value="cinematografico">Estilo · Cinematografico</option>
                                        <option value="animacion">Estilo · Animacion</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handlePreparar}
                            disabled={!consulta.trim()}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${tipoEntrega === 'produccion-completa' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/20'}`}
                        >
                            <Send className="w-3.5 h-3.5" />
                            Preparar consulta
                        </button>

                    </div>

                )}
                </div>

                {/* Contexto generado */}
                {contextoGenerado && (
                    <div className="border-t border-border/40">
                        <div className="bg-gradient-to-r from-slate-500/5 to-transparent px-5 py-3 border-b border-border/40">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                Contexto preparado
                            </p>
                        </div>
                        <div className="p-5 space-y-4">

                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Este contexto incluye la información de Quioba, el plan editorial activo y el banco de ideas. Cópialo y pégalo directamente en Claude, ChatGPT o Gemini.
                            </p>

                            <textarea
                                readOnly
                                value={contextoGenerado}
                                rows={18}
                                onClick={e => (e.target as HTMLTextAreaElement).select()}
                                className="w-full text-[11px] font-mono leading-relaxed bg-muted/30 border border-border/40 rounded-xl px-4 py-3 resize-none focus:outline-none text-foreground/80"
                            />

                            {/* Botones de copia */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {([
                                    { key: 'claude',  label: 'Copiar para Claude',  sub: 'Anthropic', cls: 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/50', act: 'bg-orange-500/15 border-orange-500/50' },
                                    { key: 'chatgpt', label: 'Copiar para ChatGPT', sub: 'OpenAI',    cls: 'border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 hover:border-teal-500/50',         act: 'bg-teal-500/15 border-teal-500/50' },
                                    { key: 'gemini',  label: 'Copiar para Gemini',  sub: 'Google',    cls: 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/50',          act: 'bg-blue-500/15 border-blue-500/50' },
                                ] as const).map(btn => {
                                    const activo = copiado === btn.key;
                                    return (
                                        <button
                                            key={btn.key}
                                            onClick={() => handleCopiar(btn.key)}
                                            className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border transition-all ${activo ? btn.act : btn.cls}`}
                                        >
                                            <div className="text-left">
                                                <p className="text-sm font-bold leading-none">{btn.label}</p>
                                                <p className="text-[10px] text-muted-foreground mt-1">{btn.sub}</p>
                                            </div>
                                            {activo
                                                ? <Check className="w-4 h-4 shrink-0 text-current" />
                                                : <Copy className="w-4 h-4 shrink-0 text-muted-foreground" />
                                            }
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Registrar respuesta */}
                            <div className="space-y-2 pt-2">
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    Registrar respuesta
                                </p>
                                <textarea
                                    value={respuesta}
                                    onChange={e => setRespuesta(e.target.value)}
                                    placeholder="Pega aquí la respuesta de Claude, ChatGPT o Gemini…"
                                    rows={6}
                                    className="w-full text-sm bg-muted/40 border border-border/50 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 placeholder:text-muted-foreground/50 transition-all leading-relaxed"
                                />
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <p className="text-[10px] text-muted-foreground/50">
                                        Guarda la consulta para revisarla más adelante en el historial.
                                    </p>
                                    <button
                                        onClick={handleGuardar}
                                        disabled={!respuesta.trim() || guardado}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                            guardado
                                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed'
                                        }`}
                                    >
                                        {guardado ? <><Check className="w-3.5 h-3.5" /> Guardado</> : <><Clock className="w-3.5 h-3.5" /> Guardar en historial</>}
                                    </button>
                                </div>
                                {serieCreada !== null && (
                                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs font-semibold text-sky-700 dark:text-sky-400">
                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                        Serie creada con {serieCreada} vídeo{serieCreada !== 1 ? 's' : ''} en
                                        <Link href="/apps/oficina/director-contenido/producciones" className="underline underline-offset-2 hover:text-sky-500 transition-colors">
                                            Producciones
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Historial de Consultas ── */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <History className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Historial de Consultas
                    </p>
                    {historial.length > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground/60">{historial.length}</span>
                    )}
                </div>

                {historial.length === 0 ? (
                    <div className="bg-card border border-border/40 rounded-2xl p-6 text-center space-y-1">
                        <p className="text-sm text-muted-foreground/60">Todavía no hay consultas guardadas.</p>
                        <p className="text-xs text-muted-foreground/40">Registra una respuesta y pulsa "Guardar en historial".</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {historial.map((entrada: EntradaHistorial) => {
                            const isOpen = expandedId === entrada.id;
                            const fecha = new Date(entrada.fechaISO).toLocaleDateString('es-ES', {
                                day: 'numeric', month: 'short', year: 'numeric',
                            });
                            const CAT_CLS: Record<string, string> = {
                                quioba: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
                                cuerpo: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
                                mente: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
                                finanzas: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                                general: 'bg-muted text-muted-foreground',
                            };
                            const CAT_LABEL: Record<string, string> = {
                                quioba: 'Quioba', cuerpo: 'Cuerpo', mente: 'Mente',
                                finanzas: 'Finanzas', general: 'General',
                            };
                            return (
                                <div key={entrada.id} className={`bg-card border rounded-2xl overflow-hidden transition-all ${isOpen ? 'border-sky-500/25 shadow-sm' : 'border-border/40'}`}>

                                    {/* Cabecera del item */}
                                    <button
                                        onClick={() => setExpandedId(isOpen ? null : entrada.id)}
                                        className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                            <p className="text-sm font-semibold leading-snug line-clamp-2">{entrada.consulta}</p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_CLS[entrada.categoria]}`}>
                                                    {CAT_LABEL[entrada.categoria]}
                                                </span>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                    entrada.respuesta
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                }`}>
                                                    {entrada.respuesta ? 'Con respuesta' : 'Sin respuesta'}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground/60 font-mono">{fecha}</span>
                                            </div>
                                        </div>
                                        {isOpen
                                            ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                            : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                        }
                                    </button>

                                    {/* Detalle expandido */}
                                    {isOpen && (
                                        <div className="border-t border-border/40 divide-y divide-border/30">

                                            <div className="p-4 space-y-1.5">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Consulta original</p>
                                                <p className="text-sm leading-relaxed">{entrada.consulta}</p>
                                            </div>

                                            <div className="p-4 space-y-2">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Briefing generado</p>
                                                <textarea
                                                    readOnly
                                                    value={entrada.briefing}
                                                    rows={12}
                                                    onClick={e => (e.target as HTMLTextAreaElement).select()}
                                                    className="w-full text-[11px] font-mono leading-relaxed bg-muted/30 border border-border/40 rounded-xl px-4 py-3 resize-none focus:outline-none text-foreground/70"
                                                />
                                            </div>

                                            {entrada.respuesta && (
                                                <div className="p-4 space-y-2">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Respuesta registrada</p>
                                                    <div className="bg-muted/30 border border-border/40 rounded-xl px-4 py-3">
                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{entrada.respuesta}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="p-4 flex justify-end">
                                                <button
                                                    onClick={() => { eliminar(entrada.id); setExpandedId(null); }}
                                                    className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/5"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Eliminar entrada
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

            {/* Acciones rápidas */}
            <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Acciones rápidas</p>
                <div className="grid grid-cols-2 gap-3">

                    <Link
                        href="/apps/oficina/director-crecimiento"
                        className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-lg shadow-emerald-500/20 hover:scale-[1.02] hover:shadow-xl transition-all"
                    >
                        <TrendingUp className="w-6 h-6 opacity-90" />
                        <div>
                            <p className="font-bold text-sm">Director de Crecimiento</p>
                            <p className="text-xs opacity-70 mt-0.5 leading-snug">Tracción y usuarios</p>
                        </div>
                    </Link>

                    <Link
                        href="/apps/oficina/director"
                        className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20 hover:scale-[1.02] hover:shadow-xl transition-all"
                    >
                        <Crown className="w-6 h-6 opacity-90" />
                        <div>
                            <p className="font-bold text-sm">Director General</p>
                            <p className="text-xs opacity-70 mt-0.5 leading-snug">Contexto estratégico</p>
                        </div>
                    </Link>

                    <Link
                        href="/apps/oficina/director-contenido/producciones"
                        className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-gradient-to-br from-sky-600 to-sky-800 text-white shadow-lg shadow-sky-500/20 hover:scale-[1.02] hover:shadow-xl transition-all"
                    >
                        <FlaskConical className="w-6 h-6 opacity-90" />
                        <div>
                            <p className="font-bold text-sm">Producciones</p>
                            <p className="text-xs opacity-70 mt-0.5 leading-snug">Series y cola de vídeos</p>
                        </div>
                    </Link>

                    {[
                        { label: 'Generar guiones',      sub: 'Estructura y desarrollo',  icono: BookOpen },
                        { label: 'Calendario editorial', sub: 'Planificación semanal',     icono: Calendar },
                    ].map(accion => (
                        <div
                            key={accion.label}
                            className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-muted/40 border-2 border-dashed border-border/60 opacity-50 cursor-not-allowed"
                        >
                            <div className="flex items-start justify-between w-full">
                                <accion.icono className="w-6 h-6 text-muted-foreground" />
                                <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-foreground">{accion.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{accion.sub}</p>
                            </div>
                        </div>
                    ))}

                </div>
            </div>

        </div>
    );
}
