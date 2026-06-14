'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';
import { getBetaAvatar } from '@/lib/beta/avatars';

interface Founder {
    id: string; nickname: string; avatar_id: string; approved_at: string | null;
}

export default function BetaHallOfFamePage() {
    const [founders, setFounders] = useState<Founder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/beta/hall-of-fame')
            .then(r => r.json())
            .then(d => setFounders(d.founders ?? []))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white dark:from-amber-950/20 dark:via-slate-950 dark:to-slate-950">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <Link href="/beta/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-6">
                    <ArrowLeft className="w-4 h-4" /> Volver al panel
                </Link>

                {/* Cabecera */}
                <div className="text-center mb-8">
                    <div className="text-6xl mb-3">🏆</div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">Hall of Fame</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                        Los primeros Beta Testers que forman parte de la historia de Quioba
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full px-4 py-1.5 text-sm font-black text-amber-700 dark:text-amber-400">
                        🏆 {founders.length} Fundador{founders.length !== 1 ? 'es' : ''} Beta de Quioba
                    </div>
                </div>

                {/* Lista */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    </div>
                ) : founders.length === 0 ? (
                    <div className="text-center py-16 space-y-3">
                        <p className="text-4xl">🔒</p>
                        <p className="font-bold text-slate-700 dark:text-slate-200">Aún no hay fundadores</p>
                        <p className="text-sm text-slate-400 max-w-sm mx-auto">
                            Los primeros usuarios aprobados por el equipo de Quioba aparecerán aquí como fundadores oficiales.
                        </p>
                        <Link href="/beta" className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 hover:underline mt-2">
                            Unirme al programa Beta →
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {founders.map((f, i) => {
                            const av = getBetaAvatar(f.avatar_id);
                            const approvedDate = f.approved_at
                                ? new Date(f.approved_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
                                : '';
                            const isFirstTen = i < 10;
                            return (
                                <div key={f.id}
                                    className={`flex items-center gap-4 rounded-2xl p-4 border transition-all ${
                                        isFirstTen
                                            ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800'
                                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                                    }`}>
                                    {/* Número y avatar */}
                                    <div className="w-8 text-center font-black text-slate-400 text-sm shrink-0">
                                        #{i + 1}
                                    </div>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                                        isFirstTen ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-slate-100 dark:bg-slate-800'
                                    }`}>
                                        {av.emoji}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-slate-800 dark:text-slate-100 truncate">
                                            @{f.nickname}
                                        </p>
                                        {approvedDate && (
                                            <p className="text-xs text-slate-400 mt-0.5">Aprobado el {approvedDate}</p>
                                        )}
                                    </div>
                                    {/* Badge */}
                                    <div className={`shrink-0 text-xs font-black px-3 py-1.5 rounded-full ${
                                        isFirstTen
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                    }`}>
                                        🏆 Fundador Beta
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Motivación si el usuario no aparece */}
                {!loading && founders.length > 0 && (
                    <div className="mt-8 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-5 text-center space-y-2">
                        <p className="font-black text-lg">¿Quieres aparecer aquí?</p>
                        <p className="text-emerald-100 text-sm">
                            Gana puntos, sube en el ranking y el equipo de Quioba te seleccionará como fundador.
                        </p>
                        <Link href="/beta/dashboard"
                            className="inline-flex items-center gap-1.5 bg-white text-emerald-700 font-bold text-sm px-4 py-2 rounded-full mt-1 hover:bg-emerald-50 transition-colors">
                            Ir a completar misiones →
                        </Link>
                    </div>
                )}

                {/* Links */}
                <div className="mt-6 flex items-center justify-center gap-4 text-sm">
                    <Link href="/beta/ranking" className="font-semibold text-emerald-600 hover:underline">
                        Ranking general →
                    </Link>
                    <Link href="/beta/referrals" className="font-semibold text-blue-600 hover:underline">
                        Ranking de referidos →
                    </Link>
                </div>
            </div>
        </div>
    );
}
