'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ChevronLeft, Cpu, FolderOpen, Target, CheckCircle2,
    Circle, AlertCircle, Scale, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { useOficinaRegistros } from '@/hooks/useOficinaRegistros';
import { useFundacionQuioba } from '@/hooks/useFundacionQuioba';
import DirectorChat from '@/components/oficina/director-chat';
import { filtrarTareasReales } from '@/lib/oficina/tareas-reales';
import { useRegistrar } from '@/hooks/useRegistrar';
import { ModalAccionPropuesta } from '@/components/oficina/modal-accion-propuesta';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

const DIR_ID = 'director-tecnico';

function UrgenciaBadge({ urgencia }: { urgencia: string }) {
    const s: Record<string, string> = {
        inmediata:      'bg-red-500/10 text-red-600 dark:text-red-400',
        'esta-semana':  'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        'este-mes':     'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    };
    return <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${s[urgencia] ?? 'bg-muted text-muted-foreground'}`}>{urgencia}</span>;
}

function PrioridadDot({ prioridad }: { prioridad?: string }) {
    const color = prioridad === 'alta' ? 'bg-red-500' : prioridad === 'media' ? 'bg-amber-500' : 'bg-blue-400';
    return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

function EstadoIcon({ estado }: { estado: string }) {
    if (estado === 'completada') return <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
    if (estado === 'en-progreso') return <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 animate-pulse" />;
    return <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />;
}

function EstadoBadge({ estado }: { estado: string }) {
    const s: Record<string, string> = {
        pendiente:      'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        'en-revision':  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        cerrado:        'bg-muted text-muted-foreground',
        aprobada:       'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        propuesta:      'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        descartada:     'bg-red-500/10 text-red-600 dark:text-red-400',
    };
    return <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${s[estado] ?? 'bg-muted text-muted-foreground'}`}>{estado}</span>;
}

export default function DirectorTecnicoPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const {
        expedientesOficina,
        tareasDirector,
        decisionesCorporativas,
        objetivosArea,
        biblioteca,
        crearExpedienteConDecision,
        actualizarEstadoTareaDirector,
        actualizarEstadoObjetivoArea,
    } = useOficinaRegistros();

    const { handleRegistrar, estructurando, accionPendiente, confirmarAccion, cancelarAccion } =
        useRegistrar('director-tecnico', crearExpedienteConDecision);
    const { fundacion } = useFundacionQuioba();
    const [expandedExp, setExpandedExp] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    if (loading || !user || user.email !== ADMIN_EMAIL) return null;

    const misExpedientes = expedientesOficina.filter(
        e => e.directorRevisor === DIR_ID && e.estado !== 'cerrado'
    );
    const misObjetivos = objetivosArea.filter(
        o => o.directorId === DIR_ID && o.estado === 'activo'
    );

    const tareasReales = filtrarTareasReales(
        tareasDirector.filter(t => t.directorId === DIR_ID),
        objetivosArea,
        DIR_ID,
    );
    const tareasPendientes = tareasReales.filter(t => t.estado !== 'completada');
    const tareasCompletadas = tareasReales.filter(t => t.estado === 'completada');

    const decisionesRelacionadas = decisionesCorporativas
        .filter(d => d.directoresAfectados?.includes(DIR_ID))
        .slice(0, 8);

    const contextoChat = {
        fundacion,
        expedientes: expedientesOficina,
        decisiones: decisionesCorporativas,
        objetivos: objetivosArea,
        tareas: tareasDirector,
        biblioteca,
    };

    const cicloEstado = (actual: string): 'pendiente' | 'en-progreso' | 'completada' => {
        if (actual === 'pendiente') return 'en-progreso';
        if (actual === 'en-progreso') return 'completada';
        return 'pendiente';
    };

    return (
        <>
        <div className="h-[calc(100dvh-64px)] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="px-4 md:px-6 pt-4 pb-3 border-b border-border/30 flex items-center justify-between gap-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Link href="/apps/oficina" className="text-muted-foreground hover:text-foreground transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400">
                            <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-none">Despacho 06</p>
                            <h1 className="font-black text-base leading-tight">Director Técnico</h1>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                    <span>{misObjetivos.length} objetivo{misObjetivos.length !== 1 ? 's' : ''}</span>
                    <span className="text-border">·</span>
                    <span>{tareasPendientes.length} tarea{tareasPendientes.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] min-h-0 overflow-hidden">

                {/* Chat */}
                <div className="flex flex-col min-h-0 border-r border-border/30">
                    <div className="px-4 py-2 border-b border-border/20 flex-shrink-0">
                        <p className="text-[11px] text-muted-foreground/60 font-medium">
                            Solo respondo usando datos registrados en Quioba
                        </p>
                    </div>
                    <div className="flex-1 min-h-0">
                        <DirectorChat
                            directorId={DIR_ID}
                            directorNombre="Director Técnico"
                            accentColor="bg-slate-600"
                            contexto={contextoChat}
                            placeholder="¿Qué desarrollos tenemos pendientes? ¿Qué bugs siguen abiertos?"
                            onRegistrar={(contenido) => handleRegistrar(contenido, contextoChat)}
                        />
                    </div>
                </div>

                {/* Panel lateral */}
                <div className="overflow-y-auto divide-y divide-border/30">

                    {/* Expedientes asignados */}
                    <div className="p-4 space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <FolderOpen className="w-3.5 h-3.5" /> Expedientes Asignados
                        </p>
                        {misExpedientes.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 py-1">Sin expedientes asignados.</p>
                        ) : (
                            <div className="space-y-2">
                                {misExpedientes.map(exp => (
                                    <div key={exp.id} className="bg-muted/30 border border-border/40 rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => setExpandedExp(expandedExp === exp.id ? null : exp.id)}
                                            className="w-full text-left p-3 flex items-start justify-between gap-2"
                                        >
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <EstadoBadge estado={exp.estado} />
                                                    <span className="text-[10px] text-muted-foreground/60">{exp.fechaCreacion.slice(0, 10)}</span>
                                                </div>
                                                <p className="text-xs font-semibold leading-snug">{exp.titulo}</p>
                                            </div>
                                            {expandedExp === exp.id
                                                ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                                : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                            }
                                        </button>
                                        {expandedExp === exp.id && (
                                            <div className="px-3 pb-3 space-y-2">
                                                <p className="text-xs text-muted-foreground leading-relaxed">{exp.resumen}</p>
                                                {exp.conversacionOriginal && (
                                                    <details className="text-[11px]">
                                                        <summary className="cursor-pointer text-muted-foreground/70 font-medium">Ver conversación original</summary>
                                                        <pre className="mt-2 text-[10px] text-muted-foreground/60 whitespace-pre-wrap font-mono bg-muted/30 p-2 rounded-lg max-h-40 overflow-y-auto">{exp.conversacionOriginal}</pre>
                                                    </details>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Objetivos activos */}
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5" /> Objetivos Activos
                            </p>
                            <span className="text-[10px] text-muted-foreground">{misObjetivos.length}</span>
                        </div>
                        {misObjetivos.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 py-1">Sin objetivos técnicos activos.</p>
                        ) : (
                            <div className="space-y-2">
                                {misObjetivos.map(obj => (
                                    <div key={obj.id} className="p-3 bg-slate-500/5 border border-slate-500/20 rounded-xl space-y-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <PrioridadDot prioridad={obj.prioridad} />
                                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                                {obj.prioridad ?? 'media'}
                                            </span>
                                            {obj.fechaObjetivo && (
                                                <span className="text-[10px] text-muted-foreground/50">📅 {obj.fechaObjetivo}</span>
                                            )}
                                        </div>
                                        <p className="text-xs font-semibold leading-snug">{obj.titulo}</p>
                                        {obj.descripcion && <p className="text-[11px] text-muted-foreground leading-snug">{obj.descripcion}</p>}
                                        <button
                                            onClick={() => actualizarEstadoObjetivoArea(obj.id, 'completado')}
                                            className="text-[10px] font-bold text-muted-foreground/60 hover:text-emerald-600 transition-colors"
                                        >
                                            Marcar completado
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tareas pendientes */}
                    <div className="p-4 space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Tareas Pendientes
                        </p>
                        {tareasPendientes.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 py-1">Sin tareas pendientes.</p>
                        ) : (
                            <div className="space-y-2">
                                {tareasPendientes.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => actualizarEstadoTareaDirector(t.id, cicloEstado(t.estado))}
                                        className="w-full text-left p-3 bg-muted/20 border border-border/30 rounded-xl space-y-1.5 hover:bg-muted/40 transition-colors"
                                    >
                                        <div className="flex items-start gap-2">
                                            <EstadoIcon estado={t.estado} />
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <UrgenciaBadge urgencia={t.urgencia} />
                                                    <span className="text-[10px] text-muted-foreground/60">{t.fechaAsignacion.slice(0, 10)}</span>
                                                </div>
                                                <p className="text-xs font-semibold leading-snug">{t.titulo}</p>
                                                {t.descripcion && <p className="text-[11px] text-muted-foreground leading-snug">{t.descripcion}</p>}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Decisiones relacionadas */}
                    <div className="p-4 space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <Scale className="w-3.5 h-3.5" /> Decisiones Relacionadas
                        </p>
                        {decisionesRelacionadas.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 py-1">Sin decisiones que afecten al área técnica.</p>
                        ) : (
                            <div className="space-y-2">
                                {decisionesRelacionadas.map(d => (
                                    <div key={d.id} className="p-3 bg-muted/20 border border-border/30 rounded-xl space-y-1">
                                        <div className="flex items-center gap-2">
                                            <EstadoBadge estado={d.estado} />
                                            <span className="text-[10px] text-muted-foreground/60">{d.fechaDecision.slice(0, 10)}</span>
                                        </div>
                                        <p className="text-xs font-semibold">{d.titulo}</p>
                                        {d.descripcion && <p className="text-[11px] text-muted-foreground leading-snug">{d.descripcion}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Completadas */}
                    {tareasCompletadas.length > 0 && (
                        <div className="p-4 space-y-2">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                Completadas ({tareasCompletadas.length})
                            </p>
                            {tareasCompletadas.slice(0, 5).map(t => (
                                <div key={t.id} className="flex items-center gap-2 opacity-50">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                    <p className="text-xs line-through text-muted-foreground">{t.titulo}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        <ModalAccionPropuesta
            accion={accionPendiente}
            estructurando={estructurando}
            onConfirmar={confirmarAccion}
            onCancelar={cancelarAccion}
        />
        </>
    );
}
