'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ArrowLeft,
    ArrowUpDown,
    AlertTriangle,
    Bell,
    Building2,
    CalendarClock,
    Clock3,
    Download,
    ExternalLink,
    Eye,
    FileBadge2,
    FileText,
    Files,
    Flag,
    History,
    Lock,
    NotebookPen,
    RefreshCcw,
    ScrollText,
    Search,
    Settings,
    Shield,
    ShieldCheck,
    Star,
    Tags,
    Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { differenceInDays, format, parseISO, startOfDay, subDays } from 'date-fns';
import { DocumentAnalysisResult, DocumentDialog, DocumentForm, DocumentMetadata } from '@/components/apps/mi-hogar/documents/document-dialog';
import { DocumentReminder, DocumentReminderDialog } from '@/components/apps/mi-hogar/documents/reminder-dialog';
import { DocumentVersionHistoryDialog } from '@/components/apps/mi-hogar/documents/version-history-dialog';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getApiUrl } from '@/lib/api-utils';

type SecureDocument = {
    id: string;
    title: string;
    category: string;
    expiration_date?: string | null;
    file_url: string;
    file_type?: string | null;
    is_favorite: boolean;
    created_at: string;
    updated_at?: string;
    tags?: string[];
    notes?: string | null;
    issuer?: string | null;
    summary?: string | null;
    document_type?: string | null;
    metadata?: DocumentMetadata | null;
    lifecycle_status: string;
    renewal_of?: string | null;
};

type SortOption = 'recent' | 'title' | 'expiry';
type DocumentStateTone = 'muted' | 'active' | 'warning' | 'expired';
type AlertSeverity = 'high' | 'medium' | 'low';
type AlertType = 'expiring' | 'expired' | 'missing_expiration' | 'missing_back' | 'lifecycle' | 'reminder';

type DocumentAlert = {
    id: string;
    documentId: string;
    documentTitle: string;
    title: string;
    description: string;
    severity: AlertSeverity;
    dueDate?: string | null;
    category: string;
    type: AlertType;
};

type DocumentAlertSettings = {
    expiring: boolean;
    expired: boolean;
    missing_expiration: boolean;
    missing_back: boolean;
    lifecycle: boolean;
    reminder: boolean;
    sync_to_tasks: boolean;
};

const DOCUMENTS_BUCKET = 'secure-docs';
const DOCUMENT_SETTINGS_KEY = 'quioba_document_alert_settings_v1';
const STORAGE_UPLOAD_TIMEOUT_MS = 45000;
const STORAGE_NOT_FOUND_MARKERS = ['not found', 'bucket not found', 'object not found'];
const CATEGORIES = ['Todos', 'Identidad', 'Vehiculo', 'Seguro', 'Hogar', 'Salud', 'Finanzas'];
const SMART_VIEWS = ['Todos', 'Urgentes', 'Caducados', 'Favoritos', 'Pendientes'];
const LIFECYCLE_LABELS: Record<string, string> = {
    activo: 'Activo',
    pendiente_revision: 'Pendiente de revision',
    pendiente_renovacion: 'Pendiente de renovacion',
    archivado: 'Archivado',
};
const AUTO_REMINDER_OFFSETS = [90, 30, 7, 1];
const DEFAULT_ALERT_SETTINGS: DocumentAlertSettings = {
    expiring: true,
    expired: true,
    missing_expiration: true,
    missing_back: true,
    lifecycle: true,
    reminder: true,
    sync_to_tasks: true,
};

const DEFAULT_FORM: DocumentForm = {
    title: '',
    category: '',
    tags: [],
    notes: '',
    issuer: '',
    summary: '',
    document_type: '',
    metadata: {},
    lifecycle_status: 'activo',
    renewal_of: null,
};

function loadAlertSettings(): DocumentAlertSettings {
    if (typeof window === 'undefined') return DEFAULT_ALERT_SETTINGS;
    try {
        const raw = window.localStorage.getItem(DOCUMENT_SETTINGS_KEY);
        if (!raw) return DEFAULT_ALERT_SETTINGS;
        return { ...DEFAULT_ALERT_SETTINGS, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_ALERT_SETTINGS;
    }
}

function saveAlertSettings(settings: DocumentAlertSettings) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DOCUMENT_SETTINGS_KEY, JSON.stringify(settings));
}

function getDocumentState(doc: SecureDocument): { label: string; tone: DocumentStateTone; daysUntilExpiration: number | null } {
    if (doc.lifecycle_status === 'archivado') return { label: 'Archivado', tone: 'muted', daysUntilExpiration: null };
    if (doc.lifecycle_status === 'pendiente_renovacion') return { label: 'Pendiente de renovacion', tone: 'warning', daysUntilExpiration: null };
    if (doc.lifecycle_status === 'pendiente_revision') return { label: 'Pendiente de revision', tone: 'warning', daysUntilExpiration: null };
    if (!doc.expiration_date) return { label: 'Sin vencimiento', tone: 'muted', daysUntilExpiration: null };
    const daysUntilExpiration = differenceInDays(parseISO(doc.expiration_date), new Date());
    if (daysUntilExpiration < 0) return { label: 'Caducado', tone: 'expired', daysUntilExpiration };
    if (daysUntilExpiration <= 30) return { label: 'Proximo a vencer', tone: 'warning', daysUntilExpiration };
    return { label: 'Vigente', tone: 'active', daysUntilExpiration };
}

function getFileLabel(fileType?: string | null) {
    if (!fileType) return 'Archivo';
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('image')) return 'Imagen';
    if (fileType.includes('word') || fileType.includes('document')) return 'Documento';
    return fileType.split('/')[1]?.toUpperCase() || 'Archivo';
}

function getDocumentFileName(doc: SecureDocument) {
    const rawExtension = doc.file_type?.split('/')[1] || doc.file_url.split('.').pop() || 'file';
    const extension = rawExtension.replace(/[^a-z0-9]/gi, '') || 'file';
    const safeTitle = doc.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'documento';
    return `${safeTitle}.${extension}`;
}

function formatMetadataLabel(key: string) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function metadataToSearchText(metadata?: DocumentMetadata | null) {
    if (!metadata) return '';
    return Object.entries(metadata).map(([key, value]) => `${key} ${String(value ?? '')}`).join(' ').toLowerCase();
}

function createFormFromDocument(doc: SecureDocument): DocumentForm {
    return {
        id: doc.id,
        title: doc.title,
        category: doc.category,
        expiration_date: doc.expiration_date || undefined,
        file_url: doc.file_url,
        file_type: doc.file_type || undefined,
        is_favorite: doc.is_favorite,
        tags: doc.tags || [],
        notes: doc.notes || '',
        issuer: doc.issuer || '',
        summary: doc.summary || '',
        document_type: doc.document_type || '',
        metadata: doc.metadata || {},
        lifecycle_status: doc.lifecycle_status || 'activo',
        renewal_of: doc.renewal_of || null,
    };
}

function buildManualTitle(file: File) {
    const rawTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
    if (!rawTitle) return 'Documento manual';
    return rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string) {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
        promise.then((value) => { clearTimeout(timer); resolve(value); }).catch((error) => { clearTimeout(timer); reject(error); });
    });
}

function normalizeSupabaseError(error: any) {
    const message = typeof error?.message === 'string' ? error.message : '';
    const statusCode = error?.statusCode ?? error?.status ?? null;
    const errorText = typeof error?.error === 'string' ? error.error : '';
    return { message, statusCode, errorText, fullText: `${message} ${errorText}`.trim().toLowerCase() };
}

function needsExpiration(doc: SecureDocument) {
    return ['Identidad', 'Vehiculo', 'Seguro', 'Salud'].includes(doc.category);
}

function buildSystemTags(doc: SecureDocument) {
    const state = getDocumentState(doc);
    const tags: string[] = [];
    if (state.tone === 'expired') tags.push('Critico');
    if (state.daysUntilExpiration !== null && state.daysUntilExpiration >= 0 && state.daysUntilExpiration <= 30) tags.push('Este mes');
    if (doc.lifecycle_status === 'pendiente_revision' || doc.lifecycle_status === 'pendiente_renovacion') tags.push('Pendiente');
    if (doc.metadata?.requiere_doble_cara === true) tags.push('Falta reverso');
    if (needsExpiration(doc) && !doc.expiration_date) tags.push('Falta fecha');
    return tags;
}

function buildAlerts(documents: SecureDocument[], reminders: DocumentReminder[], settings: DocumentAlertSettings) {
    const alerts: DocumentAlert[] = [];
    const reminderDocs = new Map(documents.map((doc) => [doc.id, doc]));

    documents.forEach((doc) => {
        const state = getDocumentState(doc);
        if (settings.expired && state.tone === 'expired') {
            alerts.push({ id: `expired-${doc.id}`, documentId: doc.id, documentTitle: doc.title, title: 'Documento caducado', description: `${doc.title} necesita renovacion inmediata.`, severity: 'high', dueDate: doc.expiration_date || null, category: doc.category, type: 'expired' });
        } else if (settings.expiring && state.daysUntilExpiration !== null && state.daysUntilExpiration >= 0 && state.daysUntilExpiration <= 30) {
            alerts.push({ id: `soon-${doc.id}`, documentId: doc.id, documentTitle: doc.title, title: state.daysUntilExpiration <= 7 ? 'Caduca esta semana' : 'Caduca este mes', description: `${doc.title} vence en ${state.daysUntilExpiration} dias.`, severity: state.daysUntilExpiration <= 7 ? 'high' : 'medium', dueDate: doc.expiration_date || null, category: doc.category, type: 'expiring' });
        }
        if (settings.missing_expiration && needsExpiration(doc) && !doc.expiration_date) {
            alerts.push({ id: `missing-expiry-${doc.id}`, documentId: doc.id, documentTitle: doc.title, title: 'Falta fecha de validez', description: `${doc.title} deberia tener una fecha de caducidad o revision.`, severity: 'medium', dueDate: null, category: doc.category, type: 'missing_expiration' });
        }
        if (settings.missing_back && doc.metadata?.requiere_doble_cara === true) {
            alerts.push({ id: `missing-back-${doc.id}`, documentId: doc.id, documentTitle: doc.title, title: 'Falta la parte trasera', description: `${doc.title} parece necesitar anverso y reverso para quedar completo.`, severity: 'medium', dueDate: null, category: doc.category, type: 'missing_back' });
        }
        if (settings.lifecycle && (doc.lifecycle_status === 'pendiente_revision' || doc.lifecycle_status === 'pendiente_renovacion')) {
            alerts.push({ id: `lifecycle-${doc.id}`, documentId: doc.id, documentTitle: doc.title, title: LIFECYCLE_LABELS[doc.lifecycle_status] || 'Pendiente', description: `${doc.title} esta marcado para seguimiento manual.`, severity: 'low', dueDate: doc.expiration_date || null, category: doc.category, type: 'lifecycle' });
        }
    });

    if (settings.reminder) {
      reminders.forEach((reminder) => {
          if (!reminder.is_active) return;
          const document = reminderDocs.get(reminder.document_id);
          if (!document) return;
          const daysUntil = differenceInDays(parseISO(reminder.next_date), new Date());
          if (daysUntil > 30) return;
          alerts.push({ id: `reminder-${reminder.id}`, documentId: document.id, documentTitle: document.title, title: reminder.title, description: reminder.description || `Aviso programado para ${document.title}.`, severity: daysUntil <= 7 ? 'medium' : 'low', dueDate: reminder.next_date, category: document.category, type: 'reminder' });
      });
    }

    return alerts.sort((a, b) => {
        const severityWeight = { high: 0, medium: 1, low: 2 };
        if (severityWeight[a.severity] !== severityWeight[b.severity]) return severityWeight[a.severity] - severityWeight[b.severity];
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
    });
}

type DocumentAlertSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DocumentAlertSettings;
  onChange: (settings: DocumentAlertSettings) => void;
};

function DocumentAlertSettingsDialog({ open, onOpenChange, settings, onChange }: DocumentAlertSettingsDialogProps) {
  const setToggle = (key: keyof DocumentAlertSettings, value: boolean) => onChange({ ...settings, [key]: value });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-amber-600" /> Ajustes de alertas documentales</DialogTitle>
          <DialogDescription>Selecciona qué alertas quieres mantener activas. No se muestran en esta pantalla; se sincronizan con tareas y calendario.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between rounded-xl border p-3"><div><Label>Caducidad próxima</Label><p className="text-sm text-muted-foreground">Avisos para documentos que vencen en 30 días o menos.</p></div><Switch checked={settings.expiring} onCheckedChange={(value) => setToggle('expiring', value)} /></div>
          <div className="flex items-center justify-between rounded-xl border p-3"><div><Label>Documentos caducados</Label><p className="text-sm text-muted-foreground">Seguimiento urgente para documentos ya vencidos.</p></div><Switch checked={settings.expired} onCheckedChange={(value) => setToggle('expired', value)} /></div>
          <div className="flex items-center justify-between rounded-xl border p-3"><div><Label>Falta fecha de validez</Label><p className="text-sm text-muted-foreground">Detecta documentos importantes sin fecha de caducidad informada.</p></div><Switch checked={settings.missing_expiration} onCheckedChange={(value) => setToggle('missing_expiration', value)} /></div>
          <div className="flex items-center justify-between rounded-xl border p-3"><div><Label>Falta reverso</Label><p className="text-sm text-muted-foreground">Marca documentos de identidad que parecen incompletos.</p></div><Switch checked={settings.missing_back} onCheckedChange={(value) => setToggle('missing_back', value)} /></div>
          <div className="flex items-center justify-between rounded-xl border p-3"><div><Label>Estados manuales</Label><p className="text-sm text-muted-foreground">Incluye pendientes de revisión o renovación marcados manualmente.</p></div><Switch checked={settings.lifecycle} onCheckedChange={(value) => setToggle('lifecycle', value)} /></div>
          <div className="flex items-center justify-between rounded-xl border p-3"><div><Label>Recordatorios personalizados</Label><p className="text-sm text-muted-foreground">Respeta también los avisos creados manualmente.</p></div><Switch checked={settings.reminder} onCheckedChange={(value) => setToggle('reminder', value)} /></div>
          <div className="flex items-center justify-between rounded-xl border p-3 bg-amber-50/50"><div><Label>Sincronizar con tareas y calendario</Label><p className="text-sm text-muted-foreground">Crea o actualiza tareas automáticas para que aparezcan en el calendario del dashboard y en la app de tareas.</p></div><Switch checked={settings.sync_to_tasks} onCheckedChange={(value) => setToggle('sync_to_tasks', value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<SecureDocument[]>([]);
    const [reminders, setReminders] = useState<DocumentReminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<SecureDocument | null>(null);
    const [reminderTarget, setReminderTarget] = useState<SecureDocument | null>(null);
    const [versionTarget, setVersionTarget] = useState<SecureDocument | null>(null);
    const [formData, setFormData] = useState<DocumentForm>(DEFAULT_FORM);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('Todos');
    const [smartView, setSmartView] = useState('Todos');
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    const [analysisPreview, setAnalysisPreview] = useState<DocumentAnalysisResult | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [analyzingDocument, setAnalyzingDocument] = useState(false);
    const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
    const [alertSettings, setAlertSettings] = useState<DocumentAlertSettings>(DEFAULT_ALERT_SETTINGS);
    const initialLoadRef = useRef(false);

    useEffect(() => {
        if (initialLoadRef.current) return;
        initialLoadRef.current = true;
        setAlertSettings(loadAlertSettings());
        void Promise.all([fetchDocuments(), fetchReminders()]).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        saveAlertSettings(alertSettings);
    }, [alertSettings]);

    const fetchDocuments = async () => {
        const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching documents:', error);
            toast.error('Error al cargar el centro de documentos');
            return;
        }
        setDocuments((data || []) as SecureDocument[]);
    };

    const fetchReminders = async () => {
        const { data, error } = await supabase.from('document_reminders').select('*').order('next_date');
        if (error) {
            console.error('Error fetching document reminders:', error);
            setReminders([]);
            return;
        }
        setReminders((data || []) as DocumentReminder[]);
    };

    const getOrCreateTaskListId = async () => {
        const { data: membershipRows } = await supabase
            .from('task_list_members')
            .select('list_id')
            .limit(1);

        const existingListId = membershipRows?.[0]?.list_id;
        if (existingListId) return existingListId as string;

        const { data: createdListId, error } = await supabase.rpc('create_default_task_list_for_user');
        if (error) {
            console.error('Error creating default task list:', error);
            return null;
        }
        return createdListId as string | null;
    };

    const syncAutomaticReminders = async (documentId: string, title: string, expirationDate?: string | null) => {
        const deleteResponse = await supabase.from('document_reminders').delete().eq('document_id', documentId).eq('kind', 'expiry');
        if (deleteResponse.error) console.error('Error clearing automatic reminders:', deleteResponse.error);
        if (!expirationDate) return;
        const expiryDate = parseISO(expirationDate);
        const today = startOfDay(new Date());
        if (expiryDate < today) return;
        const automaticRows = AUTO_REMINDER_OFFSETS
            .map((offset) => {
                const reminderDate = subDays(expiryDate, offset);
                if (reminderDate < subDays(today, 1)) return null;
                return {
                    document_id: documentId,
                    title: `${title} · aviso ${offset} dias antes`,
                    description: `Recordatorio automatico para revisar ${title} antes de su vencimiento.`,
                    kind: 'expiry',
                    offset_days: offset,
                    interval_months: null,
                    next_date: format(reminderDate, 'yyyy-MM-dd'),
                    channel: 'in_app',
                    is_active: true,
                };
            })
            .filter(Boolean);
        if (automaticRows.length === 0) return;
        const { error } = await supabase.from('document_reminders').insert(automaticRows as any[]);
        if (error) console.error('Error creating automatic reminders:', error);
    };

    const syncDocumentTasks = async (allDocuments: SecureDocument[], allReminders: DocumentReminder[], settings: DocumentAlertSettings) => {
        const taskMarkerPrefix = '[QUIOBA_DOCUMENT]';
        const alerts = buildAlerts(allDocuments, allReminders, settings);
        const actionableAlerts = settings.sync_to_tasks ? alerts.filter((alert) => ['expiring', 'expired', 'lifecycle', 'reminder'].includes(alert.type)) : [];
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) return;

        const { data: existingTasks, error: fetchError } = await supabase
            .from('tasks')
            .select('id, title, description, due_date, is_completed, list_id')
            .eq('user_id', user.id)
            .ilike('description', `${taskMarkerPrefix}%`);
        if (fetchError) {
            console.error('Error fetching document tasks:', fetchError);
            return;
        }

        const listId = actionableAlerts.length > 0 ? await getOrCreateTaskListId() : null;
        const existingByMarker = new Map<string, any>();
        (existingTasks || []).forEach((task: any) => {
            const description = String(task.description || '');
            const markerLine = description.split('\n')[0] || '';
            existingByMarker.set(markerLine.trim(), task);
        });

        const desiredMarkers = new Set<string>();
        for (const alert of actionableAlerts) {
            const marker = `${taskMarkerPrefix}:${alert.type}:${alert.documentId}`;
            desiredMarkers.add(marker);
            const dueDateIso = alert.dueDate ? `${alert.dueDate}T09:00:00.000Z` : null;
            const title = `Documento: ${alert.title} · ${alert.documentTitle}`;
            const description = `${marker}\n${alert.description}`;
            const existing = existingByMarker.get(marker);
            if (existing) {
                const { error } = await supabase
                    .from('tasks')
                    .update({
                        title,
                        description,
                        due_date: dueDateIso,
                        has_alarm: true,
                        priority: alert.severity === 'high' ? 'high' : alert.severity === 'medium' ? 'medium' : 'low',
                        is_completed: false,
                    })
                    .eq('id', existing.id);
                if (error) console.error('Error updating document task:', error);
            } else {
                const { error } = await supabase
                    .from('tasks')
                    .insert([{
                        user_id: user.id,
                        list_id: listId,
                        title,
                        description,
                        due_date: dueDateIso,
                        has_alarm: true,
                        is_completed: false,
                        priority: alert.severity === 'high' ? 'high' : alert.severity === 'medium' ? 'medium' : 'low',
                    }]);
                if (error) console.error('Error inserting document task:', error);
            }
        }

        for (const task of existingTasks || []) {
            const description = String(task.description || '');
            const markerLine = (description.split('\n')[0] || '').trim();
            if (markerLine.startsWith(taskMarkerPrefix) && !desiredMarkers.has(markerLine)) {
                const { error } = await supabase.from('tasks').delete().eq('id', task.id);
                if (error) console.error('Error deleting stale document task:', error);
            }
        }
    };

    const refreshDataAndSync = async (nextSettings = alertSettings) => {
        const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        const nextDocuments = (data || []) as SecureDocument[];
        setDocuments(nextDocuments);
        const { data: reminderData } = await supabase.from('document_reminders').select('*').order('next_date');
        const nextReminders = (reminderData || []) as DocumentReminder[];
        setReminders(nextReminders);
        await syncDocumentTasks(nextDocuments, nextReminders, nextSettings);
        return { nextDocuments, nextReminders };
    };

    const handleAnalyzeDocument = async (file: File) => {
        setAnalyzingDocument(true);
        setAnalysisPreview(null);
        setAnalysisError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error('Necesitas iniciar sesion para analizar documentos.');
            const body = new FormData();
            body.append('file', file);
            const response = await fetch(getApiUrl('api/documents/analyze'), { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body });
            const responseText = await response.text();
            let data: any = null;
            try { data = responseText ? JSON.parse(responseText) : null; } catch {
                if (!response.ok) throw new Error('El analisis devolvio una respuesta invalida del servidor. Reinicia next dev y prueba de nuevo.');
                throw new Error('La respuesta del analisis no tenia un formato valido.');
            }
            if (!response.ok) throw new Error(data?.error || 'No se pudo analizar el documento');
            const analysis = data.analysis as DocumentAnalysisResult;
            setAnalysisPreview(analysis);
            setFormData((current) => ({
                ...current,
                title: analysis.title || current.title,
                category: analysis.category || current.category,
                expiration_date: analysis.expiration_date || current.expiration_date,
                tags: current.tags.length > 0 ? current.tags : analysis.tags,
                issuer: analysis.issuer || current.issuer,
                summary: analysis.summary || current.summary,
                document_type: analysis.document_type || current.document_type,
                metadata: Object.keys(current.metadata || {}).length > 0 ? current.metadata : analysis.metadata,
            }));
            toast.success('Documento analizado y formulario autocompletado');
            return analysis;
        } catch (error: any) {
            console.error('Document analysis error:', error);
            const fallbackMessage = error?.message || 'No se pudo analizar el documento';
            setAnalysisError(fallbackMessage);
            setFormData((current) => ({ ...current, title: current.title || buildManualTitle(file), summary: current.summary || 'Documento subido sin analisis automatico. Datos completados manualmente.', metadata: current.metadata || {} }));
            toast.error(`${fallbackMessage} Puedes completar los datos manualmente y guardar el archivo igualmente.`);
            return null;
        } finally {
            setAnalyzingDocument(false);
        }
    };

    const handleSave = async (file?: File) => {
        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');
            let finalFilePath = formData.file_url;
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}.${fileExt}`;
                const filePath = `${user.id}/${fileName}`;
                const { error: uploadError } = await withTimeout(supabase.storage.from(DOCUMENTS_BUCKET).upload(filePath, file), STORAGE_UPLOAD_TIMEOUT_MS, 'La subida del archivo ha tardado demasiado. Revisa tu conexion e intentalo de nuevo.');
                if (uploadError) throw uploadError;
                finalFilePath = filePath;
            }

            const payload = {
                user_id: user.id,
                title: formData.title,
                category: formData.category,
                expiration_date: formData.expiration_date || null,
                file_url: finalFilePath,
                file_type: file ? file.type : formData.file_type,
                tags: formData.tags || [],
                notes: formData.notes?.trim() || null,
                issuer: formData.issuer?.trim() || null,
                summary: formData.summary?.trim() || null,
                document_type: formData.document_type?.trim() || null,
                metadata: formData.metadata || {},
                lifecycle_status: formData.lifecycle_status || 'activo',
                renewal_of: formData.renewal_of || null,
            };

            if (formData.id) {
                const { error } = await supabase.from('documents').update(payload).eq('id', formData.id);
                if (error) throw error;
                toast.success('Documento actualizado');
            } else {
                const { error } = await supabase.from('documents').insert([payload]);
                if (error) throw error;
                toast.success('Documento guardado');
            }

            const targetId = formData.id || null;
            if (targetId) {
                await syncAutomaticReminders(targetId, payload.title, payload.expiration_date);
            } else {
                const { data: lastDoc } = await supabase.from('documents').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
                if (lastDoc?.id) await syncAutomaticReminders(lastDoc.id, payload.title, payload.expiration_date);
            }

            setIsDialogOpen(false);
            setFormData(DEFAULT_FORM);
            setSelectedUploadFile(null);
            setAnalysisPreview(null);
            setAnalysisError(null);
            await refreshDataAndSync();
        } catch (error: any) {
            console.error('Save error:', error);
            const { message, statusCode, fullText } = normalizeSupabaseError(error);
            if (fullText.includes('row-level security')) {
                toast.error('Supabase esta bloqueando la subida al bucket secure-docs. Ejecuta la migracion create_secure_docs_storage.sql.');
            } else if (statusCode === 404 || fullText.includes('bucket not found') || fullText.includes('not found')) {
                toast.error('El bucket secure-docs no existe o no esta accesible en produccion. Ejecuta create_secure_docs_storage.sql en ese proyecto de Supabase.');
            } else if (fullText.includes('column') || fullText.includes('document_reminders') || fullText.includes('document_versions')) {
                toast.error('Falta la migracion avanzada de documentos. Ejecuta alter_documents_add_tracking.sql y alter_documents_add_smart_fields.sql en Supabase.');
            } else if (message.includes('ha tardado demasiado')) {
                toast.error(message);
            } else {
                toast.error(message || 'Error al guardar. Verifica el bucket secure-docs y las migraciones SQL.');
            }
        } finally {
            setUploading(false);
        }
    };

    const handleViewFile = async (doc: SecureDocument) => {
        try {
            const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(doc.file_url, 60);
            if (error) throw error;
            if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        } catch (error) {
            console.error('Error signing URL:', error);
            toast.error('No se pudo acceder al archivo');
        }
    };

    const handleDownload = async (doc: SecureDocument) => {
        try {
            const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(doc.file_url, 60);
            if (error) throw error;
            if (!data?.signedUrl) throw new Error('No se pudo generar la descarga');
            const response = await fetch(data.signedUrl);
            if (!response.ok) throw new Error('No se pudo descargar el archivo');
            const blob = await response.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = getDocumentFileName(doc);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(objectUrl);
            toast.success('Descarga iniciada');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('No se pudo descargar el archivo');
        }
    };

    const handleDelete = async (id: string, filePath: string) => {
        if (!confirm('Estas seguro de eliminar este documento?')) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');
            const { data: deletedRow, error } = await supabase.from('documents').delete().eq('id', id).eq('user_id', user.id).select('id, file_url').maybeSingle();
            if (error) throw error;
            if (!deletedRow) throw new Error('No se encontro el documento o no tienes permisos para borrarlo.');
            const storagePath = deletedRow.file_url || filePath;
            if (storagePath) {
                const { error: storageError } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
                if (storageError) {
                    const storageMessage = String(storageError.message || '').toLowerCase();
                    const isMissingObject = STORAGE_NOT_FOUND_MARKERS.some((marker) => storageMessage.includes(marker));
                    if (!isMissingObject) console.error('Storage delete error:', storageError);
                }
            }
            setDocuments((current) => current.filter((item) => item.id !== id));
            setReminders((current) => current.filter((item) => item.document_id !== id));
            if (selectedDocument?.id === id) {
                setSelectedDocument(null);
                setIsDetailOpen(false);
            }
            await refreshDataAndSync();
            toast.success('Documento eliminado');
        } catch (error) {
            console.error('Delete error:', error);
            toast.error(error instanceof Error ? error.message : 'Error al eliminar');
        }
    };

    const toggleFavorite = async (doc: SecureDocument) => {
        const nextValue = !doc.is_favorite;
        setDocuments((current) => current.map((item) => (item.id === doc.id ? { ...item, is_favorite: nextValue } : item)));
        const { error } = await supabase.from('documents').update({ is_favorite: nextValue }).eq('id', doc.id);
        if (error) {
            setDocuments((current) => current.map((item) => (item.id === doc.id ? { ...item, is_favorite: doc.is_favorite } : item)));
            toast.error('No se pudo actualizar el favorito');
            return;
        }
        toast.success(nextValue ? 'Anadido a favoritos' : 'Quitado de favoritos');
    };

    const handleRenewDocument = (doc: SecureDocument) => {
        setFormData({ ...createFormFromDocument(doc), lifecycle_status: 'pendiente_renovacion' });
        setSelectedUploadFile(null);
        setAnalysisPreview(null);
        setAnalysisError(null);
        setIsDetailOpen(false);
        setIsDialogOpen(true);
    };

    const filteredDocs = documents
        .filter((doc) => {
            const state = getDocumentState(doc);
            const normalizedSearch = searchTerm.toLowerCase();
            const matchesSearch = doc.title.toLowerCase().includes(normalizedSearch) || doc.category.toLowerCase().includes(normalizedSearch) || getFileLabel(doc.file_type).toLowerCase().includes(normalizedSearch) || (doc.document_type || '').toLowerCase().includes(normalizedSearch) || (doc.issuer || '').toLowerCase().includes(normalizedSearch) || (doc.summary || '').toLowerCase().includes(normalizedSearch) || (doc.notes || '').toLowerCase().includes(normalizedSearch) || (doc.tags || []).join(' ').toLowerCase().includes(normalizedSearch) || buildSystemTags(doc).join(' ').toLowerCase().includes(normalizedSearch) || metadataToSearchText(doc.metadata).includes(normalizedSearch);
            const matchesCategory = activeTab === 'Todos' || doc.category === activeTab;
            const matchesSmartView = smartView === 'Todos' || (smartView === 'Urgentes' && state.daysUntilExpiration !== null && state.daysUntilExpiration >= 0 && state.daysUntilExpiration <= 30) || (smartView === 'Caducados' && state.tone === 'expired') || (smartView === 'Favoritos' && doc.is_favorite) || (smartView === 'Pendientes' && (doc.lifecycle_status === 'pendiente_revision' || doc.lifecycle_status === 'pendiente_renovacion'));
            return matchesSearch && matchesCategory && matchesSmartView;
        })
        .sort((a, b) => {
            if (sortBy === 'title') return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
            if (sortBy === 'expiry') {
                if (!a.expiration_date && !b.expiration_date) return 0;
                if (!a.expiration_date) return 1;
                if (!b.expiration_date) return -1;
                return parseISO(a.expiration_date).getTime() - parseISO(b.expiration_date).getTime();
            }
            return parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime();
        });

    const alerts = useMemo(() => buildAlerts(documents, reminders, alertSettings), [documents, reminders, alertSettings]);
    const totalDocuments = documents.length;
    const favoritesCount = documents.filter((doc) => doc.is_favorite).length;
    const expiredCount = documents.filter((doc) => getDocumentState(doc).tone === 'expired').length;
    const urgentCount = documents.filter((doc) => {
        const state = getDocumentState(doc);
        return state.daysUntilExpiration !== null && state.daysUntilExpiration >= 0 && state.daysUntilExpiration <= 30;
    }).length;
    const pendingCount = documents.filter((doc) => doc.lifecycle_status === 'pendiente_revision' || doc.lifecycle_status === 'pendiente_renovacion').length;

    const summaryCards = [
        { label: 'Total', value: totalDocuments, description: 'Documentos guardados', icon: Files, accent: 'text-slate-700 bg-slate-100 dark:text-slate-200 dark:bg-slate-800' },
        { label: 'Urgentes', value: urgentCount, description: 'Vencen en 30 dias o menos', icon: Clock3, accent: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/40' },
        { label: 'Caducados', value: expiredCount, description: 'Necesitan renovacion', icon: AlertTriangle, accent: 'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-950/40' },
        { label: 'Pendientes', value: pendingCount, description: 'Revision o renovacion en curso', icon: Flag, accent: 'text-indigo-700 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/40' },
    ];

    const selectedMetadataEntries = useMemo(() => Object.entries(selectedDocument?.metadata || {}).filter(([, value]) => value !== null && value !== ''), [selectedDocument]);

    return (
        <>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <Link href="/apps/mi-hogar">
                                <Button variant="ghost" className="pl-0 mb-2 hover:pl-2 transition-all"><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
                            </Link>
                            <h1 className="text-3xl font-bold flex items-center gap-3"><span className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-xl text-amber-600 dark:text-amber-400"><ShieldCheck className="w-8 h-8" /></span>Centro de Documentos</h1>
                            <p className="text-muted-foreground mt-1">Organiza, localiza y renueva tus documentos. Las alertas se gestionan desde ajustes y se reflejan en tareas y calendario.</p>
                        </div>
                        <Button variant="outline" onClick={() => setIsSettingsOpen(true)}><Settings className="w-4 h-4 mr-2" /> Alertas</Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {summaryCards.map((item) => (
                            <Card key={item.label} className="border-amber-100/80 dark:border-amber-900/20 bg-white/90 dark:bg-slate-900/90">
                                <CardHeader className="pb-3"><div className="flex items-center justify-between"><div><CardDescription>{item.label}</CardDescription><CardTitle className="text-3xl mt-1">{item.value}</CardTitle></div><div className={cn('rounded-2xl p-3', item.accent)}><item.icon className="w-5 h-5" /></div></div></CardHeader>
                                <CardContent><p className="text-sm text-muted-foreground">{item.description}</p></CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card className="border-amber-100/80 dark:border-amber-900/20 bg-white/90 dark:bg-slate-900/90">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-amber-600" /> Sincronizacion activa</CardTitle>
                            <CardDescription>{alertSettings.sync_to_tasks ? `Hay ${alerts.length} avisos documentales activos y se estan reflejando en Tareas y en el calendario del dashboard.` : 'La sincronizacion con Tareas y calendario esta desactivada desde ajustes.'}</CardDescription>
                        </CardHeader>
                    </Card>

                    <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
                        <div className="relative flex-1 w-full lg:max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por titulo, categoria, tipo, emisor, etiqueta, nota o metadato..." className="pl-9" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></div>
                        <Button onClick={() => { setFormData(DEFAULT_FORM); setSelectedUploadFile(null); setAnalysisPreview(null); setAnalysisError(null); setIsDialogOpen(true); }} className="bg-amber-600 hover:bg-amber-700 text-white w-full lg:w-auto"><Lock className="w-4 h-4 mr-2" /> Nuevo Documento</Button>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4 items-start">
                        <Tabs defaultValue="Todos" value={activeTab} onValueChange={setActiveTab} className="w-full overflow-x-auto pb-2">
                            <TabsList className="bg-white dark:bg-slate-900 border">{CATEGORIES.map((cat) => (<TabsTrigger key={cat} value={cat}>{cat}{cat !== 'Todos' ? <span className="ml-2 text-xs text-muted-foreground">{documents.filter((doc) => doc.category === cat).length}</span> : null}</TabsTrigger>))}</TabsList>
                        </Tabs>
                        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                            <Tabs defaultValue="Todos" value={smartView} onValueChange={setSmartView} className="w-full"><TabsList className="bg-white dark:bg-slate-900 border w-full justify-start">{SMART_VIEWS.map((view) => <TabsTrigger key={view} value={view}>{view}</TabsTrigger>)}</TabsList></Tabs>
                            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                                <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-slate-900"><ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Ordenar por" /></SelectTrigger>
                                <SelectContent><SelectItem value="recent">Mas recientes</SelectItem><SelectItem value="title">Nombre</SelectItem><SelectItem value="expiry">Proximo vencimiento</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDocs.map((doc) => {
                            const state = getDocumentState(doc);
                            const isExpired = state.tone === 'expired';
                            const metadataEntries = Object.entries(doc.metadata || {}).filter(([, value]) => value !== null && value !== '');
                            const reminderCount = reminders.filter((reminder) => reminder.document_id === doc.id && reminder.is_active).length;
                            const systemTags = buildSystemTags(doc);
                            return (
                                <Card key={doc.id} className="group hover:shadow-lg transition-all border-amber-100 dark:border-amber-900/20 bg-white dark:bg-slate-900">
                                    <CardContent className="p-5 space-y-4">
                                        <div className="flex justify-between items-start gap-3"><div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400 group-hover:bg-amber-100 transition-colors"><FileText className="w-6 h-6" /></div><button type="button" className={cn('rounded-full p-2 transition-colors', doc.is_favorite ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-100 text-slate-400 hover:text-amber-500 dark:bg-slate-800')} onClick={() => void toggleFavorite(doc)} title={doc.is_favorite ? 'Quitar de favoritos' : 'Anadir a favoritos'}><Star className={cn('w-4 h-4', doc.is_favorite ? 'fill-current' : '')} /></button></div>
                                        <div>
                                            <h3 className="font-semibold text-lg line-clamp-1">{doc.title}</h3>
                                            <div className="flex flex-wrap gap-2 mt-2"><Badge variant="outline" className="text-slate-600 border-slate-200 dark:border-slate-700">{doc.category}</Badge>{doc.document_type ? <Badge variant="outline" className="text-slate-600 border-slate-200 dark:border-slate-700">{doc.document_type}</Badge> : null}<Badge variant="outline" className="text-slate-600 border-slate-200 dark:border-slate-700">{getFileLabel(doc.file_type)}</Badge><Badge variant={isExpired ? 'destructive' : 'outline'} className={cn(state.tone === 'warning' && 'text-amber-600 border-amber-200 dark:border-amber-800', state.tone === 'active' && 'text-emerald-600 border-emerald-200 dark:border-emerald-800', state.tone === 'muted' && 'text-slate-500 border-slate-200 dark:border-slate-700')}>{state.label}</Badge><Badge variant="secondary">{LIFECYCLE_LABELS[doc.lifecycle_status] || 'Activo'}</Badge></div>
                                            {(doc.tags && doc.tags.length > 0) || systemTags.length > 0 ? <div className="flex flex-wrap gap-2 mt-3">{(doc.tags || []).slice(0, 4).map((tag) => <Badge key={tag} variant="secondary" className="gap-1"><Tags className="w-3 h-3" /> {tag}</Badge>)}{systemTags.slice(0, 3).map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div> : null}
                                        </div>
                                        <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3 space-y-2 text-sm">{doc.issuer ? <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Emisor</span><span className="font-medium text-right line-clamp-1">{doc.issuer}</span></div> : null}<div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Subido</span><span className="font-medium">{format(parseISO(doc.created_at), 'dd/MM/yyyy')}</span></div><div className="flex items-center justify-between gap-3"><span className="text-muted-foreground flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> Vencimiento</span><span className="font-medium">{doc.expiration_date ? format(parseISO(doc.expiration_date), 'dd/MM/yyyy') : 'No aplica'}</span></div><div className="flex items-center justify-between gap-3"><span className="text-muted-foreground flex items-center gap-1"><Bell className="w-3.5 h-3.5" /> Recordatorios</span><span className="font-medium">{reminderCount}</span></div>{state.daysUntilExpiration !== null && state.daysUntilExpiration >= 0 ? <div className="text-xs text-muted-foreground pt-1">Faltan {state.daysUntilExpiration} dias para revisar este documento.</div> : null}</div>
                                        {doc.summary ? <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3 text-sm text-slate-700"><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2"><ScrollText className="w-3.5 h-3.5" /> Resumen</div><p className="line-clamp-3 whitespace-pre-wrap">{doc.summary}</p></div> : null}
                                        {metadataEntries.length > 0 ? <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-sm text-slate-600 dark:text-slate-300"><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2"><FileBadge2 className="w-3.5 h-3.5" /> Metadatos clave</div><div className="grid grid-cols-1 gap-2">{metadataEntries.slice(0, 3).map(([key, value]) => <div key={key} className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{formatMetadataLabel(key)}</span><span className="font-medium text-right break-words">{String(value)}</span></div>)}</div></div> : null}
                                        {doc.notes ? <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-sm text-slate-600 dark:text-slate-300"><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2"><NotebookPen className="w-3.5 h-3.5" /> Notas</div><p className="line-clamp-3 whitespace-pre-wrap">{doc.notes}</p></div> : null}
                                        <div className="pt-4 border-t border-dashed flex flex-wrap gap-2"><Button variant="outline" size="sm" className="flex-1 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20 text-amber-700 dark:text-amber-400" onClick={() => handleOpenDetail(doc)}><Eye className="w-4 h-4 mr-2" /> Ver</Button><Button variant="ghost" size="icon" onClick={() => setReminderTarget(doc)} title="Recordatorios"><Bell className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => setVersionTarget(doc)} title="Historial"><History className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleRenewDocument(doc)} title="Renovar"><RefreshCcw className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => void handleDownload(doc)} title="Descargar"><Download className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => { setFormData(createFormFromDocument(doc)); setSelectedUploadFile(null); setAnalysisPreview(null); setAnalysisError(null); setIsDialogOpen(true); }} title="Editar"><ExternalLink className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => void handleDelete(doc.id, doc.file_url)} title="Eliminar"><Trash2 className="w-4 h-4" /></Button></div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {filteredDocs.length === 0 && !loading ? <div className="text-center py-16 border-2 border-dashed border-amber-200 dark:border-amber-900 rounded-xl bg-amber-50/50 dark:bg-amber-900/10"><Shield className="w-16 h-16 mx-auto text-amber-300 dark:text-amber-800 mb-4" /><h3 className="text-xl font-medium text-slate-800 dark:text-slate-200">No hay documentos para esta vista</h3><p className="text-muted-foreground mb-6 max-w-sm mx-auto">Prueba otra categoria, ajusta la busqueda o guarda tu primer documento importante.</p><Button onClick={() => { setFormData(DEFAULT_FORM); setSelectedUploadFile(null); setAnalysisPreview(null); setAnalysisError(null); setIsDialogOpen(true); }} className="bg-amber-600 hover:bg-amber-700"><Lock className="w-4 h-4 mr-2" /> Guardar Documento</Button></div> : null}
                </div>

                <DocumentDialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setSelectedUploadFile(null); setAnalysisPreview(null); setAnalysisError(null); setFormData(DEFAULT_FORM); } }} form={formData} setForm={setFormData} onSave={handleSave} onAnalyze={async (file) => { setSelectedUploadFile(file); return handleAnalyzeDocument(file); }} selectedFile={selectedUploadFile} setSelectedFile={setSelectedUploadFile} analysis={analysisPreview} analysisError={analysisError} analyzing={analyzingDocument} uploading={uploading} />
                <DocumentAlertSettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} settings={alertSettings} onChange={async (settings) => { setAlertSettings(settings); await syncDocumentTasks(documents, reminders, settings); }} />
            </div>

            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
                    {selectedDocument ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-amber-600" />{selectedDocument.title}</DialogTitle>
                                <DialogDescription>Vista detallada del documento, con metadatos y acciones de seguimiento.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2"><Badge variant="outline">{selectedDocument.category}</Badge>{selectedDocument.document_type ? <Badge variant="outline">{selectedDocument.document_type}</Badge> : null}<Badge variant="outline">{getFileLabel(selectedDocument.file_type)}</Badge><Badge variant="outline">{getDocumentState(selectedDocument).label}</Badge><Badge variant="secondary">{LIFECYCLE_LABELS[selectedDocument.lifecycle_status] || 'Activo'}</Badge></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card><CardHeader className="pb-3"><CardTitle className="text-base">Datos principales</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">{selectedDocument.issuer ? <div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">Emisor</span><span className="font-medium text-right">{selectedDocument.issuer}</span></div> : null}<div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">Subido</span><span className="font-medium">{format(parseISO(selectedDocument.created_at), 'dd/MM/yyyy')}</span></div><div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">Vencimiento</span><span className="font-medium">{selectedDocument.expiration_date ? format(parseISO(selectedDocument.expiration_date), 'dd/MM/yyyy') : 'No aplica'}</span></div></CardContent></Card>
                                    <Card><CardHeader className="pb-3"><CardTitle className="text-base">Etiquetas</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-2">{(selectedDocument.tags || []).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}{buildSystemTags(selectedDocument).map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}{(selectedDocument.tags || []).length === 0 && buildSystemTags(selectedDocument).length === 0 ? <span className="text-sm text-muted-foreground">Sin etiquetas</span> : null}</div></CardContent></Card>
                                </div>
                                {selectedDocument.summary ? <Card><CardHeader className="pb-3"><CardTitle className="text-base">Resumen detectado</CardTitle></CardHeader><CardContent><p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{selectedDocument.summary}</p></CardContent></Card> : null}
                                {selectedMetadataEntries.length > 0 ? <Card><CardHeader className="pb-3"><CardTitle className="text-base">Metadatos estructurados</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">{selectedMetadataEntries.map(([key, value]) => <div key={key} className="rounded-lg border px-3 py-2 text-sm"><div className="text-xs text-muted-foreground">{formatMetadataLabel(key)}</div><div className="font-medium break-words">{String(value)}</div></div>)}</CardContent></Card> : null}
                                {selectedDocument.notes ? <Card><CardHeader className="pb-3"><CardTitle className="text-base">Notas manuales</CardTitle></CardHeader><CardContent><p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{selectedDocument.notes}</p></CardContent></Card> : null}
                                <Card><CardHeader className="pb-3"><CardTitle className="text-base">Seguimiento</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setReminderTarget(selectedDocument)}><Bell className="w-4 h-4 mr-2" /> Recordatorios</Button><Button variant="outline" onClick={() => setVersionTarget(selectedDocument)}><History className="w-4 h-4 mr-2" /> Historial</Button><Button variant="outline" onClick={() => handleRenewDocument(selectedDocument)}><RefreshCcw className="w-4 h-4 mr-2" /> Renovar</Button></CardContent></Card>
                            </div>
                            <DialogFooter><Button variant="outline" onClick={() => void handleViewFile(selectedDocument)}><Eye className="w-4 h-4 mr-2" /> Abrir archivo</Button><Button variant="outline" onClick={() => void handleDownload(selectedDocument)}><Download className="w-4 h-4 mr-2" /> Descargar</Button><Button onClick={() => { setFormData(createFormFromDocument(selectedDocument)); setSelectedUploadFile(null); setAnalysisPreview(null); setAnalysisError(null); setIsDetailOpen(false); setIsDialogOpen(true); }}><ExternalLink className="w-4 h-4 mr-2" /> Editar</Button></DialogFooter>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>

            {reminderTarget ? <DocumentReminderDialog documentId={reminderTarget.id} documentTitle={reminderTarget.title} open={Boolean(reminderTarget)} onOpenChange={(open) => { if (!open) setReminderTarget(null); }} onRemindersChange={async () => { await refreshDataAndSync(); }} /> : null}
            {versionTarget ? <DocumentVersionHistoryDialog documentId={versionTarget.id} documentTitle={versionTarget.title} open={Boolean(versionTarget)} onOpenChange={(open) => { if (!open) setVersionTarget(null); }} onRestore={async () => { await refreshDataAndSync(); const { data } = await supabase.from('documents').select('*').eq('id', versionTarget.id).maybeSingle(); if (data) setSelectedDocument(data as SecureDocument); }} /> : null}
        </>
    );

    function handleOpenDetail(doc: SecureDocument) {
        setSelectedDocument(doc);
        setIsDetailOpen(true);
    }
}

