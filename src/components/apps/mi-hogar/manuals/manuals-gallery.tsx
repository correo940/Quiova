'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, isBefore } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { Plus, Search, FileText, Image as ImageIcon, Video, Trash2, ExternalLink, AlertCircle, Loader2, Mic, Square, Pencil, Grid3x3, List, Filter, X, Home, ChefHat, Droplet, Tv, Bed, Car, FolderOpen, Tag as TagIcon, SortAsc, Download, Share2, Bell, History, CloudOff, QrCode, Scan, Settings, Star, Images, StickyNote, Upload, Database, ListChecks, Zap, File, BookOpen, ShieldCheck } from 'lucide-react';
import { es } from 'date-fns/locale';
import imageCompression from 'browser-image-compression';
import { exportManualToPDF } from '@/lib/export-manual-pdf';
import { ShareManualDialog } from './share-manual-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ReminderDialog } from './reminder-dialog';
import { VersionHistoryDialog } from './version-history-dialog';
import { offlineStorage } from '@/lib/offline-storage';
import { QRScannerDialog } from './qr-scanner-dialog';
import { extractTextFromImage } from '@/lib/ocr-extract';
import { ManageRoomsDialog } from './manage-rooms-dialog';
import { ManualsDashboard } from './manuals-dashboard';
import { NotesDialog } from './notes-dialog';
import { ImageGalleryDialog } from './image-gallery-dialog';
import { exportBackup, importBackup, exportManualsCsv } from '@/lib/backup-restore';
import { ChecklistDialog } from './checklist-dialog';
import { EnergyDialog } from './energy-dialog';
import { QrCodeDialog } from './qr-code-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type Manual = {
    id: string;
    title: string;
    category: string;
    description: string;
    type: 'text' | 'image' | 'video' | 'link' | 'audio';
    content: string;
    date: string;
    room_id?: string;
    updated_at?: string;
    tags?: string[];
    purchase_store?: string;
    purchase_date?: string;
    purchase_price?: number;
    spare_parts_url?: string;
    warranty_expires?: string;
    is_favorite?: boolean;
};

type Room = {
    id: string;
    name: string;
    icon: string;
    parent_id?: string;
};

const ROOM_ICONS: Record<string, any> = {
    'ChefHat': ChefHat,
    'Droplet': Droplet,
    'Tv': Tv,
    'Bed': Bed,
    'Car': Car,
    'Home': Home,
};

export default function ManualsGallery() {
    const [manuals, setManuals] = useState<Manual[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [search, setSearch] = useState('');
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'date' | 'name' | 'category'>('date');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Form states
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'text' | 'image' | 'video' | 'link' | 'audio'>('text');
    const [roomId, setRoomId] = useState<string>('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');

    // Separate draft states
    const [draftText, setDraftText] = useState('');
    const [draftVideo, setDraftVideo] = useState('');
    const [draftLink, setDraftLink] = useState('');
    const [draftImage, setDraftImage] = useState('');
    const [draftAudio, setDraftAudio] = useState('');
    const [draftPdf, setDraftPdf] = useState(''); // Base64 PDF data or URL
    const [draftPdfName, setDraftPdfName] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Audio Recorder State
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const [viewManual, setViewManual] = useState<Manual | null>(null);
    const [showFullMedia, setShowFullMedia] = useState(false);
    const [shareManual, setShareManual] = useState<Manual | null>(null);
    const [reminderManual, setReminderManual] = useState<Manual | null>(null);
    const [versionManual, setVersionManual] = useState<Manual | null>(null);
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [offlineCount, setOfflineCount] = useState(0);
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [ocrProcessing, setOcrProcessing] = useState(false);
    const [notesManual, setNotesManual] = useState<Manual | null>(null);
    const [galleryImages, setGalleryImages] = useState<any[]>([]);
    const [showGallery, setShowGallery] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [checklistManual, setChecklistManual] = useState<Manual | null>(null);
    const [energyManual, setEnergyManual] = useState<Manual | null>(null);
    const [qrManual, setQrManual] = useState<Manual | null>(null);
    const [isListening, setIsListening] = useState(false);

    // Purchase info states
    const [purchaseStore, setPurchaseStore] = useState('');
    const [purchaseDate, setPurchaseDate] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [sparePartsUrl, setSparePartsUrl] = useState('');
    const [warrantyExpires, setWarrantyExpires] = useState('');
    const [showManageRooms, setShowManageRooms] = useState(false);
    const [manualContentImages, setManualContentImages] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (user) {
            fetchRooms();
            fetchManuals();
        } else {
            setManuals([]);
            setRooms([]);
            setLoading(false);
        }
    }, [user]);

    const fetchRooms = async () => {
        try {
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .order('name');

            if (error) {
                // If table doesn't exist yet, just silently ignore
                console.log('Rooms table not available yet (run migrations)');
                return;
            }
            setRooms(data || []);
        } catch (error) {
            console.error('Error fetching rooms:', error);
            // Don't throw, just continue without rooms
        }
    };

    const fetchManuals = async () => {
        try {
            setLoading(true);

            // Try to fetch with tags first
            let { data, error } = await supabase
                .from('manuals')
                .select(`
                    *,
                    manual_tags (tag)
                `)
                .order('created_at', { ascending: false });

            // If tags table doesn't exist, fetch without it
            if (error && error.message?.includes('manual_tags')) {
                console.log('Manual tags table not available yet, fetching without tags');
                const result = await supabase
                    .from('manuals')
                    .select('*')
                    .order('created_at', { ascending: false });

                data = result.data;
                error = result.error;
            }

            if (error) throw error;
            if (!data) {
                setManuals([]);
                return;
            }

            const mappedManuals: Manual[] = data.map((item: any) => ({
                id: item.id,
                title: item.title,
                category: item.category || '',
                description: item.description || '',
                type: item.type as any,
                content: item.content || '',
                date: new Date(item.created_at).toLocaleDateString(),
                room_id: item.room_id,
                updated_at: item.updated_at,
                tags: item.manual_tags?.map((t: any) => t.tag) || []
            }));

            setManuals(mappedManuals);

            // Extract images for gallery preview
            const imagesMap: Record<string, string[]> = {};
            mappedManuals.forEach(m => {
                try {
                    const images: string[] = [];
                    // Check if content is JSON
                    if (m.content && m.content.startsWith('{')) {
                        const json = JSON.parse(m.content);
                        if (json.image) images.push(json.image);
                        // Future: if we support multiple images in JSON
                        if (json.images && Array.isArray(json.images)) images.push(...json.images);
                    }
                    // Check if type is image and content is URL
                    else if (m.type === 'image' && m.content) {
                        images.push(m.content);
                    }

                    if (images.length > 0) {
                        imagesMap[m.id] = images;
                    }
                } catch (e) {
                    console.warn('Error parsing manual content for images:', m.id);
                }
            });
            setManualContentImages(imagesMap);
        } catch (error) {
            console.error('Error fetching manuals:', error);
            toast.error('Error al cargar los manuales');
        } finally {
            setLoading(false);
        }
    };

    const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast.error('Por favor sube un archivo PDF válido');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error('El PDF es demasiado grande (max 5MB)');
            return;
        }

        try {
            const reader = new FileReader();
            reader.onload = (event) => {
                const pdfData = event.target?.result as string;
                setDraftPdf(pdfData);
                setDraftPdfName(file.name);
                toast.success('PDF cargado correctamente');
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error reading PDF:', error);
            toast.error('Error al leer el PDF');
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            // Compress image automatically
            const compressedFile = await imageCompression(file, {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1920,
                useWebWorker: true
            });

            const reader = new FileReader();
            reader.onload = async (event) => {
                const imageData = event.target?.result as string;
                setDraftImage(imageData);
                toast.success('Imagen comprimida y cargada');

                // Auto-extract text via OCR if text field is empty
                if (!draftText && !ocrProcessing) {
                    setOcrProcessing(true);
                    const extractedText = await extractTextFromImage(imageData);
                    if (extractedText) {
                        setDraftText(extractedText);
                    }
                    setOcrProcessing(false);
                }
            };
            reader.readAsDataURL(compressedFile);
        } catch (error) {
            console.error('Error compressing image:', error);
            toast.error('Error al procesar la imagen');
        }
    };

    const addTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const saveManualTags = async (manualId: string, tagsList: string[]) => {
        try {
            // Delete existing tags
            await supabase
                .from('manual_tags')
                .delete()
                .eq('manual_id', manualId);

            // Insert new tags
            if (tagsList.length > 0) {
                const tagInserts = tagsList.map(tag => ({
                    manual_id: manualId,
                    tag: tag
                }));

                await supabase
                    .from('manual_tags')
                    .insert(tagInserts);
            }
        } catch (error) {
            console.error('Error saving tags:', error);
        }
    };

    const addManual = async () => {
        if (!title || !category || !user) {
            toast.error('Título y categoría son obligatorios');
            return;
        }

        const contentObj = {
            text: draftText,
            video: draftVideo,
            link: draftLink,
            image: draftImage,
            audio: draftAudio,
            pdf: draftPdf,
            pdfName: draftPdfName
        };

        const finalContent = JSON.stringify(contentObj);

        try {
            if (editingId) {
                const { data, error } = await supabase
                    .from('manuals')
                    .update({
                        title,
                        category,
                        description,
                        type,
                        content: finalContent,
                        room_id: roomId || null
                    })
                    .eq('id', editingId)
                    .select()
                    .single();

                if (error) throw error;

                await saveManualTags(editingId, tags);

                toast.success('Manual actualizado');
            } else {
                const { data, error } = await supabase
                    .from('manuals')
                    .insert([{
                        user_id: user.id,
                        title,
                        category,
                        description,
                        type,
                        content: finalContent,
                        room_id: roomId || null
                    }])
                    .select()
                    .single();

                if (error) throw error;

                await saveManualTags(data.id, tags);

                toast.success('Manual añadido correctamente');
            }

            setIsDialogOpen(false);
            resetForm();
            fetchManuals();
        } catch (error) {
            console.error('Error saving manual:', error);
            toast.error('Error al guardar el manual');
        }
    };

    const handleEdit = (manual: Manual, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setEditingId(manual.id);
        setTitle(manual.title);
        setCategory(manual.category);
        setDescription(manual.description);
        setType(manual.type);
        setRoomId(manual.room_id || '');
        setTags(manual.tags || []);

        try {
            if (manual.content.startsWith('{')) {
                const parsed = JSON.parse(manual.content);
                setDraftText(parsed.text || '');
                setDraftVideo(parsed.video || '');
                setDraftLink(parsed.link || '');
                setDraftImage(parsed.image || '');
                setDraftAudio(parsed.audio || '');
            } else {
                resetForm();
                setEditingId(manual.id);
                setTitle(manual.title);
                setCategory(manual.category);
                setDescription(manual.description);
                setType(manual.type);
                setRoomId(manual.room_id || '');
                setTags(manual.tags || []);

                switch (manual.type) {
                    case 'text': setDraftText(manual.content); break;
                    case 'video': setDraftVideo(manual.content); break;
                    case 'link': setDraftLink(manual.content); break;
                    case 'image': setDraftImage(manual.content); break;
                    case 'audio': setDraftAudio(manual.content); break;
                }
            }
        } catch (e) {
            setDraftText(manual.content);
        }

        setIsDialogOpen(true);
    };

    const toggleFavorite = async (id: string, currentState: boolean, e?: React.MouseEvent) => {
        e?.stopPropagation();

        try {
            const { error } = await supabase
                .from('manuals')
                .update({ is_favorite: !currentState })
                .eq('id', id);

            if (error) throw error;

            setManuals(manuals.map(m =>
                m.id === id ? { ...m, is_favorite: !currentState } : m
            ));

            toast.success(!currentState ? 'Añadido a favoritos' : 'Eliminado de favoritos');
        } catch (error) {
            console.error('Error toggling favorite:', error);
            toast.error('Error al actualizar favorito');
        }
    };

    const deleteManual = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
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
        setRoomId('');
        setTags([]);
        setTagInput('');
        setDraftText('');
        setDraftVideo('');
        setDraftLink('');
        setDraftImage('');
        setDraftAudio('');
        setDraftPdf('');
        setDraftPdfName('');
        setPurchaseStore('');
        setPurchaseDate('');
        setPurchasePrice('');
        setSparePartsUrl('');
        setWarrantyExpires('');
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
                stream.getTracks().forEach(track => track.stop());
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

    const toggleTypeFilter = (filterType: string) => {
        if (selectedTypes.includes(filterType)) {
            setSelectedTypes(selectedTypes.filter(t => t !== filterType));
        } else {
            setSelectedTypes([...selectedTypes, filterType]);
        }
    };

    // Enhanced search and filter logic
    const filteredManuals = manuals
        .filter(m => {
            // Filter by favorites
            if (showFavoritesOnly && !m.is_favorite) {
                return false;
            }

            // Room filter
            if (selectedRoom && m.room_id !== selectedRoom) return false;

            // Type filter
            if (selectedTypes.length > 0 && !selectedTypes.includes(m.type)) return false;

            // Search filter (enhanced)
            if (search) {
                const searchLower = search.toLowerCase();
                const matchesTitle = m.title.toLowerCase().includes(searchLower);
                const matchesDescription = m.description.toLowerCase().includes(searchLower);
                const matchesCategory = m.category.toLowerCase().includes(searchLower);
                const matchesTags = m.tags?.some(tag => tag.toLowerCase().includes(searchLower));

                // Search in text content
                let matchesContent = false;
                try {
                    if (m.content.startsWith('{')) {
                        const parsed = JSON.parse(m.content);
                        matchesContent = parsed.text?.toLowerCase().includes(searchLower);
                    } else if (m.type === 'text') {
                        matchesContent = m.content.toLowerCase().includes(searchLower);
                    }
                } catch (e) { }

                if (!matchesTitle && !matchesDescription && !matchesCategory && !matchesTags && !matchesContent) {
                    return false;
                }
            }

            return true;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.title.localeCompare(b.title);
                case 'category':
                    return a.category.localeCompare(b.category);
                case 'date':
                default:
                    return new Date(b.updated_at || b.date).getTime() - new Date(a.updated_at || a.date).getTime();
            }
        });

    const startVoiceSearch = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'es-ES';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setSearch(transcript);
                toast.success(`Buscando: ${transcript}`);
            };

            recognition.start();
        } else {
            toast.error('Tu navegador no soporta búsqueda por voz');
        }
    };

    // Get content type indicators
    // Helper for content type icons
    const getContentTypeIcon = (type: string) => {
        switch (type) {
            case 'video': return <Video className="h-4 w-4" />;
            case 'image': return <ImageIcon className="h-4 w-4" />;
            case 'text': return <FileText className="h-4 w-4" />;
            case 'audio': return <Mic className="h-4 w-4" />;
            case 'link': return <ExternalLink className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    // Helper for room icons
    const getRoomIcon = (iconName: string | undefined) => {
        if (!iconName) return '🏠'; // Default
        const icons: Record<string, string> = {
            'ChefHat': '🍳',
            'Utensils': '🍽️',
            'Sofa': '🛋️',
            'Tv': '📺',
            'Bed': '🛏️',
            'Bath': '🛁',
            'Droplet': '💧',
            'Briefcase': '💼',
            'Monitor': '🖥️',
            'Car': '🚗',
            'Wrench': '🔧',
            'Flower': '🌻',
            'Sun': '☀️',
            'Warehouse': '📦',
            'Box': '📦',
            'Gamepad': '🎮',
            'Music': '🎵',
            'Book': '📚',
            'Dumbbell': '🏋️',
            'Zap': '⚡'
        };
        return icons[iconName] || '🏠';
    };

    const getContentTypes = (manual: Manual): string[] => {
        const types: string[] = [];
        try {
            if (manual.content.startsWith('{')) {
                const parsed = JSON.parse(manual.content);
                if (parsed.text) types.push('text');
                if (parsed.image) types.push('image');
                if (parsed.video) types.push('video');
                if (parsed.audio) types.push('audio');
                if (parsed.link) types.push('link');
            } else {
                types.push(manual.type);
            }
        } catch (e) {
            types.push(manual.type);
        }
        return types;
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                        <BookOpen className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                            Manual y Mantenimiento
                        </h1>
                        <p className="text-slate-500">
                            Gestión inteligente de tus electrodomésticos y garantías
                        </p>
                    </div>
                </div>

            </div>


            {/* Room Filters */}
            <div className="flex gap-3 overflow-x-auto pb-2 mb-6">
                <Button
                    variant={selectedRoom === '' ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => setSelectedRoom('')}
                    className={`gap-3 px-6 rounded-full font-medium transition-all duration-300 ${selectedRoom === ''
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-200 scale-105'
                        : 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-400 hover:shadow-md border-2'
                        }`}
                >
                    <div className={`rounded-full p-1.5 ${selectedRoom === '' ? 'bg-white/20' : 'bg-emerald-100'
                        }`}>
                        <FolderOpen className="h-5 w-5" />
                    </div>
                    <span className="font-semibold">Todos</span>
                </Button>
                {rooms.map(room => {
                    const Icon = ROOM_ICONS[room.icon] || Home;
                    const isSelected = selectedRoom === room.id;
                    return (
                        <Button
                            key={room.id}
                            variant={isSelected ? 'default' : 'outline'}
                            size="lg"
                            onClick={() => setSelectedRoom(room.id)}
                            className={`gap-3 px-6 rounded-full font-medium transition-all duration-300 ${isSelected
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-200 scale-105'
                                : 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-400 hover:shadow-md hover:scale-105 border-2'
                                }`}
                        >
                            <div className={`rounded-full p-1.5 transition-all ${isSelected ? 'bg-white/20' : 'bg-emerald-100 group-hover:bg-emerald-200'
                                }`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <span className="font-semibold">{room.name}</span>
                        </Button>
                    );
                })}
                <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowManageRooms(true)}
                    title="Gestionar habitaciones"
                    className="gap-3 px-6 rounded-full border-2 border-dashed border-emerald-300 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700 transition-all duration-300 hover:scale-105 font-medium"
                >
                    <div className="rounded-full p-1.5 bg-emerald-100">
                        <Settings className="h-5 w-5" />
                    </div>
                    <span className="font-semibold">Gestionar</span>
                </Button>
                <Button
                    variant={showFavoritesOnly ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`gap-3 px-6 rounded-full font-medium transition-all duration-300 ${showFavoritesOnly
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-200 scale-105'
                        : 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-400 hover:shadow-md hover:scale-105 border-2'
                        }`}
                    title="Mostrar solo favoritos"
                >
                    <div className={`rounded-full p-1.5 ${showFavoritesOnly ? 'bg-white/20' : 'bg-emerald-100'
                        }`}>
                        <Star className={`h-5 w-5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                    </div>
                    <span className="font-semibold">Favoritos</span>
                </Button>
            </div>

            {/* Statistics Dashboard */}
            <ManualsDashboard />

            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500 group-focus-within:scale-110 transition-transform" />
                    <Input
                        placeholder="Buscar en manuales..."
                        className="pl-11 h-12 border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute right-2 top-1/2 -translate-y-1/2 hover:bg-emerald-50 ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}
                        onClick={startVoiceSearch}
                        title="Búsqueda por voz"
                    >
                        <Mic className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('grid')}
                            className={`h-8 px-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-emerald-600'}`}
                            title="Vista Cuadrícula"
                        >
                            <Grid3x3 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('list')}
                            className={`h-8 px-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-emerald-600'}`}
                            title="Vista Lista"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Type Filters */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Filter className="h-4 w-4" />
                                Filtrar
                                {selectedTypes.length > 0 && (
                                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                                        {selectedTypes.length}
                                    </Badge>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Tipo de Contenido</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toggleTypeFilter('text')}>
                                <FileText className="h-4 w-4 mr-2" />
                                Texto {selectedTypes.includes('text') && '✓'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleTypeFilter('image')}>
                                <ImageIcon className="h-4 w-4 mr-2" />
                                Imagen {selectedTypes.includes('image') && '✓'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleTypeFilter('video')}>
                                <Video className="h-4 w-4 mr-2" />
                                Vídeo {selectedTypes.includes('video') && '✓'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleTypeFilter('audio')}>
                                <Mic className="h-4 w-4 mr-2" />
                                Audio {selectedTypes.includes('audio') && '✓'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleTypeFilter('link')}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Enlace {selectedTypes.includes('link') && '✓'}
                            </DropdownMenuItem>
                            {selectedTypes.length > 0 && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setSelectedTypes([])}>
                                        <X className="h-4 w-4 mr-2" />
                                        Limpiar filtros
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Sort */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <SortAsc className="h-4 w-4" />
                                Ordenar
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setSortBy('date')}>
                                Fecha {sortBy === 'date' && '✓'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('name')}>
                                Nombre {sortBy === 'name' && '✓'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('category')}>
                                Categoría {sortBy === 'category' && '✓'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Backup</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => exportBackup()}>
                                <Database className="h-4 w-4 mr-2" />
                                Exportar Backup (JSON)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportManualsCsv()}>
                                <Download className="h-4 w-4 mr-2" />
                                Exportar CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => document.getElementById('backup-file-input')?.click()}>
                                <Upload className="h-4 w-4 mr-2" />
                                Importar Backup
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>



                    {/* Add Manual Button */}
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={resetForm} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all">
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Manual
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
                            <DialogHeader>
                                <DialogTitle>{editingId ? 'Editar Manual' : 'Añadir Manual'}</DialogTitle>
                                <DialogDescription>Sube instrucciones, fotos o vídeos de tus electrodomésticos.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Título *</Label>
                                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Caldera" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Categoría *</Label>
                                        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej. Calefacción" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Habitación</Label>
                                    <Select value={roomId} onValueChange={setRoomId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar habitación (opcional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Sin habitación</SelectItem>
                                            {rooms.map(room => {
                                                const Icon = ROOM_ICONS[room.icon] || Home;
                                                return (
                                                    <SelectItem key={room.id} value={room.id}>
                                                        <div className="flex items-center gap-2">
                                                            <Icon className="h-4 w-4" />
                                                            {room.name}
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Etiquetas</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                            placeholder="Añadir etiqueta..."
                                        />
                                        <Button type="button" onClick={addTag} size="sm">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {tags.map(tag => (
                                                <Badge key={tag} variant="secondary" className="gap-1">
                                                    <TagIcon className="h-3 w-3" />
                                                    {tag}
                                                    <X
                                                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                                                        onClick={() => removeTag(tag)}
                                                    />
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
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
                                            <p className="text-sm text-muted-foreground">Click para subir imagen (se comprimirá auto.)</p>
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
            </div>

            {/* Manuals Display */}
            {
                loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-16 w-16 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin"></div>
                            <p className="text-muted-foreground font-medium">Cargando manuales...</p>
                        </div>
                    </div>
                ) : filteredManuals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                        <div className="rounded-full bg-emerald-50 p-6 mb-6">
                            <FileText className="h-16 w-16 text-emerald-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">No hay manuales</h3>
                        <p className="text-muted-foreground text-center mb-6 max-w-md">
                            {search || selectedRoom || selectedTypes.length > 0
                                ? '¡No se encontraron manuales con estos filtros'
                                : '¡Comienza añadiendo tu primer manual!'}
                        </p>
                        {!search && !selectedRoom && selectedTypes.length === 0 && (
                            <Button
                                onClick={() => setIsDialogOpen(true)}
                                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-200 hover:shadow-xl transition-all"
                                size="lg"
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                Crear Primer Manual
                            </Button>
                        )}
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredManuals.map(manual => {
                            const contentTypes = getContentTypes(manual);
                            return (
                                <Card key={manual.id} className="group hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-emerald-500/30 overflow-hidden bg-white hover:bg-slate-50/50">
                                    <div className="relative aspect-video bg-slate-100 overflow-hidden group/image flex items-center justify-center">
                                        {/* Preview Content */}
                                        {manual.type === 'image' && manual.content ? (
                                            <img
                                                src={manual.content}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-105"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.parentElement?.classList.add('fallback-icon');
                                                }}
                                            />
                                        ) : null}

                                        {/* Fallbacks / Type Icons */}
                                        {(manual.type !== 'image' || !manual.content) && (
                                            <div className="flex flex-col items-center justify-center text-slate-300 group-hover:text-emerald-500/50 transition-colors">
                                                {manual.type === 'video' && <Video className="h-12 w-12" />}
                                                {manual.type === 'audio' && <Mic className="h-12 w-12" />}
                                                {(manual.type === 'text' || manual.type === 'link') && <FileText className="h-12 w-12" />}
                                                {manual.type === 'image' && !manual.content && <ImageIcon className="h-12 w-12" />}
                                            </div>
                                        )}

                                        {/* Action Buttons Overlay */}
                                        <div className="absolute top-2 right-2 flex gap-1 transform translate-x-12 group-hover/image:translate-x-0 transition-transform duration-300">
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                className="h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-sm"
                                                onClick={(e) => { e.stopPropagation(); handleEdit(manual); }}
                                            >
                                                <Pencil className="h-4 w-4 text-slate-600" />
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                className="h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-sm hover:text-red-500"
                                                onClick={(e) => deleteManual(manual.id, e)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* Badges Overlay */}
                                        <div className="absolute top-2 left-2 flex gap-1">
                                            {manual.warranty_expires && isBefore(new Date(manual.warranty_expires), new Date()) && (
                                                <Badge variant="destructive" className="shadow-sm text-[10px] h-6 px-2">Expirado</Badge>
                                            )}
                                        </div>

                                        {/* Favorites & QR Buttons (Bottom) */}
                                        <Button
                                            className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-white/80 hover:bg-white text-yellow-500 shadow-sm opacity-0 group-hover/image:opacity-100 transition-opacity transform translate-y-2 group-hover/image:translate-y-0 duration-300"
                                            size="icon"
                                            variant="ghost"
                                            onClick={(e) => toggleFavorite(manual.id, !!manual.is_favorite, e)}
                                        >
                                            <Star className={`h-5 w-5 ${manual.is_favorite ? 'fill-current' : ''}`} />
                                        </Button>

                                        <Button
                                            className="absolute bottom-2 left-2 h-8 w-8 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-sm transition-all hover:scale-105"
                                            size="icon"
                                            variant="ghost"
                                            title="Generar QR"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setQrManual(manual);
                                            }}
                                        >
                                            <QrCode className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <CardContent className="p-4">
                                        <div className="mb-3">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-base leading-tight group-hover:text-emerald-700 transition-colors line-clamp-1 pr-2">
                                                    {manual.title}
                                                </h3>
                                                <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground border-slate-200 shrink-0">
                                                    {manual.category}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                                                <span className="text-sm">{manual.room?.icon ? getRoomIcon(manual.room.icon) : '🏠'}</span>
                                                <span>{manual.room?.name || 'General'}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50">
                                            <Button
                                                variant="outline"
                                                className="flex-1 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 h-9 text-xs transition-colors font-medium"
                                                onClick={() => setViewManual(manual)}
                                            >
                                                Ver Detalles
                                            </Button>
                                            {manualContentImages[manual.id] && manualContentImages[manual.id].length > 0 && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="shrink-0 h-9 w-9 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setGalleryImages(manualContentImages[manual.id].map((img, idx) => ({
                                                            id: `${manual.id}-img-${idx}`,
                                                            image_url: img,
                                                            image_order: idx,
                                                            caption: manual.title
                                                        })));
                                                        setGalleryIndex(0);
                                                        setShowGallery(true);
                                                    }}
                                                >
                                                    <Images className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="px-4 py-2 bg-slate-50 text-[10px] text-muted-foreground flex justify-between border-t h-8">
                                        <span>Updated {formatDistanceToNow(new Date(manual.updated_at || manual.date), { locale: es, addSuffix: true })}</span>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50">
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Habitación</TableHead>
                                    <TableHead className="hidden md:table-cell">Categoría</TableHead>
                                    <TableHead className="hidden lg:table-cell">Garantía</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredManuals.map((manual) => (
                                    <TableRow key={manual.id} className="hover:bg-slate-50/50">
                                        <TableCell>
                                            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 w-fit">
                                                {getContentTypeIcon(manual.type)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span className="text-base text-slate-900">{manual.title}</span>
                                                <div className="flex items-center gap-2 md:hidden text-xs text-muted-foreground">
                                                    <span>{manual.room?.name}</span>
                                                    {manual.is_favorite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{manual.room?.icon ? getRoomIcon(manual.room.icon) : '🏠'}</span>
                                                <span className="text-sm">{manual.room?.name || '---'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <Badge variant="outline">{manual.category}</Badge>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell">
                                            {manual.warranty_expires ? (
                                                <div className={`flex items-center gap-1.5 text-sm ${isBefore(new Date(manual.warranty_expires), new Date()) ? 'text-red-600' : 'text-emerald-600'}`}>
                                                    <ShieldCheck className="h-4 w-4" />
                                                    <span>{new Date(manual.warranty_expires).toLocaleDateString()}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setQrManual(manual)}
                                                    title="Generar QR"
                                                >
                                                    <QrCode className="h-4 w-4 text-slate-500 hover:text-slate-900" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => toggleFavorite(manual.id, !!manual.is_favorite, e)}
                                                >
                                                    <Star className={`h-4 w-4 ${manual.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setViewManual(manual)}
                                                >
                                                    <FileText className="h-4 w-4 text-emerald-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => startEdit(manual, e)}
                                                >
                                                    <Pencil className="h-4 w-4 text-blue-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-4 w-4 text-red-600" onClick={(e) => deleteManual(manual.id, e)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )
            }

            {/* View Manual Dialog remains the same as before */}
            {
                viewManual && (
                    <Dialog open={!!viewManual} onOpenChange={(open) => !open && setViewManual(null)}>
                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                            <DialogHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <Badge variant="secondary" className="mb-2">{viewManual?.category}</Badge>
                                        <DialogTitle className="text-2xl">{viewManual?.title}</DialogTitle>
                                        {viewManual.tags && viewManual.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {viewManual.tags.map(tag => (
                                                    <Badge key={tag} variant="outline" className="text-xs">
                                                        <TagIcon className="h-3 w-3 mr-1" />
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto py-4 space-y-6">
                                {viewManual?.description && (
                                    <div className="space-y-2">
                                        <Label className="text-base font-semibold">Descripción</Label>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                            {viewManual.description}
                                        </p>
                                    </div>
                                )}

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

                                        if (!isMixed && viewManual) {
                                            if (viewManual.type === 'text') contentData.text = viewManual.content;
                                            if (viewManual.type === 'image') contentData.image = viewManual.content;
                                            if (viewManual.type === 'video') contentData.video = viewManual.content;
                                            if (viewManual.type === 'audio') contentData.audio = viewManual.content;
                                            if (viewManual.type === 'link') contentData.link = viewManual.content;
                                        }

                                        return (
                                            <div className="space-y-4">
                                                {contentData.text && contentData.text.trim() && (
                                                    <div className="p-4 bg-muted/50 rounded-lg border text-sm whitespace-pre-wrap">
                                                        {contentData.text}
                                                    </div>
                                                )}

                                                {contentData.image && (
                                                    <div>
                                                        {!showFullMedia ? (
                                                            <Card
                                                                onClick={() => setShowFullMedia(true)}
                                                                className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-200/50 border-t-4 border-t-emerald-500 hover:scale-[1.02] cursor-pointer hover:ring-2 hover:ring-emerald-300 hover:ring-offset-2"
                                                            >
                                                                <img src={contentData.image} alt="Manual Image" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                                    <ImageIcon className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                                                                </div>
                                                            </Card>
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
                            <DialogFooter className="sm:justify-between items-center border-t pt-4 flex-row">
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); setReminderManual(viewManual); }}
                                    >
                                        <Bell className="h-4 w-4 mr-2" />
                                        Recordatorios
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); setVersionManual(viewManual); }}
                                    >
                                        <History className="h-4 w-4 mr-2" />
                                        Historial
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); setNotesManual(viewManual); }}
                                    >
                                        <StickyNote className="h-4 w-4 mr-2" />
                                        Notas
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); setChecklistManual(viewManual); }}
                                    >
                                        <ListChecks className="h-4 w-4 mr-2" />
                                        Checklist
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); setEnergyManual(viewManual); }}
                                        className="border-yellow-200 hover:bg-yellow-50 text-yellow-700"
                                    >
                                        <Zap className="h-4 w-4 mr-2 fill-yellow-500" />
                                        Consumo
                                    </Button>
                                </div>
                                <Button onClick={() => setViewManual(null)}>Cerrar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )
            }

            {/* Share Manual Dialog */}
            {
                shareManual && (
                    <ShareManualDialog
                        manual={shareManual}
                        open={!!shareManual}
                        onOpenChange={(open) => !open && setShareManual(null)}
                    />
                )
            }

            {/* Reminder Dialog */}
            {
                reminderManual && (
                    <ReminderDialog
                        manualId={reminderManual.id}
                        manualTitle={reminderManual.title}
                        open={!!reminderManual}
                        onOpenChange={(open) => !open && setReminderManual(null)}
                    />
                )
            }

            {/* Version History Dialog */}
            {
                versionManual && (
                    <VersionHistoryDialog
                        manualId={versionManual.id}
                        manualTitle={versionManual.title}
                        open={!!versionManual}
                        onOpenChange={(open) => !open && setVersionManual(null)}
                        onRestore={() => fetchManuals()}
                    />
                )
            }

            {/* QR Scanner Dialog */}
            <QRScannerDialog
                open={showQRScanner}
                onOpenChange={setShowQRScanner}
                onScan={(url) => {
                    // Auto-populate link field with scanned URL
                    setDraftLink(url);
                    setType('link');
                    toast.success('QR escaneado - enlace añadido');
                }}
            />

            {/* Notes Dialog */}
            {
                notesManual && (
                    <NotesDialog
                        manualId={notesManual.id}
                        manualTitle={notesManual.title}
                        open={!!notesManual}
                        onOpenChange={(open) => !open && setNotesManual(null)}
                    />
                )
            }

            {/* Checklist Dialog */}
            {
                checklistManual && (
                    <ChecklistDialog
                        manualId={checklistManual.id}
                        manualTitle={checklistManual.title}
                        open={!!checklistManual}
                        onOpenChange={(open) => !open && setChecklistManual(null)}
                    />
                )
            }

            {/* Energy Dialog */}
            {
                energyManual && (
                    <EnergyDialog
                        manualId={energyManual.id}
                        manualTitle={energyManual.title}
                        open={!!energyManual}
                        onOpenChange={(open) => !open && setEnergyManual(null)}
                    />
                )
            }

            {/* Image Gallery Dialog */}
            <ImageGalleryDialog
                images={galleryImages}
                initialIndex={galleryIndex}
                open={showGallery}
                onOpenChange={setShowGallery}
            />

            {/* Manage Rooms Dialog */}
            <ManageRoomsDialog
                open={showManageRooms}
                onOpenChange={setShowManageRooms}
                onRoomsChanged={() => {
                    fetchRooms();
                    fetchManuals();
                }}
            />

            {/* Hidden file input for backup import */}
            <input
                id="backup-file-input"
                type="file"
                accept=".json"
                className="hidden"
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        const success = await importBackup(file);
                        if (success) {
                            fetchManuals();
                            fetchRooms();
                        }
                        e.target.value = ''; // Reset
                    }
                }}
            />
            {/* Qr Code Dialog */}
            {qrManual && (
                <QrCodeDialog
                    open={!!qrManual}
                    onOpenChange={(open) => !open && setQrManual(null)}
                    manualTitle={qrManual.title}
                    manualId={qrManual.id}
                />
            )}
        </div >
    );
}
