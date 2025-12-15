'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, FileText, Image as ImageIcon, Video, Trash2, ExternalLink, AlertCircle, Loader2, Mic, Square, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';

type Manual = {
    id: string;
    title: string;
    category: string;
    description: string;
    type: 'text' | 'image' | 'video' | 'link' | 'audio';
    content: string; // URL or Base64 or Text
    date: string;
};

export default function ManualsGallery() {
    const [manuals, setManuals] = useState<Manual[]>([]);
    const [search, setSearch] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Form states
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'text' | 'image' | 'video' | 'link' | 'audio'>('text');

    // Separate draft states to prevent cross-contamination
    const [draftText, setDraftText] = useState('');
    const [draftVideo, setDraftVideo] = useState('');
    const [draftLink, setDraftLink] = useState('');
    const [draftImage, setDraftImage] = useState('');
    const [draftAudio, setDraftAudio] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Audio Recorder State
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const [viewManual, setViewManual] = useState<Manual | null>(null);
    const [showFullMedia, setShowFullMedia] = useState(false);

    useEffect(() => {
        if (user) {
            fetchManuals();
        } else {
            setManuals([]);
            setLoading(false);
        }
    }, [user]);

    const fetchManuals = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('manuals')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedManuals: Manual[] = data.map((item: any) => ({
                id: item.id,
                title: item.title,
                category: item.category || '',
                description: item.description || '',
                type: item.type as any,
                content: item.content || '',
                date: new Date(item.created_at).toLocaleDateString(),
            }));

            setManuals(mappedManuals);
        } catch (error) {
            console.error('Error fetching manuals:', error);
            toast.error('Error al cargar los manuales');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 1024 * 1024 * 2) { // 2MB limit
            toast.error('El archivo es demasiado grande (>2MB).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setDraftImage(event.target?.result as string);
            toast.success('Imagen cargada correctamente');
        };
        reader.readAsDataURL(file);
    };

    const addManual = async () => {
        if (!title || !category || !user) {
            toast.error('Título y categoría son obligatorios');
            return;
        }

        // Construct a composite content object
        const contentObj = {
            text: draftText,
            video: draftVideo,
            link: draftLink,
            image: draftImage,
            audio: draftAudio
        };

        // Determine effective type or use 'mixed'
        // If we are strictly adding one type, we can keep the legacy behavior for compatibility?
        // Let's just always save as JSON if we have multiple, or use string if simple?
        // To be safe and consistent, let's use JSON if we have > 1 item, or if we have one item but it's not the main type?
        // Actually, let's just serialize everything to JSON to be future proof mixed content.
        // BUT, we need to respect legacy data.

        // Let's just save the JSON string.
        const finalContent = JSON.stringify(contentObj);

        // We can set type to 'mixed' if user has multiple things, or keep the selected 'type' as primary category.
        // Let's keep 'type' as the "Primary View" or category.

        try {
            if (editingId) {
                // UPDATE existing manual
                const { data, error } = await supabase
                    .from('manuals')
                    .update({
                        title,
                        category,
                        description,
                        type,
                        content: finalContent,
                    })
                    .eq('id', editingId)
                    .select()
                    .single();

                if (error) throw error;

                setManuals(manuals.map(m => (m.id === editingId ? {
                    ...m,
                    title: data.title,
                    category: data.category || '',
                    description: data.description || '',
                    type: data.type as any,
                    content: data.content || '',
                } : m)));

                toast.success('Manual actualizado');
            } else {
                // CREATE new manual
                const { data, error } = await supabase
                    .from('manuals')
                    .insert([
                        {
                            user_id: user.id,
                            title,
                            category,
                            description,
                            type,
                            content: finalContent,
                        },
                    ])
                    .select()
                    .single();

                if (error) throw error;

                const newManual: Manual = {
                    id: data.id,
                    title: data.title,
                    category: data.category || '',
                    description: data.description || '',
                    type: data.type as any,
                    content: data.content || '',
                    date: new Date(data.created_at).toLocaleDateString(),
                };

                setManuals([newManual, ...manuals]);
                toast.success('Manual añadido correctamente');
            }

            setIsDialogOpen(false);
            resetForm();
        } catch (error) {
            console.error('Error saving manual:', error);
            toast.error('Error al guardar el manual');
        }
    };

    const handleEdit = (manual: Manual, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening view dialog
        setEditingId(manual.id);
        setTitle(manual.title);
        setCategory(manual.category);
        setDescription(manual.description);
        setType(manual.type);

        // Populate drafts from content
        // Check if content is JSON
        try {
            if (manual.content.startsWith('{')) {
                const parsed = JSON.parse(manual.content);
                setDraftText(parsed.text || '');
                setDraftVideo(parsed.video || '');
                setDraftLink(parsed.link || '');
                setDraftImage(parsed.image || '');
                setDraftAudio(parsed.audio || '');
            } else {
                // Legacy fallback
                resetForm(); // clear first
                setEditingId(manual.id); // restore ID
                setTitle(manual.title);
                setCategory(manual.category);
                setDescription(manual.description);
                setType(manual.type);

                switch (manual.type) {
                    case 'text': setDraftText(manual.content); break;
                    case 'video': setDraftVideo(manual.content); break;
                    case 'link': setDraftLink(manual.content); break;
                    case 'image': setDraftImage(manual.content); break;
                    case 'audio': setDraftAudio(manual.content); break;
                }
            }
        } catch (e) {
            // Plain text fallback
            setDraftText(manual.content);
        }

        setIsDialogOpen(true);
    };

    const deleteManual = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening view dialog
        if (!confirm('¿Eliminar este manual?')) return;

        try {
            const { error } = await supabase
                .from('manuals')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setManuals(manuals.filter(m => m.id !== id));
            toast.success('Manual eliminado');
        } catch (error) {
            console.error('Error deleting manual:', error);
            toast.error('Error al eliminar el manual');
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setTitle('');
        setCategory('');
        setDescription('');
        setType('text');
        setDraftText('');
        setDraftVideo('');
        setDraftLink('');
        setDraftImage('');
        setDraftAudio('');
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64Audio = reader.result as string;
                    setDraftAudio(base64Audio);
                };
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop()); // Stop mic
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            toast.error('No se pudo acceder al micrófono');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleTypeChange = (newType: string) => {
        setType(newType as any);
    };

    const filteredManuals = manuals.filter(m =>
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.category.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

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
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Editar Manual' : 'Añadir Manual'}</DialogTitle>
                            <DialogDescription>Sube instrucciones, fotos o vídeos de tus electrodomésticos.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4 overflow-y-auto">
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


                            <Tabs defaultValue="text" value={type} onValueChange={(v: any) => setType(v as any)}>
                                <TabsList className="grid w-full grid-cols-5">
                                    <TabsTrigger value="text">Texto</TabsTrigger>
                                    <TabsTrigger value="image">Imagen</TabsTrigger>
                                    <TabsTrigger value="video">Vídeo</TabsTrigger>
                                    <TabsTrigger value="audio">Audio</TabsTrigger>
                                    <TabsTrigger value="link">Link</TabsTrigger>
                                </TabsList>

                                <TabsContent value="text" className="pt-4">
                                    <Label>Contenido del Manual</Label>
                                    <Textarea
                                        className="min-h-[150px]"
                                        value={draftText}
                                        onChange={(e) => setDraftText(e.target.value)}
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
                                    {draftImage && (
                                        <div className="relative aspect-video rounded-lg overflow-hidden border">
                                            <img src={draftImage} alt="Preview" className="object-cover w-full h-full" />
                                            <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-6 w-6" onClick={(e) => { e.stopPropagation(); setDraftImage(''); }}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="video" className="pt-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label>URL del Vídeo (YouTube/Vimeo)</Label>
                                        <Input value={draftVideo} onChange={(e) => setDraftVideo(e.target.value)} placeholder="https://youtube.com/..." />
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Por ahora solo soportamos enlaces externos para vídeos.
                                    </p>
                                </TabsContent>

                                <TabsContent value="audio" className="pt-4 space-y-4">
                                    <div className="flex flex-col items-center justify-center space-y-4 border-2 border-dashed rounded-lg p-8">
                                        {!isRecording ? (
                                            <Button
                                                variant="outline"
                                                className="h-16 w-16 rounded-full border-red-500 hover:bg-red-50 hover:text-red-600"
                                                onClick={startRecording}
                                            >
                                                <Mic className="h-8 w-8 text-red-500" />
                                            </Button>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="animate-pulse text-red-500 font-bold mb-2">Grabando...</div>
                                                <Button
                                                    variant="destructive"
                                                    className="h-16 w-16 rounded-full"
                                                    onClick={stopRecording}
                                                >
                                                    <Square className="h-8 w-8 fill-current" />
                                                </Button>
                                            </div>
                                        )}
                                        <p className="text-sm text-muted-foreground">
                                            {isRecording ? 'Pulsa para detener' : 'Pulsa para grabar nota de voz'}
                                        </p>
                                    </div>
                                    {draftAudio && (
                                        <div className="w-full bg-muted p-3 rounded-lg flex items-center justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold mb-2">Vista previa:</p>
                                                <audio controls src={draftAudio} className="w-full" />
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDraftAudio(''); }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="link" className="pt-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label>Enlace al Manual PDF/Web</Label>
                                        <Input value={draftLink} onChange={(e) => setDraftLink(e.target.value)} placeholder="https://..." />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={addManual}>{editingId ? 'Guardar Cambios' : 'Guardar Manual'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* View Manual Dialog - Premium Design */}
            <Dialog open={!!viewManual} onOpenChange={(open) => !open && setViewManual(null)}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <Badge variant="secondary" className="mb-2">{viewManual?.category}</Badge>
                                <DialogTitle className="text-2xl">{viewManual?.title}</DialogTitle>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-4 space-y-6">

                        {/* 1. Description First (Always visible) */}
                        {viewManual?.description && (
                            <div className="space-y-2">
                                <Label className="text-base font-semibold">Descripción</Label>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {viewManual.description}
                                </p>
                            </div>
                        )}

                        {/* 2. Content / Thumbnails */}
                        <div className="space-y-4">
                            <Label className="text-base font-semibold block mb-2">
                                Contenido Adjunto
                            </Label>

                            {(() => {
                                let contentData = { text: '', image: '', video: '', audio: '', link: '' };
                                let isMixed = false;
                                try {
                                    if (viewManual?.content.startsWith('{')) {
                                        contentData = JSON.parse(viewManual.content);
                                        isMixed = true;
                                    }
                                } catch { }

                                // Fallback for legacy single-type content
                                if (!isMixed && viewManual) {
                                    if (viewManual.type === 'text') contentData.text = viewManual.content;
                                    if (viewManual.type === 'image') contentData.image = viewManual.content;
                                    if (viewManual.type === 'video') contentData.video = viewManual.content;
                                    if (viewManual.type === 'audio') contentData.audio = viewManual.content;
                                    if (viewManual.type === 'link') contentData.link = viewManual.content;
                                }

                                return (
                                    <div className="space-y-4">
                                        {/* Text Section */}
                                        {contentData.text && contentData.text.trim() && (
                                            <div className="p-4 bg-muted/50 rounded-lg border text-sm whitespace-pre-wrap">
                                                {contentData.text}
                                            </div>
                                        )}

                                        {/* Image Section */}
                                        {contentData.image && (
                                            <div>
                                                {!showFullMedia ? (
                                                    <div
                                                        className="group relative w-40 h-40 bg-muted rounded-xl overflow-hidden cursor-zoom-in border hover:shadow-lg transition-all"
                                                        onClick={() => setShowFullMedia(true)}
                                                    >
                                                        <img src={contentData.image} alt="Manual Image" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                            <ImageIcon className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="relative animate-in fade-in zoom-in-95 duration-200">
                                                        <img src={contentData.image} alt="Manual Full Sized" className="w-full h-auto rounded-lg border shadow-sm" />
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="absolute top-2 right-2 opacity-90 hover:opacity-100"
                                                            onClick={(e) => { e.stopPropagation(); setShowFullMedia(false); }}
                                                        >
                                                            Minimizar
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Audio Section */}
                                        {contentData.audio && (
                                            <div>
                                                {!showFullMedia ? (
                                                    <div
                                                        className="w-full sm:w-64 p-4 border rounded-xl bg-card hover:bg-accent/50 cursor-pointer transition-colors flex items-center gap-4 group"
                                                        onClick={() => setShowFullMedia(true)}
                                                    >
                                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                            <Mic className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-medium text-sm">Nota de Voz</p>
                                                            <p className="text-xs text-muted-foreground">Click para escuchar</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-full bg-muted/30 p-4 rounded-xl border animate-in slide-in-from-top-2">
                                                        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground ml-1">Reproductor</p>
                                                        <audio controls src={contentData.audio} className="w-full" />
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="mt-2 h-6 text-xs text-muted-foreground"
                                                            onClick={() => setShowFullMedia(false)}
                                                        >
                                                            Ocultar reproductor
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Video Section */}
                                        {contentData.video && (
                                            <a
                                                href={contentData.video}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full sm:w-64 p-4 border rounded-xl bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                                                        <Video className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">Vídeo Externo</p>
                                                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">Click para ver vídeo</p>
                                                    </div>
                                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            </a>
                                        )}

                                        {/* Link Section */}
                                        {contentData.link && (
                                            <a
                                                href={contentData.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full sm:w-64 p-4 border rounded-xl bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                                        <ExternalLink className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">Enlace Externo</p>
                                                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">Click para abrir</p>
                                                    </div>
                                                </div>
                                            </a>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-end items-center border-t pt-4">
                        <Button onClick={() => setViewManual(null)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {filteredManuals.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-xl">
                    <FileText className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
                    <h3 className="text-lg font-medium">No hay manuales guardados</h3>
                    <p className="text-muted-foreground">Sube tu primer manual para tenerlo siempre a mano.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredManuals.map(manual => (
                        <Card
                            key={manual.id}
                            className="cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 group bg-white dark:bg-slate-900"
                            onClick={() => setViewManual(manual)}
                        >
                            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50">
                                <div className="flex justify-between items-start">
                                    <div className={`
                                        p-3 rounded-xl transition-colors
                                        ${manual.type === 'video' ? 'bg-red-50 text-red-600' : ''}
                                        ${manual.type === 'image' ? 'bg-blue-50 text-blue-600' : ''}
                                        ${manual.type === 'text' ? 'bg-orange-50 text-orange-600' : ''}
                                        ${manual.type === 'audio' ? 'bg-purple-50 text-purple-600' : ''}
                                        ${manual.type === 'link' ? 'bg-green-50 text-green-600' : ''}
                                    `}>
                                        {manual.type === 'video' && <Video className="h-6 w-6" />}
                                        {manual.type === 'image' && <ImageIcon className="h-6 w-6" />}
                                        {manual.type === 'link' && <ExternalLink className="h-6 w-6" />}
                                        {manual.type === 'text' && <FileText className="h-6 w-6" />}
                                        {manual.type === 'audio' && <Mic className="h-6 w-6" />}
                                    </div>
                                    <Badge variant="outline" className="font-normal border-transparent bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                        {manual.category}
                                    </Badge>
                                </div>
                                <CardTitle className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">{manual.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                                    {manual.description || "Sin descripción"}
                                </p>
                            </CardContent>
                            <CardFooter className="pt-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={(e) => handleEdit(manual, e)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10" onClick={(e) => deleteManual(manual.id, e)}>
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
