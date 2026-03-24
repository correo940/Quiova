'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, FileText, Lock } from 'lucide-react';
import { toast } from 'sonner';

export type DocumentForm = {
    id?: string;
    title: string;
    category: string;
    expiration_date?: string;
    file_url?: string;
    file_type?: string;
    is_favorite?: boolean;
};

interface DocumentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form: DocumentForm;
    setForm: (form: DocumentForm) => void;
    onSave: (file?: File) => void;
    uploading?: boolean;
}

const CATEGORIES = ['Identidad', 'Vehiculo', 'Seguro', 'Hogar', 'Salud', 'Finanzas', 'Otros'];

export function DocumentDialog({ open, onOpenChange, form, setForm, onSave, uploading }: DocumentDialogProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-amber-500" />
                        {form.id ? 'Editar documento' : 'Nuevo documento seguro'}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
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
                        <Label>Archivo</Label>
                        <Input
                            type="file"
                            id="file"
                            className="cursor-pointer file:cursor-pointer file:text-primary"
                            onChange={handleFileChange}
                            accept="image/*,.pdf,.doc,.docx"
                        />
                        {form.file_url && !selectedFile ? (
                            <div className="text-xs text-green-600 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Archivo actual guardado
                            </div>
                        ) : null}
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
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={uploading}>
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        {uploading ? 'Subiendo...' : 'Guardar documento'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
