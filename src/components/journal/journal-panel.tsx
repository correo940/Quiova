'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useJournal } from '@/context/JournalContext';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { supabase } from '@/lib/supabase';

import { usePathname, useRouter } from 'next/navigation';
import { X, Save, Bold, Italic, Underline as UnderlineIcon, Highlighter, Palette, Loader2, Settings, Heading1, Heading2, Heading3, ExternalLink, Quote, Plus, Tag, Image as ImageIcon, Mic, Globe, ArrowLeft, ArrowRight, RotateCw, Search, Clipboard, Link as LinkIcon, MoveUpRight, Pin, HelpCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import ImageExtension from '@tiptap/extension-image';
import { AudioExtension } from './extensions/audio-extension';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface JournalPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function JournalPanel({ isOpen, onClose }: JournalPanelProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { selectedDate, width, setWidth, isBrowserPinned, setBrowserPinned, browserWindow, setBrowserWindow, setBrowserOpen } = useJournal();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [opacity, setOpacity] = useState(1);
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const recordingInterval = React.useRef<NodeJS.Timeout | null>(null);
    const popupRef = React.useRef<Window | null>(null);
    const [pipWindow, setPipWindow] = useState<Window | null>(null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
    const autoSaveTimer = React.useRef<NodeJS.Timeout | null>(null);
    const isLoadingContentRef = React.useRef(false);

    const togglePiP = async () => {
        if (pipWindow) {
            pipWindow.close();
            setPipWindow(null);
            return;
        }

        // Check API support
        if (!('documentPictureInPicture' in window)) {
            toast.error('Tu navegador no soporta el modo "Notas Flotantes" (Picture-in-Picture). Prueba en Chrome o Edge.');
            return;
        }

        try {
            // Request PiP Window
            const pip = await (window as any).documentPictureInPicture.requestWindow({
                width: 400,
                height: 600,
            });

            // Copy Styles
            Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style')).forEach((style) => {
                pip.document.head.appendChild(style.cloneNode(true));
            });

            // Add dark mode
            if (document.documentElement.classList.contains('dark')) {
                pip.document.documentElement.classList.add('dark');
            }
            if (document.body.classList.contains('dark')) {
                pip.document.body.classList.add('dark');
            }
            pip.document.body.className = document.body.className;

            // Handle closing
            pip.addEventListener('pagehide', () => {
                setPipWindow(null);
            });

            setPipWindow(pip);

        } catch (err) {
            console.error('Failed to open PiP:', err);
            toast.error('Error al abrir notas flotantes.');
        }
    };

    // Browser State
    const windowRef = React.useRef(browserWindow);

    useEffect(() => {
        windowRef.current = browserWindow;
    }, [browserWindow]);

    const openBrowserPopup = () => {
        const screenWidth = window.screen.availWidth;
        const screenHeight = window.screen.availHeight;
        const screenLeft = (window.screen as any).availLeft || 0;
        const screenTop = (window.screen as any).availTop || 0;

        // Calculate remaining width (100% - Journal Width%)
        const journalWidthPercent = width || 33;
        const availableWidth = Math.floor(screenWidth * ((100 - journalWidthPercent) / 100));

        const browserWidth = availableWidth - 12;
        const height = screenHeight - 60;

        const newWindow = window.open(
            'https://www.google.com/search?igu=1',
            'QuiobaBrowser',
            `width=${browserWidth},height=${height},left=${screenLeft},top=${screenTop},resizable=yes,scrollbars=yes,status=yes`
        );

        if (newWindow) {
            setBrowserWindow(newWindow);
            newWindow.focus();
        } else {
            toast.error('Revisa el bloqueador de ventanas emergentes.');
        }
    };

    // Keep track of pinned state in a ref for the cleanup function
    const isPinnedRef = React.useRef(isBrowserPinned);

    // Update ref when state changes
    useEffect(() => {
        isPinnedRef.current = isBrowserPinned;
    }, [isBrowserPinned]);

    // Auto-close on unmount if NOT pinned
    useEffect(() => {
        return () => {
            if (!isPinnedRef.current && windowRef.current && !windowRef.current.closed) {
                windowRef.current.close();
                setBrowserWindow(null);
            }
        };
    }, []);


    const editor = useEditor({
        extensions: [
            StarterKit,
            TextStyle,
            FontFamily,
            Underline,
            Color,
            Highlight.configure({ multicolor: true }),
            ImageExtension,
            AudioExtension,
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'prose prose-base dark:prose-invert max-w-none focus:outline-none min-h-[200px] p-5 text-[15px] leading-relaxed',
            },
        },
        onUpdate: () => {},
        immediatelyRender: false,
    });

    // Fetch user and subscribe to auth changes
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Click outside to close (DISABLED by user request)
    const panelRef = React.useRef<HTMLDivElement>(null);
    /*
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);
    */

    // Load content when pathname, user, or selectedDate changes
    useEffect(() => {
        if (!user || !editor) return;

        const loadContent = async () => {
            setIsLoading(true);

            let query: any = supabase
                .from('journal_entries')
                .select('content, context_id, tags')
                .eq('user_id', user.id);

            if (selectedDate) {
                // Fetch by date
                const startOfDay = new Date(selectedDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(selectedDate);
                endOfDay.setHours(23, 59, 59, 999);

                query = query
                    .gte('updated_at', startOfDay.toISOString())
                    .lte('updated_at', endOfDay.toISOString())
                    .order('updated_at', { ascending: false })
                    .limit(1);
            } else {
                // Fetch by context (current page)
                const contextId = pathname || '/';
                query = query.eq('context_id', contextId).maybeSingle();
            }

            const { data, error } = await query;

            // Handle array result from date query or single object from context query
            const entry = Array.isArray(data) ? data[0] : data;

            if (entry?.content) {
                isLoadingContentRef.current = true;
                editor.commands.setContent(entry.content);
                isLoadingContentRef.current = false;
                setTags(entry.tags || []);
            } else {
                // Auto-Title Capture for new notes
                let initialContent = '';
                if (!selectedDate && typeof document !== 'undefined') {
                    const pageTitle = document.title || '';
                    const h1 = document.querySelector('h1')?.innerText;
                    const titleToUse = h1 || pageTitle;

                    if (titleToUse) {
                        initialContent = `<h1>${titleToUse}</h1><p></p>`;
                    }
                }
                isLoadingContentRef.current = true;
                editor.commands.setContent(initialContent);
                isLoadingContentRef.current = false;
            }
            setSaveStatus('saved');
            setIsLoading(false);
        };

        loadContent();
    }, [pathname, selectedDate, editor]);

    // Handle pending quotes from context
    const { pendingQuote, clearPendingQuote } = useJournal();
    useEffect(() => {
        if (editor && pendingQuote) {
            editor.chain().focus().setBlockquote().insertContent(pendingQuote).run();
            clearPendingQuote();
        }
    }, [editor, pendingQuote, clearPendingQuote]);

    const handleSave = useCallback(async (isAutoSave = false) => {
        if (!user || !editor) return;
        if (!isAutoSave) setIsSaving(true);
        setSaveStatus('saving');
        const contextId = pathname || '/';
        const content = editor.getJSON();
        const firstNode = (content.content as any[])?.[0];
        const title = (firstNode?.type === 'heading' && firstNode.attrs?.level === 1)
            ? (firstNode.content?.map((n: any) => n.text || '').join('') || '')
            : '';

        const { error } = await supabase
            .from('journal_entries')
            .upsert({
                user_id: user.id,
                context_id: contextId,
                content: content,
                tags: tags,
                metadata: { title },
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id, context_id' });

        if (!isAutoSave) setIsSaving(false);
        if (error) {
            console.error('Error saving journal entry:', error);
            setSaveStatus('unsaved');
            toast.error(`Error al guardar: ${error.message}`);
        } else {
            setSaveStatus('saved');
            // No mostramos toast para evitar tapar los botones de la cabecera (el indicador '● Guardado' de la UI ya es suficiente)
        }
    }, [user, editor, pathname, tags]);

    // Auto-save: debounce 1.5s tras cada cambio en el editor
    useEffect(() => {
        if (!editor) return;

        const handleUpdate = () => {
            if (isLoadingContentRef.current) return;
            setSaveStatus('unsaved');
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
            autoSaveTimer.current = setTimeout(() => {
                handleSave(true);
            }, 1500);
        };

        editor.on('update', handleUpdate);
        return () => {
            editor.off('update', handleUpdate);
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        };
    }, [editor, handleSave]);

    // #9: Atajos de teclado
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave(false);
            }
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleSave, onClose]);

    // #11: Contador de palabras
    const [wordCount, setWordCount] = useState(0);
    useEffect(() => {
        if (!editor) return;
        const updateCount = () => {
            const text = editor.getText();
            setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
        };
        updateCount();
        editor.on('update', updateCount);
        return () => { editor.off('update', updateCount); };
    }, [editor]);

    // #8: Drag resize handle
    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = width;
        const onMouseMove = (ev: MouseEvent) => {
            const delta = startX - ev.clientX;
            const newWidth = Math.min(80, Math.max(20, startWidth + (delta / window.innerWidth * 100)));
            setWidth(newWidth);
        };
        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    if (!editor) return null;

    const getTagColor = (tag: string) => {
        const palette = [
            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
            'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
            'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
            'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800',
            'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800',
        ];
        let hash = 0;
        for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
        return palette[Math.abs(hash) % palette.length];
    };

    const handleQuote = () => {
        if (!editor) return;

        const selection = window.getSelection();
        const text = selection?.toString();

        if (text) {
            editor.chain().focus().setBlockquote().insertContent(text).run();
        } else {
            // If no text selected on page, just toggle blockquote for current line
            editor.chain().focus().toggleBlockquote().run();
        }
    };

    const handleAddTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleImageUpload = async (file: File) => {
        if (!user) {
            toast.error('Debes iniciar sesión para subir imágenes');
            return;
        }
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
            .from('journal-media')
            .upload(fileName, file);

        if (error) {
            console.error('Error uploading image:', error);
            toast.error(`Error al subir imagen: ${error.message}`);
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('journal-media')
            .getPublicUrl(fileName);

        editor?.chain().focus().setImage({ src: publicUrl }).run();
    };

    const handleDrop = async (e: React.DragEvent) => {
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            e.preventDefault();
            e.stopPropagation();
            await handleImageUpload(file);
        }
    };

    const handleSmartPaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) return;

            // Simple URL detection
            const isUrl = /^(http|https):\/\/[^ "]+$/.test(text);

            if (isUrl) {
                // If it's a URL, suggest linking context or inserting link
                editor.chain().focus().setLink({ href: text }).insertContent(text).run();
                toast.success('Enlace insertado');
            } else {
                // If text, insert as blockquote
                editor.chain().focus().setBlockquote().insertContent(text).run();
                toast.success('Texto pegado como cita');
            }
        } catch (err) {
            console.error('Clipboard error:', err);
            toast.error('No se pudo acceder al portapapeles');
        }
    };

    const startRecording = async () => {
        if (!user) {
            toast.error('Debes iniciar sesión para grabar audio');
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast.error('Tu navegador no soporta grabación de audio.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Determine supported mime type
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
            }

            const recorder = new MediaRecorder(stream, { mimeType });
            const chunks: BlobPart[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = async () => {
                // Clear timer
                if (recordingInterval.current) {
                    clearInterval(recordingInterval.current);
                    recordingInterval.current = null;
                }
                setRecordingTime(0);

                const blob = new Blob(chunks, { type: mimeType });

                if (blob.size === 0) {
                    toast.error('La grabación está vacía. Intenta hablar más fuerte o verifica tu micrófono.');
                    return;
                }

                console.log(`Recording finished. Type: ${mimeType}, Size: ${blob.size} bytes`);

                const fileExt = mimeType.includes('mp4') ? 'mp4' : 'webm';
                const file = new File([blob], `voice-${Date.now()}.${fileExt}`, { type: mimeType });

                // Upload audio
                if (!user) {
                    console.error('User not found in onstop');
                    toast.error('Usuario no autenticado al finalizar grabación');
                    return;
                }

                const fileName = `${user.id}/${file.name}`;
                const { error } = await supabase.storage
                    .from('journal-media')
                    .upload(fileName, file);

                if (error) {
                    console.error('Error uploading audio:', error);
                    toast.error(`Error al guardar audio: ${error.message}`);
                    return;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('journal-media')
                    .getPublicUrl(fileName);

                // Insert audio player using custom extension
                editor?.chain().focus().setAudio({ src: publicUrl }).run();

                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start(100); // Collect chunks every 100ms
            setMediaRecorder(recorder);
            setIsRecording(true);

            // Start timer
            setRecordingTime(0);
            recordingInterval.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err: any) {
            console.error('Error accessing microphone:', err);
            let errorMessage = 'No se pudo acceder al micrófono.';

            if (err.name === 'NotAllowedError') {
                errorMessage = 'Permiso denegado. Por favor permite el acceso al micrófono en tu navegador.';
            } else if (err.name === 'NotFoundError') {
                errorMessage = 'No se encontró ningún micrófono.';
            } else if (err.name === 'NotReadableError') {
                errorMessage = 'El micrófono está siendo usado por otra aplicación.';
            } else {
                errorMessage = `Error: ${err.message || err.name || 'Desconocido'}`;
            }

            toast.error(errorMessage);
        }
    };

    const stopRecording = () => {
        mediaRecorder?.stop();
        setIsRecording(false);
        setMediaRecorder(null);
        if (recordingInterval.current) {
            clearInterval(recordingInterval.current);
            recordingInterval.current = null;
        }
        setRecordingTime(0);
    };

    const formatRecordingTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };


    const JournalUI = (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                <div>
                    <h2 className="font-headline font-bold text-lg flex items-center gap-2">
                        📒 Mis Apuntes
                    </h2>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="link"
                            className="p-0 h-auto text-[10px] text-blue-500 hover:underline"
                            onClick={() => {
                                if (pipWindow) {
                                    pipWindow.close();
                                    setPipWindow(null);
                                }
                                router.push('/journal');
                                onClose();
                            }}
                        >
                            Ver Biblioteca Completa
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {selectedDate ? (
                            <>
                                Del: {selectedDate.toLocaleDateString()}
                            </>
                        ) : (
                            <>Sobre: {pathname === '/' ? 'Inicio' : pathname}</>
                        )}
                    </p>
                    <p className="text-[10px] leading-none mt-0.5">
                        {saveStatus === 'saving' ? (
                            <span className="text-amber-500">● Guardando...</span>
                        ) : saveStatus === 'unsaved' ? (
                            <span className="text-amber-500">● Sin guardar</span>
                        ) : (
                            <span className="text-green-500">● Guardado</span>
                        )}
                    </p>
                    {selectedDate && (
                        <Button
                            variant="link"
                            className="h-auto p-0 text-xs text-blue-500"
                            onClick={async () => {
                                const startOfDay = new Date(selectedDate);
                                startOfDay.setHours(0, 0, 0, 0);
                                const endOfDay = new Date(selectedDate);
                                endOfDay.setHours(23, 59, 59, 999);

                                const { data } = await supabase
                                    .from('journal_entries')
                                    .select('context_id')
                                    .eq('user_id', user.id)
                                    .gte('updated_at', startOfDay.toISOString())
                                    .lte('updated_at', endOfDay.toISOString())
                                    .limit(1)
                                    .single();

                                if (data?.context_id) {
                                    router.push(data.context_id);
                                    onClose();
                                } else {
                                    toast.info('No hay entrada para esta fecha');
                                }
                            }}
                        >
                            Ir al sitio
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-0.5">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={pipWindow ? "secondary" : "ghost"}
                                    size="icon"
                                    onClick={togglePiP}
                                    className="h-8 w-8 shrink-0"
                                >
                                    <MoveUpRight className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom"><p>Notas flotantes (PiP)</p></TooltipContent>
                        </Tooltip>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 z-[70] p-4" align="end">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-sm mb-3">Ajustes del panel</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-sm text-muted-foreground">Opacidad</span>
                                                <Slider defaultValue={[opacity]} max={1} min={0.2} step={0.1} className="w-32" onValueChange={(value) => setOpacity(value[0])} />
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-sm text-muted-foreground">Ancho</span>
                                                <Slider defaultValue={[width]} max={80} min={20} step={5} className="w-32" onValueChange={(value) => setWidth(value[0])} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-t border-border pt-3">
                                        <h4 className="font-semibold text-sm mb-2">Herramientas</h4>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => openBrowserPopup()}>
                                                <Globe className="w-3.5 h-3.5" /> Navegador
                                            </Button>
                                            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleSmartPaste}>
                                                <Clipboard className="w-3.5 h-3.5" /> Pegar
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="border-t border-border pt-3 text-[11px] text-muted-foreground space-y-1">
                                        <p><kbd className="bg-muted px-1 rounded text-[10px]">Ctrl+S</kbd> Guardar</p>
                                        <p><kbd className="bg-muted px-1 rounded text-[10px]">Esc</kbd> Cerrar panel</p>
                                        <p><kbd className="bg-muted px-1 rounded text-[10px]">Ctrl+B/I/U</kbd> Formato</p>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleSave(false)} disabled={isSaving} className="h-8 w-8 shrink-0">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom"><p>Guardar (Ctrl+S)</p></TooltipContent>
                        </Tooltip>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                if (pipWindow) { pipWindow.close(); setPipWindow(null); }
                                onClose();
                            }}
                            className="h-8 w-8 shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </TooltipProvider>
                </div>
            </div>

            {/* Tags Input */}
            <div className="px-4 py-2 border-b border-border bg-background/50">
                <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                        <span key={tag} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getTagColor(tag)}`}>
                            {tag}
                            <button onClick={() => handleRemoveTag(tag)} className="hover:opacity-70 ml-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag();
                            }
                        }}
                        placeholder="Añadir etiqueta..."
                        className="h-7 text-xs border-none shadow-none focus-visible:ring-0 px-0"
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddTag}>
                        <Plus className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {/* Toolbar — Fila 1: fuente + formato texto */}
            <div className="flex items-center gap-0.5 px-2 pt-2 pb-1 border-b border-border bg-background sticky top-0 z-10">
                <Select onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()}>
                    <SelectTrigger className="w-[100px] h-7 text-xs">
                        <SelectValue placeholder="Fuente" />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Comic Sans MS, Comic Sans">Comic Sans</SelectItem>
                        <SelectItem value="serif">Serif</SelectItem>
                        <SelectItem value="monospace">Mono</SelectItem>
                        <SelectItem value="cursive">Cursiva</SelectItem>
                    </SelectContent>
                </Select>

                <div className="w-px h-5 bg-border mx-1" />

                <Button variant={editor.isActive('bold') ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleBold().run()}>
                    <Bold className="w-3.5 h-3.5" />
                </Button>
                <Button variant={editor.isActive('italic') ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <Italic className="w-3.5 h-3.5" />
                </Button>
                <Button variant={editor.isActive('underline') ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleUnderline().run()}>
                    <UnderlineIcon className="w-3.5 h-3.5" />
                </Button>

                <div className="w-px h-5 bg-border mx-1" />

                <Button variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                    <Heading1 className="w-3.5 h-3.5" />
                </Button>
                <Button variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                    <Heading2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                    <Heading3 className="w-3.5 h-3.5" />
                </Button>

                <div className="w-px h-5 bg-border mx-1" />

                <Button variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={handleQuote}>
                    <Quote className="w-3.5 h-3.5" />
                </Button>
            </div>

            {/* Toolbar — Fila 2: resaltado + colores + media */}
            <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border bg-background">
                <Button variant={editor.isActive('highlight') ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleHighlight().run()}>
                    <Highlighter className="w-3.5 h-3.5" />
                </Button>

                <div className="w-px h-5 bg-border mx-1" />

                <div className="flex items-center gap-1">
                    {['#18181b','#EF4444','#3B82F6','#22C55E','#A855F7','#F59E0B'].map((color, i) => (
                        <button
                            key={color}
                            className="w-4 h-4 rounded-full border border-white/30 ring-1 ring-black/10 hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            onClick={() => editor.chain().focus().setColor(color).run()}
                        />
                    ))}
                </div>

                <div className="w-px h-5 bg-border mx-1" />

                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.getElementById('image-upload')?.click()} title="Insertar imagen">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <input id="image-upload" type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }}
                    />
                </Button>

                {isRecording && (
                    <span className="text-[11px] text-red-500 font-medium animate-pulse ml-1">
                        ● {formatRecordingTime(recordingTime)}
                    </span>
                )}
                <Button
                    variant={isRecording ? 'destructive' : 'ghost'}
                    size="icon"
                    className={`h-7 w-7 ${isRecording ? 'animate-pulse' : ''}`}
                    onClick={isRecording ? stopRecording : startRecording}
                >
                    <Mic className="w-3.5 h-3.5" />
                </Button>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-900">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        Cargando notas...
                    </div>
                ) : (
                    <EditorContent editor={editor} />
                )}
            </div>

            {/* Footer — contador de palabras */}
            <div className="px-4 py-1.5 border-t border-border bg-muted/20 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                    {wordCount} {wordCount === 1 ? 'palabra' : 'palabras'}
                </span>
                <span className="text-[11px] text-muted-foreground hidden sm:block">
                    Arrastra el borde para redimensionar
                </span>
            </div>
        </div>
    );

    if (pipWindow) {
        return createPortal(
            JournalUI,
            pipWindow.document.body
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay — solo visible en móvil */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-[59] md:hidden"
                        onClick={onClose}
                    />

                    {/* Panel móvil: bottom sheet */}
                    <motion.div
                        key="mobile-panel"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={{ opacity: opacity }}
                        className="fixed bottom-0 left-0 right-0 h-[60vh] bg-background border-t border-border shadow-2xl z-[60] flex flex-col rounded-t-2xl overflow-hidden md:hidden"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        ref={panelRef}
                    >
                        <div className="flex justify-center pt-2 pb-1 shrink-0">
                            <div className="w-10 h-1 bg-border rounded-full" />
                        </div>
                        {JournalUI}
                    </motion.div>

                    {/* Panel escritorio: lateral derecho */}
                    <motion.div
                        key="desktop-panel"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={{ width: `${width}%`, opacity: opacity }}
                        className="fixed top-0 right-0 h-full bg-background border-l border-border shadow-2xl z-[60] flex-col hidden md:flex"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                    >
                        <div
                            className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors z-10 group"
                            onMouseDown={handleResizeMouseDown}
                        >
                            <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-border rounded-full group-hover:bg-primary/50 transition-colors" />
                        </div>
                        {JournalUI}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
