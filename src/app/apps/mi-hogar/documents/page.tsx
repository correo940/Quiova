'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { differenceInDays, format, parseISO } from 'date-fns';
import { DocumentDialog, DocumentForm } from '@/components/apps/mi-hogar/documents/document-dialog';
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

type SecureDocument = {
    id: string;
    title: string;
    category: string;
    expiration_date?: string;
    file_url: string;
    file_type?: string;
    is_favorite: boolean;
    created_at: string;
};

type SortOption = 'recent' | 'title' | 'expiry';

type DocumentStateTone = 'muted' | 'active' | 'warning' | 'expired';

const DEFAULT_FORM: DocumentForm = {
    title: '',
    category: '',
};

const CATEGORIES = ['Todos', 'Identidad', 'Vehiculo', 'Seguro', 'Hogar', 'Salud', 'Finanzas'];
const SMART_VIEWS = ['Todos', 'Urgentes', 'Caducados', 'Favoritos'];

function getDocumentState(doc: SecureDocument): {
    label: string;
    tone: DocumentStateTone;
    daysUntilExpiration: number | null;
} {
    if (!doc.expiration_date) {
        return { label: 'Sin vencimiento', tone: 'muted', daysUntilExpiration: null };
    }

    const daysUntilExpiration = differenceInDays(parseISO(doc.expiration_date), new Date());

    if (daysUntilExpiration < 0) {
        return { label: 'Caducado', tone: 'expired', daysUntilExpiration };
    }

    if (daysUntilExpiration <= 30) {
        return { label: 'Proximo a vencer', tone: 'warning', daysUntilExpiration };
    }

    return { label: 'Vigente', tone: 'active', daysUntilExpiration };
}

function getFileLabel(fileType?: string) {
    if (!fileType) return 'Archivo';
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('image')) return 'Imagen';
    if (fileType.includes('word') || fileType.includes('document')) return 'Documento';
    return fileType.split('/')[1]?.toUpperCase() || 'Archivo';
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<SecureDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState<DocumentForm>(DEFAULT_FORM);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('Todos');
    const [smartView, setSmartView] = useState('Todos');
    const [sortBy, setSortBy] = useState<SortOption>('recent');

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDocuments(data || []);
        } catch (error) {
            console.error('Error fetching documents:', error);
            toast.error('Error al cargar el centro de documentos');
        } finally {
            setLoading(false);
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

                const { error: uploadError } = await supabase.storage
                    .from('secure-docs')
                    .upload(filePath, file);

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
            fetchDocuments();
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Error al guardar. Verifica el bucket secure-docs.');
        } finally {
            setUploading(false);
        }
    };

    const handleView = async (doc: SecureDocument) => {
        try {
            toast.info('Generando acceso temporal...');
            const { data, error } = await supabase.storage
                .from('secure-docs')
                .createSignedUrl(doc.file_url, 60);

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (error) {
            console.error('Error signing URL:', error);
            toast.error('No se pudo acceder al archivo');
        }
    };

    const handleDelete = async (id: string, filePath: string) => {
        if (!confirm('Estas seguro de eliminar este documento?')) return;

        try {
            const { error: storageError } = await supabase.storage
                .from('secure-docs')
                .remove([filePath]);

            if (storageError) console.error('Storage delete error', storageError);

            const { error } = await supabase.from('documents').delete().eq('id', id);
            if (error) throw error;

            toast.success('Documento eliminado');
            setDocuments((current) => current.filter((item) => item.id !== id));
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const toggleFavorite = async (doc: SecureDocument) => {
        const nextValue = !doc.is_favorite;

        setDocuments((current) =>
            current.map((item) => (item.id === doc.id ? { ...item, is_favorite: nextValue } : item))
        );

        const { error } = await supabase
            .from('documents')
            .update({ is_favorite: nextValue })
            .eq('id', doc.id);

        if (error) {
            setDocuments((current) =>
                current.map((item) => (item.id === doc.id ? { ...item, is_favorite: doc.is_favorite } : item))
            );
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
                getFileLabel(doc.file_type).toLowerCase().includes(normalizedSearch);
            const matchesCategory = activeTab === 'Todos' || doc.category === activeTab;
            const matchesSmartView =
                smartView === 'Todos' ||
                (smartView === 'Urgentes' && state.daysUntilExpiration !== null && state.daysUntilExpiration >= 0 && state.daysUntilExpiration <= 30) ||
                (smartView === 'Caducados' && state.tone === 'expired') ||
                (smartView === 'Favoritos' && doc.is_favorite);

            return matchesSearch && matchesCategory && matchesSmartView;
        })
        .sort((a, b) => {
            if (sortBy === 'title') {
                return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
            }

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
        {
            label: 'Total',
            value: totalDocuments,
            description: 'Documentos guardados',
            icon: Files,
            accent: 'text-slate-700 bg-slate-100 dark:text-slate-200 dark:bg-slate-800',
        },
        {
            label: 'Urgentes',
            value: urgentCount,
            description: 'Vencen en 30 dias o menos',
            icon: Clock3,
            accent: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/40',
        },
        {
            label: 'Caducados',
            value: expiredCount,
            description: 'Necesitan revision',
            icon: AlertTriangle,
            accent: 'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-950/40',
        },
        {
            label: 'Favoritos',
            value: favoritesCount,
            description: 'Siempre a mano',
            icon: Star,
            accent: 'text-indigo-700 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/40',
        },
    ];

    return (
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
                                    <div className={cn('rounded-2xl p-3', item.accent)}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
                    <div className="relative flex-1 w-full lg:max-w-md">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por titulo, categoria o tipo..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => { setFormData(DEFAULT_FORM); setIsDialogOpen(true); }} className="bg-amber-600 hover:bg-amber-700 text-white w-full lg:w-auto">
                        <Lock className="w-4 h-4 mr-2" /> Nuevo Documento
                    </Button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4 items-start">
                    <Tabs defaultValue="Todos" value={activeTab} onValueChange={setActiveTab} className="w-full overflow-x-auto pb-2">
                        <TabsList className="bg-white dark:bg-slate-900 border">
                            {CATEGORIES.map((cat) => (
                                <TabsTrigger key={cat} value={cat}>
                                    {cat}
                                    {cat !== 'Todos' ? (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            {documents.filter((doc) => doc.category === cat).length}
                                        </span>
                                    ) : null}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                        <Tabs defaultValue="Todos" value={smartView} onValueChange={setSmartView} className="w-full">
                            <TabsList className="bg-white dark:bg-slate-900 border w-full justify-start">
                                {SMART_VIEWS.map((view) => (
                                    <TabsTrigger key={view} value={view}>{view}</TabsTrigger>
                                ))}
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

                        return (
                            <Card key={doc.id} className="group hover:shadow-lg transition-all border-amber-100 dark:border-amber-900/20 bg-white dark:bg-slate-900">
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400 group-hover:bg-amber-100 transition-colors">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <button
                                            type="button"
                                            className={cn(
                                                'rounded-full p-2 transition-colors',
                                                doc.is_favorite
                                                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300'
                                                    : 'bg-slate-100 text-slate-400 hover:text-amber-500 dark:bg-slate-800'
                                            )}
                                            onClick={() => toggleFavorite(doc)}
                                            title={doc.is_favorite ? 'Quitar de favoritos' : 'Anadir a favoritos'}
                                        >
                                            <Star className={cn('w-4 h-4', doc.is_favorite ? 'fill-current' : '')} />
                                        </button>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-lg line-clamp-1">{doc.title}</h3>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <Badge variant="outline" className="text-slate-600 border-slate-200 dark:border-slate-700">
                                                {doc.category}
                                            </Badge>
                                            <Badge variant="outline" className="text-slate-600 border-slate-200 dark:border-slate-700">
                                                {getFileLabel(doc.file_type)}
                                            </Badge>
                                            <Badge
                                                variant={isExpired ? 'destructive' : 'outline'}
                                                className={cn(
                                                    state.tone === 'warning' && 'text-amber-600 border-amber-200 dark:border-amber-800',
                                                    state.tone === 'active' && 'text-emerald-600 border-emerald-200 dark:border-emerald-800',
                                                    state.tone === 'muted' && 'text-slate-500 border-slate-200 dark:border-slate-700'
                                                )}
                                            >
                                                {state.label}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3 space-y-1 text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">Subido</span>
                                            <span className="font-medium">{format(parseISO(doc.created_at), 'dd/MM/yyyy')}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">Vencimiento</span>
                                            <span className="font-medium">
                                                {doc.expiration_date ? format(parseISO(doc.expiration_date), 'dd/MM/yyyy') : 'No aplica'}
                                            </span>
                                        </div>
                                        {state.daysUntilExpiration !== null && state.daysUntilExpiration >= 0 ? (
                                            <div className="text-xs text-muted-foreground pt-1">
                                                Faltan {state.daysUntilExpiration} dias para revisar este documento.
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="pt-4 border-t border-dashed flex gap-2">
                                        <Button variant="outline" size="sm" className="flex-1 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20 text-amber-700 dark:text-amber-400" onClick={() => handleView(doc)}>
                                            <Eye className="w-4 h-4 mr-2" /> Ver
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => {
                                            setFormData({
                                                id: doc.id,
                                                title: doc.title,
                                                category: doc.category,
                                                expiration_date: doc.expiration_date,
                                                file_url: doc.file_url,
                                                file_type: doc.file_type,
                                                is_favorite: doc.is_favorite,
                                            });
                                            setIsDialogOpen(true);
                                        }}>
                                            <ExternalLink className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(doc.id, doc.file_url)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
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
                        <Button onClick={() => { setFormData(DEFAULT_FORM); setIsDialogOpen(true); }} className="bg-amber-600 hover:bg-amber-700">
                            <Lock className="w-4 h-4 mr-2" /> Guardar Documento
                        </Button>
                    </div>
                ) : null}
            </div>

            <DocumentDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                form={formData}
                setForm={setFormData}
                onSave={handleSave}
                uploading={uploading}
            />
        </div>
    );
}
