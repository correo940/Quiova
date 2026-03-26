'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, FileText, Lock, Sparkles, Tags, NotebookPen, Building2, FileBadge2, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

export type DocumentMetadata = Record<string, string | number | boolean | null>;

export type DocumentForm = {
    id?: string;
    title: string;
    category: string;
    expiration_date?: string;
    file_url?: string;
    file_type?: string;
    is_favorite?: boolean;
    tags: string[];
    notes: string;
    issuer: string;
    summary: string;
    document_type: string;
    metadata: DocumentMetadata;
};

export type DocumentAnalysisResult = {
    title: string;
    category: string;
    expiration_date: string | null;
    issuer: string | null;
    summary: string;
    tags: string[];
    confidence: number;
    document_type: string | null;
    metadata: DocumentMetadata;
    extracted_text_preview?: string;
};

interface DocumentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form: DocumentForm;
    setForm: (form: DocumentForm) => void;
    onSave: (file?: File) => void;
    onAnalyze?: (file: File) => Promise<DocumentAnalysisResult | null>;
    analysis?: DocumentAnalysisResult | null;
    analysisError?: string | null;
    analyzing?: boolean;
    uploading?: boolean;
}

const CATEGORIES = ['Identidad', 'Vehiculo', 'Seguro', 'Hogar', 'Salud', 'Finanzas', 'Otros'];
const IDENTITY_TAGS = ['dni', 'nie', 'pasaporte', 'carnet'];

function normalizeTags(value: string) {
    return Array.from(new Set(
        value
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
    ));
}

function formatMetadataLabel(key: string) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function DocumentDialog({
    open,
    onOpenChange,
    form,
    setForm,
    onSave,
    onAnalyze,
    analysis,
    analysisError,
    analyzing,
    uploading,
}: DocumentDialogProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [tagsInput, setTagsInput] = useState('');

    useEffect(() => {
        if (!open) {
            setSelectedFile(null);
        }
    }, [open]);

    useEffect(() => {
        setTagsInput((form.tags || []).join(', '));
    }, [form.tags, open]);

    const tagPreview = useMemo(() => normalizeTags(tagsInput), [tagsInput]);
    const isIdentityDocument =
        form.category === 'Identidad' ||
        tagPreview.some((tag) => IDENTITY_TAGS.includes(tag.toLowerCase())) ||
        IDENTITY_TAGS.some((tag) => form.title.toLowerCase().includes(tag)) ||
        IDENTITY_TAGS.some((tag) => form.document_type.toLowerCase().includes(tag));

    const metadataEntries = useMemo(
        () => Object.entries(form.metadata || {}).filter(([, value]) => value !== null && value !== ''),
        [form.metadata]
    );

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setSelectedFile(file);

        if (file && onAnalyze) {
            await onAnalyze(file);
        }
    };

    const handleSave = () => {
        if (!form.title || !form.category) {
            toast.warning('Titulo y categoria son obligatorios');
            return;
        }
        if (!form.id && !selectedFile) {
            toast.warning('Debes subir un archivo para el documento nuevo');
            return;
        }
        onSave(selectedFile || undefined);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-amber-500" />
                        {form.id ? 'Editar documento' : 'Nuevo documento inteligente'}
                    </DialogTitle>
                    <DialogDescription>
                        Guarda el archivo, revisa los metadatos detectados y completa solo lo que falte.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Archivo</Label>
                        <Input
                            type="file"
                            id="file"
                            className="cursor-pointer file:cursor-pointer file:text-primary"
                            onChange={handleFileChange}
                            accept="image/*,.pdf"
                        />
                        {form.file_url && !selectedFile ? (
                            <div className="text-xs text-green-600 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Archivo actual guardado
                            </div>
                        ) : null}
                        {analyzing ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-700 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Analizando documento y extrayendo metadatos...
                            </div>
                        ) : null}
                        {analysisError ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-700 space-y-1">
                                <div className="font-medium">El analisis automatico ha fallado</div>
                                <p>{analysisError}</p>
                                <p>Puedes guardar la foto o el PDF igualmente y completar todos los datos de forma manual.</p>
                            </div>
                        ) : null}
                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600">
                            Para documentos de identidad como DNI, NIE o carnet de conducir, sube un PDF con la parte delantera y la trasera, o una imagen donde se vean ambas caras.
                        </div>
                    </div>

                    {analysis ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                                <Sparkles className="w-4 h-4" /> Sugerencias detectadas automaticamente
                            </div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{analysis.summary}</p>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">Categoria: {analysis.category}</Badge>
                                {analysis.document_type ? <Badge variant="outline">Tipo: {analysis.document_type}</Badge> : null}
                                {analysis.issuer ? <Badge variant="outline">Emisor: {analysis.issuer}</Badge> : null}
                                <Badge variant="outline">Confianza: {Math.round(analysis.confidence * 100)}%</Badge>
                            </div>
                            {analysis.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Tags className="w-3 h-3" /> Etiquetas</span>
                                    {analysis.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary">{tag}</Badge>
                                    ))}
                                </div>
                            ) : null}
                            {isIdentityDocument ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                    Si este documento es un DNI, NIE o carnet, conviene guardar la parte delantera y la trasera en el mismo archivo para extraer mas datos y verificar mejor la validez.
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Titulo</Label>
                            <Input
                                id="title"
                                placeholder="Ej. DNI, poliza del coche o contrato"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="category">Categoria</Label>
                            <Select
                                value={form.category}
                                onValueChange={(value) => setForm({ ...form, category: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Tipo documental</Label>
                            <div className="relative">
                                <FileBadge2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    placeholder="Ej. DNI, ITV, Poliza, Factura"
                                    value={form.document_type}
                                    onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Emisor o entidad</Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    placeholder="Ej. Direccion General de la Policia"
                                    value={form.issuer}
                                    onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Resumen detectado</Label>
                        <div className="relative">
                            <ScrollText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Textarea
                                className="min-h-[110px] pl-9"
                                placeholder="Resumen del documento y datos clave detectados"
                                value={form.summary}
                                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                            />
                        </div>
                    </div>

                    {metadataEntries.length > 0 ? (
                        <div className="grid gap-2">
                            <Label>Metadatos detectados</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                                {metadataEntries.map(([key, value]) => (
                                    <div key={key} className="rounded-lg border bg-white px-3 py-2 text-sm">
                                        <div className="text-xs text-muted-foreground">{formatMetadataLabel(key)}</div>
                                        <div className="font-medium break-words">{String(value)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <div className="grid gap-2">
                        <Label>Etiquetas</Label>
                        <Input
                            placeholder="Ej. dni, coche, seguro, fiscal"
                            value={tagsInput}
                            onChange={(e) => {
                                setTagsInput(e.target.value);
                                setForm({ ...form, tags: normalizeTags(e.target.value) });
                            }}
                        />
                        {tagPreview.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {tagPreview.map((tag) => (
                                    <Badge key={tag} variant="secondary">{tag}</Badge>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <div className="grid gap-2">
                        <Label>Notas</Label>
                        <Textarea
                            placeholder="Anotaciones manuales, renovacion, ubicacion del original, observaciones..."
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className="min-h-[110px]"
                        />
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <NotebookPen className="w-3 h-3" /> Usa este campo para guardar contexto manual que no deba sobrescribirse.
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Fecha de caducidad (opcional)</Label>
                        <Input
                            type="date"
                            value={form.expiration_date || ''}
                            onChange={(e) => setForm({ ...form, expiration_date: e.target.value })}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading || analyzing}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={uploading || analyzing}>
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        {uploading ? 'Subiendo...' : 'Guardar documento'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
