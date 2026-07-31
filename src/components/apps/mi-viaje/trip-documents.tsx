'use client';

import { useEffect, useRef, useState } from 'react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    FileText, Plane, BedDouble, Ticket, Bus, Upload, Loader2,
    Trash2, ExternalLink, ImageOff, Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getApiUrl } from '@/lib/api-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const BUCKET = 'trip-documents';

const TYPE_META: Record<string, { label: string; icon: typeof Plane }> = {
    flight: { label: 'Vuelo', icon: Plane },
    hotel: { label: 'Hotel', icon: BedDouble },
    activity: { label: 'Actividad', icon: Ticket },
    transport: { label: 'Transporte', icon: Bus },
    other: { label: 'Otro', icon: FileText },
};

type TripAsset = {
    id: string;
    asset_type: string;
    title: string;
    reference_code: string | null;
    event_date: string | null;
    location: string | null;
    file_path: string | null;
    retention_days: number;
    expires_at: string;
};

type PendingAnalysis = {
    file: File;
    asset_type: string;
    title: string;
    reference_code: string;
    event_date: string;
    location: string;
    extracted_text: string;
    retention_days: 15 | 30;
};

export function TripDocuments({ tripId, tripEndDate }: { tripId: string; tripEndDate: string }) {
    const [documents, setDocuments] = useState<TripAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pending, setPending] = useState<PendingAnalysis | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadDocuments();
    }, [tripId]);

    async function loadDocuments() {
        setLoading(true);
        const { data, error } = await supabase
            .from('trip_assets')
            .select('id, asset_type, title, reference_code, event_date, location, file_path, retention_days, expires_at')
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false });

        if (!error) setDocuments(data || []);
        setLoading(false);
    }

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error('El archivo es demasiado grande (máx 10MB)');
            return;
        }

        setAnalyzing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error('Necesitas iniciar sesión');

            const body = new FormData();
            body.append('file', file);

            const response = await fetch(getApiUrl('api/mi-viaje/parse-document'), {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
                body,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || 'No se pudo analizar el documento');

            const analysis = data.analysis;
            setPending({
                file,
                asset_type: analysis.asset_type || 'other',
                title: analysis.title || file.name,
                reference_code: analysis.reference_code || '',
                event_date: analysis.event_date ? analysis.event_date.slice(0, 16) : '',
                location: analysis.location || '',
                extracted_text: data.extracted_text || '',
                retention_days: 30,
            });
            toast.success('Documento analizado — revisa los datos y guarda');
        } catch (error: any) {
            toast.error(error.message || 'No se pudo analizar el documento');
        } finally {
            setAnalyzing(false);
        }
    }

    async function handleConfirmSave() {
        if (!pending) return;
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado');

            const fileExt = pending.file.name.split('.').pop();
            const filePath = `${user.id}/${tripId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, pending.file);
            if (uploadError) throw uploadError;

            const expiresAt = addDays(new Date(tripEndDate), pending.retention_days).toISOString();

            const { error: insertError } = await supabase.from('trip_assets').insert({
                trip_id: tripId,
                asset_type: pending.asset_type,
                title: pending.title.trim() || 'Documento de viaje',
                reference_code: pending.reference_code.trim() || null,
                event_date: pending.event_date ? new Date(pending.event_date).toISOString() : null,
                location: pending.location.trim() || null,
                file_path: filePath,
                extracted_text: pending.extracted_text,
                retention_days: pending.retention_days,
                expires_at: expiresAt,
            });

            if (insertError) throw insertError;

            toast.success('Documento guardado');
            setPending(null);
            loadDocuments();
        } catch (error: any) {
            toast.error(error.message || 'No se pudo guardar el documento');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(doc: TripAsset) {
        if (doc.file_path) {
            await supabase.storage.from(BUCKET).remove([doc.file_path]);
        }
        await supabase.from('trip_assets').delete().eq('id', doc.id);
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    }

    async function handleView(doc: TripAsset) {
        if (!doc.file_path) return;
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 60);
        if (error || !data?.signedUrl) {
            toast.error('No se pudo abrir el documento');
            return;
        }
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    }

    return (
        <Card className="mb-6">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <FileText className="h-3.5 w-3.5" />
                        Documentos
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 h-8"
                        disabled={analyzing}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        Subir billete / hotel
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                </div>

                {pending && (
                    <div className="mb-4 p-3 rounded-xl border border-[#1a5c2e]/30 bg-[#1a5c2e]/5 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#1a5c2e]">
                            <Sparkles className="h-3.5 w-3.5" />
                            Revisa lo que detectó la IA
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs">Tipo</Label>
                                <Select value={pending.asset_type} onValueChange={(v) => setPending({ ...pending, asset_type: v })}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(TYPE_META).map(([key, meta]) => (
                                            <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Guardar foto</Label>
                                <Select
                                    value={String(pending.retention_days)}
                                    onValueChange={(v) => setPending({ ...pending, retention_days: Number(v) as 15 | 30 })}
                                >
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="15">15 días tras el viaje</SelectItem>
                                        <SelectItem value="30">30 días tras el viaje</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Título</Label>
                            <Input
                                className="h-9"
                                value={pending.title}
                                onChange={(e) => setPending({ ...pending, title: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs">Referencia / localizador</Label>
                                <Input
                                    className="h-9"
                                    value={pending.reference_code}
                                    onChange={(e) => setPending({ ...pending, reference_code: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Fecha / hora</Label>
                                <Input
                                    className="h-9"
                                    type="datetime-local"
                                    value={pending.event_date}
                                    onChange={(e) => setPending({ ...pending, event_date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Lugar</Label>
                            <Input
                                className="h-9"
                                value={pending.location}
                                onChange={(e) => setPending({ ...pending, location: e.target.value })}
                            />
                        </div>
                        <p className="text-[11px] text-slate-500">
                            La foto se borra sola a los {pending.retention_days} días de terminar el viaje. Los datos de texto se conservan para poder compartir el viaje en el futuro.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setPending(null)}>Cancelar</Button>
                            <Button
                                size="sm"
                                disabled={saving}
                                onClick={handleConfirmSave}
                                className="bg-gradient-to-br from-[#1a5c2e] to-[#1e7a3a] text-white gap-2"
                            >
                                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Guardar
                            </Button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                ) : documents.length === 0 && !pending ? (
                    <p className="text-sm text-slate-400">Sube billetes, QRs o reservas de hotel y la IA rellenará los datos.</p>
                ) : (
                    <div className="space-y-2">
                        {documents.map((doc) => {
                            const meta = TYPE_META[doc.asset_type] || TYPE_META.other;
                            const Icon = meta.icon;
                            const expired = !doc.file_path;
                            return (
                                <div key={doc.id} className="flex items-center gap-3 group py-1.5">
                                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                                        <Icon className="h-3.5 w-3.5 text-slate-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{doc.title}</p>
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            {doc.event_date && format(new Date(doc.event_date), "d MMM, HH:mm", { locale: es })}
                                            {doc.location ? ` · ${doc.location}` : ''}
                                            {expired && (
                                                <span className="flex items-center gap-1 text-amber-600">
                                                    <ImageOff className="h-3 w-3" /> foto eliminada, datos conservados
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {!expired && (
                                        <button onClick={() => handleView(doc)} className="text-slate-400 hover:text-[#1a5c2e]">
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(doc)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
