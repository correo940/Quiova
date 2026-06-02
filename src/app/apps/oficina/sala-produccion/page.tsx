'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Clapperboard, ChevronRight, Plus, X, Sparkles } from 'lucide-react';
import {
    useOficinaRegistros,
    type FasePieza,
    type CategoriaProduccion,
    type FormatoProduccion,
    type ObjetivoProduccion,
} from '@/hooks/useOficinaRegistros';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

// ── Metadata visual ───────────────────────────────────────────────────────────

const FASE_META: Record<FasePieza, { label: string; color: string; badge: string; borde: string; dot: string }> = {
    idea:      { label: 'Idea',      color: 'text-amber-600 dark:text-amber-400',     badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',     borde: 'border-l-amber-500',   dot: 'bg-amber-400' },
    guion:     { label: 'Guion',     color: 'text-violet-600 dark:text-violet-400',   badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',   borde: 'border-l-violet-500',  dot: 'bg-violet-400' },
    grabado:   { label: 'Grabado',   color: 'text-rose-600 dark:text-rose-400',       badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',         borde: 'border-l-rose-500',    dot: 'bg-rose-400' },
    publicado: { label: 'Publicado', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400', borde: 'border-l-emerald-500', dot: 'bg-emerald-400' },
};

const CATEGORIA_META: Record<CategoriaProduccion, { label: string; dot: string }> = {
    quioba:   { label: 'Quioba',   dot: 'bg-sky-400' },
    cuerpo:   { label: 'Cuerpo',   dot: 'bg-orange-400' },
    mente:    { label: 'Mente',    dot: 'bg-violet-400' },
    finanzas: { label: 'Finanzas', dot: 'bg-emerald-400' },
};

const FORMATO_LABEL: Record<FormatoProduccion, string> = {
    corto: 'Corto', largo: 'Largo', tutorial: 'Tutorial', historia: 'Historia', opinion: 'Opinión',
};

const OBJETIVO_META: Record<ObjetivoProduccion, { label: string; cls: string }> = {
    alcance:    { label: 'Alcance',    cls: 'bg-sky-500/10 text-sky-700 dark:text-sky-400' },
    captacion:  { label: 'Captación',  cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
    marca:      { label: 'Marca',      cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-400' },
    conversion: { label: 'Conversión', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
};

const FASES: FasePieza[] = ['idea', 'guion', 'grabado', 'publicado'];
type TabFase = FasePieza | 'todos';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SalaProduccionPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { piezas, cargando, agregarPieza } = useOficinaRegistros();

    const [tab, setTab] = useState<TabFase>('todos');
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState({
        titulo: '',
        fase: 'idea' as FasePieza,
        categoria: 'quioba' as CategoriaProduccion,
        formato: 'corto' as FormatoProduccion,
        objetivo: 'alcance' as ObjetivoProduccion,
        nota: '',
    });
    const [err, setErr] = useState('');

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    if (loading || cargando || !user || user.email !== ADMIN_EMAIL) return null;

    function submit() {
        if (!form.titulo.trim()) { setErr('El título es obligatorio.'); return; }
        agregarPieza({ ...form, titulo: form.titulo.trim() });
        setForm({ titulo: '', fase: 'idea', categoria: 'quioba', formato: 'corto', objetivo: 'alcance', nota: '' });
        setErr('');
        setFormOpen(false);
    }

    const enProduccion = piezas.filter(p => p.fase !== 'publicado').length;
    const publicadas = piezas.filter(p => p.fase === 'publicado').length;
    const lista = tab === 'todos' ? piezas : piezas.filter(p => p.fase === tab);

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-6 animate-in fade-in duration-500">

            <Link href="/apps/oficina" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" /> Oficina
            </Link>

            {/* Header */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-950 via-zinc-900 to-slate-950 p-8 md:p-10 shadow-xl">
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
                    style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #fbbf24 0px, #fbbf24 1px, transparent 1px, transparent 12px)' }} />
                <div className="relative space-y-4">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400/70 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                        <Clapperboard className="w-3.5 h-3.5" /> Zona común · Sala de Producción
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">Sala de<br />Producción</h1>
                    <p className="text-xs font-mono text-amber-200/40">
                        {piezas.length > 0
                            ? `${enProduccion} en producción · ${publicadas} publicadas`
                            : 'Sin producciones registradas'}
                    </p>
                </div>
            </div>

            {/* Registrar pieza */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setFormOpen(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Registrar producción</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{formOpen ? '▲' : '▼'}</span>
                </button>
                {formOpen && (
                    <div className="border-t border-border/40 p-5 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Título</label>
                            <input
                                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                placeholder="Ej: 5 hábitos que arruinan tu productividad"
                                value={form.titulo}
                                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fase</label>
                                <select
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    value={form.fase}
                                    onChange={e => setForm(f => ({ ...f, fase: e.target.value as FasePieza }))}
                                >
                                    <option value="idea">Idea</option>
                                    <option value="guion">Guion</option>
                                    <option value="grabado">Grabado</option>
                                    <option value="publicado">Publicado</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Categoría</label>
                                <select
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    value={form.categoria}
                                    onChange={e => setForm(f => ({ ...f, categoria: e.target.value as CategoriaProduccion }))}
                                >
                                    <option value="quioba">Quioba</option>
                                    <option value="cuerpo">Cuerpo</option>
                                    <option value="mente">Mente</option>
                                    <option value="finanzas">Finanzas</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Formato</label>
                                <select
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    value={form.formato}
                                    onChange={e => setForm(f => ({ ...f, formato: e.target.value as FormatoProduccion }))}
                                >
                                    <option value="corto">Corto</option>
                                    <option value="largo">Largo</option>
                                    <option value="tutorial">Tutorial</option>
                                    <option value="historia">Historia</option>
                                    <option value="opinion">Opinión</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Objetivo</label>
                                <select
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    value={form.objetivo}
                                    onChange={e => setForm(f => ({ ...f, objetivo: e.target.value as ObjetivoProduccion }))}
                                >
                                    <option value="alcance">Alcance</option>
                                    <option value="captacion">Captación</option>
                                    <option value="marca">Marca</option>
                                    <option value="conversion">Conversión</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nota (opcional)</label>
                            <textarea
                                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                                rows={2}
                                placeholder="Ideas, contexto, referencia..."
                                value={form.nota}
                                onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
                            />
                        </div>
                        {err && <p className="text-xs text-red-500">{err}</p>}
                        <div className="flex gap-2">
                            <button onClick={submit} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold transition-colors">
                                Registrar producción
                            </button>
                            <button onClick={() => { setFormOpen(false); setErr(''); }} className="p-2.5 rounded-xl bg-muted hover:bg-muted/70 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Pipeline bar */}
            {piezas.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Pipeline</p>
                    <div className="flex items-stretch gap-0 rounded-2xl overflow-hidden border border-border/40 shadow-sm">
                        {FASES.map(fase => {
                            const meta = FASE_META[fase];
                            const count = piezas.filter(p => p.fase === fase).length;
                            const isActive = tab === fase;
                            return (
                                <button
                                    key={fase}
                                    onClick={() => setTab(isActive ? 'todos' : fase)}
                                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 border-r last:border-r-0 border-border/30 transition-all ${
                                        isActive ? 'bg-muted/60' : 'bg-card hover:bg-muted/30'
                                    }`}
                                >
                                    <span className={`text-xl font-black tabular-nums ${meta.color}`}>{count}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{meta.label}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[10px] text-muted-foreground/50 px-1">
                        Pulsa una fase para filtrar · Vuelve a pulsar para ver todo
                    </p>
                </div>
            )}

            {/* Lista de piezas */}
            {piezas.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border/60 p-10 text-center space-y-3">
                    <Clapperboard className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                    <p className="font-semibold text-muted-foreground">Sin producciones registradas</p>
                    <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto leading-relaxed">
                        La Sala de Producción muestra únicamente producciones reales. Registra la primera para activar el pipeline.
                    </p>
                </div>
            ) : lista.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground/50 text-sm">
                    No hay piezas en esta fase.
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            {tab === 'todos' ? 'Todas las piezas' : FASE_META[tab].label}
                        </p>
                        <span className="text-xs text-muted-foreground/60">{lista.length}</span>
                    </div>
                    {lista.map(pieza => {
                        const fase = FASE_META[pieza.fase];
                        const cat = CATEGORIA_META[pieza.categoria];
                        const obj = OBJETIVO_META[pieza.objetivo];
                        return (
                            <Link
                                key={pieza.id}
                                href={`/apps/oficina/sala-produccion/${pieza.id}`}
                                className={`block bg-card border border-border/40 rounded-2xl overflow-hidden border-l-2 ${fase.borde} transition-all hover:shadow-md group`}
                            >
                                <div className="p-4 space-y-2.5">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <p className="text-sm font-bold leading-snug flex-1 min-w-0">{pieza.titulo}</p>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${fase.badge}`}>
                                                {fase.label}
                                            </span>
                                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cat.dot}`} />
                                            <span className="font-medium">{cat.label}</span>
                                        </div>
                                        <span className="text-muted-foreground/30 text-[10px]">·</span>
                                        <span className="text-[10px] text-muted-foreground font-medium">{FORMATO_LABEL[pieza.formato]}</span>
                                        <span className="text-muted-foreground/30 text-[10px]">·</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${obj.cls}`}>{obj.label}</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-0.5">
                                        <span className="text-[10px] text-muted-foreground/60 font-mono">
                                            {new Date(pieza.fechaRegistro).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                        </span>
                                        {pieza.fase === 'idea' && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                <Sparkles className="w-3 h-3" /> Preparar guion
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

        </div>
    );
}
