'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../../AdminContext';
import {
    Loader2, ArrowLeft, CheckCircle, Clock, Trash2, Plus,
    Activity, Target, Users, History, Bug, Lightbulb, Bell, ShieldCheck, FileText,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

interface Detail {
    user: any;
    history: any[];
    completions: any[];
    reviews: any[];
    referralsGiven: any[];
    referredBy: any | null;
    notifications: any[];
    activity: any[];
    auditLog: any[];
    notes: any[];
}

const STATUS_OPS: Record<string, string> = { aprobado: 'approve', rechazado: 'reject', suspendido: 'suspend', validando: 'validate', pendiente: 'reset' };
const STATUS_COLOR: Record<string, string> = { aprobado: 'text-[#1a5c2e] bg-[#edf7f1]', rechazado: 'text-red-600 bg-red-50', suspendido: 'text-orange-600 bg-orange-50', validando: 'text-blue-600 bg-blue-50', pendiente: 'text-gray-600 bg-gray-100' };

function timeAgo(iso: string): string {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (d < 60) return 'ahora';
    if (d < 3600) return `${Math.floor(d / 60)}m`;
    if (d < 86400) return `${Math.floor(d / 3600)}h`;
    return `${Math.floor(d / 86400)}d`;
}

const TABS = [
    { id: 'resumen', label: 'Resumen', icon: Activity },
    { id: 'actividad', label: 'Actividad', icon: Activity },
    { id: 'misiones', label: 'Misiones', icon: Target },
    { id: 'referidos', label: 'Referidos', icon: Users },
    { id: 'historial', label: 'Historial pts.', icon: History },
    { id: 'bugs', label: 'Revisiones', icon: Bug },
    { id: 'notificaciones', label: 'Notifs.', icon: Bell },
    { id: 'logs', label: 'Audit Log', icon: ShieldCheck },
    { id: 'notas', label: 'Notas', icon: FileText },
] as const;
type TabId = typeof TABS[number]['id'];

const clsInput = "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e]";

export default function ParticipantDetailPage() {
    const { apiFetch } = useAdmin();
    const params = useParams();
    const id = String(params?.id ?? '');
    const [data, setData] = useState<Detail | null>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<TabId>('resumen');
    const [actingStatus, setActingStatus] = useState(false);
    const [adjusting, setAdjusting] = useState(false);
    const [delta, setDelta] = useState('');
    const [note, setNote] = useState('');
    const [newNote, setNewNote] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [deletingNote, setDeletingNote] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await apiFetch(`/api/beta/admin/participants/${id}`);
            if (r.ok) setData(await r.json());
        } catch { toast.error('Error al cargar participante'); } finally { setLoading(false); }
    }, [apiFetch, id]);

    useEffect(() => { load(); }, [load]);

    async function changeStatus(newStatus: string) {
        const op = STATUS_OPS[newStatus];
        if (!op || !confirm(`¿Cambiar estado a "${newStatus}"?`)) return;
        setActingStatus(true);
        try {
            const r = await apiFetch('/api/beta/admin/action', { method: 'POST', body: JSON.stringify({ userId: id, op }) });
            const d = await r.json();
            if (!r.ok) { toast.error(d.error ?? 'Error'); return; }
            toast.success('Estado actualizado'); load();
        } finally { setActingStatus(false); }
    }

    async function adjustPoints() {
        const n = parseInt(delta, 10);
        if (!Number.isFinite(n) || n === 0) { toast.error('Delta inválido'); return; }
        setAdjusting(true);
        try {
            const r = await apiFetch('/api/beta/admin/action', { method: 'POST', body: JSON.stringify({ userId: id, op: 'adjust_points', delta: n, note }) });
            const d = await r.json();
            if (!r.ok) { toast.error(d.error ?? 'Error'); return; }
            toast.success(`Puntos: ${n > 0 ? '+' : ''}${n}`); setDelta(''); setNote(''); load();
        } finally { setAdjusting(false); }
    }

    async function saveNote() {
        if (!newNote.trim()) return;
        setSavingNote(true);
        try {
            const r = await apiFetch(`/api/beta/admin/participants/${id}/notes`, { method: 'POST', body: JSON.stringify({ content: newNote.trim() }) });
            const d = await r.json();
            if (!r.ok) { toast.error(d.error ?? 'Error'); return; }
            toast.success('Nota guardada'); setNewNote(''); load();
        } finally { setSavingNote(false); }
    }

    async function deleteNote(noteId: string) {
        setDeletingNote(noteId);
        try {
            const r = await apiFetch(`/api/beta/admin/participants/${id}/notes?noteId=${noteId}`, { method: 'DELETE' });
            if (r.ok) { toast.success('Nota eliminada'); load(); }
        } finally { setDeletingNote(null); }
    }

    if (loading && !data) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#1a5c2e]" size={24} /></div>;
    if (!data) return <div className="text-center py-16 text-gray-500">Participante no encontrado</div>;

    const { user } = data;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/beta/admin/participants" className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
                    <ArrowLeft size={18} />
                </Link>
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">{user.avatar}</div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-gray-900">{user.nickname}</h1>
                        {user.rank && <span className="text-sm font-bold text-[#b87514]">#{user.rank}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[user.status] ?? 'bg-gray-100 text-gray-500'}`}>{user.status}</span>
                    </div>
                    <p className="text-sm text-gray-400">{user.email}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                {/* Sidebar */}
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5 text-sm">
                        <Row label="Puntos" value={<span className="font-bold text-[#1a5c2e]">{user.points}</span>} />
                        <Row label="Referido por" value={data.referredBy?.nickname ?? '—'} />
                        <Row label="Invitados" value={data.referralsGiven.length} />
                        <Row label="Misiones" value={data.completions.length} />
                        <Row label="Revisiones" value={data.reviews.length} />
                        <Row label="Código ref." value={<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">{user.referral_code}</code>} />
                        <Row label="Verificado" value={user.email_verified_at ? '✅' : '❌'} />
                        <Row label="Registro" value={<span className="text-gray-400">{new Date(user.created_at).toLocaleDateString('es-ES')}</span>} />
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Estado</p>
                        <div className="space-y-1">
                            {Object.entries(STATUS_OPS).map(([status]) => (
                                <button key={status} disabled={actingStatus || user.status === status} onClick={() => changeStatus(status)}
                                    className={`w-full px-3 py-1.5 rounded-xl text-xs font-medium text-left transition-colors ${user.status === status ? 'bg-[#edf7f1] text-[#1a5c2e]' : 'hover:bg-gray-50 text-gray-700 border border-gray-100'}`}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Ajustar puntos</p>
                        <input value={delta} onChange={e => setDelta(e.target.value)} type="number" placeholder="+50 o -20" className={clsInput + ' mb-2'} />
                        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Motivo" className={clsInput + ' mb-2.5'} />
                        <button onClick={adjustPoints} disabled={adjusting || !delta} className="w-full py-2 rounded-xl text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5" style={{ background: '#1a5c2e' }}>
                            {adjusting && <Loader2 size={12} className="animate-spin" />} Aplicar
                        </button>
                    </div>
                </div>

                {/* Main content with tabs */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Tab bar */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-100">
                            {TABS.map(t => (
                                <button key={t.id} onClick={() => setTab(t.id)}
                                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${tab === t.id ? 'border-[#1a5c2e] text-[#1a5c2e]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                    <t.icon size={13} />
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <div className="p-5">
                            {tab === 'resumen' && <TabResumen data={data} />}
                            {tab === 'actividad' && <TabActividad rows={data.activity} />}
                            {tab === 'misiones' && <TabMisiones completions={data.completions} />}
                            {tab === 'referidos' && <TabReferidos given={data.referralsGiven} by={data.referredBy} />}
                            {tab === 'historial' && <TabHistorial rows={data.history} />}
                            {tab === 'bugs' && <TabRevisiones rows={data.reviews} />}
                            {tab === 'notificaciones' && <TabNotificaciones rows={data.notifications} />}
                            {tab === 'logs' && <TabLogs rows={data.auditLog} />}
                            {tab === 'notas' && (
                                <TabNotas rows={data.notes} newNote={newNote} setNewNote={setNewNote}
                                    saving={savingNote} onSave={saveNote} onDelete={deleteNote} deleting={deletingNote} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">{label}</span>
            <span className="text-gray-800 text-xs font-medium">{value}</span>
        </div>
    );
}

function Empty({ msg = 'Sin datos' }: { msg?: string }) {
    return <p className="text-sm text-gray-400 text-center py-6">{msg}</p>;
}

function TabResumen({ data }: { data: Detail }) {
    const recent = data.activity.slice(0, 8);
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatCard label="Puntos totales" value={data.user.points} color="text-[#1a5c2e]" />
            <StatCard label="Misiones" value={data.completions.length} color="text-blue-600" />
            <StatCard label="Referidos" value={data.referralsGiven.filter((r: any) => r.status === 'validated').length} color="text-purple-600" />
            <StatCard label="Revisiones" value={data.reviews.length} color="text-amber-600" />
            {recent.length > 0 && (
                <div className="col-span-2 sm:col-span-4 mt-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Actividad reciente</p>
                    <div className="space-y-1">
                        {recent.map((r: any) => (
                            <div key={r.id} className="flex justify-between text-xs text-gray-600">
                                <span>{r.event_type.replace(/_/g, ' ').toLowerCase()}</span>
                                <span className="text-gray-400">{timeAgo(r.created_at)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
    return (
        <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
    );
}

function TabActividad({ rows }: { rows: any[] }) {
    if (!rows.length) return <Empty msg="Sin eventos registrados" />;
    return (
        <div className="space-y-1">
            {rows.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700 capitalize">{r.event_type.replace(/_/g, ' ').toLowerCase()}</span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{timeAgo(r.created_at)}</span>
                </div>
            ))}
        </div>
    );
}

function TabMisiones({ completions }: { completions: any[] }) {
    if (!completions.length) return <Empty msg="Sin misiones completadas" />;
    return (
        <div className="space-y-1">
            {completions.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-[#1a5c2e] shrink-0" />
                        <span className="text-sm text-gray-700">{c.beta_missions?.title ?? c.mission_id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-[#1a5c2e] font-semibold">+{c.beta_missions?.points ?? '?'}</span>
                        <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function TabReferidos({ given, by }: { given: any[]; by: any }) {
    return (
        <div className="space-y-4">
            {by && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm">
                    <span className="text-gray-500">Referido por: </span>
                    <span className="font-medium text-gray-800">{by.nickname}</span>
                </div>
            )}
            {!given.length ? <Empty msg="No ha invitado a nadie" /> : (
                <div className="space-y-1">
                    {given.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                            <span className="text-sm text-gray-700">{r.beta_users?.nickname ?? '?'}</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'validated' ? 'bg-[#edf7f1] text-[#1a5c2e]' : 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
                                <span className="text-xs text-gray-400">{timeAgo(r.created_at)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TabHistorial({ rows }: { rows: any[] }) {
    if (!rows.length) return <Empty msg="Sin historial de puntos" />;
    return (
        <div className="space-y-0">
            {rows.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <div>
                        <p className="text-sm text-gray-700">{h.label}</p>
                        <p className="text-xs text-gray-400">{timeAgo(h.created_at)}</p>
                    </div>
                    <span className={`text-sm font-bold ${h.delta > 0 ? 'text-[#1a5c2e]' : 'text-red-500'}`}>{h.delta > 0 ? '+' : ''}{h.delta}</span>
                </div>
            ))}
        </div>
    );
}

function TabRevisiones({ rows }: { rows: any[] }) {
    if (!rows.length) return <Empty msg="Sin revisiones" />;
    const statusColor: Record<string, string> = { approved: 'bg-[#edf7f1] text-[#1a5c2e]', pending: 'bg-amber-50 text-amber-600', rejected: 'bg-red-50 text-red-500' };
    return (
        <div className="space-y-0">
            {rows.map((r: any) => (
                <div key={r.id} className="py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-700">{r.beta_missions?.title ?? '?'}</p>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[r.status] ?? 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
                            <span className="text-xs text-gray-400">{timeAgo(r.created_at)}</span>
                        </div>
                    </div>
                    {r.title && <p className="text-xs text-gray-400 mt-0.5 truncate">{r.title}</p>}
                    {r.reviewed_by && <p className="text-xs text-gray-300 mt-0.5">por {r.reviewed_by}</p>}
                </div>
            ))}
        </div>
    );
}

function TabNotificaciones({ rows }: { rows: any[] }) {
    if (!rows.length) return <Empty msg="Sin notificaciones" />;
    return (
        <div className="space-y-0">
            {rows.map((n: any) => (
                <div key={n.id} className={`py-2.5 border-b border-gray-50 last:border-0 ${n.is_read ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-sm font-medium text-gray-700">{n.title}</p>
                            {n.message && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>}
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-xs text-gray-400">{timeAgo(n.created_at)}</p>
                            {!n.is_read && <span className="text-xs text-[#1a5c2e]">nueva</span>}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function TabLogs({ rows }: { rows: any[] }) {
    if (!rows.length) return <Empty msg="Sin entradas de audit log" />;
    return (
        <div className="space-y-0">
            {rows.map((l: any) => (
                <div key={l.id} className="py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex justify-between items-start gap-2">
                        <div>
                            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mr-2">{l.action}</span>
                            <span className="text-xs text-gray-400">por {l.admin_email}</span>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{timeAgo(l.created_at)}</span>
                    </div>
                    {(l.before_value || l.after_value) && (
                        <div className="mt-1 flex gap-2 text-xs font-mono text-gray-400">
                            {l.before_value && <span className="bg-red-50 text-red-400 px-1.5 rounded">{JSON.stringify(l.before_value)}</span>}
                            {l.after_value && <span className="bg-[#edf7f1] text-[#1a5c2e] px-1.5 rounded">{JSON.stringify(l.after_value)}</span>}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function TabNotas({ rows, newNote, setNewNote, saving, onSave, onDelete, deleting }: {
    rows: any[]; newNote: string; setNewNote: (v: string) => void;
    saving: boolean; onSave: () => void; onDelete: (id: string) => void; deleting: string | null;
}) {
    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={2} placeholder="Escribe una nota interna…"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e] resize-none" />
                <button onClick={onSave} disabled={saving || !newNote.trim()}
                    className="px-3 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 flex items-center gap-1" style={{ background: '#1a5c2e' }}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                </button>
            </div>
            {!rows.length ? <Empty msg="Sin notas" /> : (
                <div className="space-y-2">
                    {rows.map((n: any) => (
                        <div key={n.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                            <div className="flex justify-between items-start gap-2">
                                <p className="text-sm text-gray-800 flex-1">{n.content}</p>
                                <button onClick={() => onDelete(n.id)} disabled={deleting === n.id}
                                    className="p-1 rounded-lg hover:bg-amber-100 text-amber-400 hover:text-red-500 transition-colors shrink-0">
                                    {deleting === n.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{n.admin_email} · {timeAgo(n.created_at)}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
