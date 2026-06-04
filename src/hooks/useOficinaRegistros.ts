'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type {
    ConsensusResult,
    CouncilReport,
    Decision as DecisionEjecutiva,
    ExecutiveBrief,
    ExecutionTask,
} from '@/lib/oficina/domain';

// ── Director General ──────────────────────────────────────────────────────────

export interface InformeEstrategico {
    id: string;
    titulo: string;
    fecha: string;
    estado: 'borrador' | 'activo' | 'archivado';
    contenido: string;
    remitente?: string;
    hash?: string;
}

// ── Jefe de Gabinete ──────────────────────────────────────────────────────────

export interface TareaGabinete {
    id: string;
    titulo: string;
    urgencia: 'inmediata' | 'esta-semana' | 'este-mes';
    estado: 'pendiente' | 'en-progreso' | 'completada';
    contexto: string;
    fechaRegistro: string;
    informeId?: string;
    decisionId?: string;
}

// ── Director de Crecimiento ───────────────────────────────────────────────────

export type TipoRegistroCrecimiento = 'diagnostico' | 'oportunidad' | 'riesgo' | 'accion';

export interface RegistroCrecimiento {
    id: string;
    tipo: TipoRegistroCrecimiento;
    titulo: string;
    descripcion: string;
    nivel?: 'critico' | 'alto' | 'medio';
    impacto?: 'alto' | 'medio' | 'bajo';
    esfuerzo?: 'alto' | 'medio' | 'bajo';
    fechaRegistro: string;
}

// ── Sala de Guerra ────────────────────────────────────────────────────────────

export interface DecisionRegistrada {
    id: string;
    texto: string;
    autor: string;
    fecha: string;
}

export interface ObjetivoActual {
    texto: string;
    progreso: number;
    tendencia: 'subiendo' | 'bajando' | 'estable';
    fechaRegistro: string;
}

// ── Mi Despacho (antes: Bandeja de Entrada) ───────────────────────────────────

export type TipoDocumento = 'informe' | 'acta' | 'análisis' | 'plan' | 'nota' | 'directiva';
export type EstadoDocumento = 'nuevo' | 'leido' | 'archivado';

export interface DocumentoBandeja {
    id: string;
    tipo: TipoDocumento;
    titulo: string;
    contenido: string;
    autor: string;
    estado: EstadoDocumento;
    fecha: string;
    informeId?: string;
}

// ── Consejo Estratégico ───────────────────────────────────────────────────────

export interface InformeConsejo {
    id: string;
    titulo: string;
    contenido: string;
    remitente: string;
    fecha: string;
    estado: 'pendiente' | 'aceptado' | 'rechazado';
}

// ── Sala de Producción ────────────────────────────────────────────────────────

export type FasePieza = 'idea' | 'guion' | 'grabado' | 'publicado';
export type CategoriaProduccion = 'quioba' | 'cuerpo' | 'mente' | 'finanzas';
export type FormatoProduccion = 'corto' | 'largo' | 'tutorial' | 'historia' | 'opinion';
export type ObjetivoProduccion = 'alcance' | 'captacion' | 'marca' | 'conversion';

export interface PiezaProduccion {
    id: string;
    titulo: string;
    fase: FasePieza;
    categoria: CategoriaProduccion;
    formato: FormatoProduccion;
    objetivo: ObjetivoProduccion;
    nota: string;
    fechaRegistro: string;
}

// ── Series de vídeo (Director de Contenido) ───────────────────────────────────

export type EstadoProduccionVideo = 'pendiente' | 'en-produccion' | 'publicado';

export interface SerieVideo {
    id: string;
    titulo: string;
    categoria: CategoriaProduccion;
    plataforma: string;
    orientacion: string;
    fechaCreacion: string;
    historialId?: string;
}

export interface ProduccionVideo {
    id: string;
    serieId: string;
    posicion: number;
    titulo: string;
    descripcion: string;
    locucion: string;
    promptVisual: string;
    duracion: string;
    hashtags: string[];
    categoria: CategoriaProduccion;
    plataforma: string;
    orientacion: string;
    estado: EstadoProduccionVideo;
    fechaRegistro: string;
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface Registros {
    informes: InformeEstrategico[];
    tareas: TareaGabinete[];
    crecimiento: RegistroCrecimiento[];
    decisiones: DecisionRegistrada[];
    objetivo: ObjetivoActual | null;
    documentos: DocumentoBandeja[];
    piezas: PiezaProduccion[];
    consejo: InformeConsejo[];
    councilReports: CouncilReport[];
    consensusResults: ConsensusResult[];
    executiveBriefs: ExecutiveBrief[];
    decisionesEjecutivas: DecisionEjecutiva[];
    executionTasks: ExecutionTask[];
    series: SerieVideo[];
    producciones: ProduccionVideo[];
}

const KEY = 'quioba_oficina_registros_v2';
const DEFAULTS: Registros = {
    informes: [],
    tareas: [],
    crecimiento: [],
    decisiones: [],
    objetivo: null,
    documentos: [],
    piezas: [],
    consejo: [],
    councilReports: [],
    consensusResults: [],
    executiveBriefs: [],
    decisionesEjecutivas: [],
    executionTasks: [],
    series: [],
    producciones: [],
};

function genId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function hashStr(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
}

function load(): Registros {
    if (typeof window === 'undefined') return DEFAULTS;
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return DEFAULTS;
        const parsed = { ...DEFAULTS, ...JSON.parse(raw) } as Registros;
        if (parsed.councilReports.length === 0 && parsed.consejo.length > 0) {
            parsed.councilReports = parsed.consejo.map(i => ({
                id: i.id,
                title: i.titulo,
                content: i.contenido,
                source: i.remitente,
                createdAt: i.fecha,
                status: i.estado,
            }));
        }
        if (parsed.executionTasks.length === 0 && parsed.tareas.length > 0) {
            parsed.executionTasks = parsed.tareas.map(t => ({
                id: t.id,
                decisionId: t.decisionId ?? `legacy-${t.informeId ?? 'manual'}`,
                title: t.titulo,
                urgencia: t.urgencia,
                estado: t.estado,
                contexto: t.contexto,
                fechaRegistro: t.fechaRegistro,
            }));
        }
        return parsed;
    } catch {
        return DEFAULTS;
    }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

async function syncFromSupabase(): Promise<Registros | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data, error } = await supabase
            .from('oficina_registros')
            .select('data')
            .eq('user_id', user.id)
            .single();
        if (error || !data) return null;
        return { ...DEFAULTS, ...(data.data as Partial<Registros>) };
    } catch {
        return null;
    }
}

async function syncToSupabase(registros: Registros): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('oficina_registros').upsert({
            user_id: user.id,
            data: registros,
            updated_at: new Date().toISOString(),
        });
    } catch {
        // Fallo silencioso — localStorage actúa como caché
    }
}

export function useOficinaRegistros() {
    const [state, setState] = useState<Registros>(DEFAULTS);
    const [cargando, setCargando] = useState(true);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Carga inmediata desde localStorage
        const local = load();
        setState(local);
        setCargando(false);

        // Luego carga desde Supabase (fuente de verdad cross-device)
        syncFromSupabase().then(server => {
            if (!server) return;
            setState(server);
            localStorage.setItem(KEY, JSON.stringify(server));
        });
    }, []);

    const update = useCallback((fn: (prev: Registros) => Registros) => {
        setState(prev => {
            const next = fn(prev);
            localStorage.setItem(KEY, JSON.stringify(next));
            // Guardado en Supabase con debounce de 2s
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => syncToSupabase(next), 2000);
            return next;
        });
    }, []);

    return {
        ...state,
        cargando,

        // ── Informes (Director General) ─────────────────────────────────────
        agregarInforme(titulo: string, contenido: string, estado: InformeEstrategico['estado']) {
            update(p => ({
                ...p,
                informes: [{ id: genId(), titulo, contenido, estado, fecha: new Date().toISOString() }, ...p.informes],
            }));
        },
        eliminarInforme(id: string) {
            update(p => ({ ...p, informes: p.informes.filter(i => i.id !== id) }));
        },

        // Crea o actualiza un informe y sincroniza automáticamente con Mi Despacho.
        // Si editandoId está presente, actualiza en lugar de crear.
        guardarInformeConSync(
            datos: { titulo: string; contenido: string; estado: InformeEstrategico['estado']; remitente: string },
            editandoId?: string,
        ) {
            update(p => {
                const ahora = new Date().toISOString();
                let informeId: string;
                let informes: InformeEstrategico[];

                if (editandoId) {
                    informeId = editandoId;
                    informes = p.informes.map(i =>
                        i.id === editandoId
                            ? { ...i, titulo: datos.titulo, contenido: datos.contenido, estado: datos.estado, remitente: datos.remitente, fecha: ahora }
                            : i,
                    );
                } else {
                    informeId = genId();
                    informes = [{ id: informeId, titulo: datos.titulo, contenido: datos.contenido, estado: datos.estado, remitente: datos.remitente, fecha: ahora }, ...p.informes];
                }

                // Sincronizar Mi Despacho: crear o actualizar sin cambiar el estado del documento
                const docExistente = p.documentos.find(d => d.informeId === informeId);
                let documentos: DocumentoBandeja[];
                if (docExistente) {
                    documentos = p.documentos.map(d =>
                        d.informeId === informeId
                            ? { ...d, titulo: datos.titulo, contenido: datos.contenido, autor: datos.remitente }
                            : d,
                    );
                } else {
                    documentos = [{
                        id: genId(),
                        tipo: 'informe' as TipoDocumento,
                        titulo: datos.titulo,
                        contenido: datos.contenido,
                        autor: datos.remitente,
                        estado: 'nuevo' as EstadoDocumento,
                        fecha: ahora,
                        informeId,
                    }, ...p.documentos];
                }

                return { ...p, informes, documentos };
            });
        },

        // Analiza texto pegado: crea/actualiza informe + tareas vinculadas (idempotente por hash de contenido).
        analizarYGuardarInforme(
            datos: { titulo: string; contenido: string; remitente: string },
            tareasParsadas: Pick<TareaGabinete, 'titulo' | 'urgencia' | 'estado' | 'contexto'>[],
            pipeline?: {
                consensusResult?: ConsensusResult;
                executiveBrief?: ExecutiveBrief;
                decision?: DecisionEjecutiva;
                executionTasks?: ExecutionTask[];
            },
        ) {
            update(p => {
                const ahora = new Date().toISOString();
                const hash = hashStr(datos.contenido);

                const existente = p.informes.find(i => i.hash === hash);
                let informeId: string;
                let informes: InformeEstrategico[];

                if (existente) {
                    informeId = existente.id;
                    informes = p.informes.map(i =>
                        i.id === informeId
                            ? { ...i, titulo: datos.titulo, remitente: datos.remitente, fecha: ahora }
                            : i,
                    );
                } else {
                    informeId = genId();
                    informes = [
                        { id: informeId, titulo: datos.titulo, contenido: datos.contenido, estado: 'activo', remitente: datos.remitente, fecha: ahora, hash },
                        ...p.informes,
                    ];
                }

                // Reemplaza tareas del informe anterior (idempotencia)
                const tareasOtras = p.tareas.filter(t => t.informeId !== informeId);
                const tareasBase = pipeline?.executionTasks?.length
                    ? pipeline.executionTasks.map(t => ({
                        titulo: t.title,
                        urgencia: t.urgencia,
                        estado: t.estado,
                        contexto: t.contexto,
                        decisionId: t.decisionId,
                    }))
                    : tareasParsadas;
                const tareasNuevas: TareaGabinete[] = tareasBase.map(t => ({
                    ...t,
                    id: genId(),
                    fechaRegistro: ahora,
                    informeId,
                }));
                const tareas = [...tareasNuevas, ...tareasOtras];

                // Sincronizar Mi Despacho
                const docExistente = p.documentos.find(d => d.informeId === informeId);
                let documentos: DocumentoBandeja[];
                if (docExistente) {
                    documentos = p.documentos.map(d =>
                        d.informeId === informeId
                            ? { ...d, titulo: datos.titulo, contenido: datos.contenido, autor: datos.remitente }
                            : d,
                    );
                } else {
                    documentos = [
                        { id: genId(), tipo: 'informe' as TipoDocumento, titulo: datos.titulo, contenido: datos.contenido, autor: datos.remitente, estado: 'nuevo' as EstadoDocumento, fecha: ahora, informeId },
                        ...p.documentos,
                    ];
                }

                const consensusResults = pipeline?.consensusResult
                    ? [pipeline.consensusResult, ...p.consensusResults.filter(c => c.id !== pipeline.consensusResult!.id)]
                    : p.consensusResults;

                const executiveBriefs = pipeline?.executiveBrief
                    ? [pipeline.executiveBrief, ...p.executiveBriefs.filter(b => b.id !== pipeline.executiveBrief!.id)]
                    : p.executiveBriefs;

                const decisionesEjecutivas = pipeline?.decision
                    ? [pipeline.decision, ...p.decisionesEjecutivas.filter(d => d.id !== pipeline.decision!.id)]
                    : p.decisionesEjecutivas;

                const executionTasks = pipeline?.executionTasks?.length
                    ? [...pipeline.executionTasks, ...p.executionTasks.filter(t => t.decisionId !== pipeline.decision?.id)]
                    : p.executionTasks;

                return {
                    ...p,
                    informes,
                    tareas,
                    documentos,
                    consensusResults,
                    executiveBriefs,
                    decisionesEjecutivas,
                    executionTasks,
                };
            });
        },

        // ── Tareas (Jefe de Gabinete) ───────────────────────────────────────
        agregarTarea(titulo: string, urgencia: TareaGabinete['urgencia'], estado: TareaGabinete['estado'], contexto: string) {
            update(p => {
                const id = genId();
                const fechaRegistro = new Date().toISOString();
                const task: ExecutionTask = {
                    id,
                    decisionId: 'legacy-manual',
                    title: titulo,
                    urgencia,
                    estado,
                    contexto,
                    fechaRegistro,
                };
                // TODO(Phase 2): remove legacy `tareas` writes once all Oficina UI reads from `executionTasks`.
                return {
                    ...p,
                    executionTasks: [task, ...p.executionTasks],
                    tareas: [{ id, titulo, urgencia, estado, contexto, fechaRegistro, decisionId: task.decisionId }, ...p.tareas],
                };
            });
        },
        toggleEstadoTarea(id: string) {
            update(p => ({
                ...p,
                tareas: p.tareas.map(t => {
                    if (t.id !== id) return t;
                    const ciclo: TareaGabinete['estado'][] = ['pendiente', 'en-progreso', 'completada'];
                    return { ...t, estado: ciclo[(ciclo.indexOf(t.estado) + 1) % ciclo.length] };
                }),
            }));
        },
        toggleEstadoExecutionTask(id: string) {
            update(p => ({
                ...p,
                executionTasks: p.executionTasks.map(t => {
                    if (t.id !== id) return t;
                    const ciclo: ExecutionTask['estado'][] = ['pendiente', 'en-progreso', 'completada'];
                    return { ...t, estado: ciclo[(ciclo.indexOf(t.estado) + 1) % ciclo.length] };
                }),
                // TODO(Phase 2): remove legacy sync when `tareas` is deleted.
                tareas: p.tareas.map(t => {
                    if (t.id !== id) return t;
                    const ciclo: TareaGabinete['estado'][] = ['pendiente', 'en-progreso', 'completada'];
                    return { ...t, estado: ciclo[(ciclo.indexOf(t.estado) + 1) % ciclo.length] };
                }),
            }));
        },
        eliminarTarea(id: string) {
            update(p => ({ ...p, tareas: p.tareas.filter(t => t.id !== id) }));
        },
        eliminarExecutionTask(id: string) {
            update(p => ({
                ...p,
                executionTasks: p.executionTasks.filter(t => t.id !== id),
                // TODO(Phase 2): remove legacy sync when `tareas` is deleted.
                tareas: p.tareas.filter(t => t.id !== id),
            }));
        },

        // ── Crecimiento (Director de Crecimiento) ───────────────────────────
        agregarRegistroCrecimiento(reg: Omit<RegistroCrecimiento, 'id' | 'fechaRegistro'>) {
            update(p => ({
                ...p,
                crecimiento: [{ ...reg, id: genId(), fechaRegistro: new Date().toISOString() }, ...p.crecimiento],
            }));
        },
        eliminarRegistroCrecimiento(id: string) {
            update(p => ({ ...p, crecimiento: p.crecimiento.filter(r => r.id !== id) }));
        },

        // ── Sala de Guerra ──────────────────────────────────────────────────
        agregarDecision(texto: string, autor: string, fecha: string) {
            update(p => ({
                ...p,
                decisiones: [{ id: genId(), texto, autor, fecha }, ...p.decisiones],
            }));
        },
        eliminarDecision(id: string) {
            update(p => ({ ...p, decisiones: p.decisiones.filter(d => d.id !== id) }));
        },
        setObjetivo(obj: Omit<ObjetivoActual, 'fechaRegistro'> | null) {
            update(p => ({
                ...p,
                objetivo: obj ? { ...obj, fechaRegistro: new Date().toISOString() } : null,
            }));
        },

        // ── Mi Despacho ─────────────────────────────────────────────────────
        agregarDocumento(doc: Omit<DocumentoBandeja, 'id' | 'fecha'>) {
            update(p => ({
                ...p,
                documentos: [{ ...doc, id: genId(), fecha: new Date().toISOString() }, ...p.documentos],
            }));
        },
        cambiarEstadoDocumento(id: string, estado: EstadoDocumento) {
            update(p => ({
                ...p,
                documentos: p.documentos.map(d => d.id === id ? { ...d, estado } : d),
            }));
        },
        eliminarDocumento(id: string) {
            update(p => ({ ...p, documentos: p.documentos.filter(d => d.id !== id) }));
        },

        // ── Consejo Estratégico ─────────────────────────────────────────────
        agregarInformeConsejo(datos: { titulo: string; contenido: string; remitente: string }) {
            update(p => {
                const id = genId();
                const fecha = new Date().toISOString();
                const informe = { id, ...datos, fecha, estado: 'pendiente' as const };
                const councilReport: CouncilReport = {
                    id,
                    title: datos.titulo,
                    content: datos.contenido,
                    source: datos.remitente,
                    createdAt: fecha,
                    status: 'pendiente',
                };
                return {
                    ...p,
                    consejo: [informe, ...p.consejo],
                    councilReports: [councilReport, ...p.councilReports],
                };
            });
        },
        cambiarEstadoInformeConsejo(id: string, estado: InformeConsejo['estado']) {
            update(p => ({
                ...p,
                consejo: p.consejo.map(i => i.id === id ? { ...i, estado } : i),
                councilReports: p.councilReports.map(r => (r.id === id ? { ...r, status: estado } : r)),
            }));
        },
        eliminarInformeConsejo(id: string) {
            update(p => ({
                ...p,
                consejo: p.consejo.filter(i => i.id !== id),
                councilReports: p.councilReports.filter(r => r.id !== id),
            }));
        },

        guardarConsensusResult(result: ConsensusResult) {
            update(p => ({
                ...p,
                consensusResults: [result, ...p.consensusResults.filter(r => r.id !== result.id)],
            }));
        },
        guardarExecutiveBrief(brief: ExecutiveBrief) {
            update(p => ({
                ...p,
                executiveBriefs: [brief, ...p.executiveBriefs.filter(b => b.id !== brief.id)],
            }));
        },
        publicarExecutiveBrief(id: string) {
            update(p => ({
                ...p,
                executiveBriefs: p.executiveBriefs.map(b => (b.id === id ? { ...b, status: 'publicado' } : b)),
            }));
        },
        guardarDecisionEjecutiva(decision: DecisionEjecutiva) {
            update(p => ({
                ...p,
                decisionesEjecutivas: [decision, ...p.decisionesEjecutivas.filter(d => d.id !== decision.id)],
            }));
        },
        cambiarEstadoDecisionEjecutiva(id: string, status: DecisionEjecutiva['status']) {
            update(p => ({
                ...p,
                decisionesEjecutivas: p.decisionesEjecutivas.map(d => (d.id === id ? { ...d, status } : d)),
            }));
        },
        guardarExecutionTasks(tasks: ExecutionTask[]) {
            update(p => ({
                ...p,
                executionTasks: [...tasks, ...p.executionTasks.filter(t => !tasks.some(nt => nt.id === t.id))],
            }));
        },

        // ── Sala de Producción ──────────────────────────────────────────────
        agregarPieza(pieza: Omit<PiezaProduccion, 'id' | 'fechaRegistro'>) {
            update(p => ({
                ...p,
                piezas: [{ ...pieza, id: genId(), fechaRegistro: new Date().toISOString() }, ...p.piezas],
            }));
        },
        cambiarFasePieza(id: string, fase: FasePieza) {
            update(p => ({
                ...p,
                piezas: p.piezas.map(pz => pz.id === id ? { ...pz, fase } : pz),
            }));
        },
        eliminarPieza(id: string) {
            update(p => ({ ...p, piezas: p.piezas.filter(pz => pz.id !== id) }));
        },

        // ── Series de vídeo (Director de Contenido) ─────────────────────────
        crearSerie(
            serie: Omit<SerieVideo, 'id' | 'fechaCreacion'>,
            videos: Omit<ProduccionVideo, 'id' | 'fechaRegistro' | 'serieId'>[],
        ) {
            update(p => {
                const serieId = genId();
                const ahora = new Date().toISOString();
                const nuevaSerie: SerieVideo = { ...serie, id: serieId, fechaCreacion: ahora };
                const formato: FormatoProduccion =
                    serie.plataforma === 'youtube' ? 'largo' : 'corto';
                const nuevasProds: ProduccionVideo[] = videos.map(v => ({
                    ...v,
                    id: genId(),
                    serieId,
                    fechaRegistro: ahora,
                }));
                const nuevasPiezas: PiezaProduccion[] = nuevasProds.map(v => ({
                    id: v.id,
                    titulo: v.titulo,
                    fase: 'idea' as FasePieza,
                    categoria: v.categoria,
                    formato,
                    objetivo: 'alcance' as ObjetivoProduccion,
                    nota: v.descripcion,
                    fechaRegistro: ahora,
                }));
                return {
                    ...p,
                    series: [nuevaSerie, ...p.series],
                    producciones: [...nuevasProds, ...p.producciones],
                    piezas: [...nuevasPiezas, ...p.piezas],
                };
            });
        },
        actualizarProduccion(
            id: string,
            cambios: Partial<Pick<ProduccionVideo, 'titulo' | 'descripcion' | 'locucion' | 'promptVisual' | 'duracion' | 'hashtags' | 'estado'>>,
        ) {
            update(p => {
                const faseMap: Record<EstadoProduccionVideo, FasePieza> = {
                    pendiente: 'idea',
                    'en-produccion': 'guion',
                    publicado: 'publicado',
                };
                return {
                    ...p,
                    producciones: p.producciones.map(pr => pr.id === id ? { ...pr, ...cambios } : pr),
                    piezas: p.piezas.map(pz => {
                        if (pz.id !== id) return pz;
                        return {
                            ...pz,
                            ...(cambios.titulo ? { titulo: cambios.titulo } : {}),
                            ...(cambios.descripcion ? { nota: cambios.descripcion } : {}),
                            ...(cambios.estado ? { fase: faseMap[cambios.estado] } : {}),
                        };
                    }),
                };
            });
        },
        eliminarProduccion(id: string) {
            update(p => ({
                ...p,
                producciones: p.producciones.filter(pr => pr.id !== id),
                piezas: p.piezas.filter(pz => pz.id !== id),
            }));
        },
        eliminarSerie(serieId: string) {
            update(p => {
                const idsAEliminar = new Set(
                    p.producciones.filter(pr => pr.serieId === serieId).map(pr => pr.id),
                );
                return {
                    ...p,
                    series: p.series.filter(s => s.id !== serieId),
                    producciones: p.producciones.filter(pr => pr.serieId !== serieId),
                    piezas: p.piezas.filter(pz => !idsAEliminar.has(pz.id)),
                };
            });
        },
    };
}
