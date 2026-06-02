'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ChevronLeft, Briefcase, Crown, CalendarClock, Plus, X,
    CheckCircle2, CircleDot, Circle, ListTodo, Zap, Lock, Trash2
} from 'lucide-react';
import { useOficinaRegistros, type TareaGabinete } from '@/hooks/useOficinaRegistros';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

function UrgenciaBadge({ valor }: { valor: TareaGabinete['urgencia'] }) {
    if (valor === 'inmediata') return (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">Inmediata</span>
    );
    if (valor === 'esta-semana') return (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">Esta semana</span>
    );
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Este mes</span>;
}

export default function JefeGabinetePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const {
        tareas,
        executionTasks,
        cargando,
        agregarTarea,
        toggleEstadoExecutionTask,
        eliminarExecutionTask,
    } = useOficinaRegistros();

    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState({
        titulo: '',
        urgencia: 'esta-semana' as TareaGabinete['urgencia'],
        estado: 'pendiente' as TareaGabinete['estado'],
        contexto: '',
    });
    const [err, setErr] = useState('');

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    if (loading || cargando || !user || user.email !== ADMIN_EMAIL) return null;

    function submit() {
        if (!form.titulo.trim()) { setErr('El título es obligatorio.'); return; }
        agregarTarea(form.titulo.trim(), form.urgencia, form.estado, form.contexto.trim());
        setForm({ titulo: '', urgencia: 'esta-semana', estado: 'pendiente', contexto: '' });
        setErr('');
        setFormOpen(false);
    }

    const completadas = executionTasks.filter(t => t.estado === 'completada').length;
    const enProgreso = executionTasks.filter(t => t.estado === 'en-progreso').length;
    const pendientes = executionTasks.length - completadas - enProgreso;
    const pct = executionTasks.length > 0 ? Math.round((completadas / executionTasks.length) * 100) : 0;
    const legacyCompletadas = tareas.filter(t => t.estado === 'completada').length;

    const grupos: { urgencia: TareaGabinete['urgencia']; label: string }[] = [
        { urgencia: 'inmediata', label: 'Inmediata' },
        { urgencia: 'esta-semana', label: 'Esta semana' },
        { urgencia: 'este-mes', label: 'Este mes' },
    ];

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-6 animate-in fade-in duration-500">

            <Link href="/apps/oficina" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" /> Oficina
            </Link>

            {/* Header */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-teal-950 via-slate-900 to-slate-950 p-8 md:p-10 shadow-xl">
                <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
                    style={{ backgroundImage: 'linear-gradient(45deg, #14b8a6 1px, transparent 1px), linear-gradient(-45deg, #14b8a6 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="relative space-y-4">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-teal-400/70 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                        <Briefcase className="w-3.5 h-3.5" /> Despacho 02 · Jefe de Gabinete
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">Jefe de<br />Gabinete</h1>
                    <p className="text-teal-200/40 text-xs font-mono">
                        Tareas registradas · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Registrar tarea */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setFormOpen(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-teal-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">Registrar tarea</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{formOpen ? '▲' : '▼'}</span>
                </button>
                {formOpen && (
                    <div className="border-t border-border/40 p-5 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tarea</label>
                            <input
                                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                                placeholder="Ej: Preparar deck para la próxima reunión"
                                value={form.titulo}
                                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Urgencia</label>
                                <select
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    value={form.urgencia}
                                    onChange={e => setForm(f => ({ ...f, urgencia: e.target.value as TareaGabinete['urgencia'] }))}
                                >
                                    <option value="inmediata">Inmediata</option>
                                    <option value="esta-semana">Esta semana</option>
                                    <option value="este-mes">Este mes</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Estado</label>
                                <select
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    value={form.estado}
                                    onChange={e => setForm(f => ({ ...f, estado: e.target.value as TareaGabinete['estado'] }))}
                                >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="en-progreso">En progreso</option>
                                    <option value="completada">Completada</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Contexto (opcional)</label>
                            <textarea
                                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                                rows={3}
                                placeholder="Detalles adicionales..."
                                value={form.contexto}
                                onChange={e => setForm(f => ({ ...f, contexto: e.target.value }))}
                            />
                        </div>
                        {err && <p className="text-xs text-red-500">{err}</p>}
                        <div className="flex gap-2">
                            <button onClick={submit} className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-sm font-bold transition-colors">
                                Registrar tarea
                            </button>
                            <button onClick={() => { setFormOpen(false); setErr(''); }} className="p-2.5 rounded-xl bg-muted hover:bg-muted/70 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tareas */}
            {executionTasks.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border/60 p-10 text-center space-y-3">
                    <ListTodo className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                    <p className="font-semibold text-muted-foreground">Sin tareas registradas</p>
                    <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto leading-relaxed">
                        El Jefe de Gabinete solo organiza tareas existentes. Registra la primera tarea para activar este despacho.
                    </p>
                </div>
            ) : (
                <>
                    {/* Barra de progreso global */}
                    <div className="bg-card border border-teal-500/20 rounded-2xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">Progreso global</span>
                            <span className="text-sm font-bold tabular-nums">
                                {completadas}<span className="text-muted-foreground font-normal">/{executionTasks.length}</span>
                            </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full rounded-full bg-teal-500 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                {enProgreso > 0 && <>{enProgreso} en progreso · </>}
                                {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
                            </span>
                            <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{pct}%</span>
                        </div>
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs space-y-1">
                            <p className="font-semibold text-amber-700 dark:text-amber-300">Debug temporal</p>
                            <p>Total tareas: {executionTasks.length}</p>
                            <p>Completadas: {completadas}</p>
                            <p>Total tareas legacy: {tareas.length}</p>
                            <p>Completadas legacy: {legacyCompletadas}</p>
                        </div>
                    </div>

                    {/* Grupos por urgencia */}
                    {grupos.map(({ urgencia }) => {
                        const items = executionTasks.filter(t => t.urgencia === urgencia);
                        if (items.length === 0) return null;
                        const itemsHechos = items.filter(t => t.estado === 'completada').length;
                        return (
                            <div key={urgencia} className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                                <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
                                    <UrgenciaBadge valor={urgencia} />
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                        {itemsHechos}/{items.length}
                                    </span>
                                </div>
                                <ul className="divide-y divide-border/40">
                                    {items.map(tarea => (
                                        <li
                                            key={tarea.id}
                                            className={`p-4 flex items-start gap-3 transition-colors ${tarea.estado === 'completada' ? 'bg-muted/20' : ''}`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    console.log(tarea.id, tarea.estado);
                                                    toggleEstadoExecutionTask(tarea.id);
                                                }}
                                                className="shrink-0 mt-0.5 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                                                title={
                                                    tarea.estado === 'pendiente' ? 'Marcar como en progreso' :
                                                    tarea.estado === 'en-progreso' ? 'Marcar como completada' :
                                                    'Volver a pendiente'
                                                }
                                            >
                                                {tarea.estado === 'completada' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                                {tarea.estado === 'en-progreso' && <CircleDot className="w-5 h-5 text-teal-500" />}
                                                {tarea.estado === 'pendiente' && <Circle className="w-5 h-5 text-muted-foreground/40" />}
                                            </button>
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <p className={`text-sm font-semibold leading-snug ${tarea.estado === 'completada' ? 'line-through text-muted-foreground/60' : ''}`}>
                                                    {tarea.title}
                                                </p>
                                                {tarea.contexto && tarea.contexto !== 'Analizado desde informe estratégico' && (
                                                    <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-border pl-3">
                                                        {tarea.contexto}
                                                    </p>
                                                )}
                                                {tarea.estado === 'en-progreso' && (
                                                    <span className="inline-block text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">En progreso</span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => eliminarExecutionTask(tarea.id)}
                                                className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </>
            )}

            {/* Acciones rápidas */}
            <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Acciones rápidas</p>
                <div className="grid grid-cols-2 gap-3">
                    <Link
                        href="/apps/oficina/director"
                        className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20 hover:scale-[1.02] hover:shadow-xl transition-all"
                    >
                        <Crown className="w-6 h-6 opacity-90" />
                        <div><p className="font-bold text-sm">Director General</p><p className="text-xs opacity-70 mt-0.5">Informes estratégicos</p></div>
                    </Link>
                    <Link
                        href="/apps/oficina/reunion-semanal"
                        className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20 hover:scale-[1.02] hover:shadow-xl transition-all"
                    >
                        <CalendarClock className="w-6 h-6 opacity-90" />
                        <div><p className="font-bold text-sm">Reunión Semanal</p><p className="text-xs opacity-70 mt-0.5">Plan de la semana</p></div>
                    </Link>
                    {[
                        { label: 'Seguimiento', sub: 'Estado de tareas', icono: ListTodo },
                        { label: 'Automatizaciones', sub: 'Flujos operativos', icono: Zap },
                    ].map(a => (
                        <div key={a.label} className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-muted/40 border-2 border-dashed border-border/60 opacity-50 cursor-not-allowed">
                            <div className="flex items-start justify-between w-full">
                                <a.icono className="w-6 h-6 text-muted-foreground" />
                                <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
                            </div>
                            <div><p className="font-bold text-sm text-foreground">{a.label}</p><p className="text-xs text-muted-foreground mt-0.5">{a.sub}</p></div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
