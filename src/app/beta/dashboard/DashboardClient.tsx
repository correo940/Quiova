'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
    Copy, Trophy, Users, Check, Loader2, ExternalLink, KeyRound,
    ChevronDown, ChevronUp, Target, ArrowRight, Star,
    TrendingUp, AlertTriangle, Megaphone, Shield, Timer,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getBetaAvatar } from '@/lib/beta/avatars';
import {
    STATUS_LABELS, STATUS_COLORS,
    type BetaStatus,
} from '@/lib/beta/constants';
import { TikTokBadge, InstagramBadge, YouTubeBadge } from '@/lib/beta/social-icons';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Mission {
    key: string; title: string; description: string; points: number;
    type: string; target_url: string | null; completed: boolean;
}
interface Achievement { key: string; title: string; description: string; icon: string; unlocked: boolean; }
interface HistoryItem { delta: number; reason: string; created_at: string; }
interface Notification { id: string; type: string; title: string; message: string; is_read: boolean; created_at: string; }
interface Novedad { id: string; title: string; description?: string; type: string; created_at: string; }

interface Props {
    data: {
        user: { nickname: string; avatar_id: string; points: number; status: string; referral_code: string; access_token: string };
        missions: Mission[];
        achievements: Achievement[];
        referralsCount: number;
        codesCompleted: number;
        history: HistoryItem[];
        notifications: Notification[];
        unreadCount: number;
        hasActiveCodes: boolean;
        novedades?: Novedad[];
    };
    rank: number;
    totalParticipants: number;
    leaderPoints: number;
    inTop10: boolean;
    inTop50: boolean;
    pointsToTop10: number;
    pointsToTop50: number;
    refLink: string;
    unreadCount: number;
    referralRank: number;
    emailVerified: boolean;
    email: string;
    selectionEndDate?: string;
}

const SELF_DECLARABLE = new Set(['follow_tiktok', 'follow_instagram', 'follow_youtube', 'share_content', 'report_bug']);

// ── Helpers ────────────────────────────────────────────────────────────────────
function getSmartMission(missions: Mission[], referralsCount: number, hasActiveCodes: boolean): Mission | null {
    const pending = missions.filter(m => !m.completed);
    if (pending.length === 0) return null;
    if (referralsCount === 0) {
        const m = pending.find(m => m.key === 'invite_friend');
        if (m) return m;
    }
    if (hasActiveCodes) {
        const m = pending.find(m => m.key === 'secret_code');
        if (m) return m;
    }
    for (const k of ['follow_tiktok', 'follow_instagram', 'follow_youtube']) {
        const m = pending.find(m => m.key === k);
        if (m) return m;
    }
    const order = ['invite_friend', 'secret_code', 'report_bug', 'share_content'];
    for (const k of order) {
        const m = pending.find(m => m.key === k);
        if (m) return m;
    }
    return pending[0];
}

function getMissionIcon(key: string): React.ReactNode {
    if (key === 'follow_tiktok') return <TikTokBadge size="sm" />;
    if (key === 'follow_instagram') return <InstagramBadge size="sm" />;
    if (key === 'follow_youtube') return <YouTubeBadge size="sm" />;
    return null;
}

function novedadIcon(type: string): string {
    const map: Record<string, string> = {
        mission: '🎉', code: '🔑', info: 'ℹ️', rank: '🏆',
        approved: '🚀', announcement: '📢', warning: '🔥',
    };
    return map[type] ?? '📢';
}

function timeAgo(iso: string): string {
    const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (secs < 3600) return `Hace ${Math.max(1, Math.floor(secs / 60))}m`;
    if (secs < 86400) return `Hace ${Math.floor(secs / 3600)}h`;
    if (secs < 172800) return 'Ayer';
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

// ── Countdown ──────────────────────────────────────────────────────────────────
function CountdownTimer({ endDate }: { endDate: string }) {
    const [t, setT] = useState({ days: 0, hours: 0, minutes: 0 });
    useEffect(() => {
        const calc = () => {
            const diff = Math.max(0, new Date(endDate).getTime() - Date.now());
            setT({
                days: Math.floor(diff / 86400000),
                hours: Math.floor((diff % 86400000) / 3600000),
                minutes: Math.floor((diff % 3600000) / 60000),
            });
        };
        calc();
        const id = setInterval(calc, 60000);
        return () => clearInterval(id);
    }, [endDate]);

    return (
        <div>
            <p className="text-xs font-semibold text-white/70 mb-2 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" /> La selección termina en
            </p>
            <div className="flex items-end gap-4">
                {[{ v: t.days, l: 'días' }, { v: t.hours, l: 'horas' }, { v: t.minutes, l: 'minutos' }].map(({ v, l }) => (
                    <div key={l} className="text-center">
                        <div className="text-3xl font-black text-white leading-none">{v}</div>
                        <div className="text-[10px] text-white/60 mt-0.5">{l}</div>
                    </div>
                ))}
            </div>
            <p className="text-[10px] text-white/50 mt-2">
                Fecha límite: {new Date(endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
        </div>
    );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function DashboardClient({
    data, rank, totalParticipants, leaderPoints,
    inTop10, inTop50,
    refLink, referralRank, emailVerified, email,
    selectionEndDate = '2026-07-20T23:59:59Z',
}: Props) {
    const router = useRouter();
    const { user } = data;
    const avatar = getBetaAvatar(user.avatar_id);
    const status = user.status as BetaStatus;

    const [code, setCode] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSent, setResendSent] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);

    const refresh = () => router.refresh();

    const handleResendVerification = async () => {
        setResendLoading(true);
        try {
            const { error } = await supabase.auth.resend({ type: 'signup', email });
            if (error) throw error;
            setResendSent(true);
            toast.success('Email de verificación reenviado');
        } catch {
            toast.error('No se pudo reenviar el email');
        } finally {
            setResendLoading(false);
        }
    };

    const copyLink = async () => {
        try { await navigator.clipboard.writeText(refLink); toast.success('Enlace copiado'); }
        catch { toast.error('No se pudo copiar'); }
    };

    const claimMission = async (key: string) => {
        setBusy(key);
        try {
            const res = await fetch('/api/beta/mission', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, token: user.access_token }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            if (d.awarded) toast.success(`+${d.points} puntos conseguidos`);
            else toast.info('Misión ya completada');
            refresh();
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
        finally { setBusy(null); }
    };

    const redeemCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;
        setBusy('code');
        try {
            const res = await fetch('/api/beta/code', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, token: user.access_token }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            toast.success(`¡Código válido! +${d.points} puntos`);
            setCode('');
            refresh();
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Código inválido'); }
        finally { setBusy(null); }
    };

    const pending = data.missions.filter(m => !m.completed);
    const completed = data.missions.filter(m => m.completed);
    const recommended = getSmartMission(data.missions, data.referralsCount, data.hasActiveCodes);
    const novedades: Novedad[] = data.novedades ?? [];
    const progressPct = leaderPoints > 0 ? Math.min(100, Math.round((user.points / leaderPoints) * 100)) : (user.points > 0 ? 50 : 5);

    // Status badge
    const statusBadge = !inTop50
        ? { text: 'Necesitas más participación', cls: 'bg-red-600' }
        : !inTop10
            ? { text: 'Puedes mejorar tu posición', cls: 'bg-[#b87514]' }
            : { text: '¡Vas por muy buen camino! 🚀', cls: 'bg-[#1e7a3a]' };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">

                {/* Email verification banner */}
                {!emailVerified && (
                    <div className="bg-[#b87514]/10 border border-[#b87514]/30 rounded-2xl px-4 py-3 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-[#96610f] shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-[#96610f]">⚠️ Email pendiente de verificar</p>
                            <p className="text-xs text-[#b87514] mt-0.5">Verifica tu email para ganar puntos y aparecer en el ranking.</p>
                        </div>
                        <button
                            onClick={handleResendVerification}
                            disabled={resendLoading || resendSent}
                            className="shrink-0 text-xs font-bold bg-[#b87514] hover:bg-[#96610f] text-white px-3 py-1.5 rounded-lg disabled:opacity-60 flex items-center gap-1.5"
                        >
                            {resendLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : resendSent ? '✓ Enviado' : 'Reenviar'}
                        </button>
                    </div>
                )}

                {/* ── BANNER COMPETICIÓN ───────────────────────── */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #133f21 0%, #1a5c2e 60%, #1e7a3a 100%)' }}>
                    <div className="px-5 py-6 md:px-8 md:py-7 flex flex-col md:flex-row md:items-center gap-5">

                        {/* Left: trophy + text */}
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div className="w-16 h-16 rounded-2xl bg-[#b87514]/20 flex items-center justify-center shrink-0">
                                <Trophy className="w-9 h-9 text-[#b87514]" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-1">Estado de tu solicitud</p>
                                <h1 className="text-xl md:text-2xl font-black text-white leading-tight">
                                    {inTop50
                                        ? <>Estás dentro del <span className="text-[#b87514]">Top {rank}</span> provisional</>
                                        : <>Actualmente estás fuera del <span className="text-[#b87514]">Top 50</span></>
                                    }
                                </h1>
                                <p className="text-sm text-white/70 mt-1.5 leading-snug">
                                    {inTop50
                                        ? 'Si la selección terminara hoy, tendrías acceso a QUIOBA.'
                                        : 'Completa misiones para mejorar tu posición.'}
                                </p>
                                <span className={`inline-block mt-2.5 text-xs font-bold text-white px-3 py-1 rounded-full ${statusBadge.cls}`}>
                                    {statusBadge.text}
                                </span>
                            </div>
                        </div>

                        {/* Right: countdown */}
                        <div className="border border-white/20 rounded-2xl px-5 py-4 bg-black/20 shrink-0 self-start md:self-auto">
                            <CountdownTimer endDate={selectionEndDate} />
                        </div>
                    </div>
                </div>

                {/* ── 3 STAT CARDS ────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Tu posición actual */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-[#1a5c2e]" />
                            <h2 className="text-sm font-bold text-slate-600 dark:text-slate-400">Tu posición actual</h2>
                        </div>
                        <div className="text-5xl font-black text-[#1a5c2e] leading-none">#{rank}</div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">de {totalParticipants} participantes</p>
                        {referralRank > 0 && (
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                <Users className="w-3 h-3" /> Ranking referidos: #{referralRank}
                            </p>
                        )}
                    </div>

                    {/* Tu progreso */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Star className="w-4 h-4 text-[#1a5c2e]" />
                            <h2 className="text-sm font-bold text-slate-600 dark:text-slate-400">Tu progreso</h2>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 mb-3">
                            <div
                                className="h-2.5 rounded-full transition-all duration-700"
                                style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #1a5c2e, #1e7a3a)' }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-snug">
                            Sigue sumando puntos para mantener o mejorar tu posición.
                        </p>
                        <div className="text-3xl font-black text-[#1a5c2e]">{user.points}</div>
                        <p className="text-xs text-slate-400">puntos totales</p>
                    </div>

                    {/* ¿Cómo se consigue el acceso? */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-4 h-4 text-[#1a5c2e]" />
                            <h2 className="text-sm font-bold text-slate-600 dark:text-slate-400">¿Cómo se consigue el acceso?</h2>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">Seleccionaremos a los mejores beta testers evaluando:</p>
                        <ul className="space-y-1.5 mb-3">
                            {['Puntos acumulados', 'Calidad de las misiones completadas', 'Actividad y participación', 'Ayuda a la comunidad'].map(item => (
                                <li key={item} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                                    <Check className="w-3.5 h-3.5 text-[#1a5c2e] shrink-0 mt-0.5" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <div className="bg-[#edf7f1] dark:bg-[#1a5c2e]/10 rounded-xl px-3 py-2.5">
                            <p className="text-xs font-semibold text-[#133f21] dark:text-[#86efac] leading-snug">
                                No hay un número fijo de puntos.<br />
                                Lo importante es tu posición en el ranking.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── ACCESOS RÁPIDOS ─────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { href: '/beta/ranking', icon: '🏆', label: 'Ranking', sub: 'Ver posiciones' },
                        { href: '/beta/referrals', icon: '👥', label: 'Referidos', sub: 'Amigos invitados' },
                        { href: '#codigos', icon: '🎁', label: 'Códigos secretos', sub: 'Nuevos códigos' },
                        { href: '/beta/hall-of-fame', icon: '⭐', label: 'Hall of Fame', sub: 'Mejores beta testers' },
                    ].map(q => (
                        <Link key={q.label} href={q.href}
                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 hover:border-[#1a5c2e]/40 hover:shadow-sm transition-all group">
                            <span className="text-2xl">{q.icon}</span>
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-2 leading-tight">{q.label}</p>
                            <p className="text-[11px] text-[#1a5c2e] mt-0.5 flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                                {q.sub} <ArrowRight className="w-3 h-3" />
                            </p>
                        </Link>
                    ))}
                </div>

                {/* ── MAIN + SIDEBAR ───────────────────────────── */}
                <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6 lg:items-start space-y-4 lg:space-y-0">

                    {/* ── COLUMNA PRINCIPAL ──────────────────────── */}
                    <div className="space-y-4">

                        {/* Novedades */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Megaphone className="w-5 h-5 text-[#1a5c2e]" />
                                <h2 className="font-black text-slate-800 dark:text-white">Novedades</h2>
                            </div>
                            {novedades.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-3">No hay novedades por el momento.</p>
                            ) : (
                                <div className="space-y-3">
                                    {novedades.slice(0, 3).map(n => (
                                        <div key={n.id} className="flex items-start gap-3">
                                            <span className="text-xl shrink-0 mt-0.5">{novedadIcon(n.type)}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{n.title}</p>
                                                {n.description && <p className="text-xs text-slate-400 mt-0.5">{n.description}</p>}
                                            </div>
                                            <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{timeAgo(n.created_at)}</span>
                                        </div>
                                    ))}
                                    {novedades.length > 3 && (
                                        <Link href="/beta/novedades" className="text-xs font-bold text-[#1a5c2e] hover:underline flex items-center gap-1 mt-1">
                                            Ver todas las novedades <ArrowRight className="w-3 h-3" />
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Misiones */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                            <h2 className="font-black text-slate-800 dark:text-white mb-4">Misiones recomendadas</h2>

                            {pending.length === 0 ? (
                                <div className="text-center py-4">
                                    <span className="text-3xl">🎉</span>
                                    <p className="font-bold text-slate-800 dark:text-white mt-2 text-sm">¡Todas las misiones completadas!</p>
                                    <p className="text-xs text-slate-400 mt-1">Vuelve pronto, publicaremos nuevas misiones.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {pending.map(m => <MissionRow key={m.key} m={m} busy={busy} onClaim={claimMission} showAction />)}
                                </div>
                            )}

                            {completed.length > 0 && (
                                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                                    <button
                                        onClick={() => setShowCompleted(v => !v)}
                                        className="w-full flex items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-1 transition-colors"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <Check className="w-3.5 h-3.5 text-[#1a5c2e]" />
                                            Misiones completadas ({completed.length})
                                        </span>
                                        {showCompleted ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                    {showCompleted && (
                                        <div className="space-y-2 mt-2">
                                            {completed.map(m => <MissionRow key={m.key} m={m} busy={busy} onClaim={claimMission} showAction={false} />)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {completed.length > 0 && !showCompleted && (
                                <Link href="/beta/ranking" className="block mt-3 text-xs font-bold text-[#1a5c2e] hover:underline flex items-center gap-1">
                                    Ver todas las misiones <ArrowRight className="w-3 h-3" />
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* ── SIDEBAR ────────────────────────────────── */}
                    <div className="space-y-4">

                        {/* Tu siguiente misión */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Target className="w-4 h-4 text-[#1a5c2e]" />
                                <h2 className="font-black text-slate-800 dark:text-white text-sm">Tu siguiente misión</h2>
                            </div>

                            {!recommended ? (
                                <div className="text-center py-4">
                                    <span className="text-3xl">🎉</span>
                                    <p className="font-bold text-slate-700 dark:text-slate-200 mt-2 text-sm">¡Todas completadas!</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col items-center text-center mb-5">
                                        <div className="w-16 h-16 rounded-2xl bg-[#edf7f1] dark:bg-[#1a5c2e]/20 flex items-center justify-center mb-3">
                                            {getMissionIcon(recommended.key) ?? <Star className="w-7 h-7 text-[#1a5c2e]" />}
                                        </div>
                                        <h3 className="font-black text-slate-800 dark:text-white text-base">{recommended.title}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">{recommended.description}</p>
                                        <span className="inline-block mt-2.5 text-xs font-bold bg-[#b87514]/10 text-[#96610f] px-3 py-1 rounded-full">
                                            +{recommended.points} puntos
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {(recommended.target_url || SELF_DECLARABLE.has(recommended.key)) ? (
                                            <>
                                                {recommended.target_url && (
                                                    <a href={recommended.target_url} target="_blank" rel="noopener noreferrer"
                                                        className="w-full flex items-center justify-center gap-2 bg-[#1a5c2e] hover:bg-[#133f21] text-white font-bold rounded-xl py-3 text-sm transition-colors">
                                                        Completar misión <ArrowRight className="w-4 h-4" />
                                                    </a>
                                                )}
                                                {SELF_DECLARABLE.has(recommended.key) && (
                                                    <button onClick={() => claimMission(recommended.key)} disabled={busy === recommended.key}
                                                        className="w-full flex items-center justify-center gap-2 bg-[#1a5c2e] hover:bg-[#133f21] text-white font-bold rounded-xl py-3 text-sm transition-colors disabled:opacity-60">
                                                        {busy === recommended.key
                                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                                            : <>Completar misión <ArrowRight className="w-4 h-4" /></>
                                                        }
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-center text-xs text-slate-400 italic py-2">Se registra automáticamente</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setShowCompleted(v => !v)}
                                        className="block w-full text-center text-xs font-bold text-[#1a5c2e] hover:underline mt-3"
                                    >
                                        Ver todas las misiones →
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Tu enlace de referido */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                            <div className="flex items-center gap-2 mb-1">
                                <Users className="w-4 h-4 text-[#1a5c2e]" />
                                <h2 className="font-black text-slate-800 dark:text-white text-sm">Tu enlace de referido</h2>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                Invita a tus amigos y gana <span className="font-bold text-[#1a5c2e]">+10 puntos</span> por cada registro.
                            </p>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 mb-3 border border-slate-100 dark:border-slate-700">
                                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">{refLink}</p>
                            </div>
                            <button onClick={copyLink}
                                className="w-full flex items-center justify-center gap-2 bg-[#1a5c2e] hover:bg-[#133f21] text-white font-bold rounded-xl py-3 text-sm transition-colors">
                                <Copy className="w-4 h-4" /> Copiar enlace
                            </button>
                            {data.referralsCount > 0 && (
                                <p className="text-center text-xs text-[#1a5c2e] font-semibold mt-2.5">
                                    {data.referralsCount} amigo{data.referralsCount !== 1 ? 's' : ''} registrado{data.referralsCount !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>

                        {/* Código secreto */}
                        <div id="codigos" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                            <div className="flex items-center gap-2 mb-1">
                                <KeyRound className="w-4 h-4 text-[#1a5c2e]" />
                                <h2 className="font-black text-slate-800 dark:text-white text-sm">Código secreto actual</h2>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                Encuentra códigos ocultos en TikTok, Instagram o YouTube.
                            </p>
                            <form onSubmit={redeemCode} className="flex gap-2">
                                <input
                                    value={code}
                                    onChange={e => setCode(e.target.value.toUpperCase())}
                                    placeholder="EJ: QB081"
                                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1a5c2e] uppercase"
                                />
                                <button type="submit" disabled={busy === 'code'}
                                    className="px-4 rounded-xl bg-[#1a5c2e] hover:bg-[#133f21] text-white text-sm font-bold disabled:opacity-60 flex items-center gap-1.5 transition-colors">
                                    {busy === 'code' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Comprobar'}
                                </button>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-col items-center gap-2 pb-2">
                            <Link href="/beta/ranking" className="text-sm font-bold text-[#1a5c2e] hover:underline flex items-center gap-1">
                                Ver ranking completo <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link href="/beta/recuperar" className="text-xs text-slate-400 hover:text-slate-600">
                                Acceder desde otro dispositivo
                            </Link>
                            <a href="/api/beta/logout" className="text-xs text-red-400 hover:text-red-600 hover:underline">
                                Cerrar sesión Beta
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── MissionRow ─────────────────────────────────────────────────────────────────
function MissionRow({ m, busy, onClaim, showAction }: {
    m: Mission; busy: string | null;
    onClaim: (key: string) => void; showAction: boolean;
}) {
    const icon = getMissionIcon(m.key);
    return (
        <div className={`flex items-center gap-3 rounded-xl p-3 border ${
            m.completed
                ? 'bg-[#edf7f1] dark:bg-[#1a5c2e]/10 border-[#1a5c2e]/20 dark:border-[#1a5c2e]/30'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
        }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                m.completed ? 'bg-[#1a5c2e] text-white' : 'bg-white dark:bg-slate-700'
            }`}>
                {m.completed ? <Check className="w-4 h-4" /> : (icon ?? <span className="text-xs font-black text-slate-500">+{m.points}</span>)}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{m.title}</p>
                <p className="text-xs text-slate-400 truncate">{m.description}</p>
            </div>
            {!m.completed && m.target_url && (
                <a href={m.target_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#1a5c2e] shrink-0">
                    <ExternalLink className="w-4 h-4" />
                </a>
            )}
            {showAction && !m.completed && SELF_DECLARABLE.has(m.key) && (
                <button onClick={() => onClaim(m.key)} disabled={busy === m.key}
                    className="text-xs font-bold text-[#133f21] bg-[#d4edda] hover:bg-[#c1e3ca] dark:bg-[#1a5c2e]/20 px-3 py-1.5 rounded-lg disabled:opacity-60 shrink-0 transition-colors">
                    {busy === m.key ? '...' : 'Hacer'}
                </button>
            )}
        </div>
    );
}
