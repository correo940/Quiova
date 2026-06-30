'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../AdminContext';
import { Loader2, Plus, Trash2, X, Key, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface SecretCode {
    id: string; code: string; description: string | null;
    points: number; max_claims: number | null; active: boolean;
    created_at: string; claims_count?: number;
}

const EMPTY = { code: '', description: '', points: 50, max_claims: '', active: true };

export default function CodesPage() {
    const { apiFetch } = useAdmin();
    const [codes, setCodes] = useState<SecretCode[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState<typeof EMPTY>(EMPTY);
    const [deleting, setDeleting] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await apiFetch('/api/beta/admin/code');
            const d = await r.json();
            setCodes(d.codes ?? []);
        } catch { toast.error('Error al cargar códigos'); } finally { setLoading(false); }
    }, [apiFetch]);

    useEffect(() => { load(); }, [load]);

    async function save() {
        if (!form.code.trim()) { toast.error('El código es obligatorio'); return; }
        setSaving(true);
        try {
            const body = {
                code: form.code.trim().toUpperCase(),
                description: form.description || null,
                points: Number(form.points) || 0,
                max_claims: form.max_claims ? Number(form.max_claims) : null,
                active: form.active,
            };
            const r = await apiFetch('/api/beta/admin/code', { method: 'POST', body: JSON.stringify(body) });
            const d = await r.json();
            if (!r.ok) { toast.error(d.error ?? 'Error'); return; }
            toast.success('Código creado');
            setModal(false); setForm(EMPTY); load();
        } finally { setSaving(false); }
    }

    async function toggleActive(id: string, active: boolean) {
        await apiFetch('/api/beta/admin/code', { method: 'PATCH', body: JSON.stringify({ id, active: !active }) });
        setCodes(prev => prev.map(c => c.id === id ? { ...c, active: !active } : c));
    }

    async function deleteCode(id: string) {
        if (!confirm('¿Desactivar permanentemente este código?')) return;
        setDeleting(id);
        try {
            await apiFetch(`/api/beta/admin/code?id=${id}`, { method: 'DELETE' });
            toast.success('Código eliminado');
            load();
        } finally { setDeleting(null); }
    }

    function copyCode(code: string) {
        navigator.clipboard.writeText(code).then(() => toast.success('Código copiado'));
    }

    const field = (key: keyof typeof form, val: unknown) => setForm(f => ({ ...f, [key]: val }));
    const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Códigos Secretos</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{codes.length} códigos configurados</p>
                </div>
                <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-opacity" style={{ background: '#1a5c2e' }}>
                    <Plus size={16} /> Nuevo código
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#1a5c2e]" size={24} /></div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Código</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Descripción</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Pts</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Usos</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Creado</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {codes.map(c => (
                                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono font-bold text-[#1a5c2e] bg-[#edf7f1] px-2 py-0.5 rounded-lg text-sm">{c.code}</code>
                                            <button onClick={() => copyCode(c.code)} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
                                                <Copy size={12} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{c.description ?? '—'}</td>
                                    <td className="px-4 py-3"><span className="font-semibold text-[#1a5c2e]">{c.points}</span></td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {c.claims_count ?? 0}{c.max_claims != null ? ` / ${c.max_claims}` : ''}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => toggleActive(c.id, c.active)} className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${c.active ? 'bg-[#edf7f1] text-[#1a5c2e] hover:bg-[#d1ead9]' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                                            {c.active ? 'Activo' : 'Inactivo'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(c.created_at)}</td>
                                    <td className="px-4 py-3">
                                        <button disabled={deleting === c.id} onClick={() => deleteCode(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                                            {deleting === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {codes.length === 0 && !loading && (
                        <div className="text-center py-12">
                            <Key size={32} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">No hay códigos secretos</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {modal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="font-bold text-lg text-gray-900">Nuevo código secreto</h2>
                            <button onClick={() => { setModal(false); setForm(EMPTY); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Código *</label>
                                <input value={form.code} onChange={e => field('code', e.target.value.toUpperCase())} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e]" placeholder="QUIOBA2026" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Descripción</label>
                                <input value={form.description} onChange={e => field('description', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e]" placeholder="Código de lanzamiento" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Puntos</label>
                                    <input type="number" min={0} value={form.points} onChange={e => field('points', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e]" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Usos máx. (vacío = ilimitado)</label>
                                    <input type="number" min={1} value={form.max_claims} onChange={e => field('max_claims', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e]" placeholder="∞" />
                                </div>
                            </div>
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <div className="relative">
                                    <input type="checkbox" checked={form.active} onChange={e => field('active', e.target.checked)} className="sr-only" />
                                    <div className={`w-10 h-5 rounded-full transition-colors ${form.active ? 'bg-[#1a5c2e]' : 'bg-gray-300'}`} />
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform`} style={{ transform: `translateX(${form.active ? 22 : 2}px)` }} />
                                </div>
                                <span className="text-sm text-gray-700">Código activo</span>
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 px-6 pb-6">
                            <button onClick={() => { setModal(false); setForm(EMPTY); }} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 flex items-center gap-2" style={{ background: '#1a5c2e' }}>
                                {saving && <Loader2 size={14} className="animate-spin" />} Crear código
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
