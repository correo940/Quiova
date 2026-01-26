'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Barcode, Mic, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';
import { Camera as CapCamera } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

interface SmartScannerProps {
    onClose: () => void;
    onProductAdded: (product: { name: string; barcode?: string }) => void;
}

export default function SmartScanner({ onClose, onProductAdded }: SmartScannerProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);

    // Helper to handle success with delay
    const handleSuccess = (productName: string, barcode?: string) => {
        setSuccess(productName);
        onProductAdded({ name: productName, barcode });

        // Wait 2 seconds before closing so user sees the success message
        setTimeout(() => {
            onClose();
        }, 2000);
    };

    // Barcode Scanning
    const handleBarcodeScan = async () => {
        try {
            setLoading(true);
            setError(null);

            const { camera } = await BarcodeScanner.requestPermissions();
            if (camera !== 'granted') {
                setError('Permiso de cámara denegado');
                setLoading(false);
                return;
            }

            document.querySelector('body')?.classList.add('barcode-scanner-active');
            const result = await BarcodeScanner.scan();
            document.querySelector('body')?.classList.remove('barcode-scanner-active');

            if (result.barcodes && result.barcodes.length > 0) {
                const barcode = result.barcodes[0].rawValue;
                console.log('🔍 Scanned Barcode:', barcode);

                try {
                    // Open Food Facts requires a User-Agent or it might block requests
                    const headers = {
                        'User-Agent': 'QuiovaApp/1.0 (Android; +https://quioba.com)',
                        'Accept': 'application/json'
                    };

                    console.log(`🔍 Fetching: https://es.openfoodfacts.org/api/v0/product/${barcode}.json`);
                    let response = await fetch(`https://es.openfoodfacts.org/api/v0/product/${barcode}.json`, { headers });

                    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

                    if (!response.ok) {
                        console.log('⚠️ ES endpoint failed, trying World endpoint...');
                        response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, { headers });
                        console.log(`📡 World Response: ${response.status} ${response.statusText}`);
                    }

                    const data = await response.json();
                    console.log('📦 Product Data:', data);

                    // Accept product if found, regardless of type (food, beauty, etc.)
                    if (data.status === 1 && data.product) {
                        // Try multiple name fields in order of preference
                        const productName =
                            data.product.product_name_es ||
                            data.product.product_name ||
                            data.product.generic_name_es ||
                            data.product.generic_name ||
                            data.product.brands ||
                            'Producto detectado';
                        handleSuccess(productName, barcode);
                    } else if (data.status === 0) {
                        const errorMsg = `❌ Producto no encontrado

Código: ${barcode}
Este código no existe en la base de datos.

Prueba con:
• Foto del producto
• Dictar el nombre por voz`;
                        setError(errorMsg);
                    } else {
                        const errorMsg = `❌ Error inesperado

Código: ${barcode}
Status: ${data.status}
Info: ${data.status_verbose || 'No disponible'}`;
                        setError(errorMsg);
                    }
                } catch (apiError: any) {
                    console.error('❌ API Error:', apiError);
                    const errorDetails = `❌ ERROR DE CONEXIÓN

Código: ${barcode}
Tipo: ${apiError.name || 'Unknown'}
Mensaje: ${apiError.message || 'Sin mensaje'}

Posibles causas:
• Sin conexión a internet
• API bloqueada por firewall
• Problema de CORS
• Timeout de red

Stack: ${apiError.stack?.substring(0, 200) || 'N/A'}`;
                    setError(errorDetails);
                }
            }
        } catch (err: any) {
            console.error('Barcode scan error:', err);
            // Don't show error if user cancelled the scan
            if (!err.message?.includes('cancelled')) {
                setError(err.message || 'Error al escanear código');
            }
        } finally {
            setLoading(false);
            document.querySelector('body')?.classList.remove('barcode-scanner-active');
        }
    };

    // Photo Recognition
    const handlePhotoCapture = async () => {
        try {
            setLoading(true);
            setError(null);

            const image = await CapCamera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Base64,
                source: CameraSource.Camera
            });

            if (image.base64String) {
                const isMobile = Capacitor.isNativePlatform();
                const baseUrl = isMobile ? 'https://www.quioba.com' : '';
                const apiUrl = `${baseUrl}/api/mi-hogar/identify-product`;

                // Resize image to reduce payload size (max 800px)
                const resizeImage = async (base64Str: string): Promise<string> => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 800;
                            const MAX_HEIGHT = 800;
                            let width = img.width;
                            let height = img.height;

                            if (width > height) {
                                if (width > MAX_WIDTH) {
                                    height *= MAX_WIDTH / width;
                                    width = MAX_WIDTH;
                                }
                            } else {
                                if (height > MAX_HEIGHT) {
                                    width *= MAX_HEIGHT / height;
                                    height = MAX_HEIGHT;
                                }
                            }

                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);
                            // Get resized base64 string (remove data:image/jpeg;base64, prefix if present for clean base64)
                            const resized = canvas.toDataURL('image/jpeg', 0.7);
                            resolve(resized.split(',')[1]);
                        };
                        img.src = `data:image/jpeg;base64,${base64Str}`;
                    });
                };

                const resizedBase64 = await resizeImage(image.base64String);

                console.log('📸 Sending to:', apiUrl);
                console.log('📸 Original size:', image.base64String.length, 'chars');
                console.log('📸 Resized size:', resizedBase64.length, 'chars');

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64Image: resizedBase64 })
                });

                console.log('📡 Photo API Response:', response.status, response.statusText);
                const data = await response.json();
                console.log('📦 Photo API Data:', data);

                if (data.productName) {
                    handleSuccess(data.productName);
                } else {
                    const errorMsg = `❌ No se identificó el producto

Status: ${response.status}
Error: ${data.error || 'Desconocido'}

¿API desplegada en producción?`;
                    setError(errorMsg);
                }
            }
        } catch (err: any) {
            console.error('❌ Photo Error:', err);
            if (!err.message?.includes('cancelled')) {
                const errorMsg = `❌ ERROR FOTO

Tipo: ${err.name}
Mensaje: ${err.message}

Verifica:
• Conexión internet
• API en producción
• Permisos cámara`;
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    // Voice Input
    const handleVoiceInput = async () => {
        try {
            setError(null);

            const { speechRecognition } = await SpeechRecognition.requestPermissions();
            if (speechRecognition !== 'granted') {
                setError('Permiso de micrófono denegado');
                return;
            }

            const { available } = await SpeechRecognition.available();
            if (!available) {
                setError('Voz no disponible en este dispositivo');
                return;
            }

            setIsListening(true);

            const result = await SpeechRecognition.start({
                language: 'es-ES',
                maxResults: 1,
                popup: false,
                partialResults: false
            });

            if (result && result.matches && result.matches.length > 0) {
                handleSuccess(result.matches[0]);
            } else {
                setError('No te he entendido. Intenta de nuevo.');
            }
            setIsListening(false);

        } catch (err: any) {
            console.error('Voice input error:', err);
            setError('Error en reconocimiento de voz');
            setIsListening(false);
        }
    };

    const stopListening = async () => {
        try {
            await SpeechRecognition.stop();
            setIsListening(false);
        } catch (err) { console.error(err); }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                onClick={success ? undefined : onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
                    style={{ backgroundColor: '#F8FAFC' }}
                >
                    {/* Success Overlay */}
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute inset-0 bg-emerald-50 z-20 flex flex-col items-center justify-center p-6 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                                className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600"
                            >
                                <CheckCircle className="w-10 h-10" />
                            </motion.div>
                            <h3 className="text-2xl font-bold text-emerald-900 mb-2">¡Añadido!</h3>
                            <p className="text-lg text-emerald-700 font-medium">{success}</p>
                        </motion.div>
                    )}

                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">Añadir Producto</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-slate-600" />
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 max-h-96 overflow-y-auto"
                        >
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <pre className="text-red-700 text-xs font-mono whitespace-pre-wrap break-words">{error}</pre>
                        </motion.div>
                    )}

                    {/* Options */}
                    <div className="space-y-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleBarcodeScan}
                            disabled={loading || isListening}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-2xl flex items-center justify-center gap-3 font-semibold transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                        >
                            <Barcode className="w-6 h-6" />
                            Escanear Código
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handlePhotoCapture}
                            disabled={loading || isListening}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-2xl flex items-center justify-center gap-3 font-semibold transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
                        >
                            <Camera className="w-6 h-6" />
                            Foto Producto
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={isListening ? stopListening : handleVoiceInput}
                            disabled={loading}
                            className={`w-full p-4 rounded-2xl flex items-center justify-center gap-3 font-semibold transition-colors shadow-lg disabled:opacity-50 ${isListening
                                ? 'bg-red-500 text-white shadow-red-500/20'
                                : 'bg-purple-500 text-white shadow-purple-500/20'
                                }`}
                        >
                            {isListening ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    Escuchando...
                                </>
                            ) : (
                                <>
                                    <Mic className="w-6 h-6" />
                                    Dictar Voz
                                </>
                            )}
                        </motion.button>
                    </div>

                    {/* Loading Overlay */}
                    {loading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-3xl">
                            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-3" />
                            <p className="font-medium text-slate-600">Procesando...</p>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
