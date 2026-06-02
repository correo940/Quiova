'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ChevronLeft, Swords, Target, Plus, X, Trash2,
    TrendingUp, TrendingDown, Minus, Crown, Briefcase, ScrollText,
    Pencil
} from 'lucide-react';
import { useOficinaRegistros, type ObjetivoActual } from '@/hooks/useOficinaRegistros';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

function fmtFecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SalaGuerraPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { objetivo, decisiones, cargando, setObjetivo, agregarDecision, eliminarDecision } = useOficinaRegistros();

    const [editandoObjetivo, setEditandoObjetivo] = useState(false);
    const [objForm, setObjForm] = useState({
        texto: '',
        progreso: 0,
        tendencia: 'estable' as ObjetivoActual['tendencia'],
    });

    const [decForm, setDecForm] = useState({
        texto: '',
        autor: 'Director General',
        fecha: new Date().toISOString().slice(0, 10),
    });
    const [decFormOpen, setDecFormOpen] = useState(false);
    const [errDec, setErrDec] = useState('');

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    if (loading || cargando || !user || user.email !== ADMIN_EMAIL) return null;

    function abrirEditarObjetivo() {
        setObjForm({
            texto: objetivo?.texto ?? '',
            progreso: objetivo?.progreso ?? 0,
            tendencia: objetivo?.tendencia ?? 'estable',
        });
        setEditandoObjetivo(true);
    }

    function guardarObjetivo() {
        if (!objForm.texto.trim()) return;
        setObjetivo({ texto: objForm.texto.trim(), progreso: objForm.progreso, tendencia: objForm.tendencia });
        setEditandoObjetivo(false);
    }

    function submitDecision() {
        if (!decForm.texto.trim()) { setErrDec('El texto es obligatorio.'); return; }
        agregarDecision(decForm.texto.trim(), decForm.autor.trim() || 'Director General', decForm.fecha);
        setDecForm({ texto: '', autor: 'Director General', fecha: new Date().toISOString().slice(0, 10) });
        setErrDec('');
        setDecFormOpen(false);
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-6 animate-in fade-in duration-500">

            <Link href="/apps/oficina" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" /> Oficina
            </Link>

            {/* Header */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-red-950 via-slate-900 to-slate-950 p-8 md:p-10 shadow-xl">
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg, #ef4444 0px, #ef4444 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, #ef4444 0px, #ef4444 1px, transparent 1px, transparent 32px)' }} />
                <div className="relative space-y-4">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-400/70 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                        <Swords className="w-3.5 h-3.5" /> Centro de Operaciones · Quioba
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">Sala de<br />Guerra</h1>
                    <p className="text-red-200/40 text-xs font-mono">
                        Decisiones registradas · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Objetivo actual */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-indigo-500/10 to-transparent px-5 py-3 border-b border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-indigo-500" />
                        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Objetivo actual</p>
                    </div>
                    {objetivo && !editandoObjetivo && (
                        <button onClick={abrirEditarObjetivo} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="w-3 h-3" /> Editar
                        </button>
                    )}
                </div>

                {/* Sin objetivo o editando */}
                {(!objetivo || editandoObjetivo) && (
                    <div className="p-5 space-y-4">
                        {!objetivo && !editandoObjetivo && (
                            <p className="text-xs text-muted-foreground/60 leading-relaxed">
                                Define el objetivo operativo actual para activar la Sala de Guerra.
                            </p>
                        )}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Objetivo</label>
                            <textarea
                                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                                rows={3}
                                placeholder="Ej: Conseguir los primeros 10 usuarios externos activos en Quioba antes del 30 de junio"
                                value={objForm.texto}
                                onChange={e => setObjForm(f => ({ ...f, texto: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Progreso %</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={0} max={100} step={5}
                                        className="flex-1 accent-indigo-500"
                                        value={objForm.progreso}
                                        onChange={e => setObjForm(f => ({ ...f, progreso: Number(e.target.value) }))}
                                    />
                                    <span className="text-sm font-bold tabular-nums w-8 text-right">{objForm.progreso}%</span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tendencia</label>
                                <select
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={objForm.tendencia}
                                    onChange={e => setObjForm(f => ({ ...f, tendencia: e.target.value as ObjetivoActual['tendencia'] }))}
                                >
                                    <option value="subiendo">↑ Subiendo</option>
                                    <option value="estable">→ Estable</option>
                                    <option value="bajando">↓ Bajando</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={guardarObjetivo} className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold transition-colors">
                                {editandoObjetivo ? 'Guardar cambios' : 'Establecer objetivo'}
                            </button>
                            {editandoObjetivo && (
                                <button onClick={() => setEditandoObjetivo(false)} className="p-2.5 rounded-xl bg-muted hover:bg-muted/70 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Objetivo establecido */}
                {objetivo && !editandoObjetivo && (
                    <div className="p-5 space-y-3">
                        <p className="text-sm font-semibold leading-snug">{objetivo.texto}</p>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>Progreso</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{objetivo.progreso}%</span>
                                    {objetivo.tendencia === 'subiendo' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                                    {objetivo.tendencia === 'bajando' && <TrendingDown className="w-3 h-3 text-rose-500" />}
                                    {objetivo.tendencia === 'estable' && <Minus className="w-3 h-3 text-muted-foreground" />}
                                </div>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                                    style={{ width: objetivo.progreso > 0 ? `${objetivo.progreso}%` : '2px' }}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground/50">Actualizado {fmtFecha(objetivo.fechaRegistro)}</p>
                    </div>
                )}
            </div>

            {/* Registrar decisión */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setDecFormOpen(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-red-600 dark:text-red-400">Registrar decisión</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{decFormOpen ? '▲' : '▼'}</span>
                </button>
                {decFormOpen && (
                    <div className="border-t border-border/40 p-5 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Decisión</label>
                            <textarea
                                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                                rows={3}
                                placeholder="Ej: Se prioriza El Campus sobre Mi Hogar para Q2"
                                value={decForm.texto}
                                onChange={e => setDecForm(f => ({ ...f, texto: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Autor</label>
                                <input
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                                    value={decForm.autor}
                                    onChange={e => setDecForm(f => ({ ...f, autor: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fecha</label>
                                <input
                                    type="date"
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                                    value={decForm.fecha}
                                    onChange={e => setDecForm(f => ({ ...f, fecha: e.target.value }))}
                                />
                            </div>
                        </div>
                        {errDec && <p className="text-xs text-red-500">{errDec}</p>}
                        <div className="flex gap-2">
                            <button onClick={submitDecision} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors">
                                Registrar decisión
                            </button>
                            <button onClick={() => { setDecFormOpen(false); setErrDec(''); }} className="p-2.5 rounded-xl bg-muted hover:bg-muted/70 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Decisiones */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-slate-500/10 to-transparent px-5 py-3 border-b border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ScrollText className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Últimas decisiones</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{decisiones.length} registrada{decisiones.length !== 1 ? 's' : ''}</span>
                </div>

                {decisiones.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                        <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-xs mx-auto">
                            Las decisiones estratégicas de Quioba aparecerán aquí cuando se registren.
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border/40">
                        {decisiones.map(d => (
                            <li key={d.id} className="px-5 py-4 flex items-start gap-3">
                                <div className="shrink-0 mt-0.5">
                                    {d.autor === 'Director General'
                                        ? <Crown className="w-3.5 h-3.5 text-amber-500" />
                                        : <Briefcase className="w-3.5 h-3.5 text-teal-500" />}
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                    <p className="text-sm leading-snug">{d.texto}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="font-medium">{d.autor}</span>
                                        <span>·</span>
                                        <span className="font-mono">{d.fecha}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => eliminarDecision(d.id)}
                                    className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

        </div>
    );
}
