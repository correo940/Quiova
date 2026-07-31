'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    MapPin, Plus, Trash2, Loader2, Plane, BedDouble, Ticket, Bus, MapIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const TripMap = dynamic(() => import('./trip-map'), {
    ssr: false,
    loading: () => (
        <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: 12 }}>
            Cargando mapa...
        </div>
    ),
});

const TYPE_META: Record<string, { label: string; icon: typeof Plane }> = {
    flight: { label: 'Vuelo', icon: Plane },
    hotel: { label: 'Hotel', icon: BedDouble },
    activity: { label: 'Actividad', icon: Ticket },
    transport: { label: 'Transporte', icon: Bus },
    other: { label: 'Otro', icon: MapIcon },
};

type TripEvent = {
    id: string;
    title: string;
    event_type: string;
    starts_at: string;
    location: string | null;
    lat: number | null;
    lng: number | null;
};

type PlaceSuggestion = { name: string; admin1: string; country: string; lat: number; lng: number };

export function TripItinerary({ tripId, onChange }: { tripId: string; onChange?: () => void }) {
    const [events, setEvents] = useState<TripEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [eventType, setEventType] = useState('flight');
    const [title, setTitle] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [locationQuery, setLocationQuery] = useState('');
    const [pickedLat, setPickedLat] = useState<number | null>(null);
    const [pickedLng, setPickedLng] = useState<number | null>(null);
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        loadEvents();
    }, [tripId]);

    async function loadEvents() {
        setLoading(true);
        const { data, error } = await supabase
            .from('trip_events')
            .select('id, title, event_type, starts_at, location, lat, lng')
            .eq('trip_id', tripId)
            .order('starts_at', { ascending: true });
        if (!error) setEvents(data || []);
        setLoading(false);
    }

    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (!locationQuery.trim()) { setSuggestions([]); return; }
        searchTimer.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationQuery)}&count=6&language=es&format=json`);
                const json = await res.json();
                setSuggestions((json.results || []).map((r: any) => ({
                    name: r.name,
                    admin1: r.admin1 || '',
                    country: r.country || '',
                    lat: r.latitude,
                    lng: r.longitude,
                })));
            } catch {
                setSuggestions([]);
            }
        }, 300);
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [locationQuery]);

    function selectSuggestion(s: PlaceSuggestion) {
        setLocationQuery(`${s.name}${s.admin1 ? ', ' + s.admin1 : ''}${s.country ? ', ' + s.country : ''}`);
        setPickedLat(s.lat);
        setPickedLng(s.lng);
        setSuggestions([]);
    }

    async function handleMapPick(lat: number, lng: number) {
        setPickedLat(lat);
        setPickedLng(lng);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`, { headers: { 'User-Agent': 'QuiobaApp/1.0' } });
            const json = await res.json();
            if (json?.display_name) setLocationQuery(json.display_name);
        } catch { /* silencioso, ya tenemos las coordenadas */ }
    }

    function resetForm() {
        setEventType('flight');
        setTitle('');
        setStartsAt('');
        setLocationQuery('');
        setPickedLat(null);
        setPickedLng(null);
        setSuggestions([]);
    }

    async function handleSave() {
        if (!title.trim() || !startsAt) {
            toast.error('Completa título y fecha/hora');
            return;
        }
        setSaving(true);
        const { error } = await supabase.from('trip_events').insert({
            trip_id: tripId,
            title: title.trim(),
            event_type: eventType,
            starts_at: new Date(startsAt).toISOString(),
            location: locationQuery.trim() || null,
            lat: pickedLat,
            lng: pickedLng,
        });
        setSaving(false);

        if (error) {
            toast.error('No se pudo guardar la parada');
            return;
        }

        toast.success('Parada añadida al itinerario');
        setDialogOpen(false);
        resetForm();
        loadEvents();
        onChange?.();
    }

    async function handleDelete(id: string) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        await supabase.from('trip_events').delete().eq('id', id);
        onChange?.();
    }

    const mapEvents = events.filter((e) => e.lat != null && e.lng != null) as (TripEvent & { lat: number; lng: number })[];
    const pendingPin = pickedLat != null && pickedLng != null
        ? [{ id: 'pending', title: title || 'Nueva parada', event_type: eventType, lat: pickedLat, lng: pickedLng }]
        : [];

    return (
        <Card className="mb-6">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <Plane className="h-3.5 w-3.5" />
                        Itinerario
                    </div>
                    <Button size="sm" variant="outline" className="gap-2 h-8" onClick={() => setDialogOpen(true)}>
                        <Plus className="h-3.5 w-3.5" />
                        Añadir parada
                    </Button>
                </div>

                {mapEvents.length > 0 && (
                    <div className="mb-4">
                        <TripMap events={mapEvents} />
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                ) : events.length === 0 ? (
                    <p className="text-sm text-slate-400">Todavía no has añadido vuelos, hoteles ni actividades.</p>
                ) : (
                    <div className="space-y-3">
                        {events.map((event) => {
                            const meta = TYPE_META[event.event_type] || TYPE_META.other;
                            const Icon = meta.icon;
                            return (
                                <div key={event.id} className="flex items-start gap-3 border-l-2 border-[#1a5c2e]/30 pl-3 group">
                                    <Icon className="h-3.5 w-3.5 mt-0.5 text-slate-400" />
                                    <div className="flex-1">
                                        <p className="font-bold text-sm text-slate-900 dark:text-white">{event.title}</p>
                                        <p className="text-xs text-slate-500">
                                            {format(new Date(event.starts_at), "d MMM, HH:mm", { locale: es })}
                                            {event.location ? ` · ${event.location}` : ''}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(event.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>

            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Añadir parada al itinerario</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Tipo</Label>
                                <Select value={eventType} onValueChange={setEventType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(TYPE_META).map(([key, meta]) => (
                                            <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Fecha y hora</Label>
                                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Título</Label>
                            <Input placeholder="Ej. Vuelo IB3172" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>

                        <div className="space-y-1.5 relative">
                            <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Lugar</Label>
                            <Input
                                placeholder="Busca una ciudad o dirección..."
                                value={locationQuery}
                                onChange={(e) => { setLocationQuery(e.target.value); setPickedLat(null); setPickedLng(null); }}
                            />
                            {suggestions.length > 0 && (
                                <div className="absolute z-10 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                                            onClick={() => selectSuggestion(s)}
                                        >
                                            {s.name}{s.admin1 ? `, ${s.admin1}` : ''}{s.country ? `, ${s.country}` : ''}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500">O toca el mapa para marcar el punto exacto</Label>
                            <TripMap events={pendingPin} pickMode onPick={handleMapPick} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button
                            disabled={saving}
                            onClick={handleSave}
                            className="bg-gradient-to-br from-[#1a5c2e] to-[#1e7a3a] text-white gap-2"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
