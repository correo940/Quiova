'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ArrowLeft,
    Lock,
    FileText,
    Search,
    ExternalLink,
    Trash2,
    Shield,
    Eye,
    ShieldCheck,
    Star,
    Clock3,
    AlertTriangle,
    Files,
    ArrowUpDown,
    Tags,
    NotebookPen,
    Download,
    Building2,
    FileBadge2,
    CalendarClock,
    ScrollText,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { differenceInDays, format, parseISO } from 'date-fns';
import { DocumentAnalysisResult, DocumentDialog, DocumentForm, DocumentMetadata } from '@/components/apps/mi-hogar/documents/document-dialog';
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
import { getApiUrl } from '@/lib/api-utils';

type SecureDocument = {
    id: string;
    title: string;
    category: string;
    expiration_date?: string;
    file_url: string;
    file_type?: string;
    is_favorite: boolean;
    created_at: string;
    tags?: string[];
    notes?: string | null;
    issuer?: string | null;
    summary?: string | null;
    document_type?: string | null;
    metadata?: DocumentMetadata | null;
};

type SortOption = 'recent' | 'title' | 'expiry';
type DocumentStateTone = 'muted' | 'active' | 'warning' | 'expired';
const DOCUMENTS_BUCKET = 'secure-docs';
const STORAGE_UPLOAD_TIMEOUT_MS = 45000;
const STORAGE_NOT_FOUND_MARKERS = ['not found', 'bucket not found', 'object not found'];

const DEFAULT_FORM: DocumentForm = {
    title: '',
    category: '',
    tags: [],
    notes: '',
    issuer: '',
    summary: '',
    document_type: '',
    metadata: {},
};

const CATEGORIES = ['Todos', 'Identidad', 'Vehiculo', 'Seguro', 'Hogar', 'Salud', 'Finanzas'];
const SMART_VIEWS = ['Todos', 'Urgentes', 'Caducados', 'Favoritos'];

function getDocumentState(doc: SecureDocument): { label: string; tone: DocumentStateTone; daysUntilExpiration: number | null } {
    if (!doc.expiration_date) return { label: 'Sin vencimiento', tone: 'muted', daysUntilExpiration: null };
    const daysUntilExpiration = differenceInDays(parseISO(doc.expiration_date), new Date());
    if (daysUntilExpiration < 0) return { label: 'Caducado', tone: 'expired', daysUntilExpiration };
    if (daysUntilExpiration <= 30) return { label: 'Proximo a vencer', tone: 'warning', daysUntilExpiration };
    return { label: 'Vigente', tone: 'active', daysUntilExpiration };
}

function getFileLabel(fileType?: string) {
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
        expiration_date: doc.expiration_date,
        file_url: doc.file_url,
        file_type: doc.file_type,
        is_favorite: doc.is_favorite,
        tags: doc.tags || [],
        notes: doc.notes || '',
        issuer: doc.issuer || '',
        summary: doc.summary || '',
        document_type: doc.document_type || '',
        metadata: doc.metadata || {},
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
        promise
            .then((value) => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch((error) => {
                clearTimeout(timer);
                reject(error);
            });
    });
}

function normalizeSupabaseError(error: any) {
    const message = typeof error?.message === 'string' ? error.message : '';
    const statusCode = error?.statusCode ?? error?.status ?? null;
    const errorText = typeof error?.error === 'string' ? error.error : '';
    return {
        message,
        statusCode,
        errorText,
        fullText: `${message} ${errorText}`.trim().toLowerCase(),
    };
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<SecureDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<SecureDocument | null>(null);
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
    const initialLoadRef = useRef(false);

    useEffect(() => {
        if (initialLoadRef.current) return;
        initialLoadRef.current = true;
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setDocuments((data || []) as SecureDocument[]);
        } catch (error) {
            console.error('Error fetching documents:', error);
            toast.error('Error al cargar el centro de documentos');
        } finally {
            setLoading(false);
        }
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
            const response = await fetch(getApiUrl('api/documents/analyze'), {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
                body,
            });
            const responseText = await response.text();
            let data: any = null;
            try {
                data = responseText ? JSON.parse(responseText) : null;
            } catch {
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
            setFormData((current) => ({
                ...current,
                title: current.title || buildManualTitle(file),
                summary: current.summary || 'Documento subido sin analisis automatico. Datos completados manualmente.',
                metadata: current.metadata || {},
            }));
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
                const { error: uploadError } = await withTimeout(
                    supabase.storage.from(DOCUMENTS_BUCKET).upload(filePath, file),
                    STORAGE_UPLOAD_TIMEOUT_MS,
                    'La subida del archivo ha tardado demasiado. Revisa tu conexion e intentalo de nuevo.'
                );
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
            setIsDialogOpen(false);
            setFormData(DEFAULT_FORM);
            setSelectedUploadFile(null);
            setAnalysisPreview(null);
            setAnalysisError(null);
            await fetchDocuments();
        } catch (error: any) {
            console.error('Save error:', error);
            const { message, statusCode, fullText } = normalizeSupabaseError(error);
            if (fullText.includes('row-level security')) {
                toast.error('Supabase esta bloqueando la subida al bucket secure-docs. Ejecuta la migracion create_secure_docs_storage.sql.');
            } else if (statusCode === 404 || fullText.includes('bucket not found') || fullText.includes('not found')) {
                toast.error('El bucket secure-docs no existe o no esta accesible en produccion. Ejecuta create_secure_docs_storage.sql en ese proyecto de Supabase.');
            } else if (fullText.includes('column')) {
                toast.error('Faltan columnas en documents. Ejecuta alter_documents_add_smart_fields.sql en Supabase.');
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
            toast.info('Generando acceso temporal...');
            const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(doc.file_url, 60);
            if (error) throw error;
            if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        } catch (error) {
            console.error('Error signing URL:', error);
            toast.error('No se pudo acceder al archivo');
        }
    };

    const handleOpenDetail = (doc: SecureDocument) => {
        setSelectedDocument(doc);
        setIsDetailOpen(true);
    };

    const handleDownload = async (doc: SecureDocument) => {
        try {
            toast.info('Preparando descarga...');
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

            const { data: deletedRow, error } = await supabase
                .from('documents')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id)
                .select('id, file_url')
                .maybeSingle();

            if (error) throw error;
            if (!deletedRow) throw new Error('No se encontro el documento o no tienes permisos para borrarlo.');

            const storagePath = deletedRow.file_url || filePath;
            if (storagePath) {
                const { error: storageError } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
                if (storageError) {
                    const storageMessage = ``.toLowerCase();
                    const isMissingObject = STORAGE_NOT_FOUND_MARKERS.some((marker) => storageMessage.includes(marker));
                    if (!isMissingObject) {
                        console.error('Storage delete error:', storageError);
                    }
                }
            }

            setDocuments((current) => current.filter((item) => item.id !== id));
            if (selectedDocument?.id === id) {
                setSelectedDocument(null);
                setIsDetailOpen(false);
            }
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

    const filteredDocs = documents
        .filter((doc) => {
            const state = getDocumentState(doc);
            const normalizedSearch = searchTerm.toLowerCase();
            const matchesSearch =
                doc.title.toLowerCase().includes(normalizedSearch) ||
                doc.category.toLowerCase().includes(normalizedSearch) ||
                getFileLabel(doc.file_type).toLowerCase().includes(normalizedSearch) ||
                (doc.document_type || '').toLowerCase().includes(normalizedSearch) ||
                (doc.issuer || '').toLowerCase().includes(normalizedSearch) ||
                (doc.summary || '').toLowerCase().includes(normalizedSearch) ||
                (doc.notes || '').toLowerCase().includes(normalizedSearch) ||
                (doc.tags || []).join(' ').toLowerCase().includes(normalizedSearch) ||
                metadataToSearchText(doc.metadata).includes(normalizedSearch);
            const matchesCategory = activeTab === 'Todos' || doc.category === activeTab;
            const matchesSmartView =
                smartView === 'Todos' ||
                (smartView === 'Urgentes' && state.daysUntilExpiration !== null && state.daysUntilExpiration >= 0 && state.daysUntilExpiration <= 30) ||
                (smartView === 'Caducados' && state.tone === 'expired') ||
                (smartView === 'Favoritos' && doc.is_favorite);
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

    const totalDocuments = documents.length;
    const favoritesCount = documents.filter((doc) => doc.is_favorite).length;
    const expiredCount = documents.filter((doc) => getDocumentState(doc).tone === 'expired').length;
    const urgentCount = documents.filter((doc) => {
        const state = getDocumentState(doc);
        return state.daysUntilExpiration !== null && state.daysUntilExpiration >= 0 && state.daysUntilExpiration <= 30;
    }).length;

    const summaryCards = [
        { label: 'Total', value: totalDocuments, description: 'Documentos guardados', icon: Files, accent: 'text-slate-700 bg-slate-100 dark:text-slate-200 dark:bg-slate-800' },
        { label: 'Urgentes', value: urgentCount, description: 'Vencen en 30 dias o menos', icon: Clock3, accent: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/40' },
        { label: 'Caducados', value: expiredCount, description: 'Necesitan revision', icon: AlertTriangle, accent: 'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-950/40' },
        { label: 'Favoritos', value: favoritesCount, description: 'Siempre a mano', icon: Star, accent: 'text-indigo-700 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/40' },
    ];

    const selectedMetadataEntries = useMemo(
        () => Object.entries(selectedDocument?.metadata || {}).filter(([, value]) => value !== null && value !== ''),
        [selectedDocument]
    );

    return (
        <>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <Link href="/apps/mi-hogar">
                                <Button variant="ghost" className="pl-0 mb-2 hover:pl-2 transition-all">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                                </Button>
                            </Link>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <span className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-xl text-amber-600 dark:text-amber-400">
                                    <ShieldCheck className="w-8 h-8" />
                                </span>
                                Centro de Documentos
                            </h1>
                            <p className="text-muted-foreground mt-1">Organiza, localiza y vigila tus documentos importantes desde un mismo sitio.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {summaryCards.map((item) => (
                            <Card key={item.label} className="border-amber-100/80 dark:border-amber-900/20 bg-white/90 dark:bg-slate-900/90">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardDescription>{item.label}</CardDescription>
                                            <CardTitle className="text-3xl mt-1">{item.value}</CardTitle>
                                        </div>
                                        <div className={cn('rounded-2xl p-3', item.accent)}><item.icon className="w-5 h-5" /></div>
                                    </div>
                                </CardHeader>
                                <CardContent><p className="text-sm text-muted-foreground">{item.description}</p></CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
                        <div className="relative flex-1 w-full lg:max-w-md">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar por titulo, categoria, tipo, emisor, etiqueta, nota o metadato..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <Button onClick={() => { setFormData(DEFAULT_FORM); setSelectedUploadFile(null); setAnalysisPreview(null); setAnalysisError(null); setIsDialogOpen(true); }} className="bg-amber-600 hover:bg-amber-700 text-white w-full lg:w-auto">
                            <Lock className="w-4 h-4 mr-2" /> Nuevo Documento
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4 items-start">
                        <Tabs defaultValue="Todos" value={activeTab} onValueChange={setActiveTab} className="w-full overflow-x-auto pb-2">
                            <TabsList className="bg-white dark:bg-slate-900 border">
                                {CATEGORIES.map((cat) => (
                                    <TabsTrigger key={cat} value={cat}>
                                        {cat}
                                        {cat !== 'Todos' ? <span className="ml-2 text-xs text-muted-foreground">{documents.filter((doc) => doc.category === cat).length}</span> : null}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>

                        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                            <Tabs defaultValue="Todos" value={smartView} onValueChange={setSmartView} className="w-full">
                                <TabsList className="bg-white dark:bg-slate-900 border w-full justify-start">
                                    {SMART_VIEWS.map((view) => <TabsTrigger key={view} value={view}>{view}</TabsTrigger>)}
                                </TabsList>
                            </Tabs>

                            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                                <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-slate-900">
                                    <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Ordenar por" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="recent">Mas recientes</SelectItem>
                                    <SelectItem value="title">Nombre</SelectItem>
                                    <SelectItem value="expiry">Proximo vencimiento</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDocs.map((doc) => {
                            const state = getDocumentState(doc);
                            const isExpired = state.tone === 'expired';
                            const metadataEntries = Object.entries(doc.metadata || {}).filter(([, value]) => value !== null && value !== '');
                            return (
                                <Card key={doc.id} className="group hover:shadow-lg transition-all border-amber-100 dark:border-amber-900/20 bg-white dark:bg-slate-900">
                                    <CardContent className="p-5 space-y-4">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400 group-hover:bg-amber-100 transition-colors"><FileText className="w-6 h-6" /></div>
                                            <button
                                                type="button"
                                                className={cn('rounded-full p-2 transition-colors', doc.is_favorite ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-100 text-slate-400 hover:text-amber-500 dark:bg-slate-800')}
                                                onClick={() => toggleFavorite(doc)}
                                                title={doc.is_favorite ? 'Quitar de favoritos' : 'Anadir a favoritos'}
                                            >
                                                <Star className={cn('w-4 h-4', doc.is_favorite ? 'fill-current' : '')} />
                                            </button>
                                        </div>

                                        <div>
                                            <h3 className="font-semibold text-lg line-clamp-1">{doc.title}</h3>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <Badge variant="outline" className="text-slate-600 border-slate-200 dark:border-slate-700">{doc.category}</Badge>
                                                {doc.document_type ? <Badge variant="outline" className="text-slate-600 border-slate-200 dark:border-slate-700">{doc.document_type}</Badge> : null}
                                                <Badge variant="outline" className="text-slate-600 border-slate-200 dark:border-slate-700">{getFileLabel(doc.file_type)}</Badge>
                                                <Badge variant={isExpired ? 'destructive' : 'outline'} className={cn(state.tone === 'warning' && 'text-amber-600 border-amber-200 dark:border-amber-800', state.tone === 'active' && 'text-emerald-600 border-emerald-200 dark:border-emerald-800', state.tone === 'muted' && 'text-slate-500 border-slate-200 dark:border-slate-700')}>
                                                    {state.label}
                                                </Badge>
                                            </div>
                                            {doc.tags && doc.tags.length > 0 ? (
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {doc.tags.slice(0, 4).map((tag) => <Badge key={tag} variant="secondary" className="gap-1"><Tags className="w-3 h-3" /> {tag}</Badge>)}
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3 space-y-2 text-sm">
                                            {doc.issuer ? <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Emisor</span><span className="font-medium text-right line-clamp-1">{doc.issuer}</span></div> : null}
                                            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Subido</span><span className="font-medium">{format(parseISO(doc.created_at), 'dd/MM/yyyy')}</span></div>
                                            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> Vencimiento</span><span className="font-medium">{doc.expiration_date ? format(parseISO(doc.expiration_date), 'dd/MM/yyyy') : 'No aplica'}</span></div>
                                            {state.daysUntilExpiration !== null && state.daysUntilExpiration >= 0 ? <div className="text-xs text-muted-foreground pt-1">Faltan {state.daysUntilExpiration} dias para revisar este documento.</div> : null}
                                        </div>

                                        {doc.summary ? <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3 text-sm text-slate-700"><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2"><ScrollText className="w-3.5 h-3.5" /> Resumen</div><p className="line-clamp-3 whitespace-pre-wrap">{doc.summary}</p></div> : null}

                                        {metadataEntries.length > 0 ? (
                                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-sm text-slate-600 dark:text-slate-300">
                                                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2"><FileBadge2 className="w-3.5 h-3.5" /> Metadatos clave</div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {metadataEntries.slice(0, 3).map(([key, value]) => <div key={key} className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{formatMetadataLabel(key)}</span><span className="font-medium text-right break-words">{String(value)}</span></div>)}
                                                </div>
                                            </div>
                                        ) : null}

                                        {doc.notes ? <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-sm text-slate-600 dark:text-slate-300"><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2"><NotebookPen className="w-3.5 h-3.5" /> Notas</div><p className="line-clamp-3 whitespace-pre-wrap">{doc.notes}</p></div> : null}

                                        <div className="pt-4 border-t border-dashed flex gap-2">
                                            <Button variant="outline" size="sm" className="flex-1 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20 text-amber-700 dark:text-amber-400" onClick={() => handleOpenDetail(doc)}>
                                                <Eye className="w-4 h-4 mr-2" /> Ver
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Descargar"><Download className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => { setFormData(createFormFromDocument(doc)); setSelectedUploadFile(null); setAnalysisPreview(null); setAnalysisError(null); setIsDialogOpen(true); }} title="Editar"><ExternalLink className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(doc.id, doc.file_url)} title="Eliminar"><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {filteredDocs.length === 0 && !loading ? (
                        <div className="text-center py-16 border-2 border-dashed border-amber-200 dark:border-amber-900 rounded-xl bg-amber-50/50 dark:bg-amber-900/10">
                            <Shield className="w-16 h-16 mx-auto text-amber-300 dark:text-amber-800 mb-4" />
                            <h3 className="text-xl font-medium text-slate-800 dark:text-slate-200">No hay documentos para esta vista</h3>
                            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Prueba otra categoria, ajusta la busqueda o guarda tu primer documento importante.</p>
                            <Button onClick={() => { setFormData(DEFAULT_FORM); setSelectedUploadFile(null); setAnalysisPreview(null); setAnalysisError(null); setIsDialogOpen(true); }} className="bg-amber-600 hover:bg-amber-700">
                                <Lock className="w-4 h-4 mr-2" /> Guardar Documento
                            </Button>
                        </div>
                    ) : null}
                </div>

                <DocumentDialog
                    open={isDialogOpen}
                    onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setSelectedUploadFile(null); setAnalysisPreview(null); setAnalysisError(null); } }}
                    form={formData}
                    setForm={setFormData}
                    onSave={handleSave}
                    onAnalyze={async (file) => { setSelectedUploadFile(file); return handleAnalyzeDocument(file); }}
                    selectedFile={selectedUploadFile}
                    setSelectedFile={setSelectedUploadFile}
                    analysis={analysisPreview}
                    analysisError={analysisError}
                    analyzing={analyzingDocument}
                    uploading={uploading}
                />
            </div>

            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
                    {selectedDocument ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-amber-600" />{selectedDocument.title}</DialogTitle>
                                <DialogDescription>Vista detallada del documento, con metadatos detectados y acciones de acceso.</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline">{selectedDocument.category}</Badge>
                                    {selectedDocument.document_type ? <Badge variant="outline">{selectedDocument.document_type}</Badge> : null}
                                    <Badge variant="outline">{getFileLabel(selectedDocument.file_type)}</Badge>
                                    <Badge variant="outline">{getDocumentState(selectedDocument).label}</Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader className="pb-3"><CardTitle className="text-base">Datos principales</CardTitle></CardHeader>
                                        <CardContent className="space-y-3 text-sm">
                                            {selectedDocument.issuer ? <div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">Emisor</span><span className="font-medium text-right">{selectedDocument.issuer}</span></div> : null}
                                            <div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">Subido</span><span className="font-medium">{format(parseISO(selectedDocument.created_at), 'dd/MM/yyyy')}</span></div>
                                            <div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">Vencimiento</span><span className="font-medium">{selectedDocument.expiration_date ? format(parseISO(selectedDocument.expiration_date), 'dd/MM/yyyy') : 'No aplica'}</span></div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-3"><CardTitle className="text-base">Etiquetas</CardTitle></CardHeader>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2">
                                                {(selectedDocument.tags || []).length > 0 ? (selectedDocument.tags || []).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>) : <span className="text-sm text-muted-foreground">Sin etiquetas</span>}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {selectedDocument.summary ? <Card><CardHeader className="pb-3"><CardTitle className="text-base">Resumen detectado</CardTitle></CardHeader><CardContent><p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{selectedDocument.summary}</p></CardContent></Card> : null}

                                {selectedMetadataEntries.length > 0 ? (
                                    <Card>
                                        <CardHeader className="pb-3"><CardTitle className="text-base">Metadatos estructurados</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {selectedMetadataEntries.map(([key, value]) => <div key={key} className="rounded-lg border px-3 py-2 text-sm"><div className="text-xs text-muted-foreground">{formatMetadataLabel(key)}</div><div className="font-medium break-words">{String(value)}</div></div>)}
                                        </CardContent>
                                    </Card>
                                ) : null}

                                {selectedDocument.notes ? <Card><CardHeader className="pb-3"><CardTitle className="text-base">Notas manuales</CardTitle></CardHeader><CardContent><p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{selectedDocument.notes}</p></CardContent></Card> : null}
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => handleViewFile(selectedDocument)}><Eye className="w-4 h-4 mr-2" /> Abrir archivo</Button>
                                <Button variant="outline" onClick={() => handleDownload(selectedDocument)}><Download className="w-4 h-4 mr-2" /> Descargar</Button>
                                <Button onClick={() => { setFormData(createFormFromDocument(selectedDocument)); setSelectedUploadFile(null); setAnalysisPreview(null); setAnalysisError(null); setIsDetailOpen(false); setIsDialogOpen(true); }}><ExternalLink className="w-4 h-4 mr-2" /> Editar</Button>
                            </DialogFooter>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    );
}






