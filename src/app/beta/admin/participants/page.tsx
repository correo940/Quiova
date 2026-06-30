'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../AdminContext';
import { Loader2, Search, ChevronDown, ExternalLink, Download } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS, type BetaStatus } from '@/lib/beta/constants';
import { getBetaAvatar } from '@/lib/beta/avatars';
import Link from 'next/link';
import { toast } from 'sonner';

interface User {
    id: string; email: string; nickname: string; avatar_id: string; points: number;
    status: string; referral_code: string; created_at: string;
    tiktok: string | null; instagram: string | null; youtube: string | null;
}

const STATUSES: BetaStatus[] = ['pendiente', 'validando', 'aprobado', 'rechazado', 'suspendido'];
const PAGE = 50;

export default function ParticipantsPage() {
    const { apiFetch } = useAdmin();
    const [users, setUsers] = useState<User[]>([]);
    const [byStatus, setByStatus] = useState<Record<string, number>>({});
    const [total, setTotal] = useState(0);
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [acting, setActing] = useState<string | null>(null);
    const [page, setPage] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ status: filter, q: search, page: String(page), limit: String(PAGE) });
            const r = await apiFetch(`/api/beta/admin/users?${params}`);
            const d = await r.json();
            setUsers(d.users ?? []);
            setByStatus(d.byStatus ?? {});
            setTotal(d.total ?? 0);
        } catch { toast.error('Error al cargar participantes'); } finally { setLoading(false); }
    }, [apiFetch, filter, search, page]);

    useEffect(() => { setPage(0); }, [filter, search]);
    useEffect(() => { load(); }, [load]);

    const STATUS_TO_OP: Record<string, string> = { aprobado: 'approve', rechazado: 'reject', suspendido: 'suspend', validando: 'validate', pendiente: 'reset' };

    async function changeStatus(userId: string, newStatus: BetaStatus) {
        setActing(userId);
        try {
            const op = STATUS_TO_OP[newStatus] ?? 'reset';
            const r = await apiFetch('/api/beta/admin/action', {
                method: 'POST',
                body: JSON.stringify({ userId, op }),
            });
            const d = await r.json();
            if (!r.ok) { toast.error(d.error ?? 'Error'); return; }
            toast.success('Estado actualizado');
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        } finally { setActing(null); }
    }

    const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Participantes</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{total} participantes totales</p>
                </div>
            </div>

            {/* Status filters */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setFilter('')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!filter ? 'bg-[#1a5c2e] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1a5c2e] hover:text-[#1a5c2e]'}`}
                >
                    Todos ({total})
                </button>
                {STATUSES.map(s => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-[#1a5c2e] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1a5c2e] hover:text-[#1a5c2e]'}`}
                    >
                        {STATUS_LABELS[s]} ({byStatus[s] ?? 0})
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar usuario..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e]"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading && users.length === 0 ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-[#1a5c2e]" size={24} /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Usuario</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Puntos</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Registro</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Código</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-base shrink-0">
                                                    {getBetaAvatar(u.avatar_id).emoji}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{u.nickname}</p>
                                                    <p className="text-xs text-gray-400">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-semibold text-[#1a5c2e]">{u.points}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="relative inline-block">
                                                <select
                                                    value={u.status}
                                                    disabled={acting === u.id}
                                                    onChange={e => changeStatus(u.id, e.target.value as BetaStatus)}
                                                    className={`appearance-none pr-6 pl-2 py-1 text-xs rounded-lg border font-medium cursor-pointer focus:outline-none ${STATUS_COLORS[u.status as BetaStatus] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                                                >
                                                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                                                </select>
                                                {acting === u.id
                                                    ? <Loader2 size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 animate-spin text-gray-500" />
                                                    : <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                }
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(u.created_at)}</td>
                                        <td className="px-4 py-3">
                                            <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{u.referral_code}</code>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link href={`/beta/admin/participants/${u.id}`} className="p-1.5 rounded-lg hover:bg-[#edf7f1] text-gray-400 hover:text-[#1a5c2e] transition-colors inline-flex">
                                                <ExternalLink size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {users.length === 0 && !loading && (
                            <p className="text-center text-sm text-gray-400 py-8">Sin resultados</p>
                        )}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {total > PAGE && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Mostrando {page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} de {total}</p>
                    <div className="flex gap-2">
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">Anterior</button>
                        <button disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">Siguiente</button>
                    </div>
                </div>
            )}
        </div>
    );
}
