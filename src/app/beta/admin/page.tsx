'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Download, Check, X, Pause, RotateCcw, Search, ShieldAlert } from 'lucide-react';
import { SUPER_ADMIN_EMAIL, STATUS_LABELS, STATUS_COLORS, type BetaStatus } from '@/lib/beta/constants';
import { getBetaAvatar } from '@/lib/beta/avatars';

interface AdminUser {
    id: string; email: string; nickname: string; avatar_id: string; points: number;
    status: string; referral_code: string; tiktok: string | null; instagram: string | null;
    youtube: string | null; follows_socials: boolean; created_at: string;
}

const STATUSES: BetaStatus[] = ['pendiente', 'validando', 'aprobado', 'rechazado', 'suspendido'];

export default function BetaAdminPage() {
    const [token, setToken] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [authReady, setAuthReady] = useState(false);

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [byStatus, setByStatus] = useState<Record<string, number>>({});
    const [total, setTotal] = useState(0);
    const [filter, setFilter] = useState<string>('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [acting, setActing] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setToken(data.session?.access_token ?? null);
            setEmail(data.session?.user?.email ?? null);
            setAuthReady(true);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
            setToken(s?.access_token ?? null);
            setEmail(s?.user?.email ?? null);
        });
        return () => sub.subscription.unsubscribe();
    }, []);

    const isAdmin = email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const qs = new URLSearchParams();
            if (filter) qs.set('status', filter);
            if (search) qs.set('q', search);
            const res = await fetch(`/api/beta/admin/users?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            setUsers(d.users); setByStatus(d.byStatus); setTotal(d.total);
        } catch (e: any) { toast.error(e.message || 'Error'); }
        finally { setLoading(false); }
    }, [token, filter, search]);

    useEffect(() => { if (isAdmin && token) load(); }, [isAdmin, token, load]);

    const act = async (userId: string, op: string, extra: Record<string, unknown> = {}) => {
        if (!token) return;
        setActing(userId + op);
        try {
            const res = await fetch('/api/beta/admin/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ op, userId, ...extra }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            toast.success('Hecho');
            load();
        } catch (e: any) { toast.error(e.message || 'Error'); }
        finally { setActing(null); }
    };

    const exportCsv = () => {
        if (!token) return;
        const qs = new URLSearchParams({ format: 'csv' });
        if (filter) qs.set('status', filter);
        // Descarga autenticada vía fetch + blob
        fetch(`/api/beta/admin/users?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.blob())
            .then(b => {
                const url = URL.createObjectURL(b);
                const a = document.createElement('a');
                a.href = url; a.download = `beta_users_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click(); URL.revokeObjectURL(url);
            });
    };

    if (!authReady) return <Center><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></Center>;
    if (!isAdmin) return (
        <Center>
            <div className="text-center">
                <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <p className="font-bold text-slate-800 dark:text-white">Acceso restringido</p>
                <p className="text-sm text-slate-500 mt-1">Inicia sesión como administrador de Quioba.</p>
            </div>
        </Center>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Panel Beta</h1>
                        <p className="text-sm text-slate-500">{total} usuarios registrados</p>
                    </div>
                    <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold">
                        <Download className="w-4 h-4" /> Exportar CSV
                    </button>
                </div>

                {/* Filtros por estado */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <Chip active={filter === ''} onClick={() => setFilter('')} label={`Todos (${total})`} />
                    {STATUSES.map(s => (
                        <Chip key={s} active={filter === s} onClick={() => setFilter(s)} label={`${STATUS_LABELS[s]} (${byStatus[s] ?? 0})`} />
                    ))}
                </div>

                {/* Búsqueda */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
                        placeholder="Buscar por email o nickname…"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-4 py-2.5 text-sm" />
                </div>

                {loading ? (
                    <Center><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></Center>
                ) : (
                    <div className="space-y-2">
                        {users.map(u => {
                            const av = getBetaAvatar(u.avatar_id);
                            const st = u.status as BetaStatus;
                            return (
                                <div key={u.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex flex-wrap items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl">{av.emoji}</div>
                                    <div className="flex-1 min-w-[180px]">
                                        <p className="font-bold text-slate-800 dark:text-slate-100">{u.nickname} <span className="text-emerald-600 font-black ml-1">{u.points}p</span></p>
                                        <p className="text-xs text-slate-400">{u.email}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[st]}`}>{STATUS_LABELS[st]}</span>
                                    <div className="flex items-center gap-1">
                                        <IconBtn title="Aprobar" color="emerald" loading={acting === u.id + 'approve'} onClick={() => act(u.id, 'approve')}><Check className="w-4 h-4" /></IconBtn>
                                        <IconBtn title="Rechazar" color="red" loading={acting === u.id + 'reject'} onClick={() => act(u.id, 'reject')}><X className="w-4 h-4" /></IconBtn>
                                        <IconBtn title="Suspender" color="amber" loading={acting === u.id + 'suspend'} onClick={() => act(u.id, 'suspend')}><Pause className="w-4 h-4" /></IconBtn>
                                        <IconBtn title="Reset a pendiente" color="slate" loading={acting === u.id + 'reset'} onClick={() => act(u.id, 'reset')}><RotateCcw className="w-4 h-4" /></IconBtn>
                                    </div>
                                </div>
                            );
                        })}
                        {users.length === 0 && <p className="text-center text-slate-400 py-12">Sin usuarios para este filtro.</p>}
                    </div>
                )}
            </div>
        </div>
    );
}

function Center({ children }: { children: React.ReactNode }) {
    return <div className="min-h-screen flex items-center justify-center">{children}</div>;
}
function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-700'}`}>
            {label}
        </button>
    );
}
const COLORS: Record<string, string> = {
    emerald: 'hover:bg-emerald-100 text-emerald-600',
    red: 'hover:bg-red-100 text-red-600',
    amber: 'hover:bg-amber-100 text-amber-600',
    slate: 'hover:bg-slate-100 text-slate-500',
};
function IconBtn({ children, title, color, loading, onClick }: { children: React.ReactNode; title: string; color: string; loading?: boolean; onClick: () => void }) {
    return (
        <button title={title} onClick={onClick} disabled={loading}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${COLORS[color]}`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
        </button>
    );
}
