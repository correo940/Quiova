'use client';

import { X, Loader2, FolderOpen, Scale, Target, CheckCircle2, Send } from 'lucide-react';
import type { AccionEstructurada } from '@/lib/oficina/registrar';

const DIR_LABEL: Record<string, string> = {
    'director':              'Director General',
    'director-contenido':    'Director de Contenido',
    'director-crecimiento':  'Director de Crecimiento',
    'director-tecnico':      'Director Técnico',
    'jefe-gabinete':         'Jefe de Gabinete',
    'consejo-estrategico':   'Consejo Estratégico',
};

const PRIORIDAD_COLOR: Record<string, string> = {
    alta:  'bg-red-500/10 text-red-600 dark:text-red-400',
    media: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    baja:  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

const URGENCIA_COLOR: Record<string, string> = {
    'inmediata':   'text-red-500',
    'esta-semana': 'text-amber-500',
    'este-mes':    'text-blue-400',
};

interface Props {
    accion: AccionEstructurada | null;
    estructurando: boolean;
    onConfirmar: () => void;
    onCancelar: () => void;
}

export function ModalAccionPropuesta({ accion, estructurando, onConfirmar, onCancelar }: Props) {
    if (!estructurando && !accion) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border/50 rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col">

                <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-base">✨</span>
                        <h2 className="font-bold text-sm">Propuesta de registro</h2>
                    </div>
                    {!estructurando && (
                        <button onClick={onCancelar} className="text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {estructurando ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Analizando la orden...</p>
                    </div>
                ) : accion ? (
                    <>
                        <div className="overflow-y-auto flex-1 divide-y divide-border/20">

                            {/* Expediente */}
                            <div className="p-5 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                    <FolderOpen className="w-3.5 h-3.5" /> Expediente
                                </p>
                                <p className="text-sm font-semibold">{accion.expediente.titulo}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">{accion.expediente.resumen}</p>
                            </div>

                            {/* Decisión */}
                            <div className="p-5 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                    <Scale className="w-3.5 h-3.5" /> Decisión
                                </p>
                                <p className="text-sm font-semibold">{accion.decision.titulo}</p>
                                {accion.decision.descripcion && (
                                    <p className="text-xs text-muted-foreground leading-relaxed">{accion.decision.descripcion}</p>
                                )}
                            </div>

                            {/* Objetivo */}
                            {accion.objetivo && (
                                <div className="p-5 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                        <Target className="w-3.5 h-3.5" /> Objetivo
                                    </p>
                                    <p className="text-sm font-semibold">{accion.objetivo.titulo}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${PRIORIDAD_COLOR[accion.objetivo.prioridad] ?? ''}`}>
                                            {accion.objetivo.prioridad}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            → {DIR_LABEL[accion.objetivo.directorId] ?? accion.objetivo.directorId}
                                        </span>
                                        {accion.objetivo.fechaObjetivo && (
                                            <span className="text-[10px] text-muted-foreground/60">📅 {accion.objetivo.fechaObjetivo}</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tareas */}
                            <div className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Tareas
                                    </p>
                                    <span className="text-[10px] text-muted-foreground">{accion.tareas.length}</span>
                                </div>
                                <div className="space-y-2">
                                    {accion.tareas.map((t, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2.5 bg-muted/20 border border-border/30 rounded-xl">
                                            <span className={`text-[10px] font-bold mt-0.5 flex-shrink-0 ${URGENCIA_COLOR[t.urgencia] ?? ''}`}>●</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium leading-snug">{t.titulo}</p>
                                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                                    {DIR_LABEL[t.directorId] ?? t.directorId} · {t.urgencia}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-4 border-t border-border/30 flex justify-end gap-2 flex-shrink-0">
                            <button
                                onClick={onCancelar}
                                className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl hover:bg-muted/40 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={onConfirmar}
                                className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors"
                            >
                                <Send className="w-3.5 h-3.5" />
                                Confirmar y crear
                            </button>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
}
