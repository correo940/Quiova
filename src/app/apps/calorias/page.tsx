'use client';

export const dynamic = 'force-dynamic';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { apiFetch } from '@/lib/api-fetch';
import { getApiUrl } from '@/lib/api-utils';

type CaloriasResult = {
    reference_object: string;
    items: { name: string; grams: number; calories: number }[];
    total_calories: number;
    confidence: string;
    provider: 'groq' | 'gemini';
};

export default function CaloriasPage() {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<CaloriasResult | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setResult(null);
        setAnalyzing(true);
        const reader = new FileReader();

        reader.onloadend = async () => {
            const base64String = reader.result as string;
            setPreview(base64String);

            try {
                toast.loading('Analizando el plato...', { id: 'calorias' });

                const res = await apiFetch(getApiUrl('api/calorias/analyze'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageB64: base64String }),
                });

                if (!res.ok) {
                    throw new Error('El servidor no pudo analizar la foto.');
                }

                const data: CaloriasResult = await res.json();
                setResult(data);
                toast.success('Análisis completado', { id: 'calorias' });
            } catch (error) {
                console.error('Error analizando calorías:', error);
                toast.error('No se pudo analizar el plato. Inténtalo de nuevo.', { id: 'calorias' });
            } finally {
                setAnalyzing(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsDataURL(file);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-6 pt-4">
                <Link href="/">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-xl font-bold">Calorías (prueba)</h1>
            </div>

            <p className="text-sm text-gray-500 mb-4">
                Pon un objeto de referencia (tenedor, moneda...) junto al plato y haz la foto.
            </p>

            <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
            />

            <Button
                className="w-full mb-4"
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing || !user}
            >
                {analyzing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <Camera className="w-4 h-4 mr-2" />
                )}
                {analyzing ? 'Analizando...' : 'Hacer foto del plato'}
            </Button>

            {!user && <p className="text-sm text-red-500">Inicia sesión para probarlo.</p>}

            {preview && (
                <img src={preview} alt="Plato" className="w-full rounded-lg mb-4" />
            )}

            {result && (
                <Card>
                    <CardContent className="pt-4 space-y-3">
                        <p className="text-sm text-gray-500">
                            Objeto de referencia detectado: <strong>{result.reference_object}</strong>
                        </p>

                        <ul className="space-y-1">
                            {result.items.map((item, i) => (
                                <li key={i} className="flex justify-between text-sm">
                                    <span>{item.name} ({item.grams} g)</span>
                                    <span>{item.calories} kcal</span>
                                </li>
                            ))}
                        </ul>

                        <div className="flex justify-between font-bold text-lg pt-2 border-t">
                            <span>Total</span>
                            <span>{result.total_calories} kcal</span>
                        </div>

                        <p className="text-xs text-gray-400">
                            Confianza: {result.confidence} · IA: {result.provider}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
