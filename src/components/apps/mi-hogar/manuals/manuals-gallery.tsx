'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, FileText, Image as ImageIcon, Video, Trash2, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

type Manual = {
    id: string;
    title: string;
    category: string;
    description: string;
    type: 'text' | 'image' | 'video' | 'link';
    content: string; // URL or Base64 or Text
    date: string;
};

export default function ManualsGallery() {
    const [manuals, setManuals] = useState<Manual[]>([]);
    const [search, setSearch] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'text' | 'image' | 'video' | 'link'>('text');
    const [content, setContent] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem('mi-hogar-manuals');
        if (saved) {
            setManuals(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('mi-hogar-manuals', JSON.stringify(manuals));
    }, [manuals]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 1024 * 1024 * 2) { // 2MB limit for localStorage safety
            toast.error('El archivo es demasiado grande para guardar localmente (>2MB).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setContent(event.target?.result as string);
            toast.success('Archivo cargado correctamente');
        };
        reader.readAsDataURL(file);
    };

    const addManual = () => {
        if (!title || !category) {
            toast.error('Título y categoría son obligatorios');
            return;
        }

        const newManual: Manual = {
            id: crypto.randomUUID(),
            title,
            category,
            description,
            type,
            content,
            date: new Date().toLocaleDateString(),
        };

        setManuals([newManual, ...manuals]);
        setIsDialogOpen(false);
        resetForm();
        toast.success('Manual añadido correctamente');
    };

    const deleteManual = (id: string) => {
        if (confirm('¿Eliminar este manual?')) {
            setManuals(manuals.filter(m => m.id !== id));
            toast.success('Manual eliminado');
        }
    };

    const resetForm = () => {
        setTitle('');
        setCategory('');
        setDescription('');
        setType('text');
        setContent('');
    };

    const filteredManuals = manuals.filter(m =>
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.category.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar manuales..."
                        className="pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Manual
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Añadir Manual</DialogTitle>
                            <DialogDescription>Sube instrucciones, fotos o vídeos de tus electrodomésticos.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Título</Label>
                                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Caldera" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Categoría</Label>
                                    <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej. Calefacción" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Descripción</Label>
                                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Instrucciones breves..." />
                            </div>

                            <Tabs defaultValue="text" value={type} onValueChange={(v: any) => setType(v)}>
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="text">Texto</TabsTrigger>
                                    <TabsTrigger value="image">Imagen</TabsTrigger>
                                    <TabsTrigger value="video">Vídeo</TabsTrigger>
                                    <TabsTrigger value="link">Link</TabsTrigger>
                                </TabsList>

                                <TabsContent value="text" className="pt-4">
                                    <Label>Contenido del Manual</Label>
                                    <Textarea
                                        className="min-h-[150px]"
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Escribe aquí los pasos detallados..."
                                    />
                                </TabsContent>

                                <TabsContent value="image" className="pt-4 space-y-4">
                                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">Click para subir imagen (Max 2MB)</p>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                    {content && content.startsWith('data:image') && (
                                        <div className="relative aspect-video rounded-lg overflow-hidden border">
                                            <img src={content} alt="Preview" className="object-cover w-full h-full" />
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="video" className="pt-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label>URL del Vídeo (YouTube/Vimeo)</Label>
                                        <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="https://youtube.com/..." />
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Por ahora solo soportamos enlaces externos para vídeos.
                                    </p>
                                </TabsContent>

                                <TabsContent value="link" className="pt-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label>Enlace al Manual PDF/Web</Label>
                                        <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="https://..." />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={addManual}>Guardar Manual</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {filteredManuals.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-xl">
                    <FileText className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
                    <h3 className="text-lg font-medium">No hay manuales guardados</h3>
                    <p className="text-muted-foreground">Sube tu primer manual para tenerlo siempre a mano.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredManuals.map(manual => (
                        <Card key={manual.id} className="overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                            {manual.type === 'image' && manual.content.startsWith('data:image') && (
                                <div className="aspect-video w-full overflow-hidden bg-muted">
                                    <img src={manual.content} alt={manual.title} className="object-cover w-full h-full hover:scale-105 transition-transform duration-500" />
                                </div>
                            )}
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <Badge variant="secondary" className="mb-2">{manual.category}</Badge>
                                    {manual.type === 'video' && <Video className="h-4 w-4 text-muted-foreground" />}
                                    {manual.type === 'image' && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                                    {manual.type === 'link' && <ExternalLink className="h-4 w-4 text-muted-foreground" />}
                                    {manual.type === 'text' && <FileText className="h-4 w-4 text-muted-foreground" />}
                                </div>
                                <CardTitle className="line-clamp-1">{manual.title}</CardTitle>
                                <CardDescription className="line-clamp-2">{manual.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                {manual.type === 'text' && (
                                    <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">{manual.content}</p>
                                )}
                                {manual.type === 'link' && (
                                    <a href={manual.content} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline break-all">
                                        {manual.content}
                                    </a>
                                )}
                                {manual.type === 'video' && (
                                    <a href={manual.content} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline break-all">
                                        Ver vídeo externo
                                    </a>
                                )}
                            </CardContent>
                            <CardFooter className="border-t pt-4 flex justify-between text-xs text-muted-foreground">
                                <span>{manual.date}</span>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteManual(manual.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
