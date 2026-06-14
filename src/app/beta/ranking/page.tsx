'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Trophy, ArrowLeft, Users } from 'lucide-react';
import { getBetaAvatar } from '@/lib/beta/avatars';
import { STATUS_DOT, type BetaStatus } from '@/lib/beta/constants';

interface Row {
    rank: number;
    nickname: string;
    avatar_id: string;
    points: number;
    status: string;
}

const medals = ['🥇', '🥈', '🥉'];

export default function BetaRankingPage() {
    const [rows, setRows] = useState<Row[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalParticipants, setTotalParticipants] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/beta/ranking?page=${page}`)
            .then(r => r.json())
            .then(d => {
                setRows(d.rows ?? []);
                setTotalPages(d.totalPages ?? 1);
                if (typeof d.total === 'number') setTotalParticipants(d.total);
            })
            .finally(() => setLoading(false));
    }, [page]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white dark:from-amber-950/20 dark:via-slate-950 dark:to-slate-950">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <Link href="/beta" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-6">
                    <ArrowLeft className="w-4 h-4" /> Volver a la Beta
                </Link>

                {/* Cabecera */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 mb-3">
                        <Trophy className="w-7 h-7" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">Ranking Beta</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                        Top 100 cazadores de acceso anticipado a Quioba
                    </p>
                    {totalParticipants !== null && (
                        <div className="mt-3 inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full px-4 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
                            <Users className="w-3.5 h-3.5 text-blue-500" />
                            {totalParticipants} participantes registrados
                        </div>
                    )}
                </div>

                {/* Leyenda de estados */}
                <div className="flex flex-wrap gap-3 justify-center mb-5 text-xs text-slate-500">
                    <span>🟡 Pendiente</span>
                    <span>🔵 En validación</span>
                    <span>🟢 Aprobado</span>
                </div>

                {/* Lista */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    </div>
                ) : rows.length === 0 ? (
                    <div className="text-center py-16 space-y-2">
                        <p className="text-4xl">🏁</p>
                        <p className="font-bold text-slate-700 dark:text-slate-200">El ranking está vacío</p>
                        <p className="text-sm text-slate-400">Sé el primero en registrarte y ganar puntos.</p>
                        <Link href="/beta" className="inline-flex items-center gap-1 mt-2 text-sm font-bold text-emerald-600 hover:underline">
                            Unirme a la Beta →
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {rows.map(r => {
                            const av = getBetaAvatar(r.avatar_id);
                            const dot = STATUS_DOT[r.status as BetaStatus] ?? '⚪';
                            const isTop3 = r.rank <= 3;
                            return (
                                <div
                                    key={r.rank}
                                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 border transition-all ${
                                        isTop3
                                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                                    }`}
                                >
                                    {/* Posición */}
                                    <div className="w-8 text-center font-black text-slate-400 text-sm shrink-0">
                                        {isTop3 ? medals[r.rank - 1] : `#${r.rank}`}
                                    </div>

                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
                                        {av.emoji}
                                    </div>

                                    {/* Nickname */}
                                    <div className="flex-1 min-w-0">
                                        <span className="font-bold text-slate-800 dark:text-slate-100 truncate block">
                                            @{r.nickname}
                                        </span>
                                    </div>

                                    {/* Estado */}
                                    <span className="text-base shrink-0" title={r.status}>{dot}</span>

                                    {/* Puntos */}
                                    <div className="font-black text-emerald-600 text-base shrink-0">
                                        {r.points.toLocaleString('es')}
                                        <span className="text-xs font-medium text-slate-400 ml-0.5">pts</span>
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
                            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold disabled:opacity-40 hover:bg-slate-50">
                            ← Anterior
                        </button>
                        <span className="text-sm text-slate-500 font-medium">
                            {page} / {totalPages}
                        </span>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold disabled:opacity-40 hover:bg-slate-50">
                            Siguiente →
                        </button>
                    </div>
                )}

                {/* CTA */}
                <div className="mt-8 text-center">
                    <Link href="/beta" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-md shadow-emerald-200 dark:shadow-none transition-all">
                        Unirme al programa Beta
                    </Link>
                </div>
            </div>
        </div>
    );
}
