'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import {
    ChevronLeft,
    Crown,
    CalendarClock,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Lock,
    Layers,
    Compass,
    Users,
} from 'lucide-react';
import { useOficinaRegistros } from '@/hooks/useOficinaRegistros';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

function fmtFecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function BriefStatusBadge({ status }: { status: 'borrador' | 'publicado' }) {
    if (status === 'publicado') {
        return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Publicado</span>;
    }
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">Borrador</span>;
}

function DecisionStatusBadge({ status }: { status: 'propuesta' | 'aprobada' | 'descartada' }) {
    if (status === 'aprobada') {
        return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Aprobada</span>;
    }
    if (status === 'descartada') {
        return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">Descartada</span>;
    }
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">Propuesta</span>;
}

function SectionList({ title, items, icon }: { title: string; items: string[]; icon: ReactNode }) {
    return (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
                {icon}
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
                <span className="text-xs text-muted-foreground ml-auto">{items.length}</span>
            </div>
            <ul className="divide-y divide-border/40">
                {items.map((item, idx) => (
                    <li key={`${title}-${idx}`} className="px-5 py-3 text-sm leading-snug">
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function DirectorGeneralPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const {
        executiveBriefs,
        decisionesEjecutivas,
        executionTasks,
        cargando,
        cambiarEstadoDecisionEjecutiva,
    } = useOficinaRegistros();

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    const decisionsByBrief = useMemo(() => {
        const map = new Map<string, typeof decisionesEjecutivas>();
        for (const d of decisionesEjecutivas) {
            const arr = map.get(d.executiveBriefId) ?? [];
            arr.push(d);
            map.set(d.executiveBriefId, arr);
        }
        return map;
    }, [decisionesEjecutivas]);
    const latestBrief = executiveBriefs[0];

    if (loading || cargando || !user || user.email !== ADMIN_EMAIL) return null;

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-6 animate-in fade-in duration-500">
            <Link href="/apps/oficina" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" /> Oficina
            </Link>

            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-950 via-slate-900 to-slate-950 p-8 md:p-10 shadow-xl">
                <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 30% 60%, #f59e0b 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                <div className="relative space-y-4">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400/70 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                        <Crown className="w-3.5 h-3.5" /> Despacho 01 · Director General
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">Director<br />General</h1>
                    <p className="text-amber-200/50 text-xs font-mono">Decisiones ejecutivas · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
            </div>

            {!latestBrief ? (
                <div className="rounded-2xl border-2 border-dashed border-border/60 p-10 text-center space-y-3">
                    <Crown className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                    <p className="font-semibold text-muted-foreground">Sin informe ejecutivo publicado</p>
                    <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto leading-relaxed">
                        El Director General muestra decisiones ejecutivas generadas desde Consejo Estratégico.
                    </p>
                </div>
            ) : (
                <>
                    <div className="bg-card border border-amber-500/30 rounded-2xl overflow-hidden shadow-sm">
                        <div className="bg-gradient-to-r from-amber-500/10 to-transparent px-5 py-3 border-b border-border/40 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                                <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Informe Ejecutivo Oficial</p>
                                <p className="text-sm font-semibold">{latestBrief.title}</p>
                            </div>
                            <BriefStatusBadge status={latestBrief.status} />
                        </div>
                        <div className="p-5 space-y-3">
                            <p className="text-sm leading-snug">{latestBrief.summary}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Clock className="w-3 h-3" /> {fmtFecha(latestBrief.createdAt)}
                            </p>
                            {/* DEBUG temporal para auditar fuente de datos del Director General */}
                            <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-xs space-y-1">
                                <p className="font-semibold text-sky-700 dark:text-sky-300">Debug Director (temporal)</p>
                                <p>Fuente colección: executiveBriefs[0]</p>
                                <p>ExecutiveBrief ID: {latestBrief.id}</p>
                                <p>Prioridades: {latestBrief.priorities.length}</p>
                                <p>Acciones: {latestBrief.actions.length}</p>
                                <p>Riesgos: {latestBrief.risks.length}</p>
                                <p>Primera prioridad renderizada: {latestBrief.priorities[0] ?? '—'}</p>
                                <p>Primera acción renderizada: {latestBrief.actions[0] ?? '—'}</p>
                                <p>Primer riesgo renderizado: {latestBrief.risks[0] ?? '—'}</p>
                            </div>
                        </div>
                    </div>

                    <SectionList
                        title="Prioridades"
                        items={latestBrief.priorities}
                        icon={<Layers className="w-4 h-4 text-amber-500" />}
                    />
                    <SectionList
                        title="Acciones"
                        items={latestBrief.actions}
                        icon={<CheckCircle2 className="w-4 h-4 text-sky-500" />}
                    />
                    <SectionList
                        title="Riesgos"
                        items={latestBrief.risks}
                        icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
                    />

                    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Decisiones Ejecutivas</p>
                            <span className="text-xs text-muted-foreground">{(decisionsByBrief.get(latestBrief.id) ?? []).length}</span>
                        </div>
                        {(decisionsByBrief.get(latestBrief.id) ?? []).length === 0 ? (
                            <div className="p-5 text-sm text-muted-foreground">Sin decisiones registradas para este informe.</div>
                        ) : (
                            <ul className="divide-y divide-border/40">
                                {(decisionsByBrief.get(latestBrief.id) ?? []).map(decision => {
                                    const tasks = executionTasks.filter(t => t.decisionId === decision.id);
                                    const completed = tasks.filter(t => t.estado === 'completada').length;
                                    return (
                                        <li key={decision.id} className="p-5 space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-semibold">{decision.title}</p>
                                                    <p className="text-sm text-muted-foreground">{decision.description}</p>
                                                </div>
                                                <DecisionStatusBadge status={decision.status} />
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>Responsable: {decision.responsable}</span>
                                                <span>·</span>
                                                <span>Fecha: {decision.fecha}</span>
                                                <span>·</span>
                                                <span>Tareas: {completed}/{tasks.length}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => cambiarEstadoDecisionEjecutiva(decision.id, 'propuesta')}
                                                    className="text-xs px-2 py-1 rounded-lg bg-muted hover:bg-muted/70 transition-colors"
                                                >
                                                    Propuesta
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => cambiarEstadoDecisionEjecutiva(decision.id, 'aprobada')}
                                                    className="text-xs px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 transition-colors"
                                                >
                                                    Aprobar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => cambiarEstadoDecisionEjecutiva(decision.id, 'descartada')}
                                                    className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                                                >
                                                    Descartar
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </>
            )}

            <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Acciones rápidas</p>
                <div className="grid grid-cols-2 gap-3">
                    <Link
                        href="/apps/oficina/reunion-semanal"
                        className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20 hover:scale-[1.02] hover:shadow-xl transition-all"
                    >
                        <CalendarClock className="w-6 h-6 opacity-90" />
                        <div><p className="font-bold text-sm">Reunión Semanal</p><p className="text-xs opacity-70 mt-0.5 leading-snug">Plan y compromisos</p></div>
                    </Link>
                    {[
                        { label: 'Estrategia', sub: 'Visión y roadmap', icono: Compass },
                        { label: 'Producto', sub: 'Features y diseño', icono: Layers },
                        { label: 'Usuarios', sub: 'Captación y validación', icono: Users },
                    ].map(a => (
                        <div key={a.label} className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-muted/40 border-2 border-dashed border-border/60 opacity-50 cursor-not-allowed">
                            <div className="flex items-start justify-between w-full">
                                <a.icono className="w-6 h-6 text-muted-foreground" />
                                <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
                            </div>
                            <div><p className="font-bold text-sm text-foreground">{a.label}</p><p className="text-xs text-muted-foreground mt-0.5 leading-snug">{a.sub}</p></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
