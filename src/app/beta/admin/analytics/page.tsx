'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../AdminContext';
import { Loader2, BarChart3 } from 'lucide-react';

interface AnalyticsData {
    timeline: { date: string; label: string; registrations: number; missions: number; referrals: number; codes: number }[];
    statusCount: Record<string, number>;
    topMissions: { key: string; title: string; count: number }[];
    totals: { registrations: number; missions: number; referrals: number; codes: number };
    days: number;
}

const STATUS_LABELS: Record<string, string> = {
    pendiente: 'Pendiente', validando: 'Validando', aprobado: 'Aprobado',
    rechazado: 'Rechazado', suspendido: 'Suspendido',
};
const STATUS_COLORS: Record<string, string> = {
    pendiente: '#f59e0b', validando: '#3b82f6', aprobado: '#1a5c2e',
    rechazado: '#ef4444', suspendido: '#6b7280',
};

function AreaChart({ data, field, color }: { data: AnalyticsData['timeline']; field: keyof AnalyticsData['timeline'][0]; color: string }) {
    const values = data.map(d => Number(d[field]));
    const max = Math.max(...values, 1);
    const W = 600, H = 120, PAD = 16;
    if (data.length < 2) return null;
    const step = (W - PAD * 2) / (data.length - 1);
    const pts = values.map((v, i) => [PAD + i * step, H - PAD - (v / max) * (H - PAD * 2)] as [number, number]);
    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const areaD = `${pathD} L${pts[pts.length - 1][0].toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`;
    const gradId = `grad-${field as string}`;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28">
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.03" />
                </linearGradient>
            </defs>
            <path d={areaD} fill={`url(#${gradId})`} />
            <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {pts.filter((_, i) => i % Math.ceil(data.length / 10) === 0).map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3" fill={color} />
            ))}
        </svg>
    );
}

function HBarChart({ data }: { data: { title: string; count: number }[] }) {
    const max = Math.max(...data.map(d => d.count), 1);
    return (
        <div className="space-y-3">
            {data.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                    <p className="text-xs text-gray-600 w-40 truncate shrink-0">{d.title}</p>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all" style={{ width: `${(d.count / max) * 100}%`, background: '#1a5c2e' }} />
                    </div>
                    <span className="text-xs font-semibold text-[#1a5c2e] w-8 text-right shrink-0">{d.count}</span>
                </div>
            ))}
        </div>
    );
}

const DAYS_OPTIONS = [7, 14, 30, 60, 90];

export default function AnalyticsPage() {
    const { apiFetch } = useAdmin();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [days, setDays] = useState(30);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await apiFetch(`/api/beta/admin/analytics?days=${days}`);
            const d = await r.json();
            setData(d);
        } catch { /* ignore */ } finally { setLoading(false); }
    }, [apiFetch, days]);

    useEffect(() => { load(); }, [load]);

    const totals = data?.totals;
    const timeline = data?.timeline ?? [];

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analítica</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Métricas de actividad del programa Beta</p>
                </div>
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                    {DAYS_OPTIONS.map(d => (
                        <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${days === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            {/* Totals */}
            {totals && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Registros', value: totals.registrations, color: '#6366f1' },
                        { label: 'Misiones completadas', value: totals.missions, color: '#1a5c2e' },
                        { label: 'Referidos validados', value: totals.referrals, color: '#b87514' },
                        { label: 'Códigos canjeados', value: totals.codes, color: '#0891b2' },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{s.label}</p>
                            <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">últimos {days} días</p>
                        </div>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#1a5c2e]" size={24} /></div>
            ) : (
                <>
                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {[
                            { field: 'registrations' as const, label: 'Registros diarios', color: '#6366f1' },
                            { field: 'missions' as const, label: 'Misiones completadas', color: '#1a5c2e' },
                            { field: 'referrals' as const, label: 'Referidos validados', color: '#b87514' },
                            { field: 'codes' as const, label: 'Códigos canjeados', color: '#0891b2' },
                        ].map(({ field, label, color }) => (
                            <div key={field} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <p className="text-sm font-semibold text-gray-700 mb-3">{label}</p>
                                <AreaChart data={timeline} field={field} color={color} />
                                {timeline.length > 0 && (
                                    <div className="flex justify-between mt-2">
                                        {timeline.filter((_, i) => i % Math.ceil(timeline.length / 5) === 0).map((d, i) => (
                                            <span key={i} className="text-[10px] text-gray-400">{d.label}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Status + Top Missions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <p className="text-sm font-semibold text-gray-700 mb-4">Distribución por estado</p>
                            {!data?.statusCount ? <p className="text-xs text-gray-400">Sin datos</p> : (
                                <div className="space-y-3">
                                    {Object.entries(data.statusCount).map(([status, count]) => {
                                        const total = Object.values(data.statusCount).reduce((a, b) => a + b, 0);
                                        return (
                                            <div key={status} className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[status] ?? '#9ca3af' }} />
                                                <span className="text-xs text-gray-600 flex-1">{STATUS_LABELS[status] ?? status}</span>
                                                <div className="w-24 bg-gray-100 rounded-full h-1.5">
                                                    <div className="h-1.5 rounded-full" style={{ width: `${(count / total) * 100}%`, background: STATUS_COLORS[status] ?? '#9ca3af' }} />
                                                </div>
                                                <span className="text-xs font-semibold text-gray-700 w-6 text-right">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <p className="text-sm font-semibold text-gray-700 mb-4">Misiones más completadas</p>
                            {(!data?.topMissions.length) ? (
                                <div className="flex flex-col items-center py-4 text-gray-400">
                                    <BarChart3 size={24} className="mb-2" />
                                    <p className="text-xs">Sin datos</p>
                                </div>
                            ) : (
                                <HBarChart data={data.topMissions} />
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
