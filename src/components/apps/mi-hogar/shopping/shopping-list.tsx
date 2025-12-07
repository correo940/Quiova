'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingCart, Archive, RefreshCw, Trash2, ArrowRight, Loader2, ScanBarcode, X, Keyboard, Camera, Sparkles, Store, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Webcam from 'react-webcam';
import { identifyProductAction } from '@/app/actions/identify-product';

type ShoppingItem = {
    id: string;
    name: string;
    category: string;
    supermarket?: string;
    status: 'to_buy' | 'in_stock';
};

export default function ShoppingList() {
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [loading, setLoading] = useState(true);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { user } = useAuth();

    const webcamRef = React.useRef<Webcam>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = React.useRef<any>(null);

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
                // Call Server Action
                const result = await identifyProductAction(imageSrc);

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
                console.error("Error calling Server Action:", error);
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
        if (user) {
            fetchItems();
        } else {
            setItems([]);
            setLoading(false);
        }
    }, [user]);

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

        try {
            const { data, error } = await supabase
                .from('shopping_items')
                .insert([
                    {
                        user_id: user.id,
                        name: name,
                        category: 'General',
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
                status: 'to_buy',
            };

            setItems(prevItems => [newItem, ...prevItems]);
            setNewItemName('');
            toast.success('Añadido a la lista de compra');
            return true;
        } catch (error) {
            console.error('Error adding item:', error);
            toast.error('Error al añadir el producto');
            return false;
        }
    };

    const toggleStatus = async (id: string) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        const newStatus = item.status === 'to_buy' ? 'in_stock' : 'to_buy';
        const isChecked = newStatus === 'in_stock';

        try {
            const { error } = await supabase
                .from('shopping_items')
                .update({ is_checked: isChecked })
                .eq('id', id);

            if (error) throw error;

            setItems(items.map(i => {
                if (i.id === id) {
                    return { ...i, status: newStatus };
                }
                return i;
            }));

            toast.success(newStatus === 'to_buy' ? '¡Añadido a la lista!' : '¡Comprado!');
        } catch (error) {
            console.error('Error updating item:', error);
            toast.error('Error al actualizar el estado');
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

    const toBuyItems = items.filter(i => i.status === 'to_buy');
    const inStockItems = items.filter(i => i.status === 'in_stock');

    const getSupermarketBadgeColor = (supermarket?: string) => {
        if (!supermarket) return "bg-gray-100 text-gray-800";
        const lower = supermarket.toLowerCase();
        if (lower.includes('mercadona')) return "bg-green-100 text-green-800 border-green-200";
        if (lower.includes('carrefour')) return "bg-blue-100 text-blue-800 border-blue-200";
        if (lower.includes('lidl')) return "bg-yellow-100 text-yellow-800 border-yellow-200";
        if (lower.includes('dia')) return "bg-red-100 text-red-800 border-red-200";
        if (lower.includes('aldi')) return "bg-blue-50 text-blue-900 border-blue-100";
        return "bg-gray-100 text-gray-800";
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex gap-2">
                    <Input
                        placeholder="¿Qué necesitas comprar? (ej. Leche, Pan...)"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addItem()}
                    />
                    <Button onClick={() => addItem()}>
                        <Plus className="mr-2 h-4 w-4" /> Añadir
                    </Button>
                    <Button
                        variant={isListening ? "destructive" : "outline"}
                        onClick={handleVoiceInput}
                        title={isListening ? "Detener escucha" : "Dictar producto"}
                    >
                        {isListening ? <MicOff className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" onClick={() => setIsScannerOpen(true)} title="Identificar producto con IA">
                        <Camera className="h-4 w-4 mr-2" />
                        <Sparkles className="h-3 w-3 text-yellow-500" />
                    </Button>
                </div>
            </div>

            <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Identificar Producto (IA)</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-4 bg-black rounded-lg overflow-hidden min-h-[300px] relative">

                        {isScannerOpen && !capturedImage && (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    screenshotQuality={0.8}
                                    forceScreenshotSourceSize={true}
                                    videoConstraints={{
                                        facingMode: "environment",
                                        width: { ideal: 1280 },
                                        height: { ideal: 720 }
                                    }}
                                    className="w-full h-full object-cover"
                                />
                                <p className="absolute bottom-4 text-white text-sm font-medium drop-shadow-md">Haz una foto al producto</p>
                            </div>
                        )}
                        {capturedImage && (
                            <div className="relative w-full h-full flex items-center justify-center bg-black">
                                <img src={capturedImage} alt="Captura" className="max-w-full max-h-full object-contain opacity-50" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
                                    <p className="text-white font-medium text-lg animate-pulse">Analizando con Gemini AI...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center mt-4">
                        <Button
                            size="lg"
                            onClick={captureAndIdentify}
                            disabled={isProcessing}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <Camera className="mr-2 h-5 w-5" />
                                    Identificar
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="list" className="relative">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Lista de Compra
                        {toBuyItems.length > 0 && (
                            <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                                {toBuyItems.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="pantry">
                        <Archive className="mr-2 h-4 w-4" />
                        Despensa / Historial
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Por Comprar</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {toBuyItems.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <ShoppingCart className="mx-auto h-12 w-12 opacity-20 mb-4" />
                                    <p>¡Todo comprado! No hay nada en la lista.</p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {toBuyItems.map(item => (
                                        <li key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors group gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{item.name}</span>
                                                    {item.supermarket && (
                                                        <Badge variant="outline" className={`w-fit mt-1 text-xs border ${getSupermarketBadgeColor(item.supermarket)}`}>
                                                            <Store className="w-3 h-3 mr-1" />
                                                            {item.supermarket}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                                                <Button size="sm" variant="outline" onClick={() => toggleStatus(item.id)} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                                    <ArrowRight className="mr-2 h-4 w-4" />
                                                    Marcar Comprado
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pantry" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>En Casa (Despensa)</CardTitle>
                            <p className="text-sm text-muted-foreground">Marca lo que se ha gastado para añadirlo de nuevo a la lista.</p>
                        </CardHeader>
                        <CardContent>
                            {inStockItems.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Archive className="mx-auto h-12 w-12 opacity-20 mb-4" />
                                    <p>La despensa está vacía.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {inStockItems.map(item => (
                                        <div key={item.id} className="flex flex-col p-3 border rounded-lg bg-secondary/20 gap-2">
                                            <div className="flex justify-between items-start">
                                                <span className="truncate font-medium">{item.name}</span>
                                                {item.supermarket && (
                                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 opacity-70">
                                                        {item.supermarket}
                                                    </Badge>
                                                )}
                                            </div>
                                            <Button size="sm" variant="secondary" onClick={() => toggleStatus(item.id)} title="Se ha gastado" className="w-full mt-1">
                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                Gastado
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
