'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingCart, Archive, RefreshCw, Trash2, ArrowRight, Loader2, ScanBarcode, X, Keyboard, Camera, Sparkles, Store, Mic, MicOff, Pencil, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { getApiUrl } from '@/lib/api-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Webcam from 'react-webcam';
// import { identifyProductAction } from '@/app/actions/identify-product';
import Link from 'next/link';
import { ChefHat, Wand2, CalendarDays, Timer, Layers } from 'lucide-react';
import { guessCategoryAndPrice, generatePlanItems, checkExpiration, CATEGORY_MAP } from '@/lib/shopping-list-ai-helpers';
import { motion, AnimatePresence } from 'framer-motion';

type ShoppingItem = {
    id: string;
    name: string;
    category: string;
    supermarket?: string;
    created_at?: string;
    status: 'to_buy' | 'in_stock';
};

export default function ShoppingList() {
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [newItemName, setNewItemName] = useState('');
    const [loading, setLoading] = useState(true);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isPlannerOpen, setIsPlannerOpen] = useState(false);
    const [plannerText, setPlannerText] = useState('');
    const [proposedItems, setProposedItems] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const { user } = useAuth();

    const webcamRef = React.useRef<Webcam>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = React.useRef<any>(null);

    const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
    const [editName, setEditName] = useState("");
    const [editSupermarket, setEditSupermarket] = useState("");
    const [isShopMode, setIsShopMode] = useState(false);
    const [activeTab, setActiveTab] = useState("list");

    const toggleShopMode = () => {
        if (!isShopMode) {
            setActiveTab("list");
        }
        setIsShopMode(!isShopMode);
    };

    const openEditDialog = (item: ShoppingItem) => {
        setEditingItem(item);
        setEditName(item.name);
        setEditSupermarket(item.supermarket || "");
    };

    const updateItem = async () => {
        if (!editingItem || !editName.trim()) return;

        try {
            const { error } = await supabase
                .from('shopping_items')
                .update({
                    name: editName,
                    supermarket: editSupermarket || null
                })
                .eq('id', editingItem.id);

            if (error) throw error;

            setItems(items.map(i =>
                i.id === editingItem.id
                    ? { ...i, name: editName, supermarket: editSupermarket || undefined }
                    : i
            ));

            setEditingItem(null);
            toast.success("Producto actualizado");
        } catch (error) {
            console.error('Error updating item:', error);
            toast.error("Error al actualizar");
        }
    };

    const handleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            toast.error("Tu navegador no soporta entrada de voz.");
            return;
        }

        if (isListening) {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    console.error("Error stopping recognition:", e);
                }
            }
            setIsListening(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.lang = 'es-ES';
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsListening(true);
            toast.info("Escuchando... Di productos para añadir.");
        };

        recognition.onend = () => {
            // If we didn't manually stop (isListening is true), restart to keep "continuous" feel if browser stops it?
            // Browsers differ. Chrome stops after a while.
            // For now, let's just respect the browser stop, or check isListening?
            // If the user wants "say another", continuous=true usually keeps going until silence timeout.
            // Let's just update state to false if it stops.
            if (isListening) {
                setIsListening(false);
            }
        };

        recognition.onresult = (event: any) => {
            const results = event.results;
            const lastResult = results[results.length - 1];

            if (lastResult.isFinal) {
                const transcript = lastResult[0].transcript.trim();
                if (transcript && transcript.length > 1) {
                    // Start adding item - we invoke addItem directly
                    // Note: addItem is async but we don't await it here to not block recognition events
                    addItem(transcript);
                    playSuccessBeep();
                    toast.success(`Añadido: ${transcript}`);
                }
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            if (event.error === 'not-allowed') {
                toast.error("Permiso de micrófono denegado.");
                setIsListening(false);
            }
            // For other errors like 'no-speech', we might want to just stop.
            if (event.error !== 'no-speech') {
                setIsListening(false);
            }
        };

        try {
            recognition.start();
        } catch (e) {
            console.error("Error starting recognition", e);
            toast.error("Error al iniciar el reconocimiento de voz.");
            setIsListening(false);
        }
    };

    const playSuccessBeep = () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1); // Short beep
    };

    const captureAndIdentify = React.useCallback(async () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setCapturedImage(imageSrc);
            setIsProcessing(true);
            toast.info("Analizando imagen con IA...");

            try {
                // Call API Route instead of Server Action
                const apiUrl = getApiUrl('api/mi-hogar/identify-product');
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ base64Image: imageSrc }),
                });

                const result = await response.json();

                if (result.success && result.data) {
                    const { productName, supermarket } = result.data;
                    toast.success(`¡Identificado: ${productName}!`);
                    if (supermarket) toast.success(`Supermercado detectado: ${supermarket}`);

                    await addItem(productName, supermarket);

                    setTimeout(() => {
                        setCapturedImage(null);
                        setIsScannerOpen(false);
                    }, 1500);
                } else {
                    const errorMsg = result.error || "No se pudo identificar.";
                    toast.error(errorMsg);
                    setTimeout(() => setCapturedImage(null), 2000);
                }
            } catch (error) {
                console.error("Error calling API:", error);
                toast.error("Error de conexión con el servidor.");
                setCapturedImage(null);
            } finally {
                setIsProcessing(false);
            }
        } else {
            toast.error("Error al capturar imagen.");
        }
    }, [webcamRef]);


    useEffect(() => {
        // Safety timeout — never stay loading more than 10 seconds
        const safetyTimer = window.setTimeout(() => {
            setLoading(false);
        }, 10000);
        if (user) {
            fetchItems().finally(() => clearTimeout(safetyTimer));
        } else {
            setItems([]);
            setLoading(false);
            clearTimeout(safetyTimer);
        }
        return () => clearTimeout(safetyTimer);
    }, [user]);

    // Auto-reset filters and switch tab when entering Shop Mode
    useEffect(() => {
        if (isShopMode) {
            setSearchTerm('');
            setCategoryFilter(null);
            // We can't directly set the Tab value here easily without a state for it
            // but the user is likely on 'list'. If not, we should probably add a state for Tab.
        }
    }, [isShopMode]);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('shopping_items')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedItems: ShoppingItem[] = data.map((item: any) => ({
                id: item.id,
                name: item.name,
                category: item.category || 'General',
                supermarket: item.supermarket,
                created_at: item.created_at,
                status: item.is_checked ? 'in_stock' : 'to_buy',
            }));

            setItems(mappedItems);
        } catch (error) {
            console.error('Error fetching shopping items:', error);
            toast.error('Error al cargar la lista de compra');
        } finally {
            setLoading(false);
        }
    };

    const addItem = async (name: string = newItemName, supermarket?: string) => {
        if (!name.trim() || !user) return;

        // AUTO-CATEGORIZATION AI MAGIC
        const aiAnalysis = guessCategoryAndPrice(name);

        try {
            const { data, error } = await supabase
                .from('shopping_items')
                .insert([
                    {
                        user_id: user.id,
                        name: name,
                        category: aiAnalysis.category,
                        supermarket: supermarket || null,
                        is_checked: false, // to_buy
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            const newItem: ShoppingItem = {
                id: data.id,
                name: data.name,
                category: data.category || 'General',
                supermarket: data.supermarket,
                created_at: data.created_at,
                status: 'to_buy',
            };

            setItems(prevItems => [newItem, ...prevItems]);
            setNewItemName('');
            toast.success(`Añadido: ${data.name} en ${aiAnalysis.category} ${aiAnalysis.emoji}`);
            return true;
        } catch (error) {
            console.error('Error adding item:', error);
            toast.error('Error al añadir el producto');
            return false;
        }
    };

    const handlePlanSubmit = async () => {
        if (!plannerText.trim()) return;
        setIsProcessing(true);
        toast.info("Generando plan mágico...");

        // Simular espera de IA para generar expectación
        setTimeout(async () => {
            const plannedItems = generatePlanItems(plannerText);
            setProposedItems(plannedItems);
            setIsProcessing(false);
        }, 800);
    };

    const confirmPlan = async () => {
        setIsProcessing(true);
        for (const item of proposedItems) {
            addItem(item);
        }
        toast.success(`¡Mágico! Añadidos ${proposedItems.length} ingredientes a tu lista.`);
        setPlannerText('');
        setProposedItems([]);
        setIsPlannerOpen(false);
        setIsProcessing(false);
    };

    const toggleStatus = async (id: string) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        const newStatus = item.status === 'to_buy' ? 'in_stock' : 'to_buy';
        const isChecked = newStatus === 'in_stock';

        // 1. Optimistic Update Local
        const originalItems = [...items];
        setItems(items.map(i => {
            if (i.id === id) {
                return { ...i, status: newStatus };
            }
            return i;
        }));

        // 2. Fetch en Background
        try {
            const { error } = await supabase
                .from('shopping_items')
                .update({ is_checked: isChecked })
                .eq('id', id);

            if (error) throw error;

            if (newStatus === 'in_stock') {
                toast.success(`🛒 ¡${item.name} movido a la despensa!`);
            } else {
                toast.info(`📝 ${item.name} devuelto a la lista`);
            }
        } catch (error) {
            console.error('Error updating item:', error);
            // 3. Rollback en caso de fallo
            setItems(originalItems);
            toast.error('Error al actualizar el estado de red');
        }
    };

    const deleteItem = async (id: string) => {
        try {
            const { error } = await supabase
                .from('shopping_items')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setItems(items.filter(i => i.id !== id));
            toast.success('Producto eliminado');
        } catch (error) {
            console.error('Error deleting item:', error);
            toast.error('Error al eliminar el producto');
        }
    };

    const filteredItems = React.useMemo(() => {
        return items.filter(item => {
            const matchSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCategory = !categoryFilter || item.category === categoryFilter;
            return matchSearch && matchCategory;
        });
    }, [items, searchTerm, categoryFilter]);

    const categories = React.useMemo(() =>
        [...new Set(items.map(i => i.category).filter(Boolean))],
        [items]
    );

    const toBuyItems = filteredItems.filter(i => i.status === 'to_buy');
    const inStockItems = filteredItems.filter(i => i.status === 'in_stock');

    // AI SUGGESTIONS LOGIC
    const suggestedItems = React.useMemo(() => {
        if (items.length === 0) return [];
        // Look for items that were 'in_stock' but maybe it's time to buy again
        // For now, let's take the most frequent ones not in 'to_buy'
        const stockItems = items.filter(i => i.status === 'in_stock');
        const toBuyNames = new Set(toBuyItems.map(i => i.name.toLowerCase()));

        // Simple heuristic: unique items in stock that are not in the list
        const uniqueStock = Array.from(new Set(stockItems.map(i => i.name)))
            .filter(name => !toBuyNames.has(name.toLowerCase()))
            .slice(0, 3); // Max 3 suggestions

        return uniqueStock;
    }, [items, toBuyItems]);

    // ProgressBar info
    const totalFiltered = toBuyItems.length + inStockItems.length;
    const progressPercent = totalFiltered === 0 ? 0 : Math.round((inStockItems.length / totalFiltered) * 100);

    // Grouping items by category for aisles
    const groupedToBuyItems = React.useMemo(() => {
        const groups: Record<string, ShoppingItem[]> = {};
        toBuyItems.forEach(item => {
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        });
        return groups;
    }, [toBuyItems]);

    const getSupermarketBadgeColor = (supermarket?: string) => {
        if (!supermarket) return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
        const lower = supermarket.toLowerCase();
        if (lower.includes('mercadona')) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50";
        if (lower.includes('carrefour')) return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/50";
        if (lower.includes('lidl')) return "bg-yellow-100/80 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50";
        if (lower.includes('dia')) return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/50";
        if (lower.includes('aldi')) return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/50";
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Sincronizando listas...</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-10">
            {/* ── SECCIÓN CENTRAL DE COMANDOS FLORANTE ── */}
            <div className="sticky top-4 z-40">
                <div className="relative group">
                    {/* Efecto resplandor */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full blur opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
                    <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-1.5 shadow-lg">
                        <div className="flex-1 px-3">
                            <Input
                                placeholder="Añadir a la lista (Ej. Manzanas...)"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                                className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-base h-10 px-0 placeholder:text-muted-foreground font-medium"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                            <Button
                                variant={isListening ? "destructive" : "secondary"}
                                size="icon"
                                className="rounded-full w-10 h-10 transition-transform hover:scale-105"
                                onClick={handleVoiceInput}
                                title={isListening ? "Detener escucha" : "Dictar producto"}
                            >
                                {isListening ? <MicOff className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4 text-slate-600 dark:text-slate-300" />}
                            </Button>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="rounded-full w-10 h-10 transition-transform hover:scale-105"
                                onClick={() => setIsScannerOpen(true)}
                                title="Identificar producto con IA"
                            >
                                <Camera className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                            </Button>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="rounded-full w-10 h-10 transition-transform hover:scale-105"
                                onClick={() => setIsPlannerOpen(true)}
                                title="Planear un evento / Botón Mágico"
                            >
                                <Wand2 className="h-5 w-5 text-indigo-500" />
                            </Button>
                            <Link href="/apps/mi-hogar/recipes">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="rounded-full w-10 h-10 transition-transform hover:scale-105 mr-1"
                                    title="Sugerir Receta Inteligente"
                                >
                                    <ChefHat className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </Button>
                            </Link>
                            <Button
                                onClick={() => addItem()}
                                className="rounded-full px-5 h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-bold tracking-wide shadow-md transition-all hover:shadow-lg active:scale-95"
                            >
                                Añadir
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── CABECERA Y BÚSQUEDA ── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row gap-5 items-center justify-between">
                    <div className="flex-1 w-full">
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                            <ShoppingCart className="w-6 h-6 text-emerald-500" /> Lista de Compra
                        </h1>
                        <p className="text-sm font-semibold text-muted-foreground mt-1">
                            Tienes {toBuyItems.length} artículos pendientes
                        </p>
                    </div>



                    {/* Búsqueda y Filtros Compactos */}
                    <div className="w-full sm:w-[260px] shrink-0 flex items-center gap-2">
                        <div className="relative flex-1">
                            <Input
                                placeholder="🔍 Buscar..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="h-10 w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-md pl-10 pr-8"
                            />
                            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2.5 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                            )}
                        </div>
                        <Button
                            variant={isShopMode ? "default" : "outline"}
                            size="icon"
                            onClick={toggleShopMode}
                            className={`rounded-xl h-10 w-10 shrink-0 transition-all ${isShopMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg' : 'border-slate-200 dark:border-slate-800'}`}
                            title={isShopMode ? "Salir de modo tienda" : "Activar modo tienda"}
                        >
                            <Store className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {!isShopMode && categories.length > 0 && (
                    <div className="flex gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800/50">
                        <button
                            onClick={() => setCategoryFilter(null)}
                            className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all ${!categoryFilter
                                ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                                }`}
                        >
                            Todas
                        </button>
                        {categories.map((cat, i) => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(prev => prev === cat ? null : cat)}
                                className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all ${categoryFilter === cat
                                    ? 'bg-emerald-500 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── MODALS (ESCANER Y EDICIÓN) ── */}
            <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                <DialogContent className="sm:max-w-md border-0 bg-slate-950 p-0 overflow-hidden text-white shadow-xl rounded-2xl">
                    <DialogHeader className="p-4 bg-slate-900/50 backdrop-blur border-b border-white/10 relative z-10">
                        <DialogTitle className="flex items-center gap-2 tracking-tight text-lg">
                            <Sparkles className="w-5 h-5 text-emerald-400" /> Identificar Producto
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center bg-black min-h-[350px] relative">
                        {isScannerOpen && !capturedImage && (
                            <div className="relative w-full h-full flex flex-col items-center justify-center">
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    screenshotQuality={0.8}
                                    forceScreenshotSourceSize={true}
                                    videoConstraints={{ facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }}
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 border-[3px] border-white/20 rounded-xl m-8 pointer-events-none" />
                            </div>
                        )}
                        {capturedImage && (
                            <div className="relative w-full h-full flex items-center justify-center bg-black">
                                <img src={capturedImage} alt="Captura" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm" />
                                <img src={capturedImage} alt="Captura Focus" className="z-10 max-w-[80%] max-h-[80%] object-contain rounded-lg shadow-2xl border border-white/10" />
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                    <div className="bg-emerald-500/20 p-4 rounded-full mb-4">
                                        <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
                                    </div>
                                    <p className="text-white font-bold tracking-wider text-sm animate-pulse">ANALIZANDO CON IA...</p>
                                </div>
                            </div>
                        )}
                    </div>
                    {!capturedImage && (
                        <div className="p-4 bg-slate-900 relative z-10 flex justify-center">
                            <button
                                onClick={captureAndIdentify}
                                disabled={isProcessing}
                                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all transform active:scale-95"
                            >
                                <Camera className="h-6 w-6 text-white" />
                            </button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent className="sm:max-w-md rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Editar Producto</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre</label>
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-base"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Supermercado <span className="opacity-50">(Opcional)</span></label>
                            <div className="relative">
                                <Input
                                    value={editSupermarket}
                                    onChange={(e) => setEditSupermarket(e.target.value)}
                                    className="h-12 bg-slate-50 dark:bg-slate-900 rounded-xl pl-10 pr-4 text-base"
                                    placeholder="Ej. Mercadona"
                                />
                                <Store className="w-4 h-4 absolute left-3.5 top-4 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-4">
                            <Button variant="outline" className="h-11 rounded-xl flex-1 font-semibold" onClick={() => setEditingItem(null)}>Cancelar</Button>
                            <Button onClick={updateItem} className="h-11 rounded-xl flex-1 bg-emerald-500 hover:bg-emerald-600 font-bold">Guardar Cambios</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isPlannerOpen} onOpenChange={setIsPlannerOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl border-0 overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 p-6 shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -ml-10 -mb-10" />

                    <DialogHeader className="relative z-10 mb-2">
                        <DialogTitle className="text-2xl font-black text-indigo-900 dark:text-indigo-100 flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-500 text-white rounded-xl shadow-lg">
                                <Wand2 className="h-6 w-6" />
                            </div>
                            Botón Mágico
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5 relative z-10">
                        <p className="text-sm font-medium text-indigo-800/70 dark:text-indigo-200/70 leading-relaxed">
                            Describe tu evento o comida (ej: "Barbacoa el sábado", "Cena italiana para 3"). La IA deducirá lo que necesitas.
                        </p>

                        {proposedItems.length === 0 ? (
                            <div className="space-y-4">
                                <textarea
                                    value={plannerText}
                                    onChange={(e) => setPlannerText(e.target.value)}
                                    placeholder="Escribe tu super plan aquí..."
                                    className="w-full h-28 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl resize-none p-4 text-base focus-visible:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                />

                                <Button
                                    onClick={handlePlanSubmit}
                                    disabled={isProcessing || !plannerText.trim()}
                                    className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? (
                                        <><Loader2 className="h-5 w-5 animate-spin" /> Pensando...</>
                                    ) : (
                                        <>Desglosar Ingredientes <Sparkles className="h-5 w-5" /></>
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white/60 dark:bg-slate-900/60 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800/50">
                                    <h4 className="font-bold text-indigo-900 dark:text-indigo-100 mb-2">He pensado en todo esto:</h4>
                                    <ul className="space-y-2 mb-2 max-h-40 overflow-y-auto pr-2">
                                        {proposedItems.map((item, idx) => (
                                            <li key={idx} className="flex items-center justify-between text-sm text-indigo-800 dark:text-indigo-200">
                                                <div className="flex items-center gap-2 truncate">
                                                    <div className="w-1.5 h-1.5 shrink-0 rounded-full bg-indigo-400" />
                                                    <span className="truncate">{item}</span>
                                                </div>
                                                <button onClick={() => setProposedItems(prev => prev.filter((_, i) => i !== idx))} className="text-indigo-400 hover:text-red-500 p-1 shrink-0">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1 border-indigo-200 text-indigo-700 font-bold" onClick={() => setProposedItems([])}>
                                        Volver
                                    </Button>
                                    <Button
                                        onClick={confirmPlan}
                                        disabled={isProcessing || proposedItems.length === 0}
                                        className="flex-[2] bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold shadow-lg"
                                    >
                                        {isProcessing ? "Añadiendo..." : `¡Añadir los ${proposedItems.length}!`}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-sm mx-auto grid-cols-2 p-1.5 h-auto bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl mb-6">
                    <TabsTrigger value="list" className="rounded-xl py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all text-sm font-semibold">
                        <ShoppingCart className="w-4 h-4 mr-2 opacity-70" />
                        Por Comprar
                    </TabsTrigger>
                    <TabsTrigger value="pantry" className="rounded-xl py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all text-sm font-semibold">
                        <Archive className="w-4 h-4 mr-2 opacity-70" />
                        Despensa
                    </TabsTrigger>
                </TabsList>

                {/* ── PESTAÑA: POR COMPRAR ── */}
                <TabsContent value="list" className="focus-visible:outline-none focus:ring-0">
                    {/* AI SUGGESTIONS SECTION */}
                    {suggestedItems.length > 0 && toBuyItems.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="mb-8 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl border border-indigo-500/20 backdrop-blur-sm"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Sugeridos para ti</h3>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                {suggestedItems.map((name, idx) => (
                                    <Button
                                        key={idx}
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => addItem(name)}
                                        className="rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 border-none shadow-sm text-xs font-bold py-0 h-8 flex items-center gap-2 group"
                                    >
                                        <Plus className="w-3 h-3 text-indigo-500 group-hover:scale-125 transition-transform" />
                                        {name}
                                    </Button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {toBuyItems.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-slate-800/50 rounded-3xl"
                        >
                            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                                <Sparkles className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">¡Todo al día!</h3>
                            <p className="text-muted-foreground mt-2 text-sm max-w-[250px] mx-auto text-balance font-medium">No hay compras pendientes. Escribe o dicta algo para añadir.</p>
                        </motion.div>
                    ) : (
                        <div className="space-y-8 pb-20">
                            {Object.entries(groupedToBuyItems).map(([category, catItems]) => (
                                <motion.div
                                    key={category}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center gap-2 pl-2">
                                        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                            <span className="text-base">{guessCategoryAndPrice(catItems[0].name).emoji}</span>
                                        </div>
                                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500">{category}</h3>
                                        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-slate-800 to-transparent ml-2" />
                                    </div>

                                    <div className={`grid gap-3 ${isShopMode ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                                        <AnimatePresence mode="popLayout">
                                            {catItems.map(item => (
                                                <motion.div
                                                    key={item.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                                    className={`group relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/40 hover:border-emerald-400/50 dark:hover:border-emerald-500/30 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-300 flex items-start gap-4 ${isShopMode ? 'p-6' : 'p-4'}`}
                                                >
                                                    <button
                                                        onClick={() => toggleStatus(item.id)}
                                                        className={`mt-0.5 flex-shrink-0 rounded-full border-2 border-slate-200 dark:border-slate-700/50 group-hover:border-emerald-400/60 group-hover:bg-emerald-400/10 flex items-center justify-center transition-all focus:outline-none ${isShopMode ? 'w-10 h-10' : 'w-8 h-8'}`}
                                                        title="Marcar como comprado"
                                                    >
                                                        <div className={`rounded-full transition-transform scale-0 group-hover:scale-[0.5] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] ${isShopMode ? 'w-full h-full' : 'w-full h-full'}`} />
                                                    </button>

                                                    <div className="flex-1 min-w-0 pr-6">
                                                        <h4 className={`font-bold text-slate-800 dark:text-slate-100 leading-tight subpixel-antialiased tracking-tight ${isShopMode ? 'text-lg' : 'text-base truncate mb-1'}`}>
                                                            {item.name}
                                                        </h4>
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                            {item.supermarket && (
                                                                <Badge variant="outline" className={`text-[9px] uppercase tracking-wider font-extrabold border rounded-md px-1.5 py-0 shadow-sm ${getSupermarketBadgeColor(item.supermarket)}`}>
                                                                    {item.supermarket}
                                                                </Badge>
                                                            )}
                                                            {item.created_at && (
                                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold opacity-80 italic">
                                                                    {formatDate(item.created_at)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="absolute top-3 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-1 group-hover:translate-x-0">
                                                        <button onClick={() => openEditDialog(item)} className="p-1.5 bg-slate-50/80 dark:bg-slate-800/80 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-lg transition-colors border border-slate-100 dark:border-slate-700 shadow-sm" title="Editar">
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => deleteItem(item.id)} className="p-1.5 bg-rose-50/80 dark:bg-rose-950/20 text-rose-400 hover:text-rose-600 rounded-lg transition-colors border border-rose-100/50 dark:border-rose-900/30 shadow-sm" title="Eliminar definitivamente">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ── PESTAÑA: DESPENSA / HISTORIAL ── */}
                <TabsContent value="pantry" className="focus-visible:outline-none focus:ring-0">
                    {inStockItems.length === 0 ? (
                        <div className="text-center py-20 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                            <Archive className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
                            <p className="text-muted-foreground font-medium">La despensa está vacía.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {inStockItems.map(item => {
                                const aiData = guessCategoryAndPrice(item.name);
                                const expiration = item.created_at ? checkExpiration(aiData.category, item.created_at) : null;
                                return (
                                    <div key={item.id} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-3.5 flex flex-col h-full hover:shadow-sm transition-shadow group relative overflow-hidden">
                                        <div className={`absolute -right-2 -top-2 w-12 h-12 rounded-full opacity-20 blur-xl ${item.supermarket ? getSupermarketBadgeColor(item.supermarket).split(' ')[0] : 'bg-slate-300'}`} />

                                        <div className="flex justify-between items-start mb-2 relative z-10 w-full">
                                            <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm leading-tight line-clamp-2 pr-4 opacity-80 group-hover:opacity-100 flex items-center gap-1.5 flex-wrap">
                                                {expiration?.status === 'expired' && <Timer className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />}
                                                {expiration?.status === 'warning' && <Timer className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                                                <span className="truncate">{aiData.emoji} {item.name}</span>
                                            </h4>
                                            <button onClick={() => deleteItem(item.id)} className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all shrink-0">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-2 mt-auto pt-2 relative z-10">
                                            <div className="flex items-end justify-between">
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    {item.supermarket && (
                                                        <Badge variant="secondary" className="text-[9px] h-5 px-1.5 uppercase font-bold tracking-wider opacity-60">
                                                            {item.supermarket}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => toggleStatus(item.id)}
                                                    className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-emerald-500 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all hover:scale-110 active:scale-95"
                                                    title="Reagregar a la lista"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {/* Warning caducidad renderizado debajo con estilo */}
                                            {expiration && (
                                                <div className="text-[10px] font-bold tracking-wide uppercase mt-1 w-full text-center rounded overflow-hidden shadow-sm">
                                                    {expiration.status === 'expired'
                                                        ? <span className="text-red-600 bg-red-100/80 dark:bg-red-900/40 dark:text-red-400 py-1 w-full block border border-red-200 dark:border-red-800/50">{expiration.message}</span>
                                                        : <span className="text-yellow-600 bg-yellow-100/80 dark:bg-yellow-900/40 dark:text-yellow-400 py-1 w-full block border border-yellow-200 dark:border-yellow-800/50">{expiration.message}</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div >
    );
}
