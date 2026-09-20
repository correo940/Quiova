'use client';

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Barcode, Mic, Loader2, CheckCircle, AlertCircle, Save, Edit3, ShoppingCart, Zap, Archive } from 'lucide-react';
import { BarcodeScanner, GoogleBarcodeScannerModuleInstallState } from '@capacitor-mlkit/barcode-scanning';
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';
import { Camera as CapCamera } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Scanner } from '@yudiel/react-qr-scanner';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import { guessCategoryAndPrice } from '@/lib/shopping-list-ai-helpers';
import { apiFetch } from '@/lib/api-fetch';

type Destination = 'shopping' | 'pantry';

interface SmartScannerProps {
    onClose: () => void;
    onProductAdded: (product: { name: string; barcode?: string }) => void;
    /** Si es true, entra directo al escaneo de código de barras en vez de mostrar el menú. */
    autoStartBarcode?: boolean;
}

const BARCODE_CACHE_KEY = 'quioba_barcode_cache';

const getBarcodeCache = (): Record<string, string> => {
    try {
        const cache = localStorage.getItem(BARCODE_CACHE_KEY);
        return cache ? JSON.parse(cache) : {};
    } catch {
        return {};
    }
};

const saveBarcodeToCache = (barcode: string, productName: string) => {
    try {
        const cache = getBarcodeCache();
        cache[barcode] = productName;
        localStorage.setItem(BARCODE_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.error('Error saving to cache:', e);
    }
};

const getFromCache = (barcode: string): string | null => {
    const cache = getBarcodeCache();
    return cache[barcode] || null;
};

export default function SmartScanner({ onClose, onProductAdded, autoStartBarcode }: SmartScannerProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);

    const [scanCount, setScanCount] = useState(0);
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [continuousMode, setContinuousMode] = useState(false);

    const [showManualEntry, setShowManualEntry] = useState(false);
    const [manualProductName, setManualProductName] = useState('');
    const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);

    const [showWebScanner, setShowWebScanner] = useState(false);
    const [destination, setDestination] = useState<Destination>('shopping');

    const [verifyBeforeAdd, setVerifyBeforeAdd] = useState(false);
    const [pendingProduct, setPendingProduct] = useState<string | null>(null);
    // Al venir del botón rápido "Código de barras" se pregunta antes de nada
    // si es "uno a uno" (verificar cada producto) o "modo cajero" (escaneo
    // seguido sin parar, como en el súper).
    const [awaitingModeChoice, setAwaitingModeChoice] = useState(!!autoStartBarcode);
    // Igual que continuousModeRef: el primer escaneo llega con el cierre de
    // antes de que destination se actualizara, así que se lee de esta ref.
    const destinationRef = useRef<Destination>('shopping');
    const chooseDestination = (d: Destination) => { destinationRef.current = d; setDestination(d); };
    const [pendingVerifySupermarket, setPendingVerifySupermarket] = useState('');
    const [pendingVerifyBarcode, setPendingVerifyBarcode] = useState<string | undefined>(undefined);

    // Escaneo seguido a pantalla completa: la cámara no se cierra entre
    // productos y el nombre sale en un aviso que dura un segundo.
    const [fullScan, setFullScan] = useState(false);
    const [scanPopup, setScanPopup] = useState<string | null>(null);
    const fullScanBusyRef = useRef(false);
    const lastFullScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
    const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const photoFileInputRef = useRef<HTMLInputElement>(null);
    const speechRecognitionRef = useRef<any>(null);
    const nativeScanListenersRef = useRef<{ remove: () => void }[]>([]);
    const nativeScanHandledRef = useRef(false);
    const [nativeLiveScan, setNativeLiveScan] = useState(false);
    // continuousMode (estado normal de React) llega con retraso a las funciones
    // que se llaman justo después de activarlo en la misma función (los
    // cierres de esas funciones capturan el valor de ANTES de actualizarse),
    // así que el bucle de escaneo seguido lee esta ref en su lugar, que se
    // actualiza al instante.
    const continuousModeRef = useRef(false);

    const isWeb = !Capacitor.isNativePlatform();

    const saveToShoppingItems = async (productName: string, supermarket?: string, barcode?: string): Promise<boolean> => {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id;
        if (!userId) {
            toast.error('Inicia sesión para guardar productos');
            return false;
        }
        const aiAnalysis = guessCategoryAndPrice(productName);
        const isPantry = destinationRef.current === 'pantry';
        const { error: insertError } = await supabase
            .from('shopping_items')
            .insert([{
                user_id: userId,
                name: productName,
                category: aiAnalysis.category,
                is_checked: isPantry,
                supermarket: supermarket || null,
                barcode: barcode || null,
            }]);
        if (insertError) {
            console.error('Error saving product:', insertError);
            toast.error('Error al guardar el producto');
            return false;
        }
        toast.success(isPantry ? `🥫 ${productName} añadido a la despensa` : `🛒 ${productName} añadido a la lista`);
        return true;
    };

    const handleSuccess = async (productName: string, barcode?: string, startNextScan = false) => {
        if (verifyBeforeAdd) {
            setPendingProduct(productName);
            setPendingVerifySupermarket('');
            setPendingVerifyBarcode(barcode);
            return;
        }
        const ok = await saveToShoppingItems(productName, undefined, barcode);
        if (!ok) return;
        setLastScanned(productName);
        setScanCount(prev => prev + 1);
        onProductAdded({ name: productName, barcode });

        if (startNextScan && continuousModeRef.current) {
            setTimeout(() => {
                setLastScanned(null);
                handleBarcodeScan();
            }, 800);
        }
    };

    const confirmPendingProduct = async () => {
        if (!pendingProduct?.trim()) return;
        const ok = await saveToShoppingItems(pendingProduct.trim(), pendingVerifySupermarket || undefined, pendingVerifyBarcode);
        if (!ok) return;
        setLastScanned(pendingProduct.trim());
        setScanCount(prev => prev + 1);
        onProductAdded({ name: pendingProduct.trim(), barcode: pendingVerifyBarcode });
        setPendingProduct(null);
        setPendingVerifySupermarket('');
        setPendingVerifyBarcode(undefined);
    };

    const handleManualSave = () => {
        if (manualProductName.trim() && pendingBarcode) {
            saveBarcodeToCache(pendingBarcode, manualProductName.trim());
            handleSuccess(manualProductName.trim(), pendingBarcode, continuousModeRef.current);
            setShowManualEntry(false);
            setManualProductName('');
            setPendingBarcode(null);
        }
    };

    // Nombre del producto según el código: caché local y, si no, Open Food Facts.
    // Devuelve null si no se conoce.
    const fetchProductName = async (barcode: string): Promise<string | null> => {
        const cachedName = getFromCache(barcode);
        if (cachedName) return cachedName;

        try {
            const headers = {
                'User-Agent': 'QuiobaApp/1.0 (Android; +https://quioba.com)',
                'Accept': 'application/json'
            };

            let response = await fetch(`https://es.openfoodfacts.org/api/v0/product/${barcode}.json`, { headers });
            if (!response.ok) {
                response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, { headers });
            }

            const data = await response.json();

            if (data.status === 1 && data.product) {
                const productName =
                    data.product.product_name_es ||
                    data.product.product_name ||
                    data.product.generic_name_es ||
                    data.product.generic_name ||
                    data.product.brands ||
                    'Producto detectado';

                saveBarcodeToCache(barcode, productName);
                return productName;
            }
        } catch {
            // Sin red o respuesta rara: se trata como producto desconocido.
        }
        return null;
    };

    const lookupBarcode = async (barcode: string, continueAfter: boolean) => {
        const productName = await fetchProductName(barcode);
        if (productName) {
            handleSuccess(productName, barcode, continueAfter);
        } else {
            setPendingBarcode(barcode);
            setShowManualEntry(true);
        }
    };

    // Cada código detectado por la cámara a pantalla completa: se guarda, sale
    // el aviso un segundo y la cámara sigue abierta para el siguiente.
    const handleFullScan = async (results: any[]) => {
        const barcode = results?.[0]?.rawValue;
        if (!barcode || fullScanBusyRef.current) return;
        const now = Date.now();
        if (lastFullScanRef.current.code === barcode && now - lastFullScanRef.current.at < 4000) return;
        lastFullScanRef.current = { code: barcode, at: now };
        fullScanBusyRef.current = true;
        try {
            const productName = await fetchProductName(barcode);
            if (!productName) {
                setFullScan(false);
                setPendingBarcode(barcode);
                setShowManualEntry(true);
                return;
            }
            const ok = await saveToShoppingItems(productName, undefined, barcode);
            if (!ok) return;
            setScanCount(prev => prev + 1);
            onProductAdded({ name: productName, barcode });
            setScanPopup(productName);
            if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
            popupTimerRef.current = setTimeout(() => setScanPopup(null), 1000);
        } finally {
            fullScanBusyRef.current = false;
        }
    };

    // ─── Web: barcode via live camera (react-qr-scanner) ─────────────────────

    const handleWebBarcodeScan = async (results: any[]) => {
        if (!results?.length || loading) return;
        const barcode = results[0]?.rawValue;
        if (!barcode) return;

        setShowWebScanner(false);
        setLoading(true);
        setError(null);
        await lookupBarcode(barcode, continuousModeRef.current);
        setLoading(false);
    };

    const handleWebScannerError = (err: unknown) => {
        setShowWebScanner(false);
        setError('No se pudo acceder a la cámara. Comprueba los permisos.');
    };

    // ─── Web: photo via file input ────────────────────────────────────────────

    const handleWebPhotoFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (e.target) e.target.value = '';
        if (!file) return;

        try {
            setLoading(true);
            setError(null);

            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const apiUrl = getApiUrl('api/mi-hogar/identify-product');
            const response = await apiFetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64Image: base64 })
            });

            const data = await response.json();

            if (data.productName) {
                handleSuccess(data.productName, undefined, false);
                setLastScanned(data.productName);
            } else {
                setError(`No se identificó: ${data.error || 'Intenta de nuevo'}`);
            }
        } catch (err: any) {
            setError(`Error foto: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // ─── Web: voice via Web Speech API ───────────────────────────────────────

    const handleWebVoiceInput = () => {
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            setError('Reconocimiento de voz no disponible en este navegador');
            return;
        }

        setError(null);
        setShowManualEntry(false);

        const recognition = new SpeechRecognitionAPI();
        recognition.lang = 'es-ES';
        recognition.maxAlternatives = 1;
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
            const text: string = event.results[0][0].transcript;
            if (text) {
                handleSuccess(text, undefined, false);
                setLastScanned(text);
            } else {
                setError('No te entendí, intenta de nuevo');
            }
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            if (event.error !== 'aborted') {
                setError('Error de voz: ' + event.error);
            }
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        speechRecognitionRef.current = recognition;
        setIsListening(true);
        recognition.start();
    };

    const stopWebListening = () => {
        speechRecognitionRef.current?.stop();
        speechRecognitionRef.current = null;
        setIsListening(false);
    };

    // ─── Native: barcode ─────────────────────────────────────────────────────
    // Cámara en vivo (startScan) en vez de la pantalla lista-para-usar de
    // Google (scan): esta última depende de un módulo aparte de Play
    // Services que en algunos móviles nunca llega a detectar nada, mientras
    // que startScan usa el lector de códigos que va integrado en la app.

    const stopNativeLiveScan = async () => {
        nativeScanListenersRef.current.forEach((h) => h.remove());
        nativeScanListenersRef.current = [];
        document.querySelector('body')?.classList.remove('barcode-scanner-active');
        setNativeLiveScan(false);
        try {
            await BarcodeScanner.stopScan();
        } catch {
            // Ya estaba parado.
        }
    };

    // scan() abre la pantalla propia de Google Play Services, aparte de
    // nuestro WebView. startScan() (cámara en vivo superpuesta a nuestra UI)
    // se probó primero, pero en Android 16 la cámara nunca llega a pintarse
    // detrás del WebView aunque se haga transparente -- un problema de
    // compatibilidad de la plataforma, no del código del plugin. scan() no
    // sufre eso porque no se superpone a nada.
    const handleNativeBarcodeScan = async () => {
        try {
            setError(null);
            setShowManualEntry(false);
            setLastScanned(null);

            const { camera } = await BarcodeScanner.requestPermissions();
            if (camera !== 'granted') {
                setError('Permiso de cámara denegado');
                return;
            }

            // El escaneo usa un módulo de Google que no viene instalado de
            // fábrica: sin esto la cámara se abre pero nunca detecta nada.
            const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
            if (!available) {
                toast.info('Preparando el escáner por primera vez, un momento…');
                let installResolve: () => void = () => {};
                let installReject: (err: Error) => void = () => {};
                const listenerHandle = await BarcodeScanner.addListener(
                    'googleBarcodeScannerModuleInstallProgress',
                    (event) => {
                        if (event.state === GoogleBarcodeScannerModuleInstallState.COMPLETED) {
                            installResolve();
                        } else if (
                            event.state === GoogleBarcodeScannerModuleInstallState.FAILED ||
                            event.state === GoogleBarcodeScannerModuleInstallState.CANCELED
                        ) {
                            installReject(new Error('No se pudo preparar el escáner de códigos de barras'));
                        }
                    }
                );
                try {
                    await new Promise<void>((resolve, reject) => {
                        installResolve = resolve;
                        installReject = reject;
                        BarcodeScanner.installGoogleBarcodeScannerModule().catch(reject);
                    });
                } finally {
                    listenerHandle.remove();
                }
            }

            const { barcodes } = await BarcodeScanner.scan({ formats: [] });
            const barcode = barcodes?.[0]?.rawValue;
            if (barcode) {
                await lookupBarcode(barcode, continuousModeRef.current);
            }
        } catch (err: any) {
            if (!err.message?.includes('cancelled')) {
                setError(err.message || 'Error al escanear código');
            }
        }
    };

    // ─── Native: photo ───────────────────────────────────────────────────────

    const handleNativePhotoCapture = async () => {
        try {
            setLoading(true);
            setError(null);
            setShowManualEntry(false);

            const image = await CapCamera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Base64,
                source: CameraSource.Camera
            });

            if (image.base64String) {
                const apiUrl = getApiUrl('api/mi-hogar/identify-product');

                const resizeImage = async (base64Str: string): Promise<string> => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX_SIZE = 800;
                            let width = img.width;
                            let height = img.height;

                            if (width > height) {
                                if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                            } else {
                                if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                            }

                            canvas.width = width;
                            canvas.height = height;
                            canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
                            resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
                        };
                        img.src = `data:image/jpeg;base64,${base64Str}`;
                    });
                };

                const resizedBase64 = await resizeImage(image.base64String);

                const response = await apiFetch(getApiUrl('api/mi-hogar/identify-product'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64Image: resizedBase64 })
                });

                const data = await response.json();

                if (data.productName) {
                    handleSuccess(data.productName, undefined, false);
                    setLastScanned(data.productName);
                } else {
                    setError(`No se identificó: ${data.error || 'Intenta de nuevo'}`);
                }
            }
        } catch (err: any) {
            if (!err.message?.includes('cancelled')) {
                setError(`Error foto: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    // ─── Native: voice ───────────────────────────────────────────────────────

    const handleNativeVoiceInput = async () => {
        try {
            setError(null);
            setShowManualEntry(false);

            const { speechRecognition } = await SpeechRecognition.requestPermissions();
            if (speechRecognition !== 'granted') {
                setError('Permiso de micrófono denegado');
                return;
            }

            const { available } = await SpeechRecognition.available();
            if (!available) {
                setError('Voz no disponible');
                return;
            }

            setIsListening(true);

            const result = await SpeechRecognition.start({
                language: 'es-ES',
                maxResults: 1,
                popup: false,
                partialResults: false
            });

            if (result?.matches?.length) {
                handleSuccess(result.matches[0], undefined, false);
                setLastScanned(result.matches[0]);
            } else {
                setError('No te entendí');
            }
            setIsListening(false);
        } catch (err: any) {
            setError('Error voz');
            setIsListening(false);
        }
    };

    const stopNativeListening = async () => {
        try {
            await SpeechRecognition.stop();
            setIsListening(false);
        } catch { }
    };

    // ─── Unified handlers (route to web or native) ────────────────────────────

    const handleBarcodeScan = async () => {
        if (continuousModeRef.current) {
            setError(null);
            setShowManualEntry(false);
            setLastScanned(null);
            setFullScan(true);
            return;
        }
        if (isWeb) {
            setError(null);
            setShowManualEntry(false);
            setLastScanned(null);
            setShowWebScanner(true);
        } else {
            await handleNativeBarcodeScan();
        }
    };

    const startContinuousMode = () => {
        continuousModeRef.current = true;
        setContinuousMode(true);
        setScanCount(0);
        handleBarcodeScan();
    };

    // Escaneo seguido sin parar y sin preguntar el súper: se usa en casa, o bien
    // al recibir la compra (va a la despensa) o bien al quedarse sin algo (va a
    // comprar). "Uno a uno": cada producto se verifica antes de añadirlo.
    const chooseContinuousMode = (d: Destination) => {
        chooseDestination(d);
        setVerifyBeforeAdd(false);
        setAwaitingModeChoice(false);
        startContinuousMode();
    };
    const chooseSingleMode = () => {
        setVerifyBeforeAdd(true);
        continuousModeRef.current = false;
        setContinuousMode(false);
        setAwaitingModeChoice(false);
        handleBarcodeScan();
    };

    useEffect(() => {
        // Si se cierra el escáner con la cámara en vivo abierta, hay que
        // pararla y quitar los listeners para no dejar la cámara encendida.
        return () => {
            if (nativeScanListenersRef.current.length > 0) {
                nativeScanListenersRef.current.forEach((h) => h.remove());
                nativeScanListenersRef.current = [];
                BarcodeScanner.stopScan().catch(() => {});
                document.querySelector('body')?.classList.remove('barcode-scanner-active');
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePhotoCapture = async () => {
        if (isWeb) {
            photoFileInputRef.current?.click();
        } else {
            await handleNativePhotoCapture();
        }
    };

    const handleVoiceInput = async () => {
        if (isWeb) {
            handleWebVoiceInput();
        } else {
            await handleNativeVoiceInput();
        }
    };

    const stopListening = async () => {
        if (isWeb) {
            stopWebListening();
        } else {
            await stopNativeListening();
        }
    };

    return (
        <AnimatePresence>
            {/* Hidden file input for web photo */}
            <input
                ref={photoFileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleWebPhotoFileSelected}
            />

            {/* Cámara en vivo: el resto de la pantalla se hace invisible (ver
                globals.css, body.barcode-scanner-active) para que se vea la
                cámara nativa por debajo; esta capa se marca visible a
                propósito para que se note por encima de ese truco. */}
            {nativeLiveScan && (
                <div
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6"
                    style={{ visibility: 'visible' }}
                >
                    <div className="w-64 h-40 border-4 border-white/90 rounded-3xl shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]" />
                    <p className="text-white font-semibold text-center px-6 drop-shadow">
                        Apunta al código de barras del producto
                    </p>
                    <button
                        onClick={stopNativeLiveScan}
                        className="px-6 py-2.5 rounded-full bg-white text-slate-800 font-semibold shadow-lg"
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {fullScan && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[200] bg-black">
                    <Scanner
                        onScan={handleFullScan}
                        onError={() => {
                            setFullScan(false);
                            setError('No se pudo acceder a la cámara. Comprueba los permisos.');
                        }}
                        constraints={{ facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }}
                        scanDelay={100}
                        sound={false}
                        components={{ finder: false }}
                        styles={{ container: { width: '100%', height: '100%' }, video: { objectFit: 'cover' } }}
                    />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-72 h-44 border-4 border-white/90 rounded-3xl" />
                    </div>
                    <p className="absolute top-[calc(1.5rem+env(safe-area-inset-top))] left-0 right-0 text-center text-white font-semibold drop-shadow px-6">
                        {destinationRef.current === 'pantry' ? 'Va a la despensa' : 'Va a la lista de comprar'} · {scanCount} escaneados
                    </p>
                    {scanPopup && (
                        <motion.div
                            key={scanPopup + scanCount}
                            initial={{ opacity: 0, y: 12, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="absolute left-4 right-4 top-1/2 mt-28 mx-auto max-w-sm bg-green-700 text-white rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3"
                        >
                            <CheckCircle className="w-7 h-7 shrink-0" />
                            <span className="font-bold text-lg leading-tight">{scanPopup}</span>
                        </motion.div>
                    )}
                    <button
                        onClick={() => setFullScan(false)}
                        className="absolute bottom-[calc(3rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 px-8 py-3 rounded-full bg-white text-slate-800 font-bold shadow-lg"
                    >
                        Terminar
                    </button>
                </div>,
                document.body
            )}

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-y-auto max-h-[90dvh]"
                    style={{ backgroundColor: '#F8FAFC' }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-slate-900">Añadir Productos</h2>
                            {scanCount > 0 && (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                                    <ShoppingCart className="w-4 h-4" /> {scanCount}
                                </span>
                            )}
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full">
                            <X className="w-6 h-6 text-slate-600" />
                        </button>
                    </div>

                    {/* Elegir modo antes de escanear (solo al entrar por el atajo directo) */}
                    {awaitingModeChoice && (
                        <div className="absolute inset-0 z-20 rounded-3xl p-6 flex flex-col justify-center gap-4" style={{ backgroundColor: '#F8FAFC' }}>
                            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">¿Cómo quieres escanear?</h3>
                            <button
                                onClick={() => chooseContinuousMode('pantry')}
                                className="w-full bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 text-white p-4 rounded-2xl flex flex-col items-center gap-1 font-bold shadow-lg shadow-green-800/30"
                            >
                                <span className="flex items-center gap-2"><Archive className="w-5 h-5" /> Ha llegado la compra</span>
                                <span className="text-xs font-normal opacity-90">Escanea seguido y va a la despensa</span>
                            </button>
                            <button
                                onClick={() => chooseContinuousMode('shopping')}
                                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-2xl flex flex-col items-center gap-1 font-bold shadow-lg shadow-orange-500/30"
                            >
                                <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Se me ha acabado</span>
                                <span className="text-xs font-normal opacity-90">Escanea seguido y va a la lista de comprar</span>
                            </button>
                            <button
                                onClick={chooseSingleMode}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 p-4 rounded-2xl flex flex-col items-center gap-1 font-bold"
                            >
                                <span className="flex items-center gap-2"><Barcode className="w-5 h-5" /> Uno a uno</span>
                                <span className="text-xs font-normal opacity-70">Verifica cada producto antes de añadirlo</span>
                            </button>
                            <button onClick={onClose} className="w-full text-sm text-slate-500 py-2 hover:text-slate-800">
                                Cancelar
                            </button>
                        </div>
                    )}

                    {/* Destination selector */}
                    <div className="grid grid-cols-2 gap-2 mb-3 p-1 bg-slate-200/70 rounded-xl">
                        <button
                            type="button"
                            onClick={() => chooseDestination('shopping')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${destination === 'shopping' ? 'bg-white text-orange-600 shadow' : 'text-slate-600'}`}
                        >
                            <ShoppingCart className="w-4 h-4" />
                            Comprar
                        </button>
                        <button
                            type="button"
                            onClick={() => chooseDestination('pantry')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${destination === 'pantry' ? 'bg-white text-emerald-700 shadow' : 'text-slate-600'}`}
                        >
                            <Archive className="w-4 h-4" />
                            Despensa
                        </button>
                    </div>

                    {/* Verify toggle */}
                    <button
                        type="button"
                        onClick={() => setVerifyBeforeAdd(v => !v)}
                        className={`w-full flex items-center justify-between mb-4 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                            verifyBeforeAdd
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                    >
                        <span>Verificar producto antes de añadir</span>
                        <span className={`w-10 h-6 rounded-full flex items-center transition-colors ${verifyBeforeAdd ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                            <span className={`w-5 h-5 bg-white rounded-full shadow mx-0.5 transition-transform ${verifyBeforeAdd ? 'translate-x-4' : 'translate-x-0'}`} />
                        </span>
                    </button>

                    {/* Pending verification panel */}
                    {pendingProduct !== null && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-3"
                        >
                            <p className="text-indigo-800 font-bold text-sm flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> Verificar producto
                            </p>
                            <input
                                type="text"
                                value={pendingProduct}
                                onChange={(e) => setPendingProduct(e.target.value)}
                                className="w-full p-2.5 border border-indigo-200 rounded-xl text-sm font-medium bg-white focus:outline-none focus:border-indigo-400"
                                autoFocus
                            />
                            <div>
                                <p className="text-xs font-semibold text-indigo-600 mb-2 uppercase tracking-wide">Dónde comprarlo <span className="opacity-50 normal-case">(Opcional)</span></p>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {['Mercadona', 'Carrefour', 'Lidl', 'Dia', 'Aldi'].map(market => (
                                        <button
                                            key={market}
                                            type="button"
                                            onClick={() => setPendingVerifySupermarket(prev => prev === market ? '' : market)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${pendingVerifySupermarket === market ? 'border-indigo-500 bg-indigo-100 text-indigo-800' : 'border-slate-200 bg-white text-slate-600'}`}
                                        >
                                            {market}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={!['Mercadona', 'Carrefour', 'Lidl', 'Dia', 'Aldi'].includes(pendingVerifySupermarket) ? pendingVerifySupermarket : ''}
                                    onChange={(e) => setPendingVerifySupermarket(e.target.value)}
                                    placeholder="Otra tienda..."
                                    className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-400"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPendingProduct(null)}
                                    className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
                                >Cancelar</button>
                                <button
                                    onClick={confirmPendingProduct}
                                    disabled={!pendingProduct?.trim()}
                                    className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50"
                                >Añadir a la lista</button>
                            </div>
                        </motion.div>
                    )}

                    {/* Web live barcode scanner */}
                    {showWebScanner && (
                        <div className="mb-4">
                            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
                                <Scanner
                                    onScan={handleWebBarcodeScan}
                                    onError={handleWebScannerError}
                                    styles={{ container: { width: '100%', height: '100%' }, video: { objectFit: 'cover' } }}
                                />
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className="w-48 h-48 border-2 border-white/70 rounded-xl" />
                                </div>
                            </div>
                            <button
                                onClick={() => setShowWebScanner(false)}
                                className="mt-2 w-full text-sm text-slate-500 py-2 hover:text-slate-800"
                            >
                                Cancelar
                            </button>
                        </div>
                    )}

                    {/* Last scanned feedback */}
                    {lastScanned && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2"
                        >
                            <CheckCircle className="w-5 h-5 text-green-800" />
                            <span className="text-green-800 font-medium truncate">{lastScanned}</span>
                        </motion.div>
                    )}

                    {/* Manual Entry Form */}
                    {showManualEntry && pendingBarcode && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Edit3 className="w-4 h-4 text-amber-600" />
                                <p className="text-amber-800 font-medium text-sm">Producto no encontrado</p>
                            </div>
                            {pendingBarcode !== 'web-unknown' && (
                                <p className="text-xs text-amber-600 mb-2 font-mono">{pendingBarcode}</p>
                            )}
                            <input
                                type="text"
                                value={manualProductName}
                                onChange={(e) => setManualProductName(e.target.value)}
                                placeholder="Nombre del producto..."
                                className="w-full p-2 border border-amber-300 rounded-lg mb-2 text-sm"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleManualSave()}
                            />
                            <button
                                onClick={handleManualSave}
                                disabled={!manualProductName.trim()}
                                className="w-full bg-amber-500 text-white p-2 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" /> Guardar
                            </button>
                        </motion.div>
                    )}

                    {/* Error Message */}
                    {error && !showManualEntry && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2"
                        >
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-red-700 text-sm">{error}</span>
                        </motion.div>
                    )}

                    {/* Options */}
                    <div className="space-y-3">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={startContinuousMode}
                            disabled={loading || isListening}
                            className="w-full bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 text-white p-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all shadow-lg shadow-green-800/30 disabled:opacity-50"
                        >
                            <Zap className="w-6 h-6" />
                            Escaneo Rápido
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { continuousModeRef.current = false; setContinuousMode(false); handleBarcodeScan(); }}
                            disabled={loading || isListening}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 p-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-50"
                        >
                            <Barcode className="w-5 h-5" />
                            Escaneo Único
                        </motion.button>

                        <div className="flex gap-3">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handlePhotoCapture}
                                disabled={loading || isListening}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
                            >
                                <Camera className="w-5 h-5" />
                                Foto
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={isListening ? stopListening : handleVoiceInput}
                                disabled={loading}
                                className={`flex-1 p-3 rounded-xl flex items-center justify-center gap-2 font-semibold disabled:opacity-50 ${isListening ? 'bg-red-500 text-white' : 'bg-purple-500 text-white'}`}
                            >
                                {isListening ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                                {isListening ? '...' : 'Voz'}
                            </motion.button>
                        </div>
                    </div>

                    {/* Loading Overlay */}
                    {loading && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-3xl">
                            <Loader2 className="w-10 h-10 text-green-800 animate-spin mb-2" />
                            <p className="font-medium text-slate-600">Escaneando...</p>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
