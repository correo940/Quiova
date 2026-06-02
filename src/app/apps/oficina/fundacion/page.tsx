'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    Building2, ChevronRight, ChevronLeft, Check,
    Users, DollarSign, Clock, Layers, Target, Minus, Plus
} from 'lucide-react';
import { useFundacionQuioba } from '@/hooks/useFundacionQuioba';
import {
    FUNDACION_DEFAULT, APPS_QUIOBA, FASE_META, MONETIZACION_META,
    type FundacionQuioba, type FaseProducto, type EstadoMonetizacion,
} from '@/config/oficina/fundacion-schema';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';
const TOTAL = 6;

// ── Paso wrapper ──────────────────────────────────────────────────────────────

function Paso({ numero, icono: Icono, titulo, subtitulo, children }: {
    numero: number;
    icono: React.ElementType;
    titulo: string;
    subtitulo: string;
    children: React.ReactNode;
}) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-400 space-y-6">
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400/70">
                    <Icono className="w-3.5 h-3.5" />
                    Paso {numero} de {TOTAL}
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">{titulo}</h2>
                <p className="text-slate-400 text-sm leading-relaxed">{subtitulo}</p>
            </div>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

// ── Radio card ────────────────────────────────────────────────────────────────

function RadioCard({ activo, onClick, titulo, descripcion }: {
    activo: boolean;
    onClick: () => void;
    titulo: string;
    descripcion: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                activo
                    ? 'border-amber-500/60 bg-amber-500/10 shadow-sm'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
            }`}
        >
            <span className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${
                activo ? 'border-amber-500 bg-amber-500' : 'border-white/30'
            }`}>
                {activo && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </span>
            <div>
                <p className={`text-sm font-bold ${activo ? 'text-amber-300' : 'text-white/90'}`}>{titulo}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">{descripcion}</p>
            </div>
        </button>
    );
}

// ── Textarea oscuro ───────────────────────────────────────────────────────────

function TextareaOscuro({ value, onChange, placeholder, rows = 2 }: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    rows?: number;
}) {
    return (
        <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full text-sm bg-white/5 border border-white/10 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 placeholder:text-slate-500 text-white leading-relaxed transition-all"
        />
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FundacionPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { fundacion, guardar, saltar } = useFundacionQuioba();

    const [paso, setPaso] = useState(0);
    const [datos, setDatos] = useState<FundacionQuioba>({
        ...FUNDACION_DEFAULT,
        fechaISO: new Date().toISOString(),
    });

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    // Si ya está fundada, ir al lobby
    useEffect(() => {
        if (!loading && fundacion?.completada) router.replace('/apps/oficina');
    }, [fundacion, loading, router]);

    if (loading || !user || user.email !== ADMIN_EMAIL) return null;

    const set = <K extends keyof FundacionQuioba>(k: K, v: FundacionQuioba[K]) =>
        setDatos(prev => ({ ...prev, [k]: v }));

    const toggleApp = (id: string) =>
        setDatos(prev => ({
            ...prev,
            appsActivas: prev.appsActivas.includes(id)
                ? prev.appsActivas.filter(a => a !== id)
                : [...prev.appsActivas, id],
        }));

    const pasoValido = [
        datos.descripcionEstado.trim().length > 0,
        true,
        true,
        datos.horasSemanales > 0,
        datos.appsActivas.length > 0,
        datos.prioridad1.trim().length > 0,
    ][paso];

    const handleFundar = () => {
        const final: FundacionQuioba = { ...datos, completada: true, fechaISO: new Date().toISOString() };
        guardar(final);
        router.push('/apps/oficina');
    };

    const progreso = ((paso) / TOTAL) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950 flex flex-col">

            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-2 text-sm font-bold text-white/70">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    Fundación Quioba
                </div>
                <button
                    onClick={() => { saltar(); router.push('/apps/oficina'); }}
                    className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
                >
                    Saltar por ahora
                </button>
            </div>

            {/* Barra de progreso */}
            <div className="h-0.5 bg-white/5">
                <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                    style={{ width: `${progreso}%` }}
                />
            </div>

            {/* Contenido central */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-xl space-y-8">

                    {/* Indicadores de paso */}
                    <div className="flex items-center justify-center gap-2">
                        {Array.from({ length: TOTAL }).map((_, i) => (
                            <div
                                key={i}
                                className={`transition-all duration-300 rounded-full ${
                                    i === paso
                                        ? 'w-6 h-2 bg-amber-500'
                                        : i < paso
                                            ? 'w-2 h-2 bg-amber-500/50'
                                            : 'w-2 h-2 bg-white/15'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Paso activo */}
                    {paso === 0 && (
                        <Paso numero={1} icono={Target} titulo="¿En qué fase está Quioba?" subtitulo="Sé honesto. Esta es la única forma de que la Oficina te dé contexto real.">
                            <div className="space-y-2">
                                {(Object.keys(FASE_META) as FaseProducto[]).map(fase => (
                                    <RadioCard
                                        key={fase}
                                        activo={datos.faseProducto === fase}
                                        onClick={() => set('faseProducto', fase)}
                                        titulo={FASE_META[fase].label}
                                        descripcion={FASE_META[fase].descripcion}
                                    />
                                ))}
                            </div>
                            <TextareaOscuro
                                value={datos.descripcionEstado}
                                onChange={v => set('descripcionEstado', v)}
                                placeholder="Describe el estado actual en una frase. Ej: 'Plataforma operativa sin usuarios externos todavía.'"
                                rows={2}
                            />
                        </Paso>
                    )}

                    {paso === 1 && (
                        <Paso numero={2} icono={Users} titulo="¿Cuántos usuarios reales hay?" subtitulo="Fuera del equipo fundador. Sin contar cuentas de prueba.">
                            <div className="flex items-center gap-5">
                                <button
                                    onClick={() => set('usuariosReales', Math.max(0, datos.usuariosReales - 1))}
                                    className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors text-white"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="text-6xl font-black text-amber-400 tabular-nums w-20 text-center leading-none">
                                    {datos.usuariosReales}
                                </span>
                                <button
                                    onClick={() => set('usuariosReales', datos.usuariosReales + 1)}
                                    className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors text-white"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                                <span className="text-slate-400 text-sm">usuarios</span>
                            </div>
                            <TextareaOscuro
                                value={datos.descripcionUsuarios}
                                onChange={v => set('descripcionUsuarios', v)}
                                placeholder="¿Quiénes son? ¿Cómo llegaron? (Opcional)"
                                rows={2}
                            />
                        </Paso>
                    )}

                    {paso === 2 && (
                        <Paso numero={3} icono={DollarSign} titulo="¿Cuál es el estado de la monetización?" subtitulo="Sin filtros. El contexto real es el único útil.">
                            <div className="space-y-2">
                                {(Object.keys(MONETIZACION_META) as EstadoMonetizacion[]).map(estado => (
                                    <RadioCard
                                        key={estado}
                                        activo={datos.estadoMonetizacion === estado}
                                        onClick={() => set('estadoMonetizacion', estado)}
                                        titulo={MONETIZACION_META[estado].label}
                                        descripcion={MONETIZACION_META[estado].descripcion}
                                    />
                                ))}
                            </div>
                            <TextareaOscuro
                                value={datos.descripcionMonetizacion}
                                onChange={v => set('descripcionMonetizacion', v)}
                                placeholder="Describe el estado en una frase. (Opcional)"
                                rows={2}
                            />
                        </Paso>
                    )}

                    {paso === 3 && (
                        <Paso numero={4} icono={Clock} titulo="¿Cuántas horas semanales puedes dedicar?" subtitulo="Horas reales disponibles para Quioba esta semana típica.">
                            <div className="flex items-center gap-5">
                                <button
                                    onClick={() => set('horasSemanales', Math.max(1, datos.horasSemanales - 1))}
                                    className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors text-white"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="text-6xl font-black text-amber-400 tabular-nums w-20 text-center leading-none">
                                    {datos.horasSemanales}
                                </span>
                                <button
                                    onClick={() => set('horasSemanales', Math.min(80, datos.horasSemanales + 1))}
                                    className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors text-white"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                                <span className="text-slate-400 text-sm">horas</span>
                            </div>
                        </Paso>
                    )}

                    {paso === 4 && (
                        <Paso numero={5} icono={Layers} titulo="¿Qué aplicaciones están activas?" subtitulo="Selecciona las que están operativas y siendo usadas hoy.">
                            <div className="grid grid-cols-2 gap-2">
                                {APPS_QUIOBA.map(app => {
                                    const activa = datos.appsActivas.includes(app.id);
                                    return (
                                        <button
                                            key={app.id}
                                            onClick={() => toggleApp(app.id)}
                                            className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-left transition-all ${
                                                activa
                                                    ? 'border-amber-500/60 bg-amber-500/10'
                                                    : 'border-white/10 bg-white/5 hover:border-white/20'
                                            }`}
                                        >
                                            <span className={`shrink-0 w-4 h-4 rounded flex items-center justify-center border ${
                                                activa ? 'border-amber-500 bg-amber-500' : 'border-white/30'
                                            }`}>
                                                {activa && <Check className="w-3 h-3 text-white" />}
                                            </span>
                                            <div>
                                                <p className={`text-xs font-bold ${activa ? 'text-amber-300' : 'text-white/80'}`}>{app.nombre}</p>
                                                <p className="text-[10px] text-slate-500">{app.descripcion}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </Paso>
                    )}

                    {paso === 5 && (
                        <Paso numero={6} icono={Target} titulo={`Prioridades de ${datos.trimestreLabel}`} subtitulo="Las 3 cosas que más importan este trimestre. Serán la brújula de todos los directores.">
                            <div className="space-y-3">
                                {[
                                    { key: 'prioridad1' as const, label: 'Prioridad 1', placeholder: 'Lo más urgente e importante del trimestre…' },
                                    { key: 'prioridad2' as const, label: 'Prioridad 2', placeholder: 'Segunda prioridad en importancia…' },
                                    { key: 'prioridad3' as const, label: 'Prioridad 3', placeholder: 'Tercera prioridad o apuesta experimental…' },
                                ].map(({ key, label, placeholder }) => (
                                    <div key={key} className="space-y-1.5">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                                        <TextareaOscuro
                                            value={datos[key]}
                                            onChange={v => set(key, v)}
                                            placeholder={placeholder}
                                            rows={2}
                                        />
                                    </div>
                                ))}
                            </div>
                        </Paso>
                    )}

                    {/* Navegación */}
                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={() => setPaso(p => Math.max(0, p - 1))}
                            disabled={paso === 0}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/70 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Atrás
                        </button>

                        {paso < TOTAL - 1 ? (
                            <button
                                onClick={() => setPaso(p => p + 1)}
                                disabled={!pasoValido}
                                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-white transition-all shadow-lg shadow-amber-500/20"
                            >
                                Siguiente
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleFundar}
                                disabled={!pasoValido}
                                className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-black text-white transition-all shadow-lg shadow-amber-500/30"
                            >
                                <Building2 className="w-4 h-4" />
                                Fundar la Oficina
                            </button>
                        )}
                    </div>

                </div>
            </div>

            {/* Footer */}
            <div className="text-center pb-8 px-4">
                <p className="text-xs text-slate-600 italic">
                    "La Oficina está aprendiendo qué es Quioba."
                </p>
            </div>

        </div>
    );
}
