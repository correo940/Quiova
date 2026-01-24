'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Barcode, Mic, Loader2 } from 'lucide-react';
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
    const [isListening, setIsListening] = useState(false);

    // Barcode Scanning
    const handleBarcodeScan = async () => {
        try {
            setLoading(true);
            setError(null);

            // Request camera permission
            const { camera } = await BarcodeScanner.requestPermissions();
            if (camera !== 'granted') {
                setError('Permiso de cámara denegado');
                return;
            }

            // Start scanning
            document.querySelector('body')?.classList.add('barcode-scanner-active');
            const result = await BarcodeScanner.scan();
            document.querySelector('body')?.classList.remove('barcode-scanner-active');

            if (result.barcodes && result.barcodes.length > 0) {
                const barcode = result.barcodes[0].rawValue;

                // Fetch product info from Open Food Facts API
                const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
                const data = await response.json();

                if (data.status === 1 && data.product) {
                    const productName = data.product.product_name || data.product.generic_name || 'Producto desconocido';
                    onProductAdded({ name: productName, barcode });
                    onClose();
                } else {
                    setError('Producto no encontrado. Intenta con foto o voz.');
                }
            }
        } catch (err: any) {
            console.error('Barcode scan error:', err);
            setError(err.message || 'Error al escanear código');
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
                // Call existing identify-product API
                const isMobile = Capacitor.isNativePlatform();
                const baseUrl = isMobile ? 'https://www.quioba.com' : '';

                console.log('📸 Sending image to API:', `${baseUrl}/api/mi-hogar/identify-product`);

                const response = await fetch(`${baseUrl}/api/mi-hogar/identify-product`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: `data:image/jpeg;base64,${image.base64String}` })
                });

                console.log('📡 API Response status:', response.status);
                const data = await response.json();
                console.log('📦 API Response data:', data);

                if (data.productName) {
                    onProductAdded({ name: data.productName });
                    onClose();
                } else {
                    setError(`No se pudo identificar el producto. ${data.error || 'Intenta con otro método.'}`);
                }
            }
        } catch (err: any) {
            console.error('Photo capture error:', err);
            setError(`Error: ${err.message || 'Error al capturar foto'}`);
        } finally {
            setLoading(false);
        }
    };

    // Voice Input
    const handleVoiceInput = async () => {
        try {
            setError(null);

            // Request permissions
            const { speechRecognition } = await SpeechRecognition.requestPermissions();
            if (speechRecognition !== 'granted') {
                setError('Permiso de micrófono denegado');
                return;
            }

            // Check availability
            const { available } = await SpeechRecognition.available();
            if (!available) {
                setError('Reconocimiento de voz no disponible');
                return;
            }

            setIsListening(true);

            // Start listening
            const result = await SpeechRecognition.start({
                language: 'es-ES',
                maxResults: 1,
                popup: false,
                partialResults: false
            });

            // Process results
            if (result && result.matches && result.matches.length > 0) {
                const productName = result.matches[0];
                onProductAdded({ name: productName });
                onClose();
            } else {
                setError('No se pudo reconocer el producto. Intenta de nuevo.');
            }
            setIsListening(false);

        } catch (err: any) {
            console.error('Voice input error:', err);
            setError(err.message || 'Error en reconocimiento de voz');
            setIsListening(false);
        }
    };

    const stopListening = async () => {
        try {
            await SpeechRecognition.stop();
            setIsListening(false);
        } catch (err) {
            console.error('Error stopping voice:', err);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
                    style={{ backgroundColor: '#F8FAFC' }}
                >
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
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Options */}
                    <div className="space-y-4">
                        {/* Barcode Scanner */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleBarcodeScan}
                            disabled={loading || isListening}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-2xl flex items-center justify-center gap-3 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Barcode className="w-6 h-6" />
                            Escanear Código de Barras
                        </motion.button>

                        {/* Photo Capture */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handlePhotoCapture}
                            disabled={loading || isListening}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-2xl flex items-center justify-center gap-3 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Camera className="w-6 h-6" />
                            Fotografiar Producto
                        </motion.button>

                        {/* Voice Input */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={isListening ? stopListening : handleVoiceInput}
                            disabled={loading}
                            className={`w-full p-4 rounded-2xl flex items-center justify-center gap-3 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isListening
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-purple-500 hover:bg-purple-600 text-white'
                                }`}
                        >
                            {isListening ? (
                                <>
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                    >
                                        <Mic className="w-6 h-6" />
                                    </motion.div>
                                    Escuchando... (Toca para detener)
                                </>
                            ) : (
                                <>
                                    <Mic className="w-6 h-6" />
                                    Dictar Producto
                                </>
                            )}
                        </motion.button>
                    </div>

                    {/* Loading Indicator */}
                    {loading && (
                        <div className="mt-6 flex items-center justify-center gap-2 text-slate-600">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Procesando...</span>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
