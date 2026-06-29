'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
    Copy, Trophy, Users, Check, Loader2, ExternalLink, KeyRound,
    ChevronDown, ChevronUp, Target, Zap, ArrowRight, Rocket,
    TrendingUp, Star, Bell, BellOff, AlertTriangle, MailCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getBetaAvatar } from '@/lib/beta/avatars';
import {
    STATUS_LABELS, STATUS_COLORS, historyReasonLabel,
    NOTIF_ICONS, type BetaStatus, type NotificationType,
} from '@/lib/beta/constants';
import { TikTokBadge, InstagramBadge, YouTubeBadge } from '@/lib/beta/social-icons';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Mission {
    key: string; title: string; description: string; points: number;
    type: string; target_url: string | null; completed: boolean;
}
interface Achievement { key: string; title: string; description: string; icon: string; unlocked: boolean; }
interface HistoryItem { delta: number; reason: string; created_at: string; }
interface Notification  { id: string; type: string; title: string; message: string; is_read: boolean; created_at: string; }

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
}

const SELF_DECLARABLE = new Set(['follow_tiktok', 'follow_instagram', 'follow_youtube', 'share_content', 'report_bug']);

// ── Misión inteligente ────────────────────────────────────────────────────────
function getSmartMission(missions: Mission[], referralsCount: number, hasActiveCodes: boolean): Mission | null {
    const pending = missions.filter(m => !m.completed);
    if (pending.length === 0) return null;

    // 1. Sin referidos → recomendar invite_friend
    if (referralsCount === 0) {
        const m = pending.find(m => m.key === 'invite_friend');
        if (m) return m;
    }
    // 2. Hay códigos activos sin reclamar → recomendar secret_code
    if (hasActiveCodes) {
        const m = pending.find(m => m.key === 'secret_code');
        if (m) return m;
    }
    // 3. Redes sociales pendientes
    for (const k of ['follow_tiktok', 'follow_instagram', 'follow_youtube']) {
        const m = pending.find(m => m.key === k);
        if (m) return m;
    }
    // 4. Primera pendiente en orden de prioridad
    const order = ['invite_friend', 'secret_code', 'report_bug', 'share_content'];
    for (const k of order) {
        const m = pending.find(m => m.key === k);
        if (m) return m;
    }
    return pending[0];
}

function getMissionIcon(key: string): React.ReactNode {
    if (key === 'follow_tiktok')    return <TikTokBadge size="sm" />;
    if (key === 'follow_instagram') return <InstagramBadge size="sm" />;
    if (key === 'follow_youtube')   return <YouTubeBadge size="sm" />;
    return null;
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function DashboardClient({
    data, rank, totalParticipants, leaderPoints,
    inTop10, inTop50, pointsToTop10, pointsToTop50, refLink, referralRank,
    emailVerified, email,
}: Props) {
    const router = useRouter();
    const { user } = data;
    const avatar = getBetaAvatar(user.avatar_id);
    const status = user.status as BetaStatus;

    const [code, setCode] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSent, setResendSent] = useState(false);

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
    const [showCompleted, setShowCompleted] = useState(false);
    const [showFullHistory, setShowFullHistory] = useState(false);

    // Estado local de notificaciones (para UI optimista al marcar)
    const [notifications, setNotifications] = useState<Notification[]>(data.notifications);
    const [unreadCount, setUnreadCount] = useState(data.unreadCount);
    const [showNotifs, setShowNotifs] = useState(false);

    const refresh = () => router.refresh();

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

    // Marcar notificación como leída (UI optimista)
    const markRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(c => Math.max(0, c - 1));
        await fetch('/api/beta/notifications', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [id] }),
        }).catch(() => {});
    };

    const markAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        await fetch('/api/beta/notifications', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ all: true }),
        }).catch(() => {});
    };

    // Misiones
    const pending   = data.missions.filter(m => !m.completed);
    const completed = data.missions.filter(m =>  m.completed);
    const recommended = getSmartMission(data.missions, data.referralsCount, data.hasActiveCodes);

    // Desglose de puntos
    const breakdown = data.history.reduce<Record<string, number>>((acc, h) => {
        const label = historyReasonLabel(h.reason);
        acc[label] = (acc[label] ?? 0) + h.delta;
        return acc;
    }, {});
    const breakdownEntries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
    const historyVisible = showFullHistory ? data.history : data.history.slice(0, 5);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

                {/* ── BANNER VERIFICACIÓN ──────────────────────── */}
                {emailVerified ? (
                    <div className="flex items-center gap-2.5 bg-[#edf7f1] dark:bg-[#1a5c2e]/10 border border-[#1a5c2e]/30 dark:border-[#1a5c2e]/40 rounded-2xl px-4 py-3">
                        <MailCheck className="w-4 h-4 text-[#1a5c2e] shrink-0" />
                        <span className="text-sm font-semibold text-[#133f21] dark:text-[#4ade80]">✅ Email verificado</span>
                    </div>
                ) : (
                    <div className="bg-[#b87514]/10 dark:bg-[#b87514]/10 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-4 space-y-3">
                        <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-[#b87514] shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-amber-800 dark:text-amber-400">⚠️ Email pendiente de verificar</p>
                                <p className="text-xs text-[#96610f] dark:text-[#b87514] mt-0.5">
                                    Verifica tu email para ganar puntos, completar misiones, aparecer en el ranking y recibir referidos.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleResendVerification}
                            disabled={resendLoading || resendSent}
                            className="w-full py-2 rounded-xl text-sm font-bold transition-all bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {resendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : resendSent ? '✓ Email enviado' : 'Reenviar email de verificación'}
                        </button>
                    </div>
                )}

                {/* ── 1. CABECERA ─────────────────────────────── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-[#d4edda] dark:bg-[#1a5c2e]/20 flex items-center justify-center text-3xl shrink-0">
                            {avatar.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg font-black text-slate-900 dark:text-white truncate">{user.nickname}</h1>
                            <span className={`inline-block mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[status]}`}>
                                {STATUS_LABELS[status]}
                            </span>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-3xl font-black text-[#1a5c2e]">{user.points}</div>
                            <div className="text-xs text-slate-400 font-medium">puntos totales</div>
                        </div>
                    </div>

                    {/* Desglose */}
                    {breakdownEntries.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Desglose</p>
                            <div className="space-y-1">
                                {breakdownEntries.map(([label, pts]) => (
                                    <div key={label} className="flex items-center justify-between text-xs">
                                        <span className="text-slate-600 dark:text-slate-400">{label}</span>
                                        <span className="font-bold text-[#1a5c2e]">+{pts}</span>
                                    </div>
                                ))}
                                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                                    <span className="font-bold text-slate-700 dark:text-slate-200">Total</span>
                                    <span className="font-black text-[#1a5c2e]">{user.points}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-4 gap-2 mt-4">
                        <Stat icon={<Trophy className="w-4 h-4 text-[#b87514]" />} label="Ranking" value={`#${rank}`} />
                        <Stat icon={<Users className="w-4 h-4 text-[#1a5c2e]" />} label="Ranking ref." value={referralRank > 0 ? `#${referralRank}` : '—'} />
                        <Stat icon={<Users className="w-4 h-4 text-[#edf7f1]0" />} label="Referidos" value={String(data.referralsCount)} />
                        <Stat icon={<KeyRound className="w-4 h-4 text-[#1a5c2e]" />} label="Códigos" value={String(data.codesCompleted)} />
                    </div>
                </div>

                {/* ── ACCESOS RÁPIDOS ─────────────────────────── */}
                <div className="grid grid-cols-3 gap-3">
                    <QuickLink href="/beta/ranking" icon="🏆" label="Ranking" color="bg-[#b87514]/10 dark:bg-[#b87514]/10 border-[#b87514]/20 dark:border-[#b87514]/30" />
                    <QuickLink href="/beta/referrals" icon="👥" label="Referidos" color="bg-[#edf7f1] dark:bg-[#1a5c2e]/10 border-[#1a5c2e]/20 dark:border-[#1a5c2e]/30" />
                    <QuickLink href="/beta/hall-of-fame" icon="🌟" label="Hall of Fame" color="bg-[#b87514]/10 dark:bg-[#b87514]/10 border-[#b87514]/20 dark:border-[#b87514]/30" />
                </div>

                {/* ── 2. NOTIFICACIONES ─────────────────────── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <button
                        onClick={() => setShowNotifs(v => !v)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-[#1a5c2e]" />
                            <span className="font-black text-slate-800 dark:text-white">Notificaciones</span>
                            {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={e => { e.stopPropagation(); markAllRead(); }}
                                    className="text-xs font-semibold text-[#1a5c2e] hover:underline"
                                >
                                    Marcar todas
                                </button>
                            )}
                            {showNotifs ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                    </button>

                    {showNotifs && (
                        <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800">
                            {notifications.length === 0 ? (
                                <div className="px-5 py-6 text-center">
                                    <BellOff className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-400">Sin notificaciones todavía</p>
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <button
                                        key={n.id}
                                        onClick={() => !n.is_read && markRead(n.id)}
                                        className={`w-full text-left px-5 py-3 flex items-start gap-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!n.is_read ? 'bg-[#edf7f1]/60 dark:bg-[#1a5c2e]/10' : ''}`}
                                    >
                                        <span className="text-xl shrink-0 mt-0.5">{NOTIF_ICONS[n.type as NotificationType] ?? 'ℹ️'}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!n.is_read ? 'font-bold text-slate-800 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-300'} leading-snug`}>
                                                {n.title}
                                            </p>
                                            {n.message && (
                                                <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {!n.is_read && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
                                            <span className="text-[10px] text-slate-400">
                                                {new Date(n.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* ── 3. COMPETICIÓN ──────────────────────────── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-5 h-5 text-[#1a5c2e]" />
                        <h2 className="font-black text-slate-800 dark:text-white">Tu posición en la competición</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-[#edf7f1] dark:bg-[#1a5c2e]/10 rounded-xl p-3">
                            <div className="text-2xl font-black text-[#1a5c2e]">#{rank}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">tu posición</div>
                        </div>
                        <div className="bg-[#edf7f1] dark:bg-[#1a5c2e]/10 rounded-xl p-3">
                            <div className="text-2xl font-black text-[#1a5c2e]">{totalParticipants}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">participantes</div>
                        </div>
                        <div className="bg-[#b87514]/10 dark:bg-[#b87514]/10 rounded-xl p-3">
                            <div className="text-2xl font-black text-[#b87514]">{leaderPoints}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">pts del líder</div>
                        </div>
                    </div>
                    <div className="mt-3 space-y-1.5">
                        {!inTop10 && pointsToTop10 > 0 && (
                            <div className="text-xs bg-[#b87514]/10 dark:bg-[#b87514]/10 rounded-lg px-3 py-2 font-semibold text-[#96610f] dark:text-[#fcd34d]">
                                🎯 Te faltan <b>{pointsToTop10} puntos</b> para entrar en el Top 10
                            </div>
                        )}
                        {!inTop50 && pointsToTop50 > 0 && (
                            <div className="text-xs bg-[#b87514]/10 dark:bg-[#b87514]/10 rounded-lg px-3 py-2 font-semibold text-[#96610f] dark:text-[#fcd34d]">
                                🏆 Te faltan <b>{pointsToTop50} puntos</b> para entrar en el Top 50
                            </div>
                        )}
                        {inTop10 && (
                            <div className="text-xs bg-[#edf7f1] dark:bg-[#1a5c2e]/10 rounded-lg px-3 py-2 font-bold text-[#133f21] dark:text-[#86efac]">
                                💎 ¡Estás en el Top 10! Sigue completando misiones para mantenerte.
                            </div>
                        )}
                    </div>
                </div>

                {/* ── 4. MENSAJE TOP 50 ───────────────────────── */}
                <div className={`rounded-2xl p-4 ${inTop50 ? 'bg-gradient-to-r from-[#1a5c2e] to-[#1e7a3a] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                    {inTop50 ? (
                        <>
                            <p className="font-black flex items-center gap-2 text-base">
                                <Trophy className="w-5 h-5" /> ¡Estás dentro del Top 50 provisional!
                            </p>
                            <p className="text-sm mt-1 text-[#edf7f1]">
                                Buen trabajo. Sigue completando misiones para mantener tu posición y destacar frente al equipo.
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="font-bold flex items-center gap-2">
                                <Zap className="w-4 h-4 text-[#b87514]" /> Fuera del Top 50
                            </p>
                            <p className="text-sm mt-0.5 text-slate-500 dark:text-slate-400">
                                Completa misiones, invita amigos y canjea códigos para subir.
                            </p>
                        </>
                    )}
                    <p className={`text-xs mt-2 ${inTop50 ? 'text-[#edf7f1]' : 'text-slate-400'}`}>
                        ⚠️ Estar en el Top 50 <b>no garantiza el acceso</b>. La aprobación final es siempre manual.
                    </p>
                </div>

                {/* ── 5. MISIÓN RECOMENDADA ──────────────────── */}
                {pending.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 text-center space-y-1">
                        <span className="text-3xl">🎉</span>
                        <p className="font-bold text-slate-800 dark:text-white">¡Todas las misiones completadas!</p>
                        <p className="text-xs text-slate-400">Vuelve pronto. Publicaremos nuevas misiones con más puntos.</p>
                    </div>
                ) : recommended ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-[#1a5c2e]/30 dark:border-[#1a5c2e]/40 p-4">
                        <p className="text-xs font-bold text-[#1a5c2e] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5" /> Tu siguiente misión recomendada
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#d4edda] dark:bg-[#1a5c2e]/20 flex items-center justify-center text-lg shrink-0">
                                {getMissionIcon(recommended.key) ?? <Star className="w-5 h-5 text-[#1a5c2e]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{recommended.title}</p>
                                <p className="text-xs text-slate-500 truncate">{recommended.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="font-black text-[#1a5c2e]">+{recommended.points}</div>
                                <div className="text-[10px] text-slate-400">pts</div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                            {recommended.target_url && (
                                <a href={recommended.target_url} target="_blank" rel="noopener noreferrer"
                                    className="flex-1 text-center text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg flex items-center justify-center gap-1">
                                    Ir <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                            {SELF_DECLARABLE.has(recommended.key) && (
                                <button onClick={() => claimMission(recommended.key)} disabled={busy === recommended.key}
                                    className="flex-1 text-xs font-bold bg-[#1a5c2e] hover:bg-[#133f21] text-white px-3 py-2 rounded-lg disabled:opacity-60">
                                    {busy === recommended.key ? '...' : 'Marcar como hecha →'}
                                </button>
                            )}
                            {!recommended.target_url && !SELF_DECLARABLE.has(recommended.key) && (
                                <span className="text-xs text-slate-400 italic">Se registra automáticamente</span>
                            )}
                        </div>
                    </div>
                ) : null}

                {/* ── 6. CÓDIGO SECRETO ──────────────────────── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#b87514]/10 dark:bg-[#b87514]/20 flex items-center justify-center text-xl shrink-0">🔍</div>
                        <div>
                            <h2 className="font-black text-slate-800 dark:text-white">Código secreto de la semana</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Encuentra códigos ocultos en TikTok, Instagram y YouTube. Introdúcelos para ganar puntos.
                            </p>
                        </div>
                    </div>
                    <form onSubmit={redeemCode} className="flex gap-2">
                        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                            placeholder="Ej: QB001"
                            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1a5c2e] uppercase" />
                        <button type="submit" disabled={busy === 'code'}
                            className="px-4 rounded-xl bg-[#1a5c2e] hover:bg-[#133f21] text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-60">
                            {busy === 'code' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Canjear'}
                        </button>
                    </form>
                </div>

                {/* ── 7. REFERIDO ────────────────────────────── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                    <h2 className="font-black text-slate-800 dark:text-white flex items-center gap-2 mb-1">
                        👥 Invita y gana <span className="text-[#1a5c2e] font-bold text-sm">+10 pts por referido</span>
                    </h2>
                    <p className="text-xs text-slate-500 mb-3">Cada amigo que se registre con tu enlace suma puntos.</p>
                    <div className="flex gap-2">
                        <input readOnly value={refLink}
                            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 font-mono" />
                        <button onClick={copyLink}
                            className="px-4 rounded-xl bg-[#1a5c2e] hover:bg-[#133f21] text-white flex items-center gap-1.5 text-sm font-bold">
                            <Copy className="w-4 h-4" /> Copiar
                        </button>
                    </div>
                </div>

                {/* ── 8. MISIONES ────────────────────────────── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                    <h2 className="font-black text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        Misiones
                        <span className="text-xs font-bold text-slate-400">({pending.length} pendientes · {completed.length} completadas)</span>
                    </h2>
                    <div className="space-y-2">
                        {pending.length === 0 && (
                            <p className="text-sm text-[#1a5c2e] font-bold text-center py-2">🎉 ¡Todas completadas!</p>
                        )}
                        {pending.map(m => <MissionRow key={m.key} m={m} busy={busy} onClaim={claimMission} showAction />)}
                    </div>
                    {completed.length > 0 && (
                        <div className="mt-3">
                            <button onClick={() => setShowCompleted(v => !v)}
                                className="w-full flex items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-700 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100">
                                <span className="flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5 text-[#1a5c2e]" />
                                    {completed.length} completada{completed.length > 1 ? 's' : ''}
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
                </div>

                {/* ── 9. ACTIVIDAD RECIENTE (historial de puntos) ── */}
                {data.history.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                        <h2 className="font-black text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                            📈 Actividad reciente
                        </h2>
                        <div className="space-y-2">
                            {historyVisible.map((h, i) => {
                                const d = new Date(h.created_at);
                                return (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                        <span className={`w-12 shrink-0 text-center font-black rounded-lg py-0.5 text-xs ${h.delta >= 0 ? 'bg-[#d4edda] text-[#133f21]' : 'bg-red-100 text-red-600'}`}>
                                            {h.delta >= 0 ? '+' : ''}{h.delta}
                                        </span>
                                        <span className="flex-1 text-slate-700 dark:text-slate-300">{historyReasonLabel(h.reason)}</span>
                                        <span className="text-[10px] text-slate-400 shrink-0 text-right">
                                            {d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}<br />
                                            {d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        {data.history.length > 5 && (
                            <button onClick={() => setShowFullHistory(v => !v)}
                                className="mt-3 w-full text-xs font-bold text-[#1a5c2e] hover:underline flex items-center justify-center gap-1">
                                {showFullHistory
                                    ? <><ChevronUp className="w-3.5 h-3.5" /> Mostrar menos</>
                                    : <><ChevronDown className="w-3.5 h-3.5" /> Ver las {data.history.length} acciones</>
                                }
                            </button>
                        )}
                    </div>
                )}

                {/* ── 10. BENEFICIOS ─────────────────────────── */}
                <div className="bg-gradient-to-br from-[#1a5c2e] to-[#1e7a3a] text-white rounded-2xl p-4">
                    <h2 className="font-black text-base flex items-center gap-2 mb-3">
                        <Rocket className="w-5 h-5" /> Beneficios de ser Beta Tester
                    </h2>
                    <ul className="space-y-2">
                        {[
                            '🚀 Acceso anticipado a Quioba antes del lanzamiento público',
                            '🎯 Influir directamente en nuevas funcionalidades',
                            '🏅 Insignia exclusiva de Fundador en tu perfil',
                            '🌟 Reconocimiento permanente en la comunidad',
                            '⚡ Acceso prioritario a todas las novedades futuras',
                        ].map((b, i) => <li key={i} className="text-sm text-[#edf7f1]">{b}</li>)}
                    </ul>
                </div>

                {/* ── 11. LOGROS ─────────────────────────────── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                    <h2 className="font-black text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        🏅 Logros
                        <span className="text-xs font-bold text-slate-400">
                            ({data.achievements.filter(a => a.unlocked).length}/{data.achievements.length})
                        </span>
                    </h2>
                    <div className="grid grid-cols-4 gap-3">
                        {data.achievements.map(a => (
                            <div key={a.key} title={a.unlocked ? a.description : '🔒 ' + a.description}
                                className={`flex flex-col items-center text-center gap-1 p-2 rounded-xl transition-all ${
                                    a.unlocked ? 'bg-[#b87514]/10 dark:bg-[#b87514]/10' : 'opacity-30 grayscale bg-slate-50 dark:bg-slate-800'
                                }`}>
                                <span className="text-2xl">{a.icon}</span>
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-tight">{a.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between pb-4">
                    <Link href="/beta/ranking" className="text-sm font-bold text-[#133f21] hover:underline flex items-center gap-1">
                        Ver ranking completo <ArrowRight className="w-4 h-4" />
                    </Link>
                    <div className="flex flex-col items-end gap-1">
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
    );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 text-center">
            <div className="flex justify-center mb-0.5">{icon}</div>
            <div className="text-base font-black text-slate-800 dark:text-slate-100">{value}</div>
            <div className="text-[10px] text-slate-400 font-medium">{label}</div>
        </div>
    );
}

function QuickLink({ href, icon, label, color }: { href: string; icon: string; label: string; color: string }) {
    return (
        <Link href={href}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center hover:scale-[1.03] transition-transform ${color}`}>
            <span className="text-2xl">{icon}</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</span>
        </Link>
    );
}

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
                    className="text-xs font-bold text-[#133f21] bg-[#d4edda] hover:bg-[#c1e3ca] dark:bg-[#1a5c2e]/20 px-3 py-1.5 rounded-lg disabled:opacity-60 shrink-0">
                    {busy === m.key ? '...' : 'Hecho'}
                </button>
            )}
        </div>
    );
}
