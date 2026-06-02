'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ChevronLeft, CalendarClock, Minus, Plus,
    CheckCircle2, Crown, ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import { REUNION_SEMANAL } from '@/config/oficina/reunion-semanal';
import { INICIATIVAS } from '@/config/oficina/iniciativas';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

const DIAS = REUNION_SEMANAL.dias;

function generarConclusionDG(iniciativaId: number, horas: number, diasCount: number): string {
    const capacidad = horas >= 20 ? 'buena capacidad' : horas >= 10 ? 'capacidad moderada' : 'capacidad limitada';
    const map: Record<number, string> = {
        1: `Con ${horas} horas disponibles en ${diasCount} días, la prioridad absoluta es consolidar la Oficina como herramienta real de dirección. El panel debe reflejar el estado del negocio con precisión. Si al cierre del viernes no puedes usar Oficina para tomar una decisión estratégica, la semana no habrá sido un éxito.`,
        2: `El Campus es nuestra apuesta de mayor tracción externa. Con ${capacidad} esta semana, enfoca cada sesión en reducir la fricción para el primer usuario externo. El objetivo no es terminar features: es que alguien que no conoce el producto pueda entrar, entender y querer volver.`,
        3: `Sin usuarios externos, todo lo que construimos es teoría. Cada hora disponible esta semana tiene que acercarnos a una conversación real con alguien fuera del equipo fundador. Prioriza el contacto humano sobre el código.`,
        4: `El contenido es el canal de captación más sostenible a largo plazo. Con ${horas} horas disponibles, define primero el formato y la frecuencia antes de escribir una sola línea. Un plan claro produce más que mucho contenido sin dirección.`,
        5: `La monetización solo tiene sentido cuando hay usuarios que la justifiquen. Esta semana el foco debe estar en clarificar las hipótesis de precio y valor, no en implementar sistemas de pago. Define qué pagaría alguien y por qué.`,
    };
    return map[iniciativaId] ?? `Con ${horas} horas disponibles, mantén el foco en la iniciativa seleccionada y mide el resultado al cierre del viernes.`;
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Seccion({ numero, pregunta, children }: {
    numero: string;
    pregunta: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/40 flex items-center gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-black">
                    {numero}
                </span>
                <p className="text-sm font-semibold leading-snug">{pregunta}</p>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReunionSemanalPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    // ── Estado del formulario
    const [horas, setHoras] = useState(REUNION_SEMANAL.horasDisponibles);
    const [diasActivos, setDiasActivos] = useState<Set<string>>(
        new Set(DIAS.filter(d => d.disponible).map(d => d.abrev))
    );
    const [iniciativaId, setIniciativaId] = useState<number>(REUNION_SEMANAL.iniciativaPrincipalId);
    const [preocupacion, setPreocupacion] = useState('');
    const [resultado, setResultado] = useState('');
    const [mostrarResumen, setMostrarResumen] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) {
            router.replace('/');
        }
    }, [user, loading, router]);

    if (loading || !user || user.email !== ADMIN_EMAIL) return null;

    const toggleDia = (abrev: string) => {
        setDiasActivos(prev => {
            const next = new Set(prev);
            next.has(abrev) ? next.delete(abrev) : next.add(abrev);
            return next;
        });
    };

    const iniciativa = INICIATIVAS.find(i => i.id === iniciativaId)!;
    const diasActivosNombres = DIAS.filter(d => diasActivos.has(d.abrev)).map(d => d.nombre);
    const formularioCompleto = preocupacion.trim().length > 0 && resultado.trim().length > 0;

    const fechaActual = new Date().toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const conclusionDG = generarConclusionDG(iniciativaId, horas, diasActivos.size);

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-6 animate-in fade-in duration-500">

            {/* Back */}
            <Link
                href="/apps/oficina"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
                Oficina
            </Link>

            {/* Header */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950 p-8 md:p-10 shadow-xl">
                <div
                    className="absolute inset-0 opacity-[0.06] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle, #a78bfa 1px, transparent 1px)', backgroundSize: '22px 22px' }}
                />
                <div className="relative space-y-4">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-400/70 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                        <CalendarClock className="w-3.5 h-3.5" />
                        Reunión con el Director General
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                        Reunión<br />Semanal
                    </h1>
                    <p className="text-violet-200/40 text-xs font-mono">{REUNION_SEMANAL.etiqueta}</p>
                </div>
            </div>

            {/* Intro del Director General */}
            <div className="flex items-start gap-4 px-1">
                <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                    <Crown className="w-4 h-4 text-white" />
                </div>
                <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex-1">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2">Director General</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        Buenos días. Antes de arrancar la semana necesito entender con qué recursos contamos y qué queremos conseguir. Responde estas preguntas y prepararemos el plan juntos.
                    </p>
                </div>
            </div>

            {/* ── 1. Horas disponibles ── */}
            <Seccion numero="1" pregunta="¿Cuántas horas tienes disponibles esta semana?">
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => setHoras(h => Math.max(1, h - 1))}
                        className="w-10 h-10 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted transition-colors"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-5xl font-black tabular-nums text-violet-600 dark:text-violet-400 w-16 text-center leading-none">
                        {horas}
                    </span>
                    <button
                        onClick={() => setHoras(h => Math.min(80, h + 1))}
                        className="w-10 h-10 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-muted-foreground text-sm">horas</span>
                </div>
            </Seccion>

            {/* ── 2. Días disponibles ── */}
            <Seccion numero="2" pregunta="¿Qué días tienes disponibles?">
                <div className="flex gap-2 flex-wrap">
                    {DIAS.map(dia => {
                        const activo = diasActivos.has(dia.abrev);
                        return (
                            <button
                                key={dia.abrev}
                                title={dia.nombre}
                                onClick={() => toggleDia(dia.abrev)}
                                className={`flex flex-col items-center gap-1.5 w-12 py-3 rounded-xl border-2 transition-all ${
                                    activo
                                        ? 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-400 scale-105 shadow-sm'
                                        : 'border-border/50 bg-muted/20 text-muted-foreground/50 hover:border-border hover:text-muted-foreground'
                                }`}
                            >
                                <span className="text-sm font-bold">{dia.abrev}</span>
                                <span className={`w-2 h-2 rounded-full ${activo ? 'bg-violet-500' : 'bg-border'}`} />
                            </button>
                        );
                    })}
                </div>
                {diasActivos.size > 0 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                        {diasActivosNombres.join(', ')}
                    </p>
                )}
            </Seccion>

            {/* ── 3. Iniciativa principal ── */}
            <Seccion numero="3" pregunta="¿Cuál es la iniciativa principal de esta semana?">
                <div className="space-y-2">
                    {INICIATIVAS.map(ini => {
                        const seleccionada = ini.id === iniciativaId;
                        return (
                            <button
                                key={ini.id}
                                onClick={() => setIniciativaId(ini.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                    seleccionada
                                        ? 'border-violet-500 bg-violet-500/5 shadow-sm'
                                        : 'border-border/40 hover:border-border bg-muted/20'
                                }`}
                            >
                                <span className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    seleccionada ? 'border-violet-500 bg-violet-500' : 'border-muted-foreground/40'
                                }`}>
                                    {seleccionada && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-semibold truncate ${seleccionada ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {ini.nombre}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{ini.descripcion}</p>
                                </div>
                                <div className="shrink-0">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                        ini.estado === 'activa' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                        ini.estado === 'pausa' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                        'bg-muted text-muted-foreground'
                                    }`}>
                                        {ini.estado}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </Seccion>

            {/* ── 4. Preocupación principal ── */}
            <Seccion numero="4" pregunta="¿Cuál es tu principal preocupación esta semana?">
                <textarea
                    value={preocupacion}
                    onChange={e => setPreocupacion(e.target.value)}
                    placeholder="Escribe aquí lo que más te preocupa o bloquea ahora mismo…"
                    rows={3}
                    className="w-full text-sm bg-muted/40 border border-border/50 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 placeholder:text-muted-foreground/50 transition-all leading-relaxed"
                />
            </Seccion>

            {/* ── 5. Resultado esperado ── */}
            <Seccion numero="5" pregunta="¿Qué resultado concreto quieres conseguir esta semana?">
                <textarea
                    value={resultado}
                    onChange={e => setResultado(e.target.value)}
                    placeholder="¿Qué tiene que ser verdad el viernes para que esta semana haya sido un éxito?"
                    rows={3}
                    className="w-full text-sm bg-muted/40 border border-border/50 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 placeholder:text-muted-foreground/50 transition-all leading-relaxed"
                />
            </Seccion>

            {/* ── Resumen de la reunión ── */}
            {formularioCompleto && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Cierre del DG */}
                    <div className="flex items-start gap-4 px-1">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                            <Crown className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex-1">
                            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2">Director General</p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Perfecto. He tomado nota de todo. Este es el resumen de nuestra reunión.
                            </p>
                        </div>
                    </div>

                    <div className="bg-card border border-violet-500/20 rounded-2xl overflow-hidden shadow-sm">
                        <div className="bg-gradient-to-r from-violet-500/10 to-transparent px-5 py-3 border-b border-border/40 flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                                Resumen de la reunión
                            </p>
                            <button
                                onClick={() => setMostrarResumen(v => !v)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {mostrarResumen
                                    ? <ChevronUp className="w-4 h-4" />
                                    : <ChevronDown className="w-4 h-4" />
                                }
                            </button>
                        </div>

                        <div className={`divide-y divide-border/40 ${mostrarResumen ? 'hidden' : ''}`}>

                            <div className="px-5 py-4 flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Capacidad</p>
                                    <p className="text-sm">
                                        <span className="font-bold">{horas} horas</span> disponibles.{' '}
                                        {diasActivosNombres.length > 0
                                            ? `Días: ${diasActivosNombres.join(', ')}.`
                                            : 'Sin días seleccionados.'}
                                    </p>
                                </div>
                            </div>

                            <div className="px-5 py-4 flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Iniciativa</p>
                                    <p className="text-sm font-semibold">{iniciativa.nombre}</p>
                                </div>
                            </div>

                            <div className="px-5 py-4 flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Preocupación principal</p>
                                    <p className="text-sm leading-relaxed">{preocupacion}</p>
                                </div>
                            </div>

                            <div className="px-5 py-4 flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Resultado esperado</p>
                                    <p className="text-sm leading-relaxed">{resultado}</p>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* ── Acta de Reunión ── */}
                    <div className="rounded-2xl overflow-hidden border border-slate-700/40 shadow-md">
                        {/* Cabecera estilo documento */}
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                    Documento oficial · Privado
                                </span>
                            </div>
                            <h2 className="text-xl font-black text-white">Acta de Reunión Semanal</h2>
                            <p className="text-slate-400 text-xs mt-1 capitalize">{fechaActual}</p>
                        </div>

                        {/* Cuerpo del acta */}
                        <div className="bg-card divide-y divide-border/40">

                            <div className="px-6 py-4 grid grid-cols-[120px_1fr] gap-3 items-start">
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground pt-0.5">Capacidad</p>
                                <p className="text-sm">
                                    <span className="font-semibold">{horas} horas</span> disponibles.{' '}
                                    {diasActivosNombres.length > 0
                                        ? `Días: ${diasActivosNombres.join(', ')}.`
                                        : 'Sin días seleccionados.'}
                                </p>
                            </div>

                            <div className="px-6 py-4 grid grid-cols-[120px_1fr] gap-3 items-start">
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground pt-0.5">Iniciativa</p>
                                <div>
                                    <p className="text-sm font-semibold">{iniciativa.nombre}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{iniciativa.descripcion}</p>
                                </div>
                            </div>

                            <div className="px-6 py-4 grid grid-cols-[120px_1fr] gap-3 items-start">
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground pt-0.5">Preocupación</p>
                                <p className="text-sm leading-relaxed">{preocupacion}</p>
                            </div>

                            <div className="px-6 py-4 grid grid-cols-[120px_1fr] gap-3 items-start">
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground pt-0.5">Resultado</p>
                                <p className="text-sm leading-relaxed">{resultado}</p>
                            </div>

                        </div>

                        {/* Conclusión del Director General */}
                        <div className="bg-gradient-to-br from-amber-950/40 to-orange-950/20 border-t border-amber-500/20 px-6 py-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Crown className="w-3.5 h-3.5 text-amber-500" />
                                <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                    Conclusión del Director General
                                </p>
                            </div>
                            <p className="text-sm leading-relaxed text-foreground/90">{conclusionDG}</p>
                            <div className="mt-5 pt-4 border-t border-amber-500/20 flex items-end justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black">Director General</p>
                                    <p className="text-xs text-muted-foreground">Quioba Corp</p>
                                </div>
                                <p className="text-xs text-muted-foreground font-mono capitalize">{fechaActual}</p>
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/apps/oficina/director"
                        className="flex items-center justify-between w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 hover:border-amber-500/40 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                                <Crown className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">Volver al despacho del Director General</p>
                                <p className="text-xs text-muted-foreground">Consulta el informe ejecutivo</p>
                            </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </Link>

                </div>
            )}

        </div>
    );
}
