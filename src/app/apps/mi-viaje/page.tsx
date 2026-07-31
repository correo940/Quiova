'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { differenceInCalendarDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plane, Plus, Home, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Trip = {
    id: string;
    destination: string;
    start_date: string;
    end_date: string;
    status: string;
    cover_emoji: string;
};

export default function MiViajePage() {
    const { user } = useAuth();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [destination, setDestination] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (!user) return;
        loadTrips();
    }, [user]);

    async function loadTrips() {
        setLoading(true);
        const { data, error } = await supabase
            .from('trips')
            .select('id, destination, start_date, end_date, status, cover_emoji')
            .order('start_date', { ascending: true });

        if (error) {
            toast.error('No se pudieron cargar los viajes');
        } else {
            setTrips(data || []);
        }
        setLoading(false);
    }

    async function handleCreateTrip() {
        if (!user || !destination.trim() || !startDate || !endDate) {
            toast.error('Completa destino y fechas');
            return;
        }
        if (endDate < startDate) {
            toast.error('La fecha de vuelta no puede ser antes que la de ida');
            return;
        }

        setSaving(true);
        const { data, error } = await supabase
            .from('trips')
            .insert({
                user_id: user.id,
                destination: destination.trim(),
                start_date: startDate,
                end_date: endDate,
            })
            .select('id')
            .single();

        setSaving(false);

        if (error || !data) {
            toast.error('No se pudo crear el viaje');
            return;
        }

        setDialogOpen(false);
        setDestination('');
        setStartDate('');
        setEndDate('');
        toast.success('Viaje creado');
        loadTrips();
    }

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#020617] p-4 md:p-8 pb-nav relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[#1a5c2e]/5 blur-[120px] pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <Link href="/">
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-slate-200 dark:border-slate-800 rounded-full px-4 h-9 shadow-sm hover:shadow-md transition-all flex items-center gap-2 group"
                        >
                            <Home className="h-4 w-4 text-slate-500 group-hover:text-[#1a5c2e] transition-colors" />
                            <span className="hidden sm:inline font-bold text-xs uppercase tracking-wider">Inicio</span>
                        </Button>
                    </Link>
                </div>

                <div className="flex items-center justify-between gap-4 mb-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-gradient-to-br from-[#1a5c2e] to-[#1e7a3a] rounded-xl shadow-lg">
                                <Plane className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                                Mi <span className="text-[#1a5c2e]">Viaje</span>
                            </h1>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-base font-medium ml-12">
                            Tus viajes, en un solo sitio.
                        </p>
                    </motion.div>

                    <Button
                        onClick={() => setDialogOpen(true)}
                        className="bg-gradient-to-br from-[#1a5c2e] to-[#1e7a3a] hover:opacity-90 text-white rounded-full h-11 px-5 gap-2 shadow-lg"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Nuevo viaje</span>
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                ) : trips.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center text-center py-16 px-6">
                            <Plane className="h-10 w-10 text-slate-300 mb-4" />
                            <h2 className="text-lg font-bold mb-1">Todavía no tienes viajes</h2>
                            <p className="text-slate-500 text-sm mb-6 max-w-sm">
                                Crea tu primer viaje para empezar a organizar fechas, itinerario y checklist.
                            </p>
                            <Button
                                onClick={() => setDialogOpen(true)}
                                className="bg-gradient-to-br from-[#1a5c2e] to-[#1e7a3a] text-white rounded-full gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Crear viaje
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {trips.map((trip) => {
                            const days = differenceInCalendarDays(new Date(trip.start_date), new Date());
                            return (
                                <Link key={trip.id} href={`/apps/mi-viaje/${trip.id}`}>
                                    <Card className="hover:shadow-md hover:border-[#1a5c2e]/30 transition-all cursor-pointer h-full">
                                        <CardContent className="p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <span className="text-3xl">{trip.cover_emoji || '✈️'}</span>
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                    {days > 0 ? `en ${days} día${days === 1 ? '' : 's'}` : days === 0 ? 'hoy' : 'en curso / pasado'}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                                {trip.destination}
                                            </h3>
                                            <p className="text-sm text-slate-500">
                                                {format(new Date(trip.start_date), "d MMM", { locale: es })} — {format(new Date(trip.end_date), "d MMM yyyy", { locale: es })}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuevo viaje</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="destination">Destino</Label>
                            <Input
                                id="destination"
                                placeholder="Ej. Lisboa"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="start-date">Ida</Label>
                                <Input
                                    id="start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="end-date">Vuelta</Label>
                                <Input
                                    id="end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateTrip}
                            disabled={saving}
                            className="bg-gradient-to-br from-[#1a5c2e] to-[#1e7a3a] text-white gap-2"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Crear viaje
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
