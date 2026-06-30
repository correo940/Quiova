'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../AdminContext';
import { Loader2, Save, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface ConfigItem {
    key: string; value: unknown; label?: string; description?: string; category?: string;
}
interface BetaEvent {
    id: string; title: string; event_date: string; icon: string; sort_order: number; active: boolean;
}

const EVENT_EMPTY = { title: '', event_date: '', icon: '📅', sort_order: 0, active: true };

export default function ConfigPage() {
    const { apiFetch } = useAdmin();
    const [config, setConfig] = useState<ConfigItem[]>([]);
    const [events, setEvents] = useState<BetaEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});
    const [eventModal, setEventModal] = useState(false);
    const [eventForm, setEventForm] = useState<typeof EVENT_EMPTY>(EVENT_EMPTY);
    const [editEventId, setEditEventId] = useState<string | null>(null);
    const [savingEvent, setSavingEvent] = useState(false);
    const [deletingEvent, setDeletingEvent] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await apiFetch('/api/beta/admin/config');
            const d = await r.json();
            setConfig(d.config ?? []);
            setEvents(d.events ?? []);
            const map: Record<string, unknown> = {};
            (d.config ?? []).forEach((c: ConfigItem) => { map[c.key] = c.value; });
            setLocalConfig(map);
        } catch { toast.error('Error al cargar configuración'); } finally { setLoading(false); }
    }, [apiFetch]);

    useEffect(() => { load(); }, [load]);

    async function saveConfig() {
        setSaving(true);
        try {
            const r = await apiFetch('/api/beta/admin/config', {
                method: 'POST',
                body: JSON.stringify({ action: 'update_config', updates: localConfig }),
            });
            if (r.ok) { toast.success('Configuración guardada'); load(); }
            else toast.error('Error al guardar');
        } finally { setSaving(false); }
    }

    function setValue(key: string, val: unknown) {
        setLocalConfig(prev => ({ ...prev, [key]: val }));
    }

    function renderField(item: ConfigItem) {
        const val = localConfig[item.key];
        if (typeof val === 'boolean') {
            return (
                <button onClick={() => setValue(item.key, !val)} className="relative w-10 h-5 rounded-full transition-colors focus:outline-none" style={{ background: val ? '#1a5c2e' : '#d1d5db' }}>
                    <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform" style={{ transform: `translateX(${val ? 22 : 2}px)` }} />
                </button>
            );
        }
        if (typeof val === 'number') {
            return (
                <input
                    type="number"
                    value={val}
                    onChange={e => setValue(item.key, Number(e.target.value))}
                    className="w-32 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e]"
                />
            );
        }
        if (item.key.includes('date')) {
            return (
                <input
                    type="date"
                    value={typeof val === 'string' ? val.slice(0, 10) : ''}
                    onChange={e => setValue(item.key, e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e]"
                />
            );
        }
        return (
            <input
                value={typeof val === 'string' ? val : JSON.stringify(val)}
                onChange={e => setValue(item.key, e.target.value)}
                className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e]"
            />
        );
    }

    const categories = [...new Set(config.map(c => c.category ?? 'general'))];

    function openCreateEvent() { setEditEventId(null); setEventForm(EVENT_EMPTY); setEventModal(true); }
    function openEditEvent(e: BetaEvent) {
        setEditEventId(e.id);
        setEventForm({ title: e.title, event_date: e.event_date.slice(0, 10), icon: e.icon, sort_order: e.sort_order, active: e.active });
        setEventModal(true);
    }

    async function saveEvent() {
        if (!eventForm.title || !eventForm.event_date) { toast.error('Completa los campos obligatorios'); return; }
        setSavingEvent(true);
        try {
            const r = await apiFetch('/api/beta/admin/config', {
                method: 'POST',
                body: JSON.stringify({ action: 'upsert_event', id: editEventId, ...eventForm }),
            });
            if (r.ok) { toast.success(editEventId ? 'Evento actualizado' : 'Evento creado'); setEventModal(false); load(); }
            else toast.error('Error al guardar evento');
        } finally { setSavingEvent(false); }
    }

    async function deleteEvent(id: string) {
        if (!confirm('¿Eliminar este evento?')) return;
        setDeletingEvent(id);
        try {
            const r = await apiFetch('/api/beta/admin/config', { method: 'POST', body: JSON.stringify({ action: 'delete_event', id }) });
            if (r.ok) { toast.success('Evento eliminado'); load(); }
        } finally { setDeletingEvent(null); }
    }

    if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#1a5c2e]" size={24} /></div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Gestiona todos los parámetros de la Beta sin tocar código</p>
                </div>
                <button onClick={saveConfig} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 transition-opacity" style={{ background: '#1a5c2e' }}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Guardar cambios
                </button>
            </div>

            {/* Config keys by category */}
            {categories.map(cat => {
                const items = config.filter(c => (c.category ?? 'general') === cat);
                return (
                    <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat}</h2>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {items.map(item => (
                                <div key={item.key} className="flex items-center justify-between px-5 py-4 gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{item.label ?? item.key}</p>
                                        {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                                        <p className="text-xs text-gray-300 font-mono mt-0.5">{item.key}</p>
                                    </div>
                                    <div className="shrink-0">{renderField(item)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* Events */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Próximos eventos</h2>
                    <button onClick={openCreateEvent} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: '#1a5c2e' }}>
                        <Plus size={13} /> Añadir
                    </button>
                </div>
                <div className="divide-y divide-gray-50">
                    {events.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Sin eventos configurados</p>}
                    {events.map(e => (
                        <div key={e.id} className="flex items-center gap-3 px-5 py-4">
                            <span className="text-xl">{e.icon}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{e.title}</p>
                                <p className="text-xs text-gray-400">{new Date(e.event_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                            {!e.active && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inactivo</span>}
                            <div className="flex items-center gap-1">
                                <button onClick={() => openEditEvent(e)} className="p-1.5 rounded-lg hover:bg-[#edf7f1] text-gray-400 hover:text-[#1a5c2e] transition-colors">
                                    <Save size={14} />
                                </button>
                                <button disabled={deletingEvent === e.id} onClick={() => deleteEvent(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                                    {deletingEvent === e.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Event modal */}
            {eventModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="font-bold text-lg text-gray-900">{editEventId ? 'Editar evento' : 'Nuevo evento'}</h2>
                            <button onClick={() => setEventModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-4 gap-3">
                                <div className="col-span-1">
                                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Icono</label>
                                    <input value={eventForm.icon} onChange={e => setEventForm(f => ({ ...f, icon: e.target.value }))} className="w-full px-3 py-2 text-center text-xl border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e]" />
                                </div>
                                <div className="col-span-3">
                                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Título *</label>
                                    <input value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e]" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Fecha *</label>
                                <input type="date" value={eventForm.event_date} onChange={e => setEventForm(f => ({ ...f, event_date: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e]" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Orden</label>
                                <input type="number" value={eventForm.sort_order} onChange={e => setEventForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e]" />
                            </div>
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <div className="relative">
                                    <input type="checkbox" checked={eventForm.active} onChange={e => setEventForm(f => ({ ...f, active: e.target.checked }))} className="sr-only" />
                                    <div className={`w-10 h-5 rounded-full transition-colors ${eventForm.active ? 'bg-[#1a5c2e]' : 'bg-gray-300'}`} />
                                    <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform" style={{ transform: `translateX(${eventForm.active ? 22 : 2}px)` }} />
                                </div>
                                <span className="text-sm text-gray-700">Evento activo</span>
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 px-6 pb-6">
                            <button onClick={() => setEventModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
                            <button onClick={saveEvent} disabled={savingEvent} className="px-4 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 flex items-center gap-2" style={{ background: '#1a5c2e' }}>
                                {savingEvent && <Loader2 size={14} className="animate-spin" />}
                                {editEventId ? 'Guardar' : 'Crear evento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
