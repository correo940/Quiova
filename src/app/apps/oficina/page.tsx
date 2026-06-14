'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Building2, Crown, Briefcase, TrendingUp, Film, Megaphone, Search, Layers,
    CircleDollarSign, Zap, Lock, CalendarClock, ChevronRight, Swords, User, Clapperboard,
    Users, DollarSign, Clock, Settings, Scale, FolderOpen, Plus, BookOpen, Cpu,
    RotateCcw, AlertTriangle, X,
} from 'lucide-react';
import { useFundacionQuioba } from '@/hooks/useFundacionQuioba';
import { useOficinaRegistros } from '@/hooks/useOficinaRegistros';
import { FASE_META, MONETIZACION_META } from '@/config/oficina/fundacion-schema';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

// ── Despachos ────────────────────────────────────────────────────────────────

const DESPACHOS = [
    {
        id: 'director',
        numero: '01',
        nombre: 'Director General',
        descripcion: 'Objetivos, iniciativas estratégicas y plan semanal.',
        icono: Crown,
        color: 'from-amber-500 to-orange-600',
        sombra: 'shadow-amber-500/20',
        borde: 'border-amber-500/30',
        href: '/apps/oficina/director',
        disponible: true,
    },
    {
        id: 'jefe-gabinete',
        numero: '02',
        nombre: 'Jefe de Gabinete',
        descripcion: 'Transforma la estrategia en planes de acción concretos y ejecutables.',
        icono: Briefcase,
        color: 'from-teal-500 to-teal-700',
        sombra: 'shadow-teal-500/20',
        borde: 'border-teal-500/30',
        href: '/apps/oficina/jefe-gabinete',
        disponible: true,
    },
    {
        id: 'director-crecimiento',
        numero: '03',
        nombre: 'Director de Crecimiento',
        descripcion: 'Tracción, validación y primeros usuarios. Crecimiento en fase 0.',
        icono: TrendingUp,
        color: 'from-emerald-500 to-green-700',
        sombra: 'shadow-emerald-500/20',
        borde: 'border-emerald-500/30',
        href: '/apps/oficina/director-crecimiento',
        disponible: true,
    },
    {
        id: 'director-contenido',
        numero: '04',
        nombre: 'Director de Contenido',
        descripcion: 'Plan editorial, ideas de vídeo y estrategia de contenido propio.',
        icono: Film,
        color: 'from-sky-500 to-blue-700',
        sombra: 'shadow-sky-500/20',
        borde: 'border-sky-500/30',
        href: '/apps/oficina/director-contenido',
        disponible: true,
    },
    {
        id: 'consejo-estrategico',
        numero: '05',
        nombre: 'Consejo Estratégico',
        descripcion: 'Compara informes de múltiples IAs y genera una decisión oficial unificada.',
        icono: Scale,
        color: 'from-violet-500 to-purple-700',
        sombra: 'shadow-violet-500/20',
        borde: 'border-violet-500/30',
        href: '/apps/oficina/consejo-estrategico',
        disponible: true,
    },
    {
        id: 'director-tecnico',
        numero: '06',
        nombre: 'Director Técnico',
        descripcion: 'Desarrollo, arquitectura, bugs, infraestructura e integraciones.',
        icono: Cpu,
        color: 'from-slate-500 to-slate-700',
        sombra: 'shadow-slate-500/20',
        borde: 'border-slate-500/30',
        href: '/apps/oficina/director-tecnico',
        disponible: true,
    },
    {
        id: 'marketing',
        numero: '07',
        nombre: 'Marketing',
        descripcion: 'Estrategia de captación, campañas y audiencias.',
        icono: Megaphone,
        color: 'from-blue-500 to-cyan-600',
        sombra: 'shadow-blue-500/20',
        borde: 'border-blue-500/30',
        href: null,
        disponible: false,
    },
    {
        id: 'seo',
        numero: '08',
        nombre: 'SEO',
        descripcion: 'Posicionamiento orgánico, contenidos y palabras clave.',
        icono: Search,
        color: 'from-emerald-500 to-teal-600',
        sombra: 'shadow-emerald-500/20',
        borde: 'border-emerald-500/30',
        href: null,
        disponible: false,
    },
    {
        id: 'producto',
        numero: '09',
        nombre: 'Producto',
        descripcion: 'Roadmap, features, diseño y experiencia de usuario.',
        icono: Layers,
        color: 'from-violet-500 to-purple-600',
        sombra: 'shadow-violet-500/20',
        borde: 'border-violet-500/30',
        href: null,
        disponible: false,
    },
    {
        id: 'monetizacion',
        numero: '10',
        nombre: 'Monetización',
        descripcion: 'Modelo de negocio, pricing y conversión.',
        icono: CircleDollarSign,
        color: 'from-rose-500 to-pink-600',
        sombra: 'shadow-rose-500/20',
        borde: 'border-rose-500/30',
        href: null,
        disponible: false,
    },
    {
        id: 'automatizaciones',
        numero: '11',
        nombre: 'Automatizaciones',
        descripcion: 'Flujos, integraciones y operaciones automáticas.',
        icono: Zap,
        color: 'from-slate-600 to-slate-800',
        sombra: 'shadow-slate-500/20',
        borde: 'border-slate-500/30',
        href: null,
        disponible: false,
    },
] as const;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OficinaPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { fundacion, cargando: fundCargando } = useFundacionQuioba();
    const { documentos, reiniciarOficina } = useOficinaRegistros();
    const nuevosDespacho = documentos.filter(d => d.estado === 'nuevo').length;
    const [confirmandoReinicio, setConfirmandoReinicio] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) {
            router.replace('/');
        }
    }, [user, loading, router]);

    if (loading || !user || user.email !== ADMIN_EMAIL) return null;

    return (
        <>
        <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24 space-y-10 animate-in fade-in duration-500">

            {/* ── Lobby ── */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 p-8 md:p-10 shadow-xl">
                {/* fondo decorativo */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
                />
                <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <Building2 className="w-3.5 h-3.5" />
                            Sede Central · Quioba
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                            Oficina
                        </h1>
                        <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                            Centro de dirección y gestión estratégica de Quioba. Selecciona un despacho para acceder a su área.
                        </p>
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Estado</p>
                        <p className="text-sm text-emerald-400 font-semibold mt-0.5">● Operativa</p>
                        <p className="text-xs text-slate-500 mt-1">v0.1</p>
                    </div>
                </div>
            </div>

            {/* ── Estado Fundacional ── */}
            {fundacion?.completada ? (
                <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-amber-500/10 to-transparent px-5 py-3 border-b border-border/40 flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                            Estado Fundacional
                        </p>
                        <Link
                            href="/apps/oficina/fundacion"
                            className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        >
                            <Settings className="w-3 h-3" />
                            Actualizar
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border/30">
                        <div className="px-4 py-3 space-y-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Fase</p>
                            <p className="text-xs font-bold">{FASE_META[fundacion.faseProducto].label}</p>
                        </div>
                        <div className="px-4 py-3 space-y-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                                <Users className="w-2.5 h-2.5" /> Usuarios
                            </p>
                            <p className="text-xs font-bold">{fundacion.usuariosReales} reales</p>
                        </div>
                        <div className="px-4 py-3 space-y-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                                <DollarSign className="w-2.5 h-2.5" /> Monetización
                            </p>
                            <p className="text-xs font-bold">{MONETIZACION_META[fundacion.estadoMonetizacion].label}</p>
                        </div>
                        <div className="px-4 py-3 space-y-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> Horas/semana
                            </p>
                            <p className="text-xs font-bold">{fundacion.horasSemanales}h</p>
                        </div>
                    </div>
                    {(fundacion.prioridad1 || fundacion.prioridad2 || fundacion.prioridad3) && (
                        <div className="px-5 py-3 border-t border-border/30 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                Prioridades {fundacion.trimestreLabel}
                            </p>
                            <div className="space-y-1">
                                {[fundacion.prioridad1, fundacion.prioridad2, fundacion.prioridad3].filter(Boolean).map((p, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs">
                                        <span className="shrink-0 w-4 h-4 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[9px] font-black mt-0.5">{i + 1}</span>
                                        <span className="text-muted-foreground leading-snug">{p}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <Link
                    href="/apps/oficina/fundacion"
                    className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/30 hover:border-amber-500/50 hover:shadow-md transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Fundar la Oficina</p>
                            <p className="text-xs text-muted-foreground">La Oficina necesita conocer el estado real de Quioba para ser útil.</p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
            )}

            {/* ── Acciones principales ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
                href="/apps/oficina/expedientes/nuevo"
                className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-500/15 to-indigo-500/5 border-2 border-indigo-500/40 hover:border-indigo-500/70 hover:shadow-lg transition-all group"
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/15 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                        <FolderOpen className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-black text-sm">Abrir Expediente</p>
                        <p className="text-xs text-muted-foreground">Entrega una conversación o decisión</p>
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>

            <Link
                href="/apps/oficina/biblioteca"
                className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-violet-500/10 to-violet-500/5 border border-violet-500/25 hover:border-violet-500/50 hover:shadow-md transition-all group"
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-violet-500/15 rounded-xl text-violet-600 dark:text-violet-400 shrink-0">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-black text-sm">Biblioteca Corporativa</p>
                        <p className="text-xs text-muted-foreground">Prompts, normas, procesos y branding</p>
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
            </div>

            {/* ── Zonas comunes ── */}
            <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Zonas comunes</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    <Link
                        href="/apps/oficina/sala-guerra"
                        className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-red-500/10 to-slate-500/5 border border-red-500/20 hover:border-red-500/50 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-500/10 rounded-xl text-red-600 dark:text-red-400 shrink-0">
                                <Swords className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Sala de Guerra</p>
                                <p className="text-xs text-muted-foreground">Situación operativa y decisiones compartidas</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-red-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>

                    <Link
                        href="/apps/oficina/reunion-semanal"
                        className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 to-purple-500/5 border border-violet-500/20 hover:border-violet-500/50 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-violet-500/10 rounded-xl text-violet-600 dark:text-violet-400 shrink-0">
                                <CalendarClock className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Reunión Semanal</p>
                                <p className="text-xs text-muted-foreground">Planifica y revisa los compromisos de la semana</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>

                    <Link
                        href="/apps/oficina/bandeja-entrada"
                        className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-500/10 to-zinc-500/5 border border-slate-500/20 hover:border-slate-500/40 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-500/10 rounded-xl text-slate-600 dark:text-slate-400 shrink-0">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-sm">Mi Despacho</p>
                                    {nuevosDespacho > 0 && (
                                        <span className="text-[10px] font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">
                                            {nuevosDespacho} {nuevosDespacho === 1 ? 'nuevo' : 'nuevos'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">Informes del equipo y herramientas de IA</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>

                    <Link
                        href="/apps/oficina/sala-produccion"
                        className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/20 hover:border-orange-500/50 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-500/10 rounded-xl text-orange-600 dark:text-orange-400 shrink-0">
                                <Clapperboard className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Sala de Producción</p>
                                <p className="text-xs text-muted-foreground">De la idea a la publicación</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>

                </div>
            </div>

            {/* ── Despachos ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Despachos</p>
                    <p className="text-xs text-muted-foreground">
                        {DESPACHOS.filter(d => d.disponible).length} de {DESPACHOS.length} disponibles
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DESPACHOS.map(d => {
                        const Icono = d.icono;

                        if (d.disponible && d.href) {
                            return (
                                <Link
                                    key={d.id}
                                    href={d.href}
                                    className={`group relative flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br ${d.color} text-white shadow-lg ${d.sombra} hover:scale-[1.02] hover:shadow-xl transition-all duration-200 min-h-[180px] border border-white/10`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                                            <Icono className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-black opacity-40 tabular-nums">{d.numero}</span>
                                    </div>
                                    <div className="space-y-1 mt-6">
                                        <h3 className="font-black text-lg leading-tight">{d.nombre}</h3>
                                        <p className="text-xs opacity-70 leading-snug">{d.descripcion}</p>
                                    </div>
                                    <ChevronRight className="absolute bottom-5 right-5 w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                </Link>
                            );
                        }

                        return (
                            <div
                                key={d.id}
                                className={`relative flex flex-col justify-between p-6 rounded-2xl border-2 border-dashed ${d.borde} bg-muted/20 min-h-[180px] opacity-60`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="p-2.5 bg-muted rounded-xl">
                                        <Icono className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <span className="text-xs font-black text-muted-foreground/40 tabular-nums">{d.numero}</span>
                                </div>
                                <div className="space-y-1 mt-6">
                                    <h3 className="font-black text-lg leading-tight text-foreground">{d.nombre}</h3>
                                    <p className="text-xs text-muted-foreground leading-snug">{d.descripcion}</p>
                                </div>
                                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                                    <Lock className="w-3 h-3" />
                                    Próximamente
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Reiniciar Oficina ── */}
            <div className="flex justify-center pt-4 border-t border-border/20">
                <button
                    onClick={() => setConfirmandoReinicio(true)}
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground/50 hover:text-red-500 transition-colors"
                >
                    <RotateCcw className="w-3 h-3" />
                    Reiniciar Oficina
                </button>
            </div>

        </div>

        {/* ── Modal de confirmación de reinicio ── */}
        {confirmandoReinicio && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-card border border-border/50 rounded-2xl w-full max-w-md shadow-2xl">
                    <div className="px-6 py-5 border-b border-border/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                            <h2 className="font-bold text-sm">Reiniciar Oficina</h2>
                        </div>
                        <button onClick={() => setConfirmandoReinicio(false)} className="text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="px-6 py-5 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Se eliminarán todos los datos registrados de la Oficina. La estructura y configuración se mantendrán.
                        </p>
                        <ul className="text-xs text-muted-foreground/70 space-y-1.5">
                            {['Expedientes', 'Decisiones', 'Objetivos', 'Tareas', 'Biblioteca', 'Conversaciones de directores'].map(item => (
                                <li key={item} className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500/60 flex-shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <p className="text-xs font-bold text-muted-foreground">
                            Se mantiene: Contexto Corporativo, despachos, código y configuración.
                        </p>
                    </div>
                    <div className="px-6 py-4 border-t border-border/30 flex justify-end gap-2">
                        <button
                            onClick={() => setConfirmandoReinicio(false)}
                            className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl hover:bg-muted/40 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                reiniciarOficina();
                                setConfirmandoReinicio(false);
                            }}
                            className="text-sm font-bold px-5 py-2 bg-red-500 text-white rounded-xl hover:bg-red-400 transition-colors"
                        >
                            Reiniciar
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
