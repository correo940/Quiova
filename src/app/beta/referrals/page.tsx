'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, Users, Trophy, ChevronRight } from 'lucide-react';
import { getBetaAvatar } from '@/lib/beta/avatars';

interface RefRow {
    user_id: string; nickname: string; avatar_id: string;
    referral_count: number; referral_points: number; rank_pos: number;
}
interface MyData { rank: number; referralCount: number; referralPoints: number; }

const medals = ['🥇', '🥈', '🥉'];

export default function BetaReferralsPage() {
    const [rows, setRows] = useState<RefRow[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState<number | null>(null);
    const [me, setMe] = useState<MyData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/beta/referrals-ranking?page=${page}`)
            .then(r => r.json())
            .then(d => {
                setRows(d.rows ?? []);
                setTotalPages(d.totalPages ?? 1);
                if (typeof d.total === 'number') setTotal(d.total);
                if (d.me) setMe(d.me);
            })
            .finally(() => setLoading(false));
    }, [page]);

    // Puntos que necesita para entrar en el Top 10
    const top10RefCount = rows.length >= 10 ? rows[9]?.referral_count : null;
    const refToTop10 = me && top10RefCount != null && me.rank > 10
        ? Math.max(1, top10RefCount - me.referralCount + 1)
        : 0;

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white dark:from-blue-950/20 dark:via-slate-950 dark:to-slate-950">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <Link href="/beta/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-6">
                    <ArrowLeft className="w-4 h-4" /> Volver al panel
                </Link>

                {/* Cabecera */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 mb-3">
                        <Users className="w-7 h-7" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">Ranking de Referidos</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                        Los mejores embajadores del programa Beta de Quioba
                    </p>
                    {total !== null && (
                        <div className="mt-3 inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full px-4 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
                            <Users className="w-3.5 h-3.5 text-blue-500" />
                            {total} participantes con referidos
                        </div>
                    )}
                </div>

                {/* Tu posición (si tiene sesión y referidos) */}
                {me && me.referralCount > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mb-5 space-y-3">
                        <p className="font-black text-slate-800 dark:text-white text-sm flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 text-blue-500" /> Tu posición en referidos
                        </p>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5">
                                <div className="text-xl font-black text-blue-600">#{me.rank > 0 ? me.rank : '—'}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">posición</div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5">
                                <div className="text-xl font-black text-emerald-600">{me.referralCount}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">referidos</div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5">
                                <div className="text-xl font-black text-amber-600">+{me.referralPoints}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">pts ganados</div>
                            </div>
                        </div>
                        {refToTop10 > 0 && (
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 rounded-xl px-3 py-2">
                                👥 Te faltan <b>{refToTop10} referido{refToTop10 > 1 ? 's' : ''}</b> para entrar en el Top 10
                            </p>
                        )}
                        {me.rank > 0 && me.rank <= 10 && (
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 rounded-xl px-3 py-2">
                                💎 ¡Estás en el Top 10 de referidos!
                            </p>
                        )}
                    </div>
                )}

                {me && me.referralCount === 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-5 text-center space-y-2">
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Aún no tienes referidos</p>
                        <p className="text-xs text-slate-400">Invita amigos con tu enlace y aparecerás en este ranking. <b>+10 pts por referido</b>.</p>
                        <Link href="/beta/dashboard" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline mt-1">
                            Copiar mi enlace de referido <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>
                )}

                {/* Lista */}
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                ) : rows.length === 0 ? (
                    <div className="text-center py-16 space-y-2">
                        <p className="text-4xl">👥</p>
                        <p className="font-bold text-slate-700 dark:text-slate-200">Aún nadie en el ranking</p>
                        <p className="text-sm text-slate-400">Sé el primero en invitar amigos.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {rows.map((r) => {
                            const av = getBetaAvatar(r.avatar_id);
                            const pos = Number(r.rank_pos);
                            const isTop3 = pos <= 3;
                            return (
                                <div key={r.user_id}
                                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
                                        isTop3
                                            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                                    }`}>
                                    <div className="w-8 text-center font-black text-slate-400 text-sm shrink-0">
                                        {isTop3 ? medals[pos - 1] : `#${pos}`}
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
                                        {av.emoji}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-bold text-slate-800 dark:text-slate-100 truncate block">@{r.nickname}</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="font-black text-blue-600">
                                            {r.referral_count} <span className="text-xs font-medium text-slate-400">ref</span>
                                        </div>
                                        <div className="text-xs text-emerald-600 font-bold">+{r.referral_points} pts</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold disabled:opacity-40">
                            ← Anterior
                        </button>
                        <span className="text-sm text-slate-500 font-medium">{page} / {totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold disabled:opacity-40">
                            Siguiente →
                        </button>
                    </div>
                )}

                {/* Links */}
                <div className="mt-8 flex items-center justify-center gap-4 text-sm">
                    <Link href="/beta/ranking" className="font-semibold text-emerald-600 hover:underline">
                        Ver ranking general →
                    </Link>
                    <Link href="/beta/hall-of-fame" className="font-semibold text-amber-600 hover:underline">
                        Hall of Fame →
                    </Link>
                </div>
            </div>
        </div>
    );
}
