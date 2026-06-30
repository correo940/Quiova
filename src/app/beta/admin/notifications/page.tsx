'use client';

import { useState } from 'react';
import { useAdmin } from '../AdminContext';
import { Loader2, Bell, Send } from 'lucide-react';
import { toast } from 'sonner';

const TYPES = [
    { value: 'info', label: 'Info', color: '#2563eb' },
    { value: 'success', label: 'Éxito', color: '#1a5c2e' },
    { value: 'warning', label: 'Aviso', color: '#b87514' },
    { value: 'announcement', label: 'Anuncio', color: '#7c3aed' },
];

const TARGETS = [
    { value: 'all', label: 'Todos los participantes' },
    { value: 'top50', label: 'Top 50 (clasificados)' },
    { value: 'out_top50', label: 'Fuera del Top 50' },
    { value: 'unverified', label: 'Sin verificar email' },
];

export default function NotificationsPage() {
    const { apiFetch } = useAdmin();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('info');
    const [target, setTarget] = useState('all');
    const [sending, setSending] = useState(false);
    const [lastResult, setLastResult] = useState<{ sent: number } | null>(null);

    async function send() {
        if (!title.trim() || !message.trim()) { toast.error('Completa todos los campos'); return; }
        if (!confirm(`¿Enviar notificación a "${TARGETS.find(t => t.value === target)?.label}"?`)) return;
        setSending(true);
        try {
            const r = await apiFetch('/api/beta/admin/notify', {
                method: 'POST',
                body: JSON.stringify({ title: title.trim(), message: message.trim(), type, target }),
            });
            const d = await r.json();
            if (!r.ok) { toast.error(d.error ?? 'Error al enviar'); return; }
            setLastResult({ sent: d.sent });
            toast.success(`Notificación enviada a ${d.sent} usuario(s)`);
            setTitle(''); setMessage('');
        } finally { setSending(false); }
    }

    const selectedType = TYPES.find(t => t.value === type)!;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
                <p className="text-sm text-gray-500 mt-0.5">Envía comunicados a grupos de participantes</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                {/* Target */}
                <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">Destinatarios</label>
                    <div className="grid grid-cols-2 gap-2">
                        {TARGETS.map(t => (
                            <button
                                key={t.value}
                                onClick={() => setTarget(t.value)}
                                className={`px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors border ${target === t.value ? 'border-[#1a5c2e] bg-[#edf7f1] text-[#1a5c2e]' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Type */}
                <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">Tipo</label>
                    <div className="flex gap-2 flex-wrap">
                        {TYPES.map(t => (
                            <button
                                key={t.value}
                                onClick={() => setType(t.value)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${type === t.value ? 'border-transparent text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                style={type === t.value ? { background: t.color } : {}}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Title */}
                <div>
                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Título *</label>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        maxLength={80}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e]"
                        placeholder="Ej: ¡Última semana para subir puntos!"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/80</p>
                </div>

                {/* Message */}
                <div>
                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Mensaje *</label>
                    <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        maxLength={500}
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/30 focus:border-[#1a5c2e] resize-none"
                        placeholder="Escribe el mensaje que verán los participantes..."
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/500</p>
                </div>

                {/* Preview */}
                {(title || message) && (
                    <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                        <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Vista previa</p>
                        <div className="bg-white rounded-lg p-3 border shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <Bell size={13} style={{ color: selectedType.color }} />
                                <span className="text-xs font-bold" style={{ color: selectedType.color }}>{selectedType.label.toUpperCase()}</span>
                            </div>
                            {title && <p className="text-sm font-semibold text-gray-900">{title}</p>}
                            {message && <p className="text-xs text-gray-600 mt-0.5">{message}</p>}
                        </div>
                    </div>
                )}

                {lastResult && (
                    <div className="flex items-center gap-2 p-3 bg-[#edf7f1] rounded-xl text-sm text-[#1a5c2e]">
                        <Bell size={16} />
                        <span>Última vez enviada a <strong>{lastResult.sent}</strong> usuario(s)</span>
                    </div>
                )}

                <button
                    onClick={send}
                    disabled={sending || !title.trim() || !message.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                    style={{ background: '#1a5c2e' }}
                >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {sending ? 'Enviando...' : `Enviar a ${TARGETS.find(t => t.value === target)?.label}`}
                </button>
            </div>
        </div>
    );
}
