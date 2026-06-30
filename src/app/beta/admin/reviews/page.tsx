'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../AdminContext';
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Review {
    id: string; status: string; title: string | null; description: string | null;
    created_at: string; reviewed_at: string | null; reviewed_by: string | null;
    beta_users: { id: string; nickname: string; email: string; avatar_id: string; points: number } | null;
    beta_missions: { id: string; key: string; title: string; points: number; verification_type: string; type: string } | null;
}

const TABS = [
    { key: 'pending', label: 'Pendientes' },
    { key: 'approved', label: 'Aprobadas' },
    { key: 'rejected', label: 'Rechazadas' },
];

const TYPE_LABELS: Record<string, string> = {
    bug: 'Bug', social: 'Social', referral: 'Referido', code: 'Código', share: 'Compartir', custom: 'Custom',
};

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'ahora';
    if (m < 60) return `hace ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h}h`;
    return `hace ${Math.floor(h / 24)}d`;
}

function getBetaAvatarEmoji(id: string): string {
    const emojis = ['🦁', '🐯', '🦊', '🐺', '🦅', '🐬', '🦋', '🌟', '🔥', '🌊', '⚡', '🎯', '🚀', '💎', '🌙', '🎪'];
    const idx = Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % emojis.length;
    return emojis[idx];
}

export default function ReviewsPage() {
    const { apiFetch } = useAdmin();
    const [tab, setTab] = useState('pending');
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(false);
    const [acting, setActing] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await apiFetch(`/api/beta/admin/review?status=${tab}`);
            const d = await r.json();
            setReviews(d.reviews ?? []);
        } catch { toast.error('Error al cargar revisiones'); } finally { setLoading(false); }
    }, [apiFetch, tab]);

    useEffect(() => { load(); }, [load]);

    async function act(id: string, action: 'approve' | 'reject') {
        setActing(id);
        try {
            const r = await apiFetch('/api/beta/admin/review', {
                method: 'POST',
                body: JSON.stringify({ reviewId: id, action }),
            });
            const d = await r.json();
            if (!r.ok) { toast.error(d.error ?? 'Error'); return; }
            toast.success(action === 'approve' ? 'Revisión aprobada' : 'Revisión rechazada');
            setReviews(prev => prev.filter(r => r.id !== id));
        } finally { setActing(null); }
    }

    function typeLabel(r: Review) {
        if (r.beta_missions?.type === 'bug') return { label: 'Bug', color: '#dc2626', bg: '#fef2f2' };
        if (r.beta_missions?.verification_type === 'declaration') return { label: 'Declarativa', color: '#2563eb', bg: '#eff6ff' };
        return { label: TYPE_LABELS[r.beta_missions?.type ?? ''] ?? 'Manual', color: '#7c3aed', bg: '#f5f3ff' };
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Revisiones</h1>
                <p className="text-sm text-gray-500 mt-0.5">Gestiona las solicitudes de misión pendientes de validación</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#1a5c2e]" size={24} /></div>
            ) : reviews.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <Clock size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No hay revisiones {tab === 'pending' ? 'pendientes' : tab === 'approved' ? 'aprobadas' : 'rechazadas'}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reviews.map(r => {
                        const { label, color, bg } = typeLabel(r);
                        const isExpanded = expanded === r.id;
                        const avatar = r.beta_users ? getBetaAvatarEmoji(r.beta_users.avatar_id) : '?';
                        return (
                            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div
                                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => setExpanded(isExpanded ? null : r.id)}
                                >
                                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-lg shrink-0">{avatar}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-gray-900">{r.beta_users?.nickname ?? '?'}</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: bg, color }}>{label}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{r.beta_missions?.title ?? '?'} · {r.beta_missions?.points ?? 0} pts</p>
                                    </div>
                                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(r.created_at)}</span>
                                    {tab === 'pending' && (
                                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                            <button
                                                disabled={acting === r.id}
                                                onClick={e => { e.stopPropagation(); act(r.id, 'approve'); }}
                                                className="p-2 rounded-xl bg-[#edf7f1] text-[#1a5c2e] hover:bg-[#d1ead9] transition-colors disabled:opacity-50"
                                            >
                                                {acting === r.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                                            </button>
                                            <button
                                                disabled={acting === r.id}
                                                onClick={e => { e.stopPropagation(); act(r.id, 'reject'); }}
                                                className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                                            >
                                                <XCircle size={15} />
                                            </button>
                                        </div>
                                    )}
                                    {isExpanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                                </div>
                                {isExpanded && (
                                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2">
                                        {r.title && <p className="text-sm font-medium text-gray-700">{r.title}</p>}
                                        {r.description && <p className="text-sm text-gray-600 whitespace-pre-wrap">{r.description}</p>}
                                        {!r.title && !r.description && <p className="text-xs text-gray-400 italic">Sin descripción adicional</p>}
                                        <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                                            <span>Usuario: {r.beta_users?.email ?? '?'}</span>
                                            <span>{r.beta_users?.points ?? 0} pts actuales</span>
                                            {r.reviewed_by && <span>Revisado por: {r.reviewed_by}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
