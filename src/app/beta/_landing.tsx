'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
    Loader2, Check, Trophy, Users, Star, Zap, ArrowRight,
    LogIn, Target, ChevronRight, Lock, Eye, EyeOff, Mail,
} from 'lucide-react';
import { BETA_AVATARS, getBetaAvatar } from '@/lib/beta/avatars';
import { STATUS_LABELS, STATUS_COLORS, type BetaStatus } from '@/lib/beta/constants';
import {
    TikTokIcon, InstagramIcon, YouTubeIcon,
    TikTokBadge, InstagramBadge, YouTubeBadge,
} from '@/lib/beta/social-icons';
import { supabase } from '@/lib/supabase';

interface RankRow { rank: number; nickname: string; avatar_id: string; points: number; status: string; }
interface BetaLight {
    nickname: string; avatar_id: string; points: number; status: string;
    access_token: string;
}
interface LightResponse {
    user: BetaLight; rank: number; unreadCount: number; totalParticipants: number;
}

// ── Tarjeta resumen para beta testers que regresan a /beta ───────────────────
function BetaReturningCard({ user, rank, unreadCount, totalParticipants }: {
    user: BetaLight; rank: number; unreadCount: number; totalParticipants: number;
}) {
    const av = getBetaAvatar(user.avatar_id);
    const status = user.status as BetaStatus;
    return (
        <div className="w-full lg:w-[42%]">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-6 text-white text-center">
                    <div className="text-5xl mb-2">{av.emoji}</div>
                    <h2 className="font-black text-xl">{user.nickname}</h2>
                    <span className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full bg-white/20">
                        {STATUS_LABELS[status]}
                    </span>
                </div>

                <div className="p-5 space-y-4">
                    {/* Notificaciones pendientes */}
                    {unreadCount > 0 && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-sm font-bold text-emerald-700">
                            <span>🔔</span>
                            {unreadCount} notificación{unreadCount > 1 ? 'es' : ''} nueva{unreadCount > 1 ? 's' : ''}
                        </div>
                    )}

                    {/* Stats: puntos, posición, participantes */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-2.5 text-center">
                            <div className="text-xl font-black text-emerald-600">{user.points}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">puntos</div>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-2.5 text-center">
                            <div className="text-xl font-black text-amber-600">#{rank}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">posición</div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-2.5 text-center">
                            <div className="text-xl font-black text-blue-600">{totalParticipants}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">participantes</div>
                        </div>
                    </div>

                    <Link
                        href={`/beta/dashboard?t=${user.access_token}`}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all text-base shadow-md shadow-emerald-200 dark:shadow-none"
                    >
                        <Zap className="w-5 h-5" /> Ir a mi panel
                    </Link>

                    <p className="text-xs text-center text-slate-400">
                        ¿No eres tú?{' '}
                        <a href="/api/beta/logout" className="text-red-500 hover:underline font-semibold">
                            Cerrar esta sesión
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Componente principal ──────────────────────────────────────────────────────
function BetaLanding() {
    const router = useRouter();
    const params = useSearchParams();
    const [ref, setRef] = useState('');
    const [loading, setLoading] = useState(false);

    const [betaCheck, setBetaCheck] = useState<'checking' | 'found' | 'none'>('checking');
    const [betaUser, setBetaUser] = useState<BetaLight | null>(null);
    const [betaRank, setBetaRank] = useState(0);
    const [betaUnread, setBetaUnread] = useState(0);
    const [betaTotal, setBetaTotal] = useState(0);

    const [top3, setTop3] = useState<RankRow[]>([]);
    const [totalParticipants, setTotalParticipants] = useState<number | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({
        email: '', password: '', nickname: '', avatarId: 'fox',
        tiktok: '', instagram: '', youtube: '', followsSocials: false,
    });

    // Comprueba si existe sesión beta (el servidor lee la cookie httpOnly)
    useEffect(() => {
        fetch('/api/beta/me?light=1')
            .then(r => r.ok ? r.json() : null)
            .then((d: LightResponse | null) => {
                if (d?.user) {
                    setBetaUser(d.user);
                    setBetaRank(d.rank ?? 0);
                    setBetaUnread(d.unreadCount ?? 0);
                    setBetaTotal(d.totalParticipants ?? 0);
                    setBetaCheck('found');
                } else {
                    setBetaCheck('none');
                }
            })
            .catch(() => setBetaCheck('none'));
    }, []);

    useEffect(() => {
        const r = params?.get('ref');
        if (r) setRef(r.toUpperCase());
    }, [params]);

    useEffect(() => {
        if (betaCheck !== 'none') return; // solo cargar ranking si mostramos el form
        fetch('/api/beta/ranking?page=1')
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (!d) return;
                setTop3((d.rows ?? []).slice(0, 3));
                if (typeof d.total === 'number') setTotalParticipants(d.total);
            })
            .catch(() => {});
    }, [betaCheck]);

    const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Crear cuenta Supabase Auth (envía email de confirmación automáticamente)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
                options: { emailRedirectTo: `${window.location.origin}/login` },
            });
            if (authError) throw new Error(authError.message);

            // 2. Registrar perfil beta (nickname, avatar, puntos, etc.)
            const res = await fetch('/api/beta/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, ref, authUserId: authData.user?.id }),
            });
            const data = await res.json();
            // 409 = email/nickname ya existe, no es error fatal si el auth fue bien
            if (!res.ok && res.status !== 409) throw new Error(data.error || 'Error al registrarse');

            setConfirmed(true);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Error al registrarse');
        } finally {
            setLoading(false);
        }
    };

    const leaderPts = top3.length > 0 ? top3[0].points : null;

    // Mientras comprueba la sesión — spinner mínimo
    if (betaCheck === 'checking') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950">
            {/* Barra superior */}
            <div className="bg-emerald-600 text-white text-center text-xs font-bold py-2 tracking-wide">
                ✨ BETA PRIVADA · PLAZAS LIMITADAS · ACCESO POR SELECCIÓN MANUAL
            </div>

            <div className="max-w-[1100px] mx-auto px-4 py-8 lg:py-10">
                {/* Headline mobile */}
                <div className="text-center mb-6 lg:hidden">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                        {betaCheck === 'found'
                            ? <>👋 ¡Hola de nuevo, <span className="text-emerald-600">{betaUser?.nickname}</span>!</>
                            : <>🚀 Consigue acceso anticipado a <span className="text-emerald-600">Quioba</span></>
                        }
                    </h1>
                    {betaCheck === 'none' && (
                        <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                            Completa misiones, invita amigos, encuentra códigos secretos y escala en el ranking.
                        </p>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">

                    {/* ── Columna izquierda: form O tarjeta resumen ── */}
                    {betaCheck === 'found' && betaUser ? (
                        <BetaReturningCard user={betaUser} rank={betaRank} unreadCount={betaUnread} totalParticipants={betaTotal} />
                    ) : (
                        <div className="w-full lg:w-[42%] lg:sticky lg:top-4">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
                                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-white">
                                    <p className="font-black text-lg">Únete al programa Beta</p>
                                    <p className="text-emerald-100 text-xs mt-0.5">Crea tu perfil y empieza a ganar puntos</p>
                                </div>

                                <form onSubmit={submit} className="px-5 py-4 space-y-3.5">
                                    {confirmed ? (
                                        <div className="py-6 text-center space-y-3">
                                            <div className="text-5xl">✉️</div>
                                            <h3 className="font-black text-slate-800 dark:text-white text-lg">Revisa tu email</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                Hemos enviado un enlace de confirmación a <b className="text-slate-700 dark:text-slate-200">{form.email}</b>. Haz clic en el enlace para activar tu cuenta.
                                            </p>
                                            <Link href="/login" className="inline-block mt-2 text-sm font-bold text-emerald-600 hover:underline">
                                                Ir al login →
                                            </Link>
                                        </div>
                                    ) : (<>
                                    {ref && (
                                        <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-center">
                                            👋 Te invitó un amigo · código <b>{ref}</b>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Email</label>
                                        <input type="email" required value={form.email}
                                            onChange={e => set('email', e.target.value)}
                                            placeholder="tu@email.com"
                                            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Contraseña</label>
                                        <div className="relative mt-1">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                minLength={8}
                                                value={form.password}
                                                onChange={e => set('password', e.target.value)}
                                                placeholder="Mínimo 8 caracteres"
                                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                            />
                                            <button type="button" onClick={() => setShowPassword(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Nickname único</label>
                                        <input type="text" required value={form.nickname}
                                            onChange={e => set('nickname', e.target.value)}
                                            placeholder="tu_alias" minLength={3} maxLength={20}
                                            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide block mb-1.5">Elige tu avatar</label>
                                        <div className="grid grid-cols-8 gap-1 max-h-[88px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1.5">
                                            {BETA_AVATARS.map(a => (
                                                <button type="button" key={a.id}
                                                    onClick={() => set('avatarId', a.id)} title={a.label}
                                                    className={`aspect-square rounded-lg text-lg flex items-center justify-center transition-all ${
                                                        form.avatarId === a.id
                                                            ? 'bg-emerald-100 dark:bg-emerald-900 ring-2 ring-emerald-500 scale-110'
                                                            : 'hover:bg-white dark:hover:bg-slate-700'
                                                    }`}>
                                                    {a.emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <TikTokBadge size="sm" />
                                            <input value={form.tiktok} onChange={e => set('tiktok', e.target.value)}
                                                placeholder="@TikTok (opcional) · +5 pts"
                                                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <InstagramBadge size="sm" />
                                            <input value={form.instagram} onChange={e => set('instagram', e.target.value)}
                                                placeholder="@Instagram (opcional) · +5 pts"
                                                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <YouTubeBadge size="sm" />
                                            <input value={form.youtube} onChange={e => set('youtube', e.target.value)}
                                                placeholder="@YouTube (opcional) · +5 pts"
                                                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                        </div>
                                    </div>

                                    <label className="flex items-start gap-2.5 cursor-pointer">
                                        <span
                                            className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                                                form.followsSocials ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 bg-white dark:bg-slate-800'
                                            }`}
                                            onClick={() => set('followsSocials', !form.followsSocials)}
                                        >
                                            {form.followsSocials && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                        </span>
                                        <input type="checkbox" className="sr-only" checked={form.followsSocials}
                                            onChange={e => set('followsSocials', e.target.checked)} />
                                        <span className="text-sm text-slate-600 dark:text-slate-300 leading-snug">
                                            Sigo las redes oficiales de Quioba{' '}
                                            <span className="text-emerald-600 font-bold">+puntos</span>
                                            <span className="block text-xs text-slate-400 mt-0.5">Necesario para completar misiones de redes sociales</span>
                                        </span>
                                    </label>

                                    <button type="submit" disabled={loading}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-200 dark:shadow-none disabled:opacity-60 text-base">
                                        {loading
                                            ? <Loader2 className="w-5 h-5 animate-spin" />
                                            : <><Zap className="w-5 h-5" /> Unirme a la Beta</>
                                        }
                                    </button>

                                    <div className="flex flex-col items-center gap-1 pt-1">
                                        <span className="text-xs text-slate-400">¿Ya tienes cuenta?</span>
                                        <Link href="/login"
                                            className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
                                            <LogIn className="w-3 h-3" /> Iniciar sesión
                                        </Link>
                                    </div>
                                    </>)}
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ── Columna derecha: social proof (siempre visible) ── */}
                    <div className="w-full lg:w-[58%] space-y-4">

                        {/* Headline desktop */}
                        <div className="hidden lg:block">
                            {betaCheck === 'found' && betaUser ? (
                                <>
                                    <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                                        👋 ¡Hola de nuevo,{' '}
                                        <span className="text-emerald-600">{betaUser.nickname}</span>!
                                    </h1>
                                    <p className="mt-3 text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Continúa completando misiones y escala en el ranking para aumentar tus posibilidades de ser seleccionado.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                                        🚀 Consigue acceso<br />anticipado a{' '}
                                        <span className="text-emerald-600">Quioba</span>
                                    </h1>
                                    <p className="mt-3 text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Completa misiones, invita amigos, encuentra códigos secretos y escala en el ranking para convertirte en uno de nuestros primeros beta testers.
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Contadores */}
                        <div className="grid grid-cols-3 gap-3">
                            <StatCard icon={<Users className="w-5 h-5 text-blue-500" />}
                                value={totalParticipants !== null ? totalParticipants.toLocaleString('es') : '—'}
                                label="Participantes" bg="bg-blue-50 dark:bg-blue-950/30" />
                            <StatCard icon={<Trophy className="w-5 h-5 text-amber-500" />}
                                value="50" label="Plazas beta" bg="bg-amber-50 dark:bg-amber-950/30" />
                            <StatCard icon={<Star className="w-5 h-5 text-purple-500" />}
                                value={leaderPts !== null ? `${leaderPts.toLocaleString('es')} pts` : '—'}
                                label="Pts del líder" bg="bg-purple-50 dark:bg-purple-950/30" />
                        </div>

                        {/* Cómo funciona */}
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                            <h2 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wide mb-2">¿Cómo funciona?</h2>
                            <p className="text-xs text-slate-500 mb-3">
                                Gana puntos completando misiones y sube en el ranking para destacar frente al equipo de selección.
                            </p>
                            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                                <MissionRow icon={<Zap className="w-3.5 h-3.5 text-emerald-500" />} label="Regístrate" points={10} />
                                <MissionRow icon={<TikTokIcon className="w-3.5 h-3.5 text-black dark:text-white" />} label="Síguenos en TikTok" points={5} />
                                <MissionRow icon={<InstagramIcon className="w-3.5 h-3.5 text-pink-600" />} label="Síguenos en Instagram" points={5} />
                                <MissionRow icon={<YouTubeIcon className="w-3.5 h-3.5 text-red-600" />} label="Suscríbete en YouTube" points={5} />
                                <MissionRow icon={<Users className="w-3.5 h-3.5 text-blue-500" />} label="Invita amigos" points={10} />
                                <MissionRow icon={<Target className="w-3.5 h-3.5 text-purple-500" />} label="Código secreto" points={10} />
                                <MissionRow icon={<span className="text-sm">🐛</span>} label="Reporta errores" points={20} />
                                <MissionRow icon={<span className="text-sm">💡</span>} label="Sugerencia implementada" points={50} />
                            </div>
                            <Link href="/beta/ranking" className="mt-3 flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline">
                                Ver todas las misiones <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {/* Top 3 */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-black text-slate-800 dark:text-white text-sm flex items-center gap-1.5">
                                    <Trophy className="w-4 h-4 text-amber-500" /> Top 3 del ranking
                                </h2>
                                <Link href="/beta/ranking" className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-0.5">
                                    Ver completo <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                            {top3.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4">El ranking aún está vacío.</p>
                            ) : (
                                <div className="space-y-2">
                                    {top3.map((r, i) => {
                                        const av = getBetaAvatar(r.avatar_id);
                                        return (
                                            <div key={r.rank} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${i === 0 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                                                <span className="text-base w-6 text-center">{['🥇','🥈','🥉'][i]}</span>
                                                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-xl shadow-sm">{av.emoji}</div>
                                                <span className="flex-1 font-bold text-sm text-slate-700 dark:text-slate-200 truncate">@{r.nickname}</span>
                                                <span className="font-black text-emerald-600 text-sm">{r.points.toLocaleString('es')} <span className="text-[10px] font-medium text-slate-400">pts</span></span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Beneficios */}
                        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-2xl p-4">
                            <h2 className="font-black flex items-center gap-2 mb-3">🚀 Beneficios de ser Beta Tester</h2>
                            <ul className="space-y-1.5 text-sm">
                                {[
                                    '✅ Acceso anticipado a Quioba antes del lanzamiento',
                                    '✅ Influir directamente en nuevas funcionalidades',
                                    '✅ Insignia exclusiva de Fundador en tu perfil',
                                    '✅ Reconocimiento permanente en la comunidad',
                                    '✅ Acceso prioritario a todas las novedades futuras',
                                ].map((b, i) => <li key={i} className="text-emerald-50">{b}</li>)}
                            </ul>
                        </div>

                        {/* Cómo conseguir acceso */}
                        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                                <h3 className="font-black text-slate-800 dark:text-white text-sm">Cómo conseguir acceso a la Beta</h3>
                            </div>
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl px-3 py-2 leading-snug">
                                Cuantos más puntos consigas, más posibilidades tendrás de ser seleccionado para acceder a Quioba.
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Completa misiones, invita amigos, encuentra códigos secretos y participa activamente para subir posiciones en el ranking.{' '}
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Los usuarios mejor clasificados tendrán prioridad durante el proceso de selección.</span>
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-2">
                                La aprobación final será revisada manualmente por el equipo de Quioba para garantizar una comunidad activa, comprometida y libre de fraude.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, bg }: { icon: React.ReactNode; value: string; label: string; bg: string }) {
    return (
        <div className={`${bg} rounded-2xl p-3 text-center`}>
            <div className="flex justify-center mb-1">{icon}</div>
            <div className="font-black text-slate-800 dark:text-white text-lg leading-tight">{value}</div>
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
        </div>
    );
}

function MissionRow({ icon, label, points }: { icon: React.ReactNode; label: string; points: number }) {
    return (
        <div className="flex items-center gap-2">
            <span className="shrink-0 w-4 flex items-center justify-center">{icon}</span>
            <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate">{label}</span>
            <span className="text-xs font-black text-emerald-600 shrink-0">+{points}</span>
        </div>
    );
}

// ── Export con Suspense (requerido por useSearchParams) ───────────────────────
export default function BetaLandingSuspense() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
        }>
            <BetaLanding />
        </Suspense>
    );
}
