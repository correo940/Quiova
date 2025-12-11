'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, ArrowLeft, Lock, FileText, Search, ExternalLink, Trash2, Shield, Eye, ShieldCheck, Download } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DocumentDialog, DocumentForm } from '@/components/apps/mi-hogar/documents/document-dialog';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

const DEFAULT_FORM: DocumentForm = {
    title: '',
    category: '',
};

const CATEGORIES = ['Todos', 'Identidad', 'Vehículo', 'Seguro', 'Hogar', 'Salud', 'Finanzas'];

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<SecureDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState<DocumentForm>(DEFAULT_FORM);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('Todos');

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
            toast.error('Error al cargar la caja fuerte');
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
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const filePath = `${user.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('secure-docs')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // For secure docs, we STORE THE PATH, NOT THE PUBLIC URL
                finalFilePath = filePath;
            }

            const payload = {
                user_id: user.id,
                title: formData.title,
                category: formData.category,
                expiration_date: formData.expiration_date || null,
                file_url: finalFilePath, // This is the storage path
                file_type: file ? file.type : formData.file_type
            };

            if (formData.id) {
                const { error } = await supabase.from('documents').update(payload).eq('id', formData.id);
                if (error) throw error;
                toast.success('Documento actualizado');
            } else {
                const { error } = await supabase.from('documents').insert([payload]);
                if (error) throw error;
                toast.success('Documento guardado bajo llave 🔒');
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
            toast.info('Generando llave de acceso temporal...');
            const { data, error } = await supabase.storage
                .from('secure-docs')
                .createSignedUrl(doc.file_url, 60); // Valid for 60 seconds

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
        if (!confirm('¿Estás seguro de destruir este documento?')) return;

        try {
            // Delete file from storage first
            const { error: storageError } = await supabase.storage
                .from('secure-docs')
                .remove([filePath]);

            if (storageError) console.error('Storage delete error', storageError);

            const { error } = await supabase.from('documents').delete().eq('id', id);
            if (error) throw error;

            toast.success('Documento eliminado');
            setDocuments(documents.filter(d => d.id !== id));
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const filteredDocs = documents.filter(d => {
        const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeTab === 'Todos' || d.category === activeTab;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
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
                            Caja Fuerte
                        </h1>
                        <p className="text-muted-foreground mt-1">Tus documentos importantes, encriptados y seguros.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative flex-1 w-full md:max-w-md">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar documento..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => { setFormData(DEFAULT_FORM); setIsDialogOpen(true); }} className="bg-amber-600 hover:bg-amber-700 text-white w-full md:w-auto">
                        <Lock className="w-4 h-4 mr-2" /> Nuevo Documento
                    </Button>
                </div>

                <Tabs defaultValue="Todos" value={activeTab} onValueChange={setActiveTab} className="w-full overflow-x-auto pb-2">
                    <TabsList className="bg-white dark:bg-slate-900 border">
                        {CATEGORIES.map(cat => (
                            <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDocs.map(doc => {
                        const isExpired = doc.expiration_date && new Date(doc.expiration_date) < new Date();

                        return (
                            <Card key={doc.id} className="group hover:shadow-lg transition-all border-amber-100 dark:border-amber-900/20 bg-white dark:bg-slate-900">
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400 group-hover:bg-amber-100 transition-colors">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        {doc.expiration_date && (
                                            <Badge variant={isExpired ? "destructive" : "outline"} className={cn(isExpired ? "" : "text-amber-600 border-amber-200")}>
                                                {isExpired ? 'Caducado' : `Vence: ${format(parseISO(doc.expiration_date), 'dd/MM/yy')}`}
                                            </Badge>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-lg line-clamp-1">{doc.title}</h3>
                                        <p className="text-sm text-muted-foreground">{doc.category}</p>
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
                                                file_type: doc.file_type
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

                {filteredDocs.length === 0 && !loading && (
                    <div className="text-center py-16 border-2 border-dashed border-amber-200 dark:border-amber-900 rounded-xl bg-amber-50/50 dark:bg-amber-900/10">
                        <Shield className="w-16 h-16 mx-auto text-amber-300 dark:text-amber-800 mb-4" />
                        <h3 className="text-xl font-medium text-slate-800 dark:text-slate-200">Caja Fuerte Vacía</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Tus documentos más importantes merecen un lugar seguro. Empieza a guardarlos aquí.</p>
                        <Button onClick={() => { setFormData(DEFAULT_FORM); setIsDialogOpen(true); }} className="bg-amber-600 hover:bg-amber-700">
                            <Lock className="w-4 h-4 mr-2" /> Guardar Primer Documento
                        </Button>
                    </div>
                )}
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
