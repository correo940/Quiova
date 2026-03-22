'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft,
    Leaf,
    Droplets,
    Sun,
    Camera,
    UploadCloud,
    Sprout,
    AlertCircle,
    CheckCircle2,
    Trash2,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { motion, AnimatePresence } from 'framer-motion';

type Plant = {
    id: string;
    name: string;
    species: string;
    common_name: string;
    watering_frequency_days: number;
    sunlight_needs: string;
    health_status: string;
    care_instructions: string;
    image_b64: string;
    last_watered_date: string;
    next_watering_date: string;
};

export default function HuertoPage() {
    const { user } = useAuth();
    const [plants, setPlants] = useState<Plant[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            fetchPlants();
        }
    }, [user]);

    const fetchPlants = async () => {
        try {
            const { data, error } = await supabase
                .from('huerto_plants')
                .select('*')
                .eq('user_id', user?.id)
                .order('next_watering_date', { ascending: true });

            if (error) throw error;
            setPlants(data || []);
        } catch (error) {
            console.error('Error fetching plants:', error);
            toast.error('Error al cargar tu huerto');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Validations
        if (file.size > 5 * 1024 * 1024) {
            return toast.error('La imagen debe pesar menos de 5MB');
        }

        setAnalyzing(true);
        const reader = new FileReader();

        reader.onloadend = async () => {
            const base64String = reader.result as string;

            try {
                toast.loading('La IA de Pl@ntNet y Groq está analizando tu planta...', { id: 'analyze' });

                const res = await fetch('/api/plants/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageB64: base64String, userId: user.id }),
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Error en el análisis');
                }

                const plantData = await res.json();
                
                // Save to Supabase
                const today = new Date();
                const nextWatering = new Date(today);
                nextWatering.setDate(nextWatering.getDate() + (plantData.watering_frequency_days || 7));

                const newPlant = {
                    user_id: user.id,
                    name: plantData.common_name,
                    species: plantData.species,
                    common_name: plantData.common_name,
                    watering_frequency_days: plantData.watering_frequency_days,
                    sunlight_needs: plantData.sunlight_needs,
                    health_status: plantData.health_status,
                    care_instructions: plantData.care_instructions,
                    image_b64: base64String,
                    last_watered_date: today.toISOString().split('T')[0],
                    next_watering_date: nextWatering.toISOString().split('T')[0]
                };

                const { error: dbError } = await supabase.from('huerto_plants').insert(newPlant);
                if (dbError) throw dbError;

                toast.success(`¡Misterio resuelto! Es un/una ${plantData.common_name}`, { id: 'analyze' });
                fetchPlants();
            } catch (error: any) {
                console.error(error);
                toast.error(error.message || 'Error analizando la planta', { id: 'analyze' });
            } finally {
                setAnalyzing(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsDataURL(file);
    };

    const handleWaterPlant = async (plant: Plant) => {
        try {
            const today = new Date();
            const nextWatering = new Date(today);
            nextWatering.setDate(today.getDate() + plant.watering_frequency_days);

            const { error } = await supabase
                .from('huerto_plants')
                .update({
                    last_watered_date: today.toISOString().split('T')[0],
                    next_watering_date: nextWatering.toISOString().split('T')[0]
                })
                .eq('id', plant.id);

            if (error) throw error;
            toast.success(`Has regado a: ${plant.name}`);
            fetchPlants();
        } catch (error) {
            console.error(error);
            toast.error('Error al registrar riego');
        }
    };

    const handleDeletePlant = async (id: string) => {
        if (!window.confirm('¿Eliminar esta planta de tu huerto?')) return;
        try {
            const { error } = await supabase.from('huerto_plants').delete().eq('id', id);
            if (error) throw error;
            toast.success('Planta eliminada');
            fetchPlants();
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const getWateringStatus = (nextWateringDate: string) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const nextDate = new Date(nextWateringDate);
        nextDate.setHours(0,0,0,0);
        
        const diff = differenceInDays(nextDate, today);
        
        if (diff < 0) return { text: `Vencido (hace ${Math.abs(diff)} días)`, color: 'text-red-500 font-bold', bg: 'bg-red-100 dark:bg-red-900/30' };
        if (diff === 0) return { text: '¡Toca hoy!', color: 'text-orange-500 font-bold', bg: 'bg-orange-100 dark:bg-orange-900/30' };
        if (diff === 1) return { text: 'Mañana', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' };
        return { text: `En ${diff} días`, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-green-50/30 dark:bg-emerald-950/20"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
    }

    return (
        <div className="min-h-screen bg-green-50/30 dark:bg-[#0B120F] pb-24 text-slate-900 dark:text-slate-100 font-sans">
            <div className="container mx-auto p-4 max-w-6xl space-y-6">
                
                {/* Header */}
                <div className="flex justify-between items-center">
                    <Link href="/apps/mi-hogar">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ArrowLeft className="h-4 w-4" /> Volver
                        </Button>
                    </Link>
                </div>

                {/* Hero Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-green-700 via-emerald-800 to-teal-900 p-8 text-white shadow-2xl shadow-emerald-900/30 border border-emerald-500/20"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl opacity-50" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-sm font-medium">
                                <Sprout className="w-4 h-4 text-green-300" />
                                <span>Mi Huerto Inteligente</span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Cuidemos tus Plantas.</h1>
                            <p className="text-emerald-100 max-w-xl text-lg opacity-90">
                                Sube una foto de tu maceta u hoja enferma. Nuestra IA botánica identificará la especie y creará un plan de cuidados perfecto al instante.
                            </p>
                        </div>

                        <div className="w-full md:w-auto flex flex-col items-center gap-3">
                            <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment" 
                                className="hidden" 
                                ref={fileInputRef}
                                onChange={handleFileUpload} 
                            />
                            <Button 
                                size="lg" 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={analyzing}
                                className="w-full md:w-auto h-16 rounded-2xl bg-white text-emerald-900 hover:bg-green-50 hover:scale-105 active:scale-95 transition-all text-lg font-bold shadow-xl flex gap-3"
                            >
                                {analyzing ? (
                                    <><Loader2 className="w-6 h-6 animate-spin" /> Analizando ADN...</>
                                ) : (
                                  <><Camera className="w-6 h-6" /> Escanear Planta</>
                                )}
                            </Button>
                        </div>
                    </div>
                </motion.div>

                {/* Plants Grid */}
                <div className="pt-8">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Leaf className="text-emerald-500" /> Tu Jardín Botánico</h2>
                    
                    {plants.length === 0 ? (
                        <div className="text-center py-20 px-4 rounded-3xl border-2 border-dashed border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-900/10">
                            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Sprout className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100 mb-2">Aún no hay plantas</h3>
                            <p className="text-emerald-700/70 dark:text-emerald-300/70 max-w-md mx-auto">
                                Toca en "Escanear Planta" para añadir tu primera compañera verde. Identificaremos qué cuidados necesita.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {plants.map((plant) => {
                                    const status = getWateringStatus(plant.next_watering_date);
                                    
                                    return (
                                        <motion.div
                                            key={plant.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                        >
                                            <Card className="overflow-hidden border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl group hover:-translate-y-1 transition-all h-full flex flex-col">
                                                <div className="h-48 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                                                    {plant.image_b64 ? (
                                                        <img src={plant.image_b64} alt={plant.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center"><Leaf className="w-12 h-12 text-slate-300" /></div>
                                                    )}
                                                    
                                                    {/* Overlays */}
                                                    <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />
                                                    
                                                    <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                                                        <div className={`px-3 py-1 rounded-full backdrop-blur-md shadow-sm text-xs font-semibold ${status.bg} ${status.color} border border-white/20`}>
                                                            <div className="flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5" /> {status.text}</div>
                                                        </div>
                                                        <button onClick={() => handleDeletePlant(plant.id)} className="p-2 bg-black/30 hover:bg-red-500/80 text-white rounded-full backdrop-blur-md transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <CardContent className="p-5 flex-1 space-y-4">
                                                    <div>
                                                        <h3 className="text-xl font-bold line-clamp-1">{plant.name}</h3>
                                                        <p className="text-sm font-mono text-emerald-600 dark:text-emerald-400 italic line-clamp-1">{plant.species}</p>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                                                                <Sun className="w-3.5 h-3.5" /> Luz
                                                            </div>
                                                            <span className="font-medium">{plant.sunlight_needs}</span>
                                                        </div>
                                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                                                                <Droplets className="w-3.5 h-3.5" /> Riego
                                                            </div>
                                                            <span className="font-medium">Cada {plant.watering_frequency_days} días</span>
                                                        </div>
                                                    </div>

                                                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                                                        <div className="flex gap-2 items-start">
                                                            {plant.health_status.toLowerCase().includes('enferm') || plant.health_status.toLowerCase().includes('sec') ? (
                                                                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                            ) : (
                                                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                                            )}
                                                            <div className="text-sm">
                                                                <span className="font-semibold block mb-0.5 text-slate-700 dark:text-slate-200">Estado</span>
                                                                <p className="text-slate-600 dark:text-slate-400 line-clamp-2">{plant.health_status}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>

                                                <CardFooter className="p-5 pt-0">
                                                    <Button 
                                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                                                        onClick={() => handleWaterPlant(plant)}
                                                    >
                                                        <Droplets className="w-4 h-4 mr-2" /> Regar Planta
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
