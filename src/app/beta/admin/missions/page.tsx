'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../AdminContext';
import { Loader2, Plus, Pencil, Trash2, X, Target, Star } from 'lucide-react';
import { toast } from 'sonner';

interface Mission {
    id: string; key: string; title: string; description: string;
    points: number; type: string; verification_type: string;
    target_url: string | null; active: boolean; sort_order: number;
    repeatable: boolean; cooldown_hours: number; max_per_user: number;
    visible: boolean; featured: boolean;
    start_date: string | null; end_date: string | null;
    required_rank: number | null; required_points: number | null;
    badge: string | null; color: string | null; icon: string | null;
}

const TYPES = ['register', 'social', 'referral', 'code', 'bug', 'share', 'custom'];
const VTYPES = ['automatic', 'declaration', 'manual'];
const TYPE_LABELS: Record<string, string> = { register: 'Registro', social: 'Social', referral: 'Referido', code: 'Código', bug: 'Bug', share: 'Compartir', custom: 'Custom' };
const VTYPE_LABELS: Record<string, string> = { automatic: 'Automática', declaration: 'Declarativa', manual: 'Manual' };
const VTYPE_COLORS: Record<string, string> = { automatic: 'bg-blue-50 text-blue-600', declaration: 'bg-amber-50 text-amber-600', manual: 'bg-purple-50 text-purple-600' };

const EMPTY: Omit<Mission, 'id'> = {
    key: '', title: '', description: '', points: 0, type: 'custom',
    verification_type: 'manual', target_url: '', active: true, sort_order: 99,
    repeatable: false, cooldown_hours: 0, max_per_user: 1,
    visible: true, featured: false,
    start_date: null, end_date: null,
    required_rank: null, required_points: null,
    badge: null, color: null, icon: null,
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" onClick={() => onChange(!checked)}
            className={`relative inline-flex w-10 h-5 rounded-full transition-colors ${checked ? 'bg-[#1a5c2e]' : 'bg-gray-300'}`}>
            <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                style={{ transform: `translateX(${checked ? 22 : 2}px)` }} />
        </button>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">{label}</label>
            {children}
        </div>
    );
}

const cls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e]";

export default function MissionsPage() {
    const { apiFetch } = useAdmin();
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState<Omit<Mission, 'id'>>(EMPTY);
    const [editKey, setEditKey] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await apiFetch('/api/beta/admin/mission');
            const d = await r.json();
            setMissions(d.missions ?? []);
        } catch { toast.error('Error al cargar misiones'); } finally { setLoading(false); }
    }, [apiFetch]);

    useEffect(() => { load(); }, [load]);

    function openCreate() { setEditKey(null); setForm(EMPTY); setModal(true); }
    function openEdit(m: Mission) {
        setEditKey(m.key);
        setForm({
            key: m.key, title: m.title, description: m.description,
            points: m.points, type: m.type, verification_type: m.verification_type,
            target_url: m.target_url ?? '', active: m.active, sort_order: m.sort_order,
            repeatable: m.repeatable ?? false, cooldown_hours: m.cooldown_hours ?? 0,
            max_per_user: m.max_per_user ?? 1, visible: m.visible ?? true,
            featured: m.featured ?? false,
            start_date: m.start_date ? m.start_date.slice(0, 16) : null,
            end_date: m.end_date ? m.end_date.slice(0, 16) : null,
            required_rank: m.required_rank ?? null, required_points: m.required_points ?? null,
            badge: m.badge ?? null, color: m.color ?? null, icon: m.icon ?? null,
        });
        setModal(true);
    }

    async function save() {
        if (!form.title.trim()) { toast.error('El título es obligatorio'); return; }
        setSaving(true);
        try {
            const payload = {
                ...form,
                start_date: form.start_date || null,
                end_date: form.end_date || null,
                required_rank: form.required_rank || null,
                required_points: form.required_points || null,
                badge: form.badge || null,
                color: form.color || null,
                icon: form.icon || null,
            };
            const r = await apiFetch('/api/beta/admin/mission', { method: 'POST', body: JSON.stringify(payload) });
            const d = await r.json();
            if (!r.ok) { toast.error(d.error ?? 'Error'); return; }
            toast.success(editKey ? 'Misión actualizada' : 'Misión creada');
            setModal(false); load();
        } finally { setSaving(false); }
    }

    async function deleteMission(key: string) {
        if (!confirm('¿Eliminar esta misión? Esta acción no se puede deshacer.')) return;
        setDeleting(key);
        try {
            const r = await apiFetch(`/api/beta/admin/mission?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
            if (r.ok) { toast.success('Misión eliminada'); load(); }
            else toast.error('Error al eliminar');
        } finally { setDeleting(null); }
    }

    const f = (k: keyof typeof form, val: unknown) => setForm(prev => ({ ...prev, [k]: val }));

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Misiones</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{missions.length} misiones configuradas</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors hover:opacity-90" style={{ background: '#1a5c2e' }}>
                    <Plus size={16} /> Nueva misión
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#1a5c2e]" size={24} /></div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Misión</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Verificación</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Pts</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Flags</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {missions.map(m => (
                                <tr key={m.key} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {m.icon && <span className="text-lg">{m.icon}</span>}
                                            <div>
                                                <p className="font-medium text-gray-900">{m.title}</p>
                                                <p className="text-xs text-gray-400 font-mono">{m.key}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{TYPE_LABELS[m.type] ?? m.type}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${VTYPE_COLORS[m.verification_type] ?? 'bg-gray-100 text-gray-600'}`}>{VTYPE_LABELS[m.verification_type] ?? m.verification_type}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-semibold text-[#1a5c2e]">{m.points}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            {m.featured && <span title="Destacada"><Star size={13} className="text-amber-500 fill-amber-500" /></span>}
                                            {m.repeatable && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">rep.</span>}
                                            {!m.visible && <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">oculta</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {m.active
                                            ? <span className="text-xs px-2 py-0.5 rounded-full bg-[#edf7f1] text-[#1a5c2e] font-medium">Activa</span>
                                            : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">Inactiva</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-[#edf7f1] text-gray-400 hover:text-[#1a5c2e] transition-colors">
                                                <Pencil size={14} />
                                            </button>
                                            <button disabled={deleting === m.key} onClick={() => deleteMission(m.key)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                                                {deleting === m.key ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {missions.length === 0 && !loading && (
                        <div className="text-center py-12">
                            <Target size={32} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">No hay misiones configuradas</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {modal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                            <h2 className="font-bold text-lg text-gray-900">{editKey ? 'Editar misión' : 'Nueva misión'}</h2>
                            <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Básico */}
                            <div className="space-y-3">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Básico</p>
                                <Field label="Título *">
                                    <input value={form.title} onChange={e => f('title', e.target.value)} className={cls} placeholder="Ej: Seguir en TikTok" />
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Key (slug) — vacío = auto">
                                        <input value={form.key} onChange={e => f('key', e.target.value)} disabled={!!editKey} className={cls + (editKey ? ' disabled:bg-gray-50 disabled:text-gray-400' : '')} placeholder="follow_tiktok" />
                                    </Field>
                                    <Field label="Icono (emoji)">
                                        <input value={form.icon ?? ''} onChange={e => f('icon', e.target.value)} className={cls} placeholder="🎯" />
                                    </Field>
                                </div>
                                <Field label="Descripción">
                                    <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={2} className={cls + ' resize-none'} />
                                </Field>
                                <Field label="URL objetivo (opcional)">
                                    <input value={form.target_url ?? ''} onChange={e => f('target_url', e.target.value)} className={cls} placeholder="https://..." />
                                </Field>
                            </div>

                            {/* Puntos y clasificación */}
                            <div className="space-y-3">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Puntos y clasificación</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <Field label="Puntos">
                                        <input type="number" min={0} value={form.points} onChange={e => f('points', parseInt(e.target.value) || 0)} className={cls} />
                                    </Field>
                                    <Field label="Orden">
                                        <input type="number" min={0} value={form.sort_order} onChange={e => f('sort_order', parseInt(e.target.value) || 0)} className={cls} />
                                    </Field>
                                    <Field label="Color (hex)">
                                        <input value={form.color ?? ''} onChange={e => f('color', e.target.value)} className={cls} placeholder="#1a5c2e" />
                                    </Field>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Badge">
                                        <input value={form.badge ?? ''} onChange={e => f('badge', e.target.value)} className={cls} placeholder="Fundador" />
                                    </Field>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Field label="Tipo">
                                            <select value={form.type} onChange={e => f('type', e.target.value)} className={cls}>
                                                {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Verificación">
                                            <select value={form.verification_type} onChange={e => f('verification_type', e.target.value)} className={cls}>
                                                {VTYPES.map(t => <option key={t} value={t}>{VTYPE_LABELS[t] ?? t}</option>)}
                                            </select>
                                        </Field>
                                    </div>
                                </div>
                            </div>

                            {/* Repetición */}
                            <div className="space-y-3">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Repetición</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <Field label="Máx. por usuario">
                                        <input type="number" min={1} value={form.max_per_user} onChange={e => f('max_per_user', parseInt(e.target.value) || 1)} className={cls} />
                                    </Field>
                                    <Field label="Cooldown (horas)">
                                        <input type="number" min={0} value={form.cooldown_hours} onChange={e => f('cooldown_hours', parseInt(e.target.value) || 0)} className={cls} disabled={!form.repeatable} />
                                    </Field>
                                    <div className="flex items-end pb-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <Toggle checked={form.repeatable} onChange={v => f('repeatable', v)} />
                                            <span className="text-sm text-gray-700">Repetible</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Requisitos */}
                            <div className="space-y-3">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Requisitos de acceso</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Puntos mínimos requeridos">
                                        <input type="number" min={0} value={form.required_points ?? ''} onChange={e => f('required_points', e.target.value ? parseInt(e.target.value) : null)} className={cls} placeholder="— sin requisito —" />
                                    </Field>
                                    <Field label="Rango máximo requerido">
                                        <input type="number" min={1} value={form.required_rank ?? ''} onChange={e => f('required_rank', e.target.value ? parseInt(e.target.value) : null)} className={cls} placeholder="— sin requisito —" />
                                    </Field>
                                </div>
                            </div>

                            {/* Fechas */}
                            <div className="space-y-3">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Ventana temporal (opcional)</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Fecha inicio">
                                        <input type="datetime-local" value={form.start_date ?? ''} onChange={e => f('start_date', e.target.value || null)} className={cls} />
                                    </Field>
                                    <Field label="Fecha fin">
                                        <input type="datetime-local" value={form.end_date ?? ''} onChange={e => f('end_date', e.target.value || null)} className={cls} />
                                    </Field>
                                </div>
                            </div>

                            {/* Visibilidad */}
                            <div className="space-y-3">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Visibilidad</p>
                                <div className="flex flex-wrap gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <Toggle checked={form.active} onChange={v => f('active', v)} />
                                        <span className="text-sm text-gray-700">Activa</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <Toggle checked={form.visible} onChange={v => f('visible', v)} />
                                        <span className="text-sm text-gray-700">Visible en dashboard</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <Toggle checked={form.featured} onChange={v => f('featured', v)} />
                                        <span className="text-sm text-gray-700">Destacada</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-6 pb-6 sticky bottom-0 bg-white border-t border-gray-100 pt-4">
                            <button onClick={() => setModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2" style={{ background: '#1a5c2e' }}>
                                {saving && <Loader2 size={14} className="animate-spin" />}
                                {editKey ? 'Guardar cambios' : 'Crear misión'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
