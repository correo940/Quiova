'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ChevronLeft, Briefcase, FolderOpen, Target,
    AlertTriangle, Users, CheckCircle2, AlertCircle, Circle,
} from 'lucide-react';
import { useOficinaRegistros } from '@/hooks/useOficinaRegistros';
import { useFundacionQuioba } from '@/hooks/useFundacionQuioba';
import DirectorChat from '@/components/oficina/director-chat';
import { filtrarTareasReales } from '@/lib/oficina/tareas-reales';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

const DIR_LABEL: Record<string, string> = {
    'director':              'Dir. General',
    'director-contenido':    'Dir. Contenido',
    'director-crecimiento':  'Dir. Crecimiento',
    'director-tecnico':      'Dir. Técnico',
    'jefe-gabinete':         'Jefe Gabinete',
    'consejo-estrategico':   'Consejo',
};

const DIR_COMPLETO: Record<string, string> = {
    'director':              'Director General',
    'director-contenido':    'Director de Contenido',
    'director-crecimiento':  'Director de Crecimiento',
    'director-tecnico':      'Director Técnico',
    'jefe-gabinete':         'Jefe de Gabinete',
    'consejo-estrategico':   'Consejo Estratégico',
};

function PrioridadDot({ prioridad }: { prioridad?: string }) {
    const color = prioridad === 'alta' ? 'bg-red-500' : prioridad === 'media' ? 'bg-amber-500' : 'bg-blue-400';
    return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

export default function JefeGabinetePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const {
        expedientesOficina,
        decisionesCorporativas,
        tareasDirector,
        objetivosArea,
        biblioteca,
    } = useOficinaRegistros();
    const { fundacion } = useFundacionQuioba();

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    if (loading || !user || user.email !== ADMIN_EMAIL) return null;

    // Expedientes sin decisión (filtro robusto: ignorar expedienteId nulos)
    const expedienteIdConDecision = new Set(
        decisionesCorporativas.map(d => d.expedienteId).filter(Boolean)
    );
    const expedientesSinDecision = expedientesOficina.filter(
        e => e.estado !== 'cerrado' && !expedienteIdConDecision.has(e.id)
    );

    // Tareas reales: excluir agrupadoras con lógica canónica (global, sin scope de director)
    const tareasReales = filtrarTareasReales(
        tareasDirector.filter(t => t.estado !== 'completada'),
        objetivosArea,
    );

    // Objetivos con ALGUNA tarea (incluye agrupadoras para no marcar como huérfano un objetivo
    // que el DG ya está gestionando aunque sea con tarea-resumen)
    const objetivosConTareas = new Set(
        tareasDirector.filter(t => t.objetivoId && t.estado !== 'completada').map(t => t.objetivoId!)
    );
    const objetivosSinTareas = objetivosArea.filter(
        o => o.estado === 'activo' && !objetivosConTareas.has(o.id)
    );

    // Objetivos vencidos
    const hoy = new Date().toISOString().slice(0, 10);
    const objetivosVencidos = objetivosArea.filter(
        o => o.estado === 'activo' && o.fechaObjetivo && o.fechaObjetivo < hoy
    );

    // Carga por director (solo tareas reales, sin agrupadoras)
    const directoresActivos = [...new Set(tareasReales.map(t => t.directorId))];
    const cargaDirectores = directoresActivos.map(id => ({
        id,
        label: DIR_COMPLETO[id] ?? id,
        pendientes: tareasReales.filter(t => t.directorId === id).length,
        enProgreso: tareasReales.filter(t => t.directorId === id && t.estado === 'en-progreso').length,
    })).sort((a, b) => b.pendientes - a.pendientes);

    const totalAlertas = expedientesSinDecision.length + objetivosSinTareas.length + objetivosVencidos.length;

    const contextoChat = {
        fundacion,
        expedientes: expedientesOficina,
        decisiones: decisionesCorporativas,
        objetivos: objetivosArea,
        tareas: tareasDirector,
        biblioteca,
    };

    return (
        <div className="h-[calc(100dvh-64px)] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="px-4 md:px-6 pt-4 pb-3 border-b border-border/30 flex items-center justify-between gap-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Link href="/apps/oficina" className="text-muted-foreground hover:text-foreground transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                            <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 leading-none">Despacho 02</p>
                            <h1 className="font-black text-base leading-tight">Jefe de Gabinete</h1>
                        </div>
                    </div>
                </div>
                {totalAlertas > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {totalAlertas} alerta{totalAlertas !== 1 ? 's' : ''}
                    </div>
                )}
            </div>

            {/* Layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] min-h-0 overflow-hidden">

                {/* Chat */}
                <div className="flex flex-col min-h-0 border-r border-border/30">
                    <div className="px-4 py-2 border-b border-border/20 flex-shrink-0">
                        <p className="text-[11px] text-muted-foreground/60 font-medium">Coordinador operativo — visión global de Quioba</p>
                    </div>
                    <div className="flex-1 min-h-0">
                        <DirectorChat
                            directorId="jefe-gabinete"
                            directorNombre="Jefe de Gabinete"
                            accentColor="bg-teal-600"
                            contexto={contextoChat}
                            placeholder="¿Qué tenemos pendiente hoy?"
                        />
                    </div>
                </div>

                {/* Panel lateral */}
                <div className="overflow-y-auto divide-y divide-border/30">

                    {/* Alertas */}
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" /> Alertas
                            </p>
                            {totalAlertas === 0 && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Todo en orden</span>
                            )}
                        </div>
                        {totalAlertas === 0 ? (
                            <p className="text-xs text-muted-foreground/60 py-1 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Sin alertas activas.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {objetivosVencidos.map(o => (
                                    <div key={o.id} className="flex items-start gap-2 p-2.5 bg-red-500/5 border border-red-500/20 rounded-xl">
                                        <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Objetivo vencido</p>
                                            <p className="text-xs font-semibold leading-snug truncate">{o.titulo}</p>
                                            <p className="text-[10px] text-muted-foreground/60">📅 {o.fechaObjetivo} · {DIR_LABEL[o.directorId] ?? o.directorId}</p>
                                        </div>
                                    </div>
                                ))}
                                {expedientesSinDecision.length > 0 && (
                                    <div className="flex items-center gap-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Sin decisión</p>
                                            <p className="text-xs text-muted-foreground">{expedientesSinDecision.length} expediente{expedientesSinDecision.length !== 1 ? 's' : ''} sin procesar</p>
                                        </div>
                                    </div>
                                )}
                                {objetivosSinTareas.length > 0 && (
                                    <div className="flex items-center gap-2 p-2.5 bg-muted/40 border border-border/40 rounded-xl">
                                        <Circle className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sin tareas</p>
                                            <p className="text-xs text-muted-foreground">{objetivosSinTareas.length} objetivo{objetivosSinTareas.length !== 1 ? 's' : ''} huérfano{objetivosSinTareas.length !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Expedientes sin decisión */}
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                <FolderOpen className="w-3.5 h-3.5" /> Sin decisión
                            </p>
                            <span className="text-[10px] text-muted-foreground">{expedientesSinDecision.length}</span>
                        </div>
                        {expedientesSinDecision.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 py-1 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Todos los expedientes tienen decisión.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {expedientesSinDecision.map(e => (
                                    <div key={e.id} className="p-3 bg-muted/30 border border-border/40 rounded-xl space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">{e.estado}</span>
                                            <span className="text-[10px] text-muted-foreground/60">{e.fechaCreacion.slice(0, 10)}</span>
                                        </div>
                                        <p className="text-xs font-semibold leading-snug">{e.titulo}</p>
                                        <p className="text-[11px] text-muted-foreground/60">→ {DIR_LABEL[e.directorRevisor] ?? e.directorRevisor}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Objetivos sin tareas */}
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5" /> Objetivos huérfanos
                            </p>
                            <span className="text-[10px] text-muted-foreground">{objetivosSinTareas.length}</span>
                        </div>
                        {objetivosSinTareas.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 py-1 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Todos los objetivos tienen tareas.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {objetivosSinTareas.map(o => (
                                    <div key={o.id} className="p-3 bg-muted/30 border border-border/40 rounded-xl space-y-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <PrioridadDot prioridad={o.prioridad} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{o.prioridad}</span>
                                            <span className="text-[10px] text-muted-foreground/60">→ {DIR_LABEL[o.directorId] ?? o.directorId}</span>
                                        </div>
                                        <p className="text-xs font-semibold leading-snug">{o.titulo}</p>
                                        {o.fechaObjetivo && (
                                            <p className="text-[10px] text-muted-foreground/50">📅 {o.fechaObjetivo}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Carga por director */}
                    <div className="p-4 space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" /> Carga por director
                        </p>
                        {cargaDirectores.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 py-1 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Sin tareas activas.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {cargaDirectores.map(d => (
                                    <div key={d.id} className="flex items-center gap-3 p-2.5 bg-muted/20 border border-border/30 rounded-xl">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold truncate">{d.label}</p>
                                            {d.enProgreso > 0 && (
                                                <p className="text-[10px] text-teal-600 dark:text-teal-400">{d.enProgreso} en progreso</p>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <span className="text-sm font-black tabular-nums">{d.pendientes}</span>
                                            <p className="text-[10px] text-muted-foreground/60">pendientes</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
