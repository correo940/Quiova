'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    ArrowLeft, Loader2, Plane, Plus, Trash2,
    CalendarDays, ListChecks, Sparkles, MapPin,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { TripDocuments } from '@/components/apps/mi-viaje/trip-documents';
import { TripItinerary } from '@/components/apps/mi-viaje/trip-itinerary';
import { toast } from 'sonner';

function useCountdown(target: Date) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const diffMs = target.getTime() - now.getTime();
    const isPast = diffMs <= 0;
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { isPast, days, hours, minutes, seconds };
}

type Trip = {
    id: string;
    destination: string;
    start_date: string;
    end_date: string;
    status: string;
    cover_emoji: string;
};

type TripEvent = {
    id: string;
    title: string;
    event_type: string;
    starts_at: string;
    location: string | null;
};

type ChecklistItem = {
    id: string;
    label: string;
    is_done: boolean;
};

export default function TripDetailPage() {
    const params = useParams<{ tripId: string }>();
    const router = useRouter();
    const tripId = params?.tripId as string;

    const [trip, setTrip] = useState<Trip | null>(null);
    const [events, setEvents] = useState<TripEvent[]>([]);
    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItemLabel, setNewItemLabel] = useState('');

    const loadTrip = useCallback(async () => {
        setLoading(true);
        const [tripRes, eventsRes, checklistRes] = await Promise.all([
            supabase.from('trips').select('*').eq('id', tripId).single(),
            supabase.from('trip_events').select('*').eq('trip_id', tripId).order('starts_at', { ascending: true }),
            supabase.from('trip_checklist_items').select('*').eq('trip_id', tripId).order('created_at', { ascending: true }),
        ]);

        if (tripRes.error || !tripRes.data) {
            toast.error('No se encontró el viaje');
            router.push('/apps/mi-viaje');
            return;
        }

        setTrip(tripRes.data);
        setEvents(eventsRes.data || []);
        setChecklist(checklistRes.data || []);
        setLoading(false);
    }, [tripId, router]);

    useEffect(() => {
        loadTrip();
    }, [loadTrip]);

    const countdown = useCountdown(trip ? new Date(`${trip.start_date}T00:00:00`) : new Date());

    async function toggleChecklistItem(item: ChecklistItem) {
        setChecklist((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_done: !i.is_done } : i)));
        const { error } = await supabase
            .from('trip_checklist_items')
            .update({ is_done: !item.is_done })
            .eq('id', item.id);
        if (error) {
            toast.error('No se pudo actualizar');
            loadTrip();
        }
    }

    async function addChecklistItem() {
        const label = newItemLabel.trim();
        if (!label) return;
        setNewItemLabel('');
        const { data, error } = await supabase
            .from('trip_checklist_items')
            .insert({ trip_id: tripId, label })
            .select('*')
            .single();
        if (error || !data) {
            toast.error('No se pudo añadir');
            return;
        }
        setChecklist((prev) => [...prev, data]);
    }

    async function removeChecklistItem(id: string) {
        setChecklist((prev) => prev.filter((i) => i.id !== id));
        await supabase.from('trip_checklist_items').delete().eq('id', id);
    }

    if (loading || !trip) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        );
    }

    const nextEvent = events.find((e) => new Date(e.starts_at) >= new Date());
    const doneCount = checklist.filter((i) => i.is_done).length;
    const missingCount = checklist.length - doneCount;

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#020617] p-4 md:p-8 pb-nav">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <Link href="/apps/mi-viaje">
                        <Button variant="ghost" size="sm" className="rounded-full gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Mis viajes
                        </Button>
                    </Link>
                </div>

                {/* Cabecera / countdown */}
                <Card className="mb-6 overflow-hidden border-none shadow-lg bg-gradient-to-br from-[#1a5c2e] to-[#1e7a3a] text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-3xl">{trip.cover_emoji || '✈️'}</span>
                            <h1 className="text-2xl md:text-3xl font-black">{trip.destination}</h1>
                        </div>
                        <p className="text-white/80 text-sm mb-4">
                            {format(new Date(trip.start_date), "d MMM", { locale: es })} — {format(new Date(trip.end_date), "d MMM yyyy", { locale: es })}
                        </p>
                        {countdown.isPast ? (
                            <div className="text-4xl font-black">En curso / finalizado</div>
                        ) : (
                            <>
                                <div className="flex items-end gap-3 md:gap-5">
                                    {[
                                        { value: countdown.days, label: 'días' },
                                        { value: countdown.hours, label: 'horas' },
                                        { value: countdown.minutes, label: 'min' },
                                        { value: countdown.seconds, label: 'seg' },
                                    ].map((unit) => (
                                        <div key={unit.label} className="text-center">
                                            <div className="text-3xl md:text-4xl font-black tabular-nums">{String(unit.value).padStart(2, '0')}</div>
                                            <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">{unit.label}</div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-white/70 text-xs uppercase tracking-wider font-bold mt-2">para el viaje</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Próximo evento + qué me falta */}
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                                <CalendarDays className="h-3.5 w-3.5" />
                                Próximo evento
                            </div>
                            {nextEvent ? (
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{nextEvent.title}</p>
                                    <p className="text-sm text-slate-500 flex items-center gap-1">
                                        {format(new Date(nextEvent.starts_at), "d MMM, HH:mm", { locale: es })}
                                        {nextEvent.location && (
                                            <>
                                                <MapPin className="h-3 w-3 ml-1" /> {nextEvent.location}
                                            </>
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400">Sin eventos en el itinerario todavía.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                                <Sparkles className="h-3.5 w-3.5" />
                                ¿Qué me falta?
                            </div>
                            {checklist.length === 0 ? (
                                <p className="text-sm text-slate-400">Añade tu checklist más abajo.</p>
                            ) : missingCount === 0 ? (
                                <p className="text-sm font-bold text-[#1a5c2e]">Todo listo ✓</p>
                            ) : (
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                    Te falta{missingCount === 1 ? '' : 'n'} <span className="font-bold">{missingCount}</span> cosa{missingCount === 1 ? '' : 's'} por preparar.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Documentos: billetes, QRs, hoteles */}
                <TripDocuments tripId={trip.id} tripEndDate={trip.end_date} />

                {/* Checklist */}
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">
                            <ListChecks className="h-3.5 w-3.5" />
                            Checklist ({doneCount}/{checklist.length})
                        </div>
                        <div className="space-y-2 mb-3">
                            {checklist.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 group">
                                    <Checkbox checked={item.is_done} onCheckedChange={() => toggleChecklistItem(item)} />
                                    <span className={`flex-1 text-sm ${item.is_done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {item.label}
                                    </span>
                                    <button
                                        onClick={() => removeChecklistItem(item.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Añadir a la checklist..."
                                value={newItemLabel}
                                onChange={(e) => setNewItemLabel(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                            />
                            <Button size="icon" variant="outline" onClick={addChecklistItem}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Itinerario con mapa interactivo */}
                <TripItinerary tripId={trip.id} onChange={loadTrip} />
            </div>
        </div>
    );
}
