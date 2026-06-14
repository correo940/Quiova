'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ChevronLeft, Building2, Save, Users, DollarSign,
    Clock, Target, FileText, Layers,
} from 'lucide-react';
import { useFundacionQuioba } from '@/hooks/useFundacionQuioba';
import {
    FUNDACION_DEFAULT, FASE_META, MONETIZACION_META,
    type FundacionQuioba, type FaseProducto, type EstadoMonetizacion,
} from '@/config/oficina/fundacion-schema';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

function Campo({ label, descripcion, children }: {
    label: string;
    descripcion?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                {descripcion && <p className="text-xs text-muted-foreground/60 mt-0.5">{descripcion}</p>}
            </div>
            {children}
        </div>
    );
}

export default function ContextoCorporativoPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { fundacion, guardar } = useFundacionQuioba();

    const [datos, setDatos] = useState<FundacionQuioba>({
        ...FUNDACION_DEFAULT,
        fechaISO: new Date().toISOString(),
    });
    const [guardado, setGuardado] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    useEffect(() => {
        if (fundacion) setDatos(fundacion);
    }, [fundacion]);

    if (loading || !user || user.email !== ADMIN_EMAIL) return null;

    const set = <K extends keyof FundacionQuioba>(k: K, v: FundacionQuioba[K]) =>
        setDatos(prev => ({ ...prev, [k]: v }));

    const handleGuardar = () => {
        guardar({ ...datos, completada: true, fechaISO: new Date().toISOString() });
        setGuardado(true);
        setTimeout(() => setGuardado(false), 2000);
    };

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-6 pb-24 space-y-6 animate-in fade-in duration-500">
            <Link href="/apps/oficina" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" /> Oficina
            </Link>

            {/* Header */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-950 via-slate-900 to-slate-950 p-8 shadow-xl">
                <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 30% 60%, #f59e0b 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                <div className="relative space-y-3">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400/70 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                        <Building2 className="w-3.5 h-3.5" /> Contexto Corporativo
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                        Estado de Quioba
                    </h1>
                    <p className="text-amber-200/50 text-xs font-mono leading-relaxed">
                        Los directores usan esta información como base de conocimiento.
                        Si no está aquí, no lo saben.
                    </p>
                </div>
            </div>

            {/* Formulario */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm divide-y divide-border/30">

                {/* Fase */}
                <div className="p-5 space-y-3">
                    <Campo label="Fase del Proyecto" descripcion="¿En qué momento está Quioba?">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(Object.entries(FASE_META) as [FaseProducto, { label: string; descripcion: string }][]).map(([k, v]) => (
                                <button
                                    key={k}
                                    onClick={() => set('faseProducto', k)}
                                    className={`text-left p-3 rounded-xl border text-sm transition-all ${
                                        datos.faseProducto === k
                                            ? 'border-amber-500/60 bg-amber-500/8 text-foreground'
                                            : 'border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                                    }`}
                                >
                                    <p className="font-bold text-xs">{v.label}</p>
                                    <p className="text-[11px] mt-0.5 leading-snug opacity-70">{v.descripcion}</p>
                                </button>
                            ))}
                        </div>
                    </Campo>
                    <Campo label="Descripción del estado actual">
                        <textarea
                            value={datos.descripcionEstado}
                            onChange={e => set('descripcionEstado', e.target.value)}
                            placeholder="Ej: La app está operativa. Arquitectura sólida. Sin usuarios externos todavía."
                            rows={2}
                            className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-border resize-none leading-relaxed"
                        />
                    </Campo>
                </div>

                {/* Usuarios */}
                <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <Users className="w-3.5 h-3.5" /> Usuarios
                    </div>
                    <Campo label="Usuarios reales activos (fuera del equipo fundador)">
                        <input
                            type="number"
                            min={0}
                            value={datos.usuariosReales}
                            onChange={e => set('usuariosReales', parseInt(e.target.value) || 0)}
                            className="w-32 bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-border"
                        />
                    </Campo>
                    <Campo label="Contexto de usuarios">
                        <textarea
                            value={datos.descripcionUsuarios}
                            onChange={e => set('descripcionUsuarios', e.target.value)}
                            placeholder="Ej: Solo el fundador lo usa. 3 personas en pruebas privadas desde mayo."
                            rows={2}
                            className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-border resize-none leading-relaxed"
                        />
                    </Campo>
                </div>

                {/* Monetización */}
                <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <DollarSign className="w-3.5 h-3.5" /> Monetización
                    </div>
                    <Campo label="Estado de monetización">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(Object.entries(MONETIZACION_META) as [EstadoMonetizacion, { label: string; descripcion: string }][]).map(([k, v]) => (
                                <button
                                    key={k}
                                    onClick={() => set('estadoMonetizacion', k)}
                                    className={`text-left p-3 rounded-xl border text-sm transition-all ${
                                        datos.estadoMonetizacion === k
                                            ? 'border-amber-500/60 bg-amber-500/8 text-foreground'
                                            : 'border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                                    }`}
                                >
                                    <p className="font-bold text-xs">{v.label}</p>
                                    <p className="text-[11px] mt-0.5 leading-snug opacity-70">{v.descripcion}</p>
                                </button>
                            ))}
                        </div>
                    </Campo>
                </div>

                {/* Recursos */}
                <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" /> Recursos
                    </div>
                    <Campo label="Horas disponibles por semana">
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min={5}
                                max={60}
                                step={5}
                                value={datos.horasSemanales}
                                onChange={e => set('horasSemanales', parseInt(e.target.value))}
                                className="flex-1"
                            />
                            <span className="text-sm font-bold w-16 text-center">{datos.horasSemanales}h/sem</span>
                        </div>
                    </Campo>
                </div>

                {/* Objetivos trimestrales */}
                <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <Target className="w-3.5 h-3.5" /> Prioridades del Trimestre
                    </div>
                    <Campo label="Trimestre">
                        <input
                            type="text"
                            value={datos.trimestreLabel}
                            onChange={e => set('trimestreLabel', e.target.value)}
                            placeholder="Ej: Q2 2026"
                            className="w-40 bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-border"
                        />
                    </Campo>
                    {(['prioridad1', 'prioridad2', 'prioridad3'] as const).map((k, i) => (
                        <Campo key={k} label={`Prioridad ${i + 1}`}>
                            <input
                                type="text"
                                value={datos[k]}
                                onChange={e => set(k, e.target.value)}
                                placeholder={`Prioridad ${i + 1} del trimestre...`}
                                className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-border"
                            />
                        </Campo>
                    ))}
                </div>

                {/* Observaciones */}
                <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <FileText className="w-3.5 h-3.5" /> Observaciones Estratégicas
                    </div>
                    <Campo label="Notas libres para los directores" descripcion="Contexto adicional que no encaja en otros campos.">
                        <textarea
                            value={datos.descripcionMonetizacion}
                            onChange={e => set('descripcionMonetizacion', e.target.value)}
                            placeholder="Ej: Foco en Q2 es El Campus. No dispersar recursos en otras apps. Beta privada con 3 familias."
                            rows={3}
                            className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-border resize-none leading-relaxed"
                        />
                    </Campo>
                </div>

                {/* Guardar */}
                <div className="p-5 flex justify-end">
                    <button
                        onClick={handleGuardar}
                        className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-all active:scale-95 ${
                            guardado
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-500 hover:bg-amber-400 text-white'
                        }`}
                    >
                        <Save className="w-4 h-4" />
                        {guardado ? '¡Guardado!' : 'Guardar Contexto'}
                    </button>
                </div>
            </div>
        </div>
    );
}
