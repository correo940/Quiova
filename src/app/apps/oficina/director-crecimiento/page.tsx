'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ElementType } from 'react';
import Link from 'next/link';
import {
    ChevronLeft, TrendingUp, Plus, X, Trash2, Lock,
    Crown, ShieldAlert, Lightbulb, BarChart3, FlaskConical, Map, UserCheck,
    Activity, ArrowRight
} from 'lucide-react';
import { useOficinaRegistros, type RegistroCrecimiento, type TipoRegistroCrecimiento } from '@/hooks/useOficinaRegistros';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

const TIPO_LABELS: Record<TipoRegistroCrecimiento, string> = {
    diagnostico: 'Diagnóstico',
    oportunidad: 'Oportunidad',
    riesgo: 'Riesgo',
    accion: 'Próxima acción',
};

function NivelBadge({ nivel }: { nivel: RegistroCrecimiento['nivel'] }) {
    if (!nivel) return null;
    if (nivel === 'critico') return <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 uppercase tracking-wide">Crítico</span>;
    if (nivel === 'alto') return <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase tracking-wide">Alto</span>;
    return <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide">Medio</span>;
}

function ImpactoBadge({ valor }: { valor: RegistroCrecimiento['impacto'] }) {
    if (!valor) return null;
    const cls = valor === 'alto' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : valor === 'medio' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground';
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cls}`}>Impacto {valor}</span>;
}

function EsfuerzoBadge({ valor }: { valor: RegistroCrecimiento['esfuerzo'] }) {
    if (!valor) return null;
    const cls = valor === 'bajo' ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400' : valor === 'medio' ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400';
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cls}`}>Esfuerzo {valor}</span>;
}

function borderTipo(tipo: TipoRegistroCrecimiento) {
    if (tipo === 'diagnostico') return 'border-l-amber-500';
    if (tipo === 'oportunidad') return 'border-l-emerald-500';
    if (tipo === 'riesgo') return 'border-l-red-500';
    return 'border-l-indigo-500';
}

function Seccion({ tipo, titulo, icono: Icono, color, items, onDelete }: {
    tipo: TipoRegistroCrecimiento;
    titulo: string;
    icono: ElementType;
    color: string;
    items: RegistroCrecimiento[];
    onDelete: (id: string) => void;
}) {
    if (items.length === 0) return (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div className={`bg-gradient-to-r ${color} px-5 py-3 border-b border-border/40 flex items-center gap-2`}>
                <Icono className="w-3.5 h-3.5" />
                <p className="text-xs font-bold uppercase tracking-widest">{titulo}</p>
            </div>
            <div className="p-5 text-center text-xs text-muted-foreground/50">Sin registros</div>
        </div>
    );
    return (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div className={`bg-gradient-to-r ${color} px-5 py-3 border-b border-border/40 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <Icono className="w-3.5 h-3.5" />
                    <p className="text-xs font-bold uppercase tracking-widest">{titulo}</p>
                </div>
                <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <ul className="divide-y divide-border/40">
                {items.map(item => (
                    <li key={item.id} className={`p-5 space-y-2 border-l-2 ${borderTipo(item.tipo)}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2 min-w-0">
                                <p className="font-semibold text-sm leading-snug">{item.titulo}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">{item.descripcion}</p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <NivelBadge nivel={item.nivel} />
                                    <ImpactoBadge valor={item.impacto} />
                                    <EsfuerzoBadge valor={item.esfuerzo} />
                                </div>
                            </div>
                            <button
                                onClick={() => onDelete(item.id)}
                                className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function DirectorCrecimientoPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { crecimiento, cargando, agregarRegistroCrecimiento, eliminarRegistroCrecimiento } = useOficinaRegistros();

    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState({
        tipo: 'diagnostico' as TipoRegistroCrecimiento,
        titulo: '',
        descripcion: '',
        nivel: 'alto' as RegistroCrecimiento['nivel'],
        impacto: 'alto' as RegistroCrecimiento['impacto'],
        esfuerzo: 'medio' as RegistroCrecimiento['esfuerzo'],
    });
    const [err, setErr] = useState('');

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    if (loading || cargando || !user || user.email !== ADMIN_EMAIL) return null;

    function submit() {
        if (!form.titulo.trim() || !form.descripcion.trim()) { setErr('Título y descripción son obligatorios.'); return; }
        const reg: Omit<RegistroCrecimiento, 'id' | 'fechaRegistro'> = {
            tipo: form.tipo,
            titulo: form.titulo.trim(),
            descripcion: form.descripcion.trim(),
            ...(form.tipo === 'diagnostico' || form.tipo === 'riesgo' ? { nivel: form.nivel } : {}),
            ...(form.tipo === 'oportunidad' ? { impacto: form.impacto, esfuerzo: form.esfuerzo } : {}),
        };
        agregarRegistroCrecimiento(reg);
        setForm({ tipo: 'diagnostico', titulo: '', descripcion: '', nivel: 'alto', impacto: 'alto', esfuerzo: 'medio' });
        setErr('');
        setFormOpen(false);
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-6 animate-in fade-in duration-500">

            <Link href="/apps/oficina" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" /> Oficina
            </Link>

            {/* Header */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-8 md:p-10 shadow-xl">
                <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
                    style={{ backgroundImage: 'linear-gradient(#4ade80 1px, transparent 1px), linear-gradient(90deg, #4ade80 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                <div className="relative space-y-4">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400/70 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                        <TrendingUp className="w-3.5 h-3.5" /> Despacho 03 · Director de Crecimiento
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">Director de<br />Crecimiento</h1>
                    <p className="text-emerald-200/40 text-xs font-mono">
                        Observaciones registradas · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Registrar observación */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setFormOpen(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Registrar observación</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{formOpen ? '▲' : '▼'}</span>
                </button>
                {formOpen && (
                    <div className="border-t border-border/40 p-5 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tipo</label>
                            <select
                                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                value={form.tipo}
                                onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoRegistroCrecimiento }))}
                            >
                                <option value="diagnostico">Diagnóstico</option>
                                <option value="oportunidad">Oportunidad</option>
                                <option value="riesgo">Riesgo</option>
                                <option value="accion">Próxima acción</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Título</label>
                            <input
                                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                placeholder="Ej: Sin usuarios externos activos"
                                value={form.titulo}
                                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Descripción</label>
                            <textarea
                                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                                rows={4}
                                placeholder="Describe la observación con contexto real..."
                                value={form.descripcion}
                                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                            />
                        </div>

                        {/* Campos condicionales */}
                        {(form.tipo === 'diagnostico' || form.tipo === 'riesgo') && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nivel</label>
                                <select
                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    value={form.nivel}
                                    onChange={e => setForm(f => ({ ...f, nivel: e.target.value as RegistroCrecimiento['nivel'] }))}
                                >
                                    <option value="critico">Crítico</option>
                                    <option value="alto">Alto</option>
                                    <option value="medio">Medio</option>
                                </select>
                            </div>
                        )}
                        {form.tipo === 'oportunidad' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Impacto</label>
                                    <select
                                        className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        value={form.impacto}
                                        onChange={e => setForm(f => ({ ...f, impacto: e.target.value as RegistroCrecimiento['impacto'] }))}
                                    >
                                        <option value="alto">Alto</option>
                                        <option value="medio">Medio</option>
                                        <option value="bajo">Bajo</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Esfuerzo</label>
                                    <select
                                        className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        value={form.esfuerzo}
                                        onChange={e => setForm(f => ({ ...f, esfuerzo: e.target.value as RegistroCrecimiento['esfuerzo'] }))}
                                    >
                                        <option value="bajo">Bajo</option>
                                        <option value="medio">Medio</option>
                                        <option value="alto">Alto</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {err && <p className="text-xs text-red-500">{err}</p>}
                        <div className="flex gap-2">
                            <button onClick={submit} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-colors">
                                Registrar {TIPO_LABELS[form.tipo].toLowerCase()}
                            </button>
                            <button onClick={() => { setFormOpen(false); setErr(''); }} className="p-2.5 rounded-xl bg-muted hover:bg-muted/70 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Empty state global */}
            {crecimiento.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-border/60 p-10 text-center space-y-3">
                    <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                    <p className="font-semibold text-muted-foreground">Sin observaciones registradas</p>
                    <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto leading-relaxed">
                        El Director de Crecimiento solo analiza información registrada. Registra diagnósticos, oportunidades, riesgos y próximas acciones reales.
                    </p>
                </div>
            )}

            {/* Secciones */}
            {crecimiento.length > 0 && (
                <>
                    <Seccion tipo="diagnostico" titulo="Diagnóstico" icono={ShieldAlert} color="from-red-500/10 to-transparent text-red-600 dark:text-red-400" items={crecimiento.filter(r => r.tipo === 'diagnostico')} onDelete={eliminarRegistroCrecimiento} />
                    <Seccion tipo="oportunidad" titulo="Oportunidades" icono={Lightbulb} color="from-emerald-500/10 to-transparent text-emerald-600 dark:text-emerald-400" items={crecimiento.filter(r => r.tipo === 'oportunidad')} onDelete={eliminarRegistroCrecimiento} />
                    <Seccion tipo="riesgo" titulo="Riesgos" icono={ShieldAlert} color="from-rose-500/10 to-transparent text-rose-600 dark:text-rose-400" items={crecimiento.filter(r => r.tipo === 'riesgo')} onDelete={eliminarRegistroCrecimiento} />
                    <Seccion tipo="accion" titulo="Próxima acción" icono={ArrowRight} color="from-indigo-500/10 to-transparent text-indigo-600 dark:text-indigo-400" items={crecimiento.filter(r => r.tipo === 'accion')} onDelete={eliminarRegistroCrecimiento} />
                </>
            )}

            {/* Acciones rápidas */}
            <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Acciones rápidas</p>
                <div className="grid grid-cols-2 gap-3">
                    <Link href="/apps/oficina/director" className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20 hover:scale-[1.02] hover:shadow-xl transition-all">
                        <Crown className="w-6 h-6 opacity-90" />
                        <div><p className="font-bold text-sm">Director General</p><p className="text-xs opacity-70 mt-0.5 leading-snug">Informes estratégicos</p></div>
                    </Link>
                    {[
                        { label: 'Métricas de activación', sub: 'Funnel y conversión', icono: BarChart3 },
                        { label: 'Experimentos', sub: 'Hipótesis y resultados', icono: FlaskConical },
                        { label: 'Mapa de canales', sub: 'Dónde están los usuarios', icono: Map },
                        { label: 'Validación ICP', sub: 'Perfil de usuario ideal', icono: UserCheck },
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
