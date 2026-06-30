'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from './AdminContext';
import { Loader2, Users, Clock, TrendingUp, Star, RefreshCw, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// ── Types
interface DashboardData {
    stats: {
        totalParticipants: number; newThisWeek: number; capacity: number;
        inTop50: number; unverifiedEmails: number;
        pendingReviews: { total: number; bugs: number; ideas: number; declarative: number };
    };
    selectionState: { inTop: number; outTop: number; total: number };
    activityFeed: { id: string; message: string; icon: string; avatar: string; time: string }[];
    topReferrers: { id: string; nickname: string; avatar: string; points: number; referrals: number }[];
    topByPoints: { rank: number; id: string; nickname: string; avatar: string; points: number }[];
    upcomingEvents: { id: string; title: string; date: string; icon: string }[];
    registrationsChart: { label: string; value: number }[];
    activityChart: { label: string; missions: number; referrals: number; codes: number; registrations: number }[];
    reviewsPreview: {
        id: string; nickname: string; avatar: string; points: number;
        missionTitle: string; missionType: string; verificationType: string;
        title: string | null; description: string | null; createdAt: string;
    }[];
}

// ── Mini Line Chart (SVG)
function LineChart({ data, color = '#1a5c2e' }: { data: { label: string; value: number }[]; color?: string }) {
    const max = Math.max(...data.map(d => d.value), 1);
    const W = 280, H = 80, PAD = 8;
    const step = (W - PAD * 2) / (data.length - 1 || 1);
    const pts = data.map((d, i) => [PAD + i * step, H - PAD - ((d.value / max) * (H - PAD * 2))]);
    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const areaD = `${pathD} L${pts[pts.length - 1][0].toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
            <defs>
                <linearGradient id={`grad-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            <path d={areaD} fill={`url(#grad-${color.slice(1)})`} />
            <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color} />
            ))}
        </svg>
    );
}

// ── Mini Bar Chart (SVG)
function BarChart({ data }: { data: { label: string; missions: number; referrals: number; registrations: number }[] }) {
    const max = Math.max(...data.map(d => d.missions + d.referrals + d.registrations), 1);
    const W = 280, H = 80, PAD = 8;
    const barW = Math.max(4, (W - PAD * 2) / data.length - 4);
    const step = (W - PAD * 2) / (data.length || 1);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
            {data.map((d, i) => {
                const x = PAD + i * step + (step - barW) / 2;
                const totalH = ((d.missions + d.referrals + d.registrations) / max) * (H - PAD * 2);
                const mH = (d.missions / max) * (H - PAD * 2);
                const rH = (d.referrals / max) * (H - PAD * 2);
                const regH = (d.registrations / max) * (H - PAD * 2);
                let yOffset = H - PAD;
                const segs = [
                    { h: mH, color: '#1a5c2e' },
                    { h: rH, color: '#b87514' },
                    { h: regH, color: '#6366f1' },
                ];
                return (
                    <g key={i}>
                        {segs.map((s, j) => {
                            if (s.h < 0.5) return null;
                            yOffset -= s.h;
                            return <rect key={j} x={x} y={yOffset} width={barW} height={s.h} fill={s.color} rx="2" />;
                        })}
                        <text x={x + barW / 2} y={H - 1} textAnchor="middle" fontSize="7" fill="#9ca3af">{d.label}</text>
                    </g>
                );
            })}
        </svg>
    );
}

// ── Donut Chart for selection state
function DonutChart({ inTop, outTop }: { inTop: number; outTop: number }) {
    const total = inTop + outTop;
    if (total === 0) return <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">Sin datos</div>;
    const pct = inTop / total;
    const r = 36, cx = 44, cy = 44;
    const circ = 2 * Math.PI * r;
    const dash = pct * circ;
    return (
        <div className="relative w-22 h-22">
            <svg width="88" height="88" viewBox="0 0 88 88">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a5c2e" strokeWidth="12"
                    strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-bold text-base text-[#1a5c2e]">{inTop}</span>
                <span className="text-[9px] text-gray-400">/ {total}</span>
            </div>
        </div>
    );
}

// ── Stat Card
function StatCard({ label, value, sub, color = '#1a5c2e', icon }: { label: string; value: string | number; sub?: string; color?: string; icon: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
                {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'ahora';
    if (m < 60) return `hace ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h}h`;
    return `hace ${Math.floor(h / 24)}d`;
}

function ReviewTypeBadge({ vtype, mtype }: { vtype: string; mtype: string }) {
    if (mtype === 'bug') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Bug</span>;
    if (vtype === 'declaration') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">Declarativa</span>;
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">Manual</span>;
}

// ── Main Dashboard
export default function AdminDashboard() {
    const { apiFetch, ready } = useAdmin();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(false);
    const [actingReview, setActingReview] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!ready) return;
        setLoading(true);
        try {
            const r = await apiFetch('/api/beta/admin/dashboard');
            const d = await r.json();
            setData(d);
        } catch { /* ignore */ } finally { setLoading(false); }
    }, [ready, apiFetch]);

    useEffect(() => { load(); }, [load]);

    async function actReview(id: string, action: 'approve' | 'reject') {
        setActingReview(id);
        try {
            await apiFetch('/api/beta/admin/review', {
                method: 'POST',
                body: JSON.stringify({ reviewId: id, action }),
            });
            await load();
        } catch { /* ignore */ } finally { setActingReview(null); }
    }

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <Loader2 className="animate-spin text-[#1a5c2e]" size={28} />
            </div>
        );
    }

    const s = data?.stats;
    const capacity = s?.capacity ?? 50;
    const pct = s ? Math.round((s.totalParticipants / capacity) * 100) : 0;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Panel de control de la Beta QUIOBA</p>
                </div>
                <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    Actualizar
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Participantes" value={s?.totalParticipants ?? 0} sub={`+${s?.newThisWeek ?? 0} esta semana`} color="#1a5c2e" icon={<Users size={18} />} />
                <StatCard label="Revisiones pendientes" value={s?.pendingReviews.total ?? 0} sub={`${s?.pendingReviews.bugs ?? 0} bugs · ${s?.pendingReviews.declarative ?? 0} decl.`} color="#b87514" icon={<Clock size={18} />} />
                <StatCard label="En Top 50" value={s?.inTop50 ?? 0} sub={`de ${s?.totalParticipants ?? 0} participantes`} color="#6366f1" icon={<Star size={18} />} />
                <StatCard label="Capacidad" value={`${pct}%`} sub={`${s?.totalParticipants ?? 0} / ${capacity} plazas`} color="#059669" icon={<TrendingUp size={18} />} />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Registrations line chart */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Registros — últimos 7 días</p>
                    {data && <LineChart data={data.registrationsChart} color="#1a5c2e" />}
                    <div className="flex justify-between mt-2">
                        {data?.registrationsChart.map((d, i) => (
                            <span key={i} className="text-[10px] text-gray-400">{d.label}</span>
                        ))}
                    </div>
                </div>

                {/* Activity stacked bar chart */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Actividad semanal</p>
                    <div className="flex items-center gap-3 mb-2">
                        {[['#1a5c2e', 'Misiones'], ['#b87514', 'Referidos'], ['#6366f1', 'Registros']].map(([c, l]) => (
                            <span key={l} className="flex items-center gap-1 text-[10px] text-gray-500">
                                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: c }} />{l}
                            </span>
                        ))}
                    </div>
                    {data && <BarChart data={data.activityChart} />}
                </div>

                {/* Selection donut */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3">
                    <p className="text-sm font-semibold text-gray-700 self-start">Estado de selección</p>
                    {data && <DonutChart inTop={data.selectionState.inTop} outTop={data.selectionState.outTop} />}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 w-full mt-1">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#1a5c2e]" />
                            <span className="text-xs text-gray-500">Top 50</span>
                            <span className="text-xs font-semibold text-gray-800 ml-auto">{data?.selectionState.inTop ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                            <span className="text-xs text-gray-500">Fuera</span>
                            <span className="text-xs font-semibold text-gray-800 ml-auto">{data?.selectionState.outTop ?? 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle row: activity + rankings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Activity feed */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm col-span-1 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-gray-700">Actividad en tiempo real</p>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {data?.activityFeed.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Sin actividad reciente</p>}
                        {data?.activityFeed.map(a => (
                            <div key={a.id} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-base shrink-0">{a.avatar}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-700 truncate">{a.icon} {a.message}</p>
                                </div>
                                <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(a.time)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top by points */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-gray-700">Top ranking</p>
                        <Link href="/beta/admin/participants" className="text-xs text-[#1a5c2e] hover:underline flex items-center gap-0.5">Ver todos <ArrowRight size={11} /></Link>
                    </div>
                    <div className="space-y-3">
                        {data?.topByPoints.map(u => (
                            <div key={u.id} className="flex items-center gap-2">
                                <span className={`text-xs font-bold w-5 text-center ${u.rank <= 3 ? 'text-[#b87514]' : 'text-gray-400'}`}>#{u.rank}</span>
                                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm shrink-0">{u.avatar}</div>
                                <span className="flex-1 text-sm text-gray-700 truncate">{u.nickname}</span>
                                <span className="text-xs font-semibold text-[#1a5c2e]">{u.points} pts</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom row: pending reviews + upcoming events */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Pending reviews */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm col-span-1 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-gray-700">
                            Revisiones pendientes
                            {(s?.pendingReviews.total ?? 0) > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{s!.pendingReviews.total}</span>
                            )}
                        </p>
                        <Link href="/beta/admin/reviews" className="text-xs text-[#1a5c2e] hover:underline flex items-center gap-0.5">Ver todas <ArrowRight size={11} /></Link>
                    </div>
                    {(!data?.reviewsPreview.length) && (
                        <p className="text-xs text-gray-400 text-center py-4">No hay revisiones pendientes</p>
                    )}
                    <div className="space-y-3">
                        {data?.reviewsPreview.map(r => (
                            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-base shrink-0">{r.avatar}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-800 truncate">{r.nickname}</span>
                                        <ReviewTypeBadge vtype={r.verificationType} mtype={r.missionType} />
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">{r.missionTitle}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        disabled={actingReview === r.id}
                                        onClick={() => actReview(r.id, 'approve')}
                                        className="p-1.5 rounded-lg bg-[#edf7f1] text-[#1a5c2e] hover:bg-[#d1ead9] transition-colors disabled:opacity-50"
                                    >
                                        {actingReview === r.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                    </button>
                                    <button
                                        disabled={actingReview === r.id}
                                        onClick={() => actReview(r.id, 'reject')}
                                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                                    >
                                        <XCircle size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upcoming events + top referrers */}
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <p className="text-sm font-semibold text-gray-700 mb-3">Próximos eventos</p>
                        <div className="space-y-2.5">
                            {data?.upcomingEvents.map(e => (
                                <div key={e.id} className="flex items-center gap-2.5">
                                    <span className="text-lg leading-none">{e.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-700 truncate">{e.title}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(e.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            ))}
                            {(!data?.upcomingEvents.length) && <p className="text-xs text-gray-400">Sin eventos próximos</p>}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <p className="text-sm font-semibold text-gray-700 mb-3">Top referidores</p>
                        <div className="space-y-2.5">
                            {data?.topReferrers.map(u => (
                                <div key={u.id} className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm shrink-0">{u.avatar}</div>
                                    <span className="flex-1 text-xs text-gray-700 truncate">{u.nickname}</span>
                                    <span className="text-xs font-semibold text-[#b87514]">{u.referrals} inv.</span>
                                </div>
                            ))}
                            {(!data?.topReferrers.length) && <p className="text-xs text-gray-400">Sin referidos aún</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
