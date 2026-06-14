'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ChevronLeft, Crown, FolderOpen, Plus, CheckCircle2, Clock,
    X, ChevronDown, ChevronUp, Send, Building2, Target,
} from 'lucide-react';
import { useOficinaRegistros } from '@/hooks/useOficinaRegistros';
import { useFundacionQuioba } from '@/hooks/useFundacionQuioba';
import DirectorChat from '@/components/oficina/director-chat';
import type { TareaDirector, ObjetivoArea } from '@/hooks/useOficinaRegistros';
import { useRegistrar } from '@/hooks/useRegistrar';
import { ModalAccionPropuesta } from '@/components/oficina/modal-accion-propuesta';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

const DIRECTORES_DESTINO = [
    { id: 'director-contenido', label: 'Director de Contenido' },
    { id: 'director-crecimiento', label: 'Director de Crecimiento' },
    { id: 'director-tecnico', label: 'Director Técnico' },
    { id: 'jefe-gabinete', label: 'Jefe de Gabinete' },
    { id: 'consejo-estrategico', label: 'Consejo Estratégico' },
];

const DIR_LABEL: Record<string, string> = {
    'director-contenido': 'Dir. Contenido',
    'director-crecimiento': 'Dir. Crecimiento',
    'director-tecnico': 'Dir. Técnico',
    'jefe-gabinete': 'Jefe Gabinete',
    'consejo-estrategico': 'Consejo',
    'director': 'Dir. General',
};

interface TareaForm {
    directorId: string;
    titulo: string;
    descripcion: string;
    urgencia: TareaDirector['urgencia'];
}

function EstadoBadge({ estado }: { estado: string }) {
    const s: Record<string, string> = {
        pendiente: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        'en-revision': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        cerrado: 'bg-muted text-muted-foreground',
        propuesta: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        aprobada: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        descartada: 'bg-red-500/10 text-red-600 dark:text-red-400',
        activo: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        completado: 'bg-muted text-muted-foreground',
        cancelado: 'bg-red-500/10 text-red-600 dark:text-red-400',
    };
    return (
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${s[estado] ?? 'bg-muted text-muted-foreground'}`}>
            {estado}
        </span>
    );
}

function PrioridadDot({ prioridad }: { prioridad?: string }) {
    const color = prioridad === 'alta' ? 'bg-red-500' : prioridad === 'media' ? 'bg-amber-500' : 'bg-blue-400';
    return <span className={`inline-block w-2 h-2 rounded-full ${color}`} title={prioridad} />;
}

export default function DirectorGeneralPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const {
        expedientesOficina,
        decisionesCorporativas,
        tareasDirector,
        objetivosArea,
        biblioteca,
        crearDecisionCorporativa,
        crearExpedienteConDecision,
        actualizarEstadoExpediente,
        actualizarEstadoObjetivoArea,
    } = useOficinaRegistros();

    const { handleRegistrar, estructurando, accionPendiente, confirmarAccion, cancelarAccion } =
        useRegistrar('director', crearExpedienteConDecision);
    const { fundacion } = useFundacionQuioba();

    // Modal estado
    const [modalExpId, setModalExpId] = useState<string | null>(null);
    const [decTitulo, setDecTitulo] = useState('');
    const [decDesc, setDecDesc] = useState('');
    // Objetivo
    const [crearObjetivo, setCrearObjetivo] = useState(true);
    const [objTitulo, setObjTitulo] = useState('');
    const [objDesc, setObjDesc] = useState('');
    const [objDirector, setObjDirector] = useState('director-contenido');
    const [objPrioridad, setObjPrioridad] = useState<ObjetivoArea['prioridad']>('media');
    const [objFecha, setObjFecha] = useState('');
    // Tareas (modo individual)
    const [tareas, setTareas] = useState<TareaForm[]>([
        { directorId: 'director-contenido', titulo: '', descripcion: '', urgencia: 'esta-semana' },
    ]);
    // Tareas (modo masivo)
    const [modoMasivo, setModoMasivo] = useState(false);
    const [textoMasivo, setTextoMasivo] = useState('');
    const [masivoDirector, setMasivoDirector] = useState('director-contenido');
    const [masivoUrgencia, setMasivoUrgencia] = useState<TareaDirector['urgencia']>('esta-semana');
    // UI
    const [expandedExp, setExpandedExp] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    if (loading || !user || user.email !== ADMIN_EMAIL) return null;

    const expedientesPendientes = expedientesOficina.filter(
        e => e.directorRevisor === 'director' && e.estado !== 'cerrado'
    );
    const objetivosActivos = objetivosArea.filter(o => o.estado === 'activo');
    const misDecisiones = decisionesCorporativas.slice(0, 6);
    const tareasDelgadas = tareasDirector.filter(t => t.directorOrigen === 'director' && t.estado !== 'completada').slice(0, 6);

    const contextoChat = {
        fundacion,
        expedientes: expedientesOficina,
        decisiones: decisionesCorporativas,
        objetivos: objetivosArea,
        tareas: tareasDirector,
        biblioteca,
    };

    const openModal = (expId: string) => {
        setModalExpId(expId);
        setDecTitulo(''); setDecDesc('');
        setCrearObjetivo(true);
        setObjTitulo(''); setObjDesc('');
        setObjDirector('director-contenido');
        setObjPrioridad('media'); setObjFecha('');
        setTareas([{ directorId: 'director-contenido', titulo: '', descripcion: '', urgencia: 'esta-semana' }]);
        setModoMasivo(false); setTextoMasivo('');
        setMasivoDirector('director-contenido'); setMasivoUrgencia('esta-semana');
    };
    const closeModal = () => setModalExpId(null);

    const addTarea = () =>
        setTareas(prev => [...prev, { directorId: objDirector, titulo: '', descripcion: '', urgencia: 'esta-semana' }]);

    const removeTarea = (i: number) => setTareas(prev => prev.filter((_, idx) => idx !== i));

    const updateTarea = (i: number, field: keyof TareaForm, value: string) =>
        setTareas(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));

    const handleCrearDecision = () => {
        if (!modalExpId || !decTitulo.trim()) return;
        const tareasValidas = modoMasivo
            ? textoMasivo.split('\n').map(l => l.trim()).filter(Boolean).map(titulo => ({
                directorId: masivoDirector,
                titulo,
                descripcion: '',
                urgencia: masivoUrgencia,
            }))
            : tareas.filter(t => t.titulo.trim());
        const objetivo = crearObjetivo && objTitulo.trim()
            ? {
                directorId: objDirector,
                titulo: objTitulo.trim(),
                descripcion: objDesc.trim(),
                prioridad: objPrioridad,
                estado: 'activo' as const,
                fechaObjetivo: objFecha || undefined,
            }
            : null;

        crearDecisionCorporativa(
            {
                expedienteId: modalExpId,
                titulo: decTitulo.trim(),
                descripcion: decDesc.trim(),
                directorOrigen: 'director',
                directoresAfectados: [...new Set([
                    ...(objetivo ? [objetivo.directorId] : []),
                    ...tareasValidas.map(t => t.directorId),
                ])],
                estado: 'aprobada',
            },
            objetivo,
            tareasValidas.map(t => ({
                expedienteId: modalExpId,
                directorId: t.directorId,
                directorOrigen: 'director',
                titulo: t.titulo.trim(),
                descripcion: t.descripcion.trim(),
                urgencia: t.urgencia,
                estado: 'pendiente' as const,
            })),
        );
        closeModal();
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
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Crown className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 leading-none">Despacho 01</p>
                            <h1 className="font-black text-base leading-tight">Director General</h1>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/apps/oficina/fundacion"
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-muted border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                    >
                        <Building2 className="w-3.5 h-3.5" />
                        Contexto
                    </Link>
                    <Link
                        href="/apps/oficina/expedientes/nuevo"
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Nuevo Expediente
                    </Link>
                </div>
            </div>

            {/* Layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] min-h-0 overflow-hidden">

                {/* Chat */}
                <div className="flex flex-col min-h-0 border-r border-border/30">
                    <div className="px-4 py-2 border-b border-border/20 flex-shrink-0">
                        <p className="text-[11px] text-muted-foreground/60 font-medium">Solo respondo usando datos registrados en Quioba</p>
                    </div>
                    <div className="flex-1 min-h-0">
                        <DirectorChat
                            directorId="director"
                            directorNombre="Director General"
                            accentColor="bg-amber-500"
                            contexto={contextoChat}
                            placeholder="¿Qué objetivos tenemos esta semana?"
                            onRegistrar={(contenido) => handleRegistrar(contenido, contextoChat)}
                        />
                    </div>
                </div>

                {/* Panel lateral */}
                <div className="overflow-y-auto divide-y divide-border/30">

                    {/* Expedientes pendientes */}
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                <FolderOpen className="w-3.5 h-3.5" /> Expedientes
                            </p>
                            <span className="text-[10px] text-muted-foreground">{expedientesPendientes.length} pendientes</span>
                        </div>
                        {expedientesPendientes.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 py-1">Sin expedientes pendientes.</p>
                        ) : (
                            <div className="space-y-2">
                                {expedientesPendientes.map(exp => (
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
                                            <div className="px-3 pb-3 space-y-3">
                                                <p className="text-xs text-muted-foreground leading-relaxed">{exp.resumen}</p>
                                                {exp.conversacionOriginal && (
                                                    <details className="text-[11px]">
                                                        <summary className="cursor-pointer text-muted-foreground/70 font-medium">Ver conversación original</summary>
                                                        <pre className="mt-2 text-[10px] text-muted-foreground/60 whitespace-pre-wrap font-mono bg-muted/30 p-2 rounded-lg max-h-40 overflow-y-auto">{exp.conversacionOriginal}</pre>
                                                    </details>
                                                )}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => openModal(exp.id)}
                                                        className="flex-1 text-xs font-bold py-2 px-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
                                                    >
                                                        Crear Decisión
                                                    </button>
                                                    <button
                                                        onClick={() => actualizarEstadoExpediente(exp.id, 'cerrado')}
                                                        className="text-xs font-bold py-2 px-3 bg-muted text-muted-foreground border border-border/40 rounded-lg hover:bg-muted/70 transition-colors"
                                                    >
                                                        Cerrar
                                                    </button>
                                                </div>
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
                            <span className="text-[10px] text-muted-foreground">{objetivosActivos.length}</span>
                        </div>
                        {objetivosActivos.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 py-1">Sin objetivos activos. Crea uno desde una Decisión.</p>
                        ) : (
                            <div className="space-y-2">
                                {objetivosActivos.map(obj => (
                                    <div key={obj.id} className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <PrioridadDot prioridad={obj.prioridad} />
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                                {obj.prioridad ?? 'media'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground/60">
                                                → {DIR_LABEL[obj.directorId] ?? obj.directorId}
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

                    {/* Decisiones recientes */}
                    <div className="p-4 space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Decisiones
                        </p>
                        {misDecisiones.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 py-1">Sin decisiones registradas.</p>
                        ) : (
                            <div className="space-y-2">
                                {misDecisiones.map(d => (
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

                    {/* Tareas delegadas */}
                    {tareasDelgadas.length > 0 && (
                        <div className="p-4 space-y-3">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> Delegadas
                            </p>
                            <div className="space-y-2">
                                {tareasDelgadas.map(t => (
                                    <div key={t.id} className="p-3 bg-muted/20 border border-border/30 rounded-xl space-y-1">
                                        <div className="flex items-center gap-2">
                                            <EstadoBadge estado={t.estado} />
                                            <span className="text-[10px] text-muted-foreground/60 capitalize">{t.urgencia}</span>
                                        </div>
                                        <p className="text-xs font-semibold">{t.titulo}</p>
                                        <p className="text-[11px] text-muted-foreground/60">→ {DIR_LABEL[t.directorId] ?? t.directorId}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Crear Decisión + Objetivo + Tareas */}
            {modalExpId && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border/50 rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col">
                        <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between flex-shrink-0">
                            <h2 className="font-bold text-sm">Crear Decisión, Objetivo y Tareas</h2>
                            <button onClick={closeModal} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="overflow-y-auto flex-1 divide-y divide-border/20">

                            {/* Decisión */}
                            <div className="p-5 space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">1. Decisión</p>
                                <input
                                    type="text"
                                    placeholder="Título de la decisión *"
                                    value={decTitulo}
                                    onChange={e => setDecTitulo(e.target.value)}
                                    className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-border"
                                />
                                <textarea
                                    placeholder="Descripción (opcional)"
                                    value={decDesc}
                                    onChange={e => setDecDesc(e.target.value)}
                                    rows={2}
                                    className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-border resize-none"
                                />
                            </div>

                            {/* Objetivo */}
                            <div className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">2. Objetivo</p>
                                    <button
                                        onClick={() => setCrearObjetivo(!crearObjetivo)}
                                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors ${crearObjetivo ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}
                                    >
                                        {crearObjetivo ? 'Incluir' : 'Omitir'}
                                    </button>
                                </div>
                                {crearObjetivo && (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            placeholder="Título del objetivo"
                                            value={objTitulo}
                                            onChange={e => setObjTitulo(e.target.value)}
                                            className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-border"
                                        />
                                        <textarea
                                            placeholder="Descripción del objetivo (opcional)"
                                            value={objDesc}
                                            onChange={e => setObjDesc(e.target.value)}
                                            rows={2}
                                            className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-border resize-none"
                                        />
                                        <div className="grid grid-cols-3 gap-2">
                                            <select
                                                value={objDirector}
                                                onChange={e => setObjDirector(e.target.value)}
                                                className="col-span-1 bg-muted/30 border border-border/40 rounded-xl px-2 py-2 text-xs outline-none"
                                            >
                                                {DIRECTORES_DESTINO.map(d => (
                                                    <option key={d.id} value={d.id}>{d.label}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={objPrioridad}
                                                onChange={e => setObjPrioridad(e.target.value as ObjetivoArea['prioridad'])}
                                                className="bg-muted/30 border border-border/40 rounded-xl px-2 py-2 text-xs outline-none"
                                            >
                                                <option value="alta">Alta</option>
                                                <option value="media">Media</option>
                                                <option value="baja">Baja</option>
                                            </select>
                                            <input
                                                type="date"
                                                value={objFecha}
                                                onChange={e => setObjFecha(e.target.value)}
                                                className="bg-muted/30 border border-border/40 rounded-xl px-2 py-2 text-xs outline-none"
                                                title="Fecha objetivo"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tareas */}
                            <div className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">3. Tareas</p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setModoMasivo(false)}
                                            className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${!modoMasivo ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            Individual
                                        </button>
                                        <button
                                            onClick={() => setModoMasivo(true)}
                                            className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${modoMasivo ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            Masivo
                                        </button>
                                        {!modoMasivo && (
                                            <button onClick={addTarea} className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1 ml-1">
                                                <Plus className="w-3 h-3" /> Añadir
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {modoMasivo ? (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                value={masivoDirector}
                                                onChange={e => setMasivoDirector(e.target.value)}
                                                className="bg-muted/30 border border-border/40 rounded-lg px-2 py-1.5 text-xs outline-none"
                                            >
                                                {DIRECTORES_DESTINO.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                                            </select>
                                            <select
                                                value={masivoUrgencia}
                                                onChange={e => setMasivoUrgencia(e.target.value as TareaDirector['urgencia'])}
                                                className="bg-muted/30 border border-border/40 rounded-lg px-2 py-1.5 text-xs outline-none"
                                            >
                                                <option value="inmediata">Inmediata</option>
                                                <option value="esta-semana">Esta semana</option>
                                                <option value="este-mes">Este mes</option>
                                            </select>
                                        </div>
                                        <textarea
                                            value={textoMasivo}
                                            onChange={e => setTextoMasivo(e.target.value)}
                                            placeholder={'Una tarea por línea:\nCrear vídeo: Cómo los ciclos circadianos...\nCrear vídeo: Los errores en finanzas...\nCrear vídeo: La lista de la compra inteligente...'}
                                            rows={6}
                                            className="w-full bg-muted/30 border border-border/40 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-border resize-none font-mono leading-relaxed"
                                        />
                                        {textoMasivo.split('\n').filter(l => l.trim()).length > 0 && (
                                            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                                {textoMasivo.split('\n').filter(l => l.trim()).length} tarea{textoMasivo.split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''} detectada{textoMasivo.split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {tareas.map((t, i) => (
                                            <div key={i} className="bg-muted/20 border border-border/30 rounded-xl p-3 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={t.directorId}
                                                        onChange={e => updateTarea(i, 'directorId', e.target.value)}
                                                        className="flex-1 bg-muted/30 border border-border/40 rounded-lg px-2 py-1.5 text-xs outline-none"
                                                    >
                                                        {DIRECTORES_DESTINO.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                                                    </select>
                                                    <select
                                                        value={t.urgencia}
                                                        onChange={e => updateTarea(i, 'urgencia', e.target.value)}
                                                        className="bg-muted/30 border border-border/40 rounded-lg px-2 py-1.5 text-xs outline-none"
                                                    >
                                                        <option value="inmediata">Inmediata</option>
                                                        <option value="esta-semana">Esta semana</option>
                                                        <option value="este-mes">Este mes</option>
                                                    </select>
                                                    {tareas.length > 1 && (
                                                        <button onClick={() => removeTarea(i)} className="text-muted-foreground hover:text-red-500">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Título de la tarea"
                                                    value={t.titulo}
                                                    onChange={e => updateTarea(i, 'titulo', e.target.value)}
                                                    className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-1.5 text-xs outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Descripción breve (opcional)"
                                                    value={t.descripcion}
                                                    onChange={e => updateTarea(i, 'descripcion', e.target.value)}
                                                    className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-1.5 text-xs outline-none"
                                                />
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="px-5 py-4 border-t border-border/30 flex justify-end gap-2 flex-shrink-0">
                            <button onClick={closeModal} className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl hover:bg-muted/40 transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleCrearDecision}
                                disabled={!decTitulo.trim()}
                                className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2 bg-amber-500 text-white rounded-xl disabled:opacity-40 hover:bg-amber-400 transition-colors"
                            >
                                <Send className="w-3.5 h-3.5" />
                                Aprobar y Delegar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ModalAccionPropuesta
                accion={accionPendiente}
                estructurando={estructurando}
                onConfirmar={confirmarAccion}
                onCancelar={cancelarAccion}
            />
        </div>
    );
}
