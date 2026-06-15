import React, { useState, useRef } from 'react';
import { Camera, RefreshCw, Image as ImageIcon, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/api-utils';

interface PendingBalanceImageScannerProps {
    onScanSuccess: (data: { amount: string, concept: string, date: string, merchant: string }) => void;
}

export function PendingBalanceImageScanner({ onScanSuccess }: PendingBalanceImageScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCameraSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (cameraInputRef.current) cameraInputRef.current.value = '';

        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen es demasiado grande (máx 5MB)');
            return;
        }

        setIsScanning(true);
        const toastId = toast.loading('Analizando recibo con IA...', { duration: Infinity });

        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const apiUrl = getApiUrl('api/scan-receipt');
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64 })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al analizar el recibo');
            }

            const data = await response.json();
            toast.dismiss(toastId);

            onScanSuccess({
                amount: data.amount ? String(Math.abs(data.amount)) : '',
                concept: data.merchant ? `Compra en ${data.merchant}` : 'Suministros varios',
                date: data.date || new Date().toISOString().split('T')[0],
                merchant: data.merchant || ''
            });

        } catch (error: any) {
            console.error('Scan error:', error);
            toast.error(error.message || 'Error al procesar la imagen', { id: toastId });
        } finally {
            setIsScanning(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (fileInputRef.current) fileInputRef.current.value = '';

        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        if (!isImage && !isPdf) {
            toast.error('Solo se admiten imágenes o archivos PDF');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('El archivo es demasiado grande (máx 10MB)');
            return;
        }

        setIsScanning(true);
        const toastId = toast.loading('Analizando archivo con IA...', { duration: Infinity });

        try {
            if (isPdf) {
                // PDFs use OCR pipeline
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch(getApiUrl('api/expenses/parse-receipt'), {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error al analizar el PDF');
                }

                const data = await response.json();
                toast.dismiss(toastId);

                const analysis = data.analysis;
                onScanSuccess({
                    amount: analysis?.amount != null ? String(Math.abs(analysis.amount)) : '',
                    concept: analysis?.issuer
                        ? `Compra en ${analysis.issuer}`
                        : analysis?.title || 'Gasto registrado',
                    date: analysis?.date || new Date().toISOString().split('T')[0],
                    merchant: analysis?.issuer || analysis?.title || ''
                });
            } else {
                // Images use the same vision AI as the camera button
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                const response = await fetch(getApiUrl('api/scan-receipt'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64 })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error al analizar la imagen');
                }

                const data = await response.json();
                toast.dismiss(toastId);

                onScanSuccess({
                    amount: data.amount ? String(Math.abs(data.amount)) : '',
                    concept: data.merchant ? `Compra en ${data.merchant}` : 'Suministros varios',
                    date: data.date || new Date().toISOString().split('T')[0],
                    merchant: data.merchant || ''
                });
            }

        } catch (error: any) {
            console.error('File scan error:', error);
            toast.error(error.message || 'Error al procesar el archivo', { id: toastId });
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div>
            <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={cameraInputRef}
                onChange={handleCameraSelect}
            />
            <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
            />

            <div className="grid grid-cols-2 gap-2">
                <Button
                    variant="outline"
                    type="button"
                    className="border-orange-200 dark:border-orange-800/50 hover:bg-orange-50 dark:hover:bg-orange-950/20 text-orange-600 dark:text-orange-400 gap-2 h-12"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isScanning}
                >
                    {isScanning ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <Camera className="w-4 h-4" />
                    )}
                    <span className="text-sm">Foto</span>
                </Button>

                <Button
                    variant="outline"
                    type="button"
                    className="border-orange-200 dark:border-orange-800/50 hover:bg-orange-50 dark:hover:bg-orange-950/20 text-orange-600 dark:text-orange-400 gap-2 h-12"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                >
                    {isScanning ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <Paperclip className="w-4 h-4" />
                    )}
                    <span className="text-sm">Adjuntar</span>
                </Button>
            </div>

            <p className="text-[10px] text-center text-muted-foreground mt-1.5 flex items-center justify-center gap-1">
                <ImageIcon className="w-3 h-3" /> Auto-rellena importe y comercio · Foto o PDF
            </p>
        </div>
    );
}
