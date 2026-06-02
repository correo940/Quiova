'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Clapperboard, Copy, Check, FileText, Trash2, ChevronRight, Mic2, Sparkles, Clock, Hash } from 'lucide-react';
import { generarBriefing } from '@/config/oficina/briefing-generator';
import {
    useOficinaRegistros,
    type FasePieza,
    type CategoriaProduccion,
    type FormatoProduccion,
    type ObjetivoProduccion,
} from '@/hooks/useOficinaRegistros';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

// ── Metadata visual ───────────────────────────────────────────────────────────

const FASE_BADGE: Record<FasePieza, string> = {
    idea:      'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    guion:     'bg-violet-500/15 text-violet-700 dark:text-violet-400',
    grabado:   'bg-rose-500/15 text-rose-700 dark:text-rose-400',
    publicado: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
};
const FASE_LABEL: Record<FasePieza, string> = {
    idea: 'Idea', guion: 'Guion', grabado: 'Grabado', publicado: 'Publicado',
};
const FASES_ORDEN: FasePieza[] = ['idea', 'guion', 'grabado', 'publicado'];
const FASE_BORDE: Record<FasePieza, string> = {
    idea: 'border-amber-500/30', guion: 'border-violet-500/30',
    grabado: 'border-rose-500/30', publicado: 'border-emerald-500/30',
};
const CAT_DOT: Record<CategoriaProduccion, string> = {
    quioba: 'bg-sky-400', cuerpo: 'bg-orange-400', mente: 'bg-violet-400', finanzas: 'bg-emerald-400',
};
const FORMATO_LABEL: Record<FormatoProduccion, string> = {
    corto: 'Corto', largo: 'Largo', tutorial: 'Tutorial', historia: 'Historia', opinion: 'Opinión',
};
const OBJETIVO_CLS: Record<ObjetivoProduccion, string> = {
    alcance:    'bg-sky-500/10 text-sky-700 dark:text-sky-400',
    captacion:  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    marca:      'bg-violet-500/10 text-violet-700 dark:text-violet-400',
    conversion: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
};
const OBJETIVO_LABEL: Record<ObjetivoProduccion, string> = {
    alcance: 'Alcance', captacion: 'Captación', marca: 'Marca', conversion: 'Conversión',
};

// ── Botones de copia ──────────────────────────────────────────────────────────

type Target = 'claude' | 'chatgpt' | 'gemini';

const COPY_BTN: Record<Target, { label: string; sub: string; cls: string; active: string }> = {
    claude:  { label: 'Copiar para Claude',  sub: 'Anthropic', cls: 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/50', active: 'bg-orange-500/15 border-orange-500/50 text-orange-700 dark:text-orange-300' },
    chatgpt: { label: 'Copiar para ChatGPT', sub: 'OpenAI',    cls: 'border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 hover:border-teal-500/50',         active: 'bg-teal-500/15 border-teal-500/50 text-teal-700 dark:text-teal-300' },
    gemini:  { label: 'Copiar para Gemini',  sub: 'Google',    cls: 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/50',          active: 'bg-blue-500/15 border-blue-500/50 text-blue-700 dark:text-blue-300' },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PiezaDetallePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const { piezas, producciones, cargando, cambiarFasePieza, eliminarPieza } = useOficinaRegistros();
    const [copied, setCopied] = useState<Target | null>(null);

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    if (loading || cargando || !user || user.email !== ADMIN_EMAIL) return null;

    const pieza = piezas.find(p => p.id === params?.id);

    if (!pieza) {
        return (
            <div className="max-w-3xl mx-auto p-6 space-y-4">
                <Link href="/apps/oficina/sala-produccion" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Sala de Producción
                </Link>
                <p className="text-muted-foreground text-sm">Pieza no encontrada.</p>
            </div>
        );
    }

    // ProduccionVideo asociado (si viene de una serie del Director de Contenido)
    const produccion = producciones.find(p => p.id === pieza.id);

    // Adapter para generarBriefing — solo usa titulo, categoria, formato, objetivo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const briefing = generarBriefing(pieza as any);

    const handleCopy = async (target: Target) => {
        try {
            await navigator.clipboard.writeText(briefing);
        } catch {
            const el = document.createElement('textarea');
            el.value = briefing;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        setCopied(target);
        setTimeout(() => setCopied(null), 2000);
    };

    function handleDelete() {
        if (!pieza) return;
        eliminarPieza(pieza.id);
        router.replace('/apps/oficina/sala-produccion');
    }

    const faseSiguiente = pieza ? FASES_ORDEN[FASES_ORDEN.indexOf(pieza.fase) + 1] : undefined;

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-6 animate-in fade-in duration-500">

            <Link href="/apps/oficina/sala-produccion" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" /> Sala de Producción
            </Link>

            {/* Header */}
            <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 to-slate-950 p-6 shadow-lg border ${FASE_BORDE[pieza.fase]}`}>
                <div className="relative space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <Clapperboard className="w-3 h-3" /> Sala de Producción
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${FASE_BADGE[pieza.fase]}`}>
                            {FASE_LABEL[pieza.fase]}
                        </span>
                    </div>
                    <h1 className="text-xl md:text-2xl font-black text-white leading-snug">{pieza.titulo}</h1>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span className={`w-1.5 h-1.5 rounded-full ${CAT_DOT[pieza.categoria]}`} />
                            <span className="capitalize font-medium">{pieza.categoria}</span>
                        </div>
                        <span className="text-muted-foreground/30 text-[10px]">·</span>
                        <span className="text-[10px] text-muted-foreground">{FORMATO_LABEL[pieza.formato]}</span>
                        <span className="text-muted-foreground/30 text-[10px]">·</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${OBJETIVO_CLS[pieza.objetivo]}`}>
                            {OBJETIVO_LABEL[pieza.objetivo]}
                        </span>
                    </div>
                    {pieza.nota && (
                        <p className="text-[11px] text-white/50 leading-relaxed bg-white/5 rounded-xl px-3 py-2">
                            {pieza.nota}
                        </p>
                    )}
                </div>
            </div>

            {/* Contenido del vídeo (si viene de una serie) */}
            {produccion && (
                <div className="space-y-3">
                    {produccion.duracion && (
                        <div className="flex items-center gap-2 px-1">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />
                            <span className="text-xs text-muted-foreground">{produccion.duracion}</span>
                        </div>
                    )}

                    {produccion.descripcion && (
                        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
                                <FileText className="w-3 h-3 text-muted-foreground/60" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descripción</p>
                            </div>
                            <p className="px-4 py-3 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{produccion.descripcion}</p>
                        </div>
                    )}

                    {produccion.locucion && (
                        <div className="bg-card border border-sky-500/20 rounded-2xl overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-sky-500/10 bg-sky-500/5 flex items-center gap-2">
                                <Mic2 className="w-3 h-3 text-sky-500" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">Locución — Texto a leer</p>
                            </div>
                            <p className="px-4 py-3 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{produccion.locucion}</p>
                        </div>
                    )}

                    {produccion.promptVisual && (
                        <div className="rounded-2xl overflow-hidden border border-slate-600/30">
                            <div className="px-4 py-2.5 border-b border-slate-600/20 bg-slate-900/60 flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-violet-400" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Prompt Visual — Para generar imagen</p>
                            </div>
                            <p className="px-4 py-3 text-xs font-mono leading-relaxed text-slate-300 bg-slate-950/60 whitespace-pre-wrap">{produccion.promptVisual}</p>
                        </div>
                    )}

                    {produccion.hashtags.length > 0 && (
                        <div className="flex items-start gap-2 px-1 flex-wrap">
                            <Hash className="w-3.5 h-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                            <div className="flex flex-wrap gap-1.5">
                                {produccion.hashtags.map(h => (
                                    <span key={h} className="text-[10px] font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full">{h}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Acciones de fase */}
            <div className="flex gap-2">
                {faseSiguiente && (
                    <button
                        onClick={() => cambiarFasePieza(pieza.id, faseSiguiente)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted hover:bg-muted/70 border border-border/50 text-sm font-semibold transition-colors"
                    >
                        Avanzar a {FASE_LABEL[faseSiguiente]}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}
                <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-semibold border border-red-500/20 transition-colors"
                >
                    <Trash2 className="w-4 h-4" /> Eliminar
                </button>
            </div>

            {/* Briefing */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-amber-500/10 to-transparent px-5 py-3 border-b border-border/40">
                    <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-amber-500" />
                        <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Briefing Preparado</p>
                    </div>
                </div>
                <div className="p-4">
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                        Briefing generado a partir de los datos registrados. Cópialo y pégalo en Claude, ChatGPT o Gemini.
                    </p>
                    <textarea
                        readOnly
                        value={briefing}
                        rows={22}
                        className="w-full text-[11px] font-mono leading-relaxed bg-muted/30 border border-border/40 rounded-xl px-4 py-3 resize-none focus:outline-none text-foreground/80"
                        onClick={e => (e.target as HTMLTextAreaElement).select()}
                    />
                </div>
            </div>

            {/* Botones de copia */}
            <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Copiar briefing</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(Object.keys(COPY_BTN) as Target[]).map(target => {
                        const btn = COPY_BTN[target];
                        const isCopied = copied === target;
                        return (
                            <button
                                key={target}
                                onClick={() => handleCopy(target)}
                                className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border transition-all ${isCopied ? btn.active : btn.cls}`}
                            >
                                <div className="text-left">
                                    <p className="text-sm font-bold leading-none">{btn.label}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">{btn.sub}</p>
                                </div>
                                {isCopied
                                    ? <Check className="w-4 h-4 shrink-0 text-current" />
                                    : <Copy className="w-4 h-4 shrink-0 text-muted-foreground" />
                                }
                            </button>
                        );
                    })}
                </div>
                <p className="text-[10px] text-muted-foreground/50 px-1">
                    Los tres botones copian el mismo texto.
                </p>
            </div>

        </div>
    );
}
