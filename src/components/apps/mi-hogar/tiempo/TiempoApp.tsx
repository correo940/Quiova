'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Loader2, MapPin, Search, ArrowLeft, RefreshCw,
    CloudRain, Sun, Thermometer, Wind, MessageCircle,
    Settings, Star, Clock, AlertTriangle, Trash2,
    Plane, X, PlaneLanding,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

interface WeatherDay {
    date: string;
    temperature_max: number;
    temperature_min: number;
    apparent_temperature_max: number;
    apparent_temperature_min: number;
    precipitation_sum: number;
    precipitation_hours: number;
    windspeed_max: number;
    weathercode: number;
    uv_index_max?: number;
}

interface ClothingItem {
    emoji: string;
    nombre: string;
    urgente: boolean;
}

interface DayRecommendation {
    fecha: string;
    comentario_quioba: string;
    hora_salida_consejo?: string;
    items: ClothingItem[];
    resumen_tiempo: string;
    nivel_calor: 'calor' | 'templado' | 'fresco' | 'frio' | 'mucho_frio';
}

interface FavoriteLocation {
    name: string;
    lat: number;
    lon: number;
}

interface GeoSuggestion {
    name: string;
    admin1: string;
    country: string;
    lat: number;
    lon: number;
}

interface TripPlan {
    date: string;
    cityName: string;
    lat: number;
    lon: number;
    weatherDay: WeatherDay | null;
    recommendation: DayRecommendation | null;
}

type UserProfile = 'friolero' | 'normal' | 'caluroso';

const ACTIVITIES = [
    { key: 'trabajar', label: 'Trabajar', emoji: '💼' },
    { key: 'correr', label: 'Correr', emoji: '🏃' },
    { key: 'playa', label: 'Playa', emoji: '🏖️' },
    { key: 'montana', label: 'Montaña', emoji: '🏔️' },
    { key: 'salir_noche', label: 'Salir', emoji: '🍷' },
    { key: 'compras', label: 'Compras', emoji: '🛍️' },
];

const WMO_DESCRIPTIONS: Record<number, string> = {
    0: 'Despejado', 1: 'Principalmente despejado', 2: 'Parcialmente nublado', 3: 'Cubierto',
    45: 'Niebla', 48: 'Niebla con hielo',
    51: 'Llovizna ligera', 53: 'Llovizna moderada', 55: 'Llovizna densa',
    61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia fuerte',
    71: 'Nieve ligera', 73: 'Nieve moderada', 75: 'Nieve fuerte',
    80: 'Chubascos ligeros', 81: 'Chubascos', 82: 'Chubascos fuertes',
    85: 'Nieve ligera', 86: 'Nieve fuerte',
    95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta fuerte',
};

const NIVEL_CALOR_CONFIG = {
    calor:      { bg: 'from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20',   border: 'border-orange-200 dark:border-orange-800', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
    templado:   { bg: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20', border: 'border-green-200 dark:border-green-800',   badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    fresco:     { bg: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',         border: 'border-blue-200 dark:border-blue-800',     badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    frio:       { bg: 'from-slate-50 to-blue-50 dark:from-slate-950/20 dark:to-blue-950/20',       border: 'border-slate-200 dark:border-slate-700',   badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    mucho_frio: { bg: 'from-indigo-50 to-slate-50 dark:from-indigo-950/20 dark:to-slate-950/20',   border: 'border-indigo-200 dark:border-indigo-800', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
};

function formatDate(dateStr: string): { weekday: string; day: string; month: string } {
    const date = new Date(dateStr + 'T12:00:00');
    return {
        weekday: date.toLocaleDateString('es-ES', { weekday: 'long' }),
        day: date.toLocaleDateString('es-ES', { day: 'numeric' }),
        month: date.toLocaleDateString('es-ES', { month: 'short' }),
    };
}

function isToday(dateStr: string): boolean {
    return dateStr === new Date().toISOString().split('T')[0];
}

function computeAlerts(day: WeatherDay): string[] {
    const alerts: string[] = [];
    const diff = day.temperature_max - day.temperature_min;
    if (diff >= 12) alerts.push(`Cambio de ${diff}° entre mañana y tarde — pon capas`);
    if (day.precipitation_hours > 0 && day.precipitation_hours < 8 && day.precipitation_sum > 0)
        alerts.push(`Lluvia solo parte del día — lleva paraguas por si acaso`);
    if ((day.uv_index_max ?? 0) >= 8) alerts.push(`UV muy alto (${day.uv_index_max}) — crema solar obligatoria`);
    if (day.windspeed_max > 50) alerts.push(`Viento fuerte (${day.windspeed_max}km/h) — cuidado con paraguas`);
    return alerts;
}

function loadProfile(): UserProfile {
    if (typeof window === 'undefined') return 'normal';
    return (localStorage.getItem('quioba_weather_profile') as UserProfile) || 'normal';
}

function loadFavorites(): FavoriteLocation[] {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('quioba_weather_favorites') || '[]'); } catch { return []; }
}

function loadTrips(): Record<string, TripPlan> {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('quioba_weather_trips') || '{}'); } catch { return {}; }
}

function saveTrips(trips: Record<string, TripPlan>) {
    if (typeof window !== 'undefined') localStorage.setItem('quioba_weather_trips', JSON.stringify(trips));
}

function todayStr(): string {
    return new Date().toISOString().split('T')[0];
}

function getDatesInRange(start: string, end: string): string[] {
    const dates: string[] = [];
    const cur = new Date(start + 'T12:00:00');
    const last = new Date(end + 'T12:00:00');
    while (cur <= last) {
        dates.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}

function isWithinForecast(dateStr: string): boolean {
    const diffDays = Math.round((new Date(dateStr + 'T12:00:00').getTime() - new Date().setHours(12, 0, 0, 0)) / 86400000);
    return diffDays >= 0 && diffDays <= 15;
}

async function fetchWeatherForDay(lat: number, lon: number, targetDate: string): Promise<WeatherDay | null> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_hours,windspeed_10m_max,uv_index_max&timezone=auto&forecast_days=7&past_days=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const d = json.daily;
    const idx = d.time.indexOf(targetDate);
    if (idx === -1) return null;
    return {
        date: targetDate,
        temperature_max: Math.round(d.temperature_2m_max[idx]),
        temperature_min: Math.round(d.temperature_2m_min[idx]),
        apparent_temperature_max: Math.round(d.apparent_temperature_max?.[idx] ?? d.temperature_2m_max[idx]),
        apparent_temperature_min: Math.round(d.apparent_temperature_min?.[idx] ?? d.temperature_2m_min[idx]),
        precipitation_sum: d.precipitation_sum[idx] ?? 0,
        precipitation_hours: d.precipitation_hours?.[idx] ?? 0,
        windspeed_max: Math.round(d.windspeed_10m_max[idx]),
        weathercode: d.weathercode[idx],
        uv_index_max: d.uv_index_max?.[idx] ?? 0,
    };
}

export default function TiempoApp() {
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingGeo, setLoadingGeo] = useState(false);
    const [resolvedCity, setResolvedCity] = useState('');
    const [currentLat, setCurrentLat] = useState<number | null>(null);
    const [currentLon, setCurrentLon] = useState<number | null>(null);

    const [weatherDays, setWeatherDays] = useState<WeatherDay[]>([]);
    const [yesterdayData, setYesterdayData] = useState<WeatherDay | null>(null);
    const [recommendations, setRecommendations] = useState<DayRecommendation[]>([]);
    const [weeklySummary, setWeeklySummary] = useState('');
    const [selectedDay, setSelectedDay] = useState(0);
    const [hasResults, setHasResults] = useState(false);

    const [profile, setProfile] = useState<UserProfile>('normal');
    const [activity, setActivity] = useState('');
    const [departureTime, setDepartureTime] = useState('');
    const [showSettings, setShowSettings] = useState(false);

    const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);

    // Main search autocomplete
    const [citySuggestions, setCitySuggestions] = useState<GeoSuggestion[]>([]);
    const [loadingCitySugg, setLoadingCitySugg] = useState(false);
    const cityAutoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Trip planner
    const [trips, setTrips] = useState<Record<string, TripPlan>>({});
    const [showTripModal, setShowTripModal] = useState(false);
    const [tripSelectedCity, setTripSelectedCity] = useState<GeoSuggestion | null>(null);
    const [tripStartDate, setTripStartDate] = useState('');
    const [tripEndDate, setTripEndDate] = useState('');
    const [createTripTasks, setCreateTripTasks] = useState(true);
    const [tripTaskListId, setTripTaskListId] = useState<string | null>(null);
    const [tripInput, setTripInput] = useState('');
    const [tripSuggestions, setTripSuggestions] = useState<GeoSuggestion[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [loadingTrip, setLoadingTrip] = useState(false);
    const tripInputRef = useRef<HTMLInputElement>(null);
    const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setProfile(loadProfile());
        setFavorites(loadFavorites());
        setTrips(loadTrips());
        // Pre-load user's default task list ID
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;
            supabase.from('task_lists').select('id').eq('owner_id', user.id).limit(1)
                .then(({ data }) => {
                    if (data && data.length > 0) {
                        setTripTaskListId(data[0].id);
                    } else {
                        supabase.rpc('create_default_task_list_for_user').then(() => {
                            supabase.from('task_lists').select('id').eq('owner_id', user.id).limit(1)
                                .then(({ data: d2 }) => { if (d2 && d2.length > 0) setTripTaskListId(d2[0].id); });
                        });
                    }
                });
        });
    }, []);

    // Autocomplete for trip input
    useEffect(() => {
        if (suggestTimer.current) clearTimeout(suggestTimer.current);
        if (!tripInput.trim()) { setTripSuggestions([]); return; }
        suggestTimer.current = setTimeout(async () => {
            setLoadingSuggestions(true);
            try {
                const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(tripInput)}&count=7&language=es&format=json`);
                const json = await res.json();
                setTripSuggestions((json.results || []).map((r: any) => ({
                    name: r.name,
                    admin1: r.admin1 || '',
                    country: r.country || '',
                    lat: r.latitude,
                    lon: r.longitude,
                })));
            } catch { setTripSuggestions([]); }
            finally { setLoadingSuggestions(false); }
        }, 250);
        return () => { if (suggestTimer.current) clearTimeout(suggestTimer.current); };
    }, [tripInput]);

    // Focus trip input when modal opens (only if no city selected yet)
    useEffect(() => {
        if (showTripModal && !tripSelectedCity) setTimeout(() => tripInputRef.current?.focus(), 150);
    }, [showTripModal, tripSelectedCity]);

    // Autocomplete for main city search
    useEffect(() => {
        if (cityAutoTimer.current) clearTimeout(cityAutoTimer.current);
        if (!city.trim()) { setCitySuggestions([]); return; }
        cityAutoTimer.current = setTimeout(async () => {
            setLoadingCitySugg(true);
            try {
                const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=6&language=es&format=json`);
                const json = await res.json();
                setCitySuggestions((json.results || []).map((r: any) => ({
                    name: r.name, admin1: r.admin1 || '', country: r.country || '',
                    lat: r.latitude, lon: r.longitude,
                })));
            } catch { setCitySuggestions([]); }
            finally { setLoadingCitySugg(false); }
        }, 250);
        return () => { if (cityAutoTimer.current) clearTimeout(cityAutoTimer.current); };
    }, [city]);

    const openTripModal = () => {
        const today = todayStr();
        setTripInput('');
        setTripSuggestions([]);
        setTripSelectedCity(null);
        setTripStartDate(today);
        setTripEndDate(today);
        setShowTripModal(true);
    };

    const setTripPreset = (preset: 'today' | 'tomorrow' | 'weekend' | 'week') => {
        const today = new Date();
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        if (preset === 'today') {
            setTripStartDate(fmt(today)); setTripEndDate(fmt(today));
        } else if (preset === 'tomorrow') {
            const t = new Date(today); t.setDate(t.getDate() + 1);
            setTripStartDate(fmt(t)); setTripEndDate(fmt(t));
        } else if (preset === 'weekend') {
            const day = today.getDay();
            const toSat = day === 6 ? 7 : (6 - day + 7) % 7 || 7;
            const sat = new Date(today); sat.setDate(today.getDate() + toSat);
            const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
            setTripStartDate(fmt(sat)); setTripEndDate(fmt(sun));
        } else {
            const end = new Date(today); end.setDate(today.getDate() + 6);
            setTripStartDate(fmt(today)); setTripEndDate(fmt(end));
        }
    };

    const tripDates = tripStartDate && tripEndDate && tripEndDate >= tripStartDate
        ? getDatesInRange(tripStartDate, tripEndDate)
        : [];

    const confirmTrip = async () => {
        if (!tripSelectedCity || tripDates.length === 0) return;
        setShowTripModal(false);
        setLoadingTrip(true);
        const newTrips = { ...trips };
        try {
            for (const date of tripDates) {
                let weatherDay: WeatherDay | null = null;
                let rec: DayRecommendation | null = null;
                if (isWithinForecast(date)) {
                    weatherDay = await fetchWeatherForDay(tripSelectedCity.lat, tripSelectedCity.lon, date);
                    if (weatherDay) {
                        const res = await fetch(getApiUrl('api/mi-hogar/weather-clothing'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                weatherData: [{
                                    fecha: weatherDay.date,
                                    temp_max: weatherDay.temperature_max,
                                    temp_min: weatherDay.temperature_min,
                                    sensacion_max: weatherDay.apparent_temperature_max,
                                    sensacion_min: weatherDay.apparent_temperature_min,
                                    lluvia_mm: weatherDay.precipitation_sum,
                                    horas_lluvia: weatherDay.precipitation_hours,
                                    viento_kmh: weatherDay.windspeed_max,
                                    descripcion: WMO_DESCRIPTIONS[weatherDay.weathercode] || 'Variable',
                                    uv_max: weatherDay.uv_index_max,
                                }],
                                city: tripSelectedCity.name,
                                profile,
                                activity: activity || null,
                                departureTime: null,
                            }),
                        });
                        const result = await res.json();
                        rec = result.success ? result.data?.dias?.[0] ?? null : null;
                    }
                }
                newTrips[date] = {
                    date,
                    cityName: tripSelectedCity.name,
                    lat: tripSelectedCity.lat,
                    lon: tripSelectedCity.lon,
                    weatherDay,
                    recommendation: rec,
                };
            }
            setTrips(newTrips);
            saveTrips(newTrips);

            // Create tasks in task app
            if (createTripTasks && tripTaskListId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    for (const date of tripDates) {
                        await supabase.from('tasks').insert({
                            user_id: user.id,
                            list_id: tripTaskListId,
                            title: `✈️ Viaje a ${tripSelectedCity.name}`,
                            due_date: `${date}T00:00:00`,
                            is_completed: false,
                            has_alarm: false,
                            priority: 'medium',
                        });
                    }
                }
            }

            toast.success(`Viaje a ${tripSelectedCity.name} guardado — ${tripDates.length} día${tripDates.length > 1 ? 's' : ''}${createTripTasks && tripTaskListId ? ' + tareas creadas' : ''}`);
        } catch {
            toast.error('Error al guardar el viaje');
        } finally {
            setLoadingTrip(false);
        }
    };

    const removeTrip = (date: string) => {
        const newTrips = { ...trips };
        delete newTrips[date];
        setTrips(newTrips);
        saveTrips(newTrips);
    };

    const handleProfileChange = (p: UserProfile) => {
        setProfile(p);
        if (typeof window !== 'undefined') localStorage.setItem('quioba_weather_profile', p);
    };

    const saveFavorite = () => {
        if (!resolvedCity || currentLat === null || currentLon === null) return;
        if (favorites.some(f => f.name === resolvedCity)) { toast.info('Ya está guardada'); return; }
        const newFavs = [...favorites.slice(-4), { name: resolvedCity, lat: currentLat, lon: currentLon }];
        setFavorites(newFavs);
        if (typeof window !== 'undefined') localStorage.setItem('quioba_weather_favorites', JSON.stringify(newFavs));
        toast.success(`"${resolvedCity}" guardado en favoritos`);
    };

    const removeFavorite = (name: string) => {
        const newFavs = favorites.filter(f => f.name !== name);
        setFavorites(newFavs);
        if (typeof window !== 'undefined') localStorage.setItem('quioba_weather_favorites', JSON.stringify(newFavs));
    };

    const fetchWeatherByCoords = async (lat: number, lon: number, cityName: string) => {
        setLoading(true);
        setHasResults(false);
        setCurrentLat(lat);
        setCurrentLon(lon);
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_hours,windspeed_10m_max,uv_index_max&timezone=auto&forecast_days=7&past_days=1`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Error al obtener el tiempo');
            const json = await res.json();
            const d = json.daily;

            const allDays: WeatherDay[] = d.time.map((date: string, i: number) => ({
                date,
                temperature_max: Math.round(d.temperature_2m_max[i]),
                temperature_min: Math.round(d.temperature_2m_min[i]),
                apparent_temperature_max: Math.round(d.apparent_temperature_max?.[i] ?? d.temperature_2m_max[i]),
                apparent_temperature_min: Math.round(d.apparent_temperature_min?.[i] ?? d.temperature_2m_min[i]),
                precipitation_sum: d.precipitation_sum[i] ?? 0,
                precipitation_hours: d.precipitation_hours?.[i] ?? 0,
                windspeed_max: Math.round(d.windspeed_10m_max[i]),
                weathercode: d.weathercode[i],
                uv_index_max: d.uv_index_max?.[i] ?? 0,
            }));

            setYesterdayData(allDays[0]);
            const forecast = allDays.slice(1);
            setWeatherDays(forecast);
            setResolvedCity(cityName);
            await fetchRecommendations(forecast, cityName);
        } catch (err: any) {
            toast.error(err.message || 'Error al obtener el tiempo');
        } finally {
            setLoading(false);
        }
    };

    const fetchRecommendations = async (days: WeatherDay[], cityName: string) => {
        const weatherData = days.map(d => ({
            fecha: d.date,
            temp_max: d.temperature_max,
            temp_min: d.temperature_min,
            sensacion_max: d.apparent_temperature_max,
            sensacion_min: d.apparent_temperature_min,
            lluvia_mm: d.precipitation_sum,
            horas_lluvia: d.precipitation_hours,
            viento_kmh: d.windspeed_max,
            descripcion: WMO_DESCRIPTIONS[d.weathercode] || 'Variable',
            uv_max: d.uv_index_max,
        }));

        const response = await fetch(getApiUrl('api/mi-hogar/weather-clothing'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                weatherData, city: cityName,
                profile,
                activity: activity || null,
                departureTime: departureTime || null,
            }),
        });

        if (!response.ok) throw new Error('Error al generar recomendaciones');
        const result = await response.json();
        if (result.success && result.data?.dias) {
            setRecommendations(result.data.dias);
            setWeeklySummary(result.data.resumen_semana || '');
            setSelectedDay(0);
            setHasResults(true);
        } else {
            throw new Error(result.error || 'Error desconocido');
        }
    };

    const handleSearchCity = async () => {
        const trimmed = city.trim();
        if (!trimmed) return;
        setLoading(true);
        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=es&format=json`);
            const geoJson = await geoRes.json();
            if (!geoJson.results?.length) {
                toast.error(`No encontré "${trimmed}". Prueba con otra ciudad.`);
                setLoading(false);
                return;
            }
            const place = geoJson.results[0];
            await fetchWeatherByCoords(place.latitude, place.longitude, place.name);
        } catch {
            toast.error('Error buscando la ciudad');
            setLoading(false);
        }
    };

    const handleGeolocate = () => {
        if (!navigator.geolocation) { toast.error('Tu navegador no soporta geolocalización'); return; }
        setLoadingGeo(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude, longitude } = pos.coords;
                    let cityName = 'Tu ubicación';
                    try {
                        const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=es`, { headers: { 'User-Agent': 'QuiobaApp/1.0' } });
                        const nom = await nomRes.json();
                        cityName = nom.address?.city || nom.address?.town || nom.address?.village || nom.address?.county || 'Tu ubicación';
                    } catch { /* ignore */ }
                    await fetchWeatherByCoords(latitude, longitude, cityName);
                } catch {
                    toast.error('Error al obtener tu ubicación');
                } finally {
                    setLoadingGeo(false);
                }
            },
            () => { toast.error('No pudimos acceder a tu ubicación'); setLoadingGeo(false); }
        );
    };

    const handleRefresh = async () => {
        if (!weatherDays.length || !resolvedCity) return;
        setLoading(true);
        setHasResults(false);
        try {
            await fetchRecommendations(weatherDays, resolvedCity);
        } catch (err: any) {
            toast.error(err.message || 'Error al regenerar');
        } finally {
            setLoading(false);
        }
    };

    const currentTrip = weatherDays[selectedDay] ? trips[weatherDays[selectedDay].date] : undefined;
    const currentRec = currentTrip?.recommendation ?? recommendations[selectedDay];
    const currentWeather = currentTrip?.weatherDay ?? weatherDays[selectedDay];
    const nivelConfig = currentRec ? (NIVEL_CALOR_CONFIG[currentRec.nivel_calor as keyof typeof NIVEL_CALOR_CONFIG] ?? NIVEL_CALOR_CONFIG.templado) : null;
    const dayAlerts = currentWeather ? computeAlerts(currentWeather) : [];
    const isFavorite = favorites.some(f => f.name === resolvedCity);
    const activeActivity = ACTIVITIES.find(a => a.key === activity);

    return (
        <div className="max-w-4xl mx-auto space-y-4 pb-20 p-4">
            {/* Trip Modal */}
            {showTripModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowTripModal(false)}>
                    <div className="bg-background rounded-t-3xl w-full max-w-lg p-6 pb-10 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Plane className="h-5 w-5 text-sky-500" />
                                Planificar viaje
                            </h3>
                            <Button variant="ghost" size="icon" onClick={() => setShowTripModal(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* City search */}
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">¿A dónde vas?</p>
                        {tripSelectedCity ? (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 mb-3">
                                <MapPin className="h-4 w-4 text-sky-500 flex-shrink-0" />
                                <span className="font-medium text-sm flex-1">{tripSelectedCity.name}
                                    <span className="text-xs text-muted-foreground font-normal ml-1.5">
                                        {[tripSelectedCity.admin1, tripSelectedCity.country].filter(Boolean).join(', ')}
                                    </span>
                                </span>
                                <button onClick={() => { setTripSelectedCity(null); setTripInput(''); setTimeout(() => tripInputRef.current?.focus(), 100); }} className="text-xs text-sky-600 hover:underline">Cambiar</button>
                            </div>
                        ) : (
                            <>
                                <div className="relative mb-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        ref={tripInputRef}
                                        type="text"
                                        placeholder="Escribe la ciudad del viaje..."
                                        value={tripInput}
                                        onChange={e => setTripInput(e.target.value)}
                                        className="w-full pl-9 pr-4 py-3 rounded-xl border border-input bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                                    />
                                    {loadingSuggestions && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                    )}
                                </div>
                                {tripSuggestions.length > 0 && (
                                    <div className="mb-3 rounded-xl border border-border overflow-hidden bg-background shadow-lg">
                                        {tripSuggestions.map((s, i) => (
                                            <button
                                                key={i}
                                                onClick={() => { setTripSelectedCity(s); setTripSuggestions([]); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0"
                                            >
                                                <MapPin className="h-4 w-4 text-sky-500 flex-shrink-0" />
                                                <div>
                                                    <span className="font-medium text-sm">{s.name}</span>
                                                    {(s.admin1 || s.country) && (
                                                        <span className="text-xs text-muted-foreground ml-1.5">
                                                            {[s.admin1, s.country].filter(Boolean).join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {tripInput.length > 0 && tripSuggestions.length === 0 && !loadingSuggestions && (
                                    <p className="text-center text-xs text-muted-foreground mb-3">No se encontraron resultados</p>
                                )}
                                {tripInput.length === 0 && (
                                    <p className="text-center text-xs text-muted-foreground mb-3">Empieza a escribir para ver sugerencias</p>
                                )}
                            </>
                        )}

                        {/* Date range */}
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-3">¿Cuándo?</p>

                        {/* Quick presets */}
                        <div className="flex gap-2 mb-3 flex-wrap">
                            {([
                                { key: 'today', label: 'Hoy' },
                                { key: 'tomorrow', label: 'Mañana' },
                                { key: 'weekend', label: 'Fin de semana' },
                                { key: 'week', label: '1 semana' },
                            ] as const).map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => setTripPreset(p.key)}
                                    className="px-3 py-1.5 rounded-full text-xs font-medium border-2 border-transparent bg-muted/40 text-muted-foreground hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 transition-all"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Date inputs */}
                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <div>
                                <label className="text-xs text-muted-foreground block mb-1">Desde</label>
                                <input
                                    type="date"
                                    value={tripStartDate}
                                    min={todayStr()}
                                    onChange={e => {
                                        setTripStartDate(e.target.value);
                                        if (e.target.value > tripEndDate) setTripEndDate(e.target.value);
                                    }}
                                    className="w-full px-3 py-2.5 rounded-xl border border-input bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground block mb-1">Hasta</label>
                                <input
                                    type="date"
                                    value={tripEndDate}
                                    min={tripStartDate || todayStr()}
                                    onChange={e => setTripEndDate(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-input bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                                />
                            </div>
                        </div>

                        {tripDates.length > 0 && (
                            <p className="text-xs text-sky-600 dark:text-sky-400 text-center mb-3 font-medium">
                                {tripDates.length} día{tripDates.length > 1 ? 's' : ''} seleccionado{tripDates.length > 1 ? 's' : ''}
                                {tripDates.filter(d => !isWithinForecast(d)).length > 0 && (
                                    <span className="text-muted-foreground font-normal ml-1">
                                        · {tripDates.filter(d => isWithinForecast(d)).length} con previsión del tiempo
                                    </span>
                                )}
                            </p>
                        )}

                        {/* Tasks toggle */}
                        <button
                            onClick={() => setCreateTripTasks(v => !v)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 mb-4 transition-all ${createTripTasks ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30' : 'border-border bg-muted/20'}`}
                        >
                            <div className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${createTripTasks ? 'bg-sky-500' : 'bg-muted-foreground/30'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-all ${createTripTasks ? 'left-5' : 'left-1'}`} />
                            </div>
                            <div className="text-left">
                                <span className="text-sm font-medium block">Añadir a Tareas</span>
                                <span className="text-xs text-muted-foreground">Crea "✈️ Viaje a {tripSelectedCity?.name ?? '...'}" en tu calendario de tareas</span>
                            </div>
                        </button>

                        <Button
                            onClick={confirmTrip}
                            disabled={!tripSelectedCity || tripDates.length === 0}
                            className="w-full bg-sky-600 hover:bg-sky-700 text-white"
                        >
                            <Plane className="h-4 w-4 mr-2" />
                            {!tripSelectedCity
                                ? 'Primero elige la ciudad'
                                : tripDates.length === 0
                                ? 'Elige las fechas'
                                : `Guardar viaje — ${tripDates.length} día${tripDates.length > 1 ? 's' : ''}`}
                        </Button>
                    </div>
                </div>
            )}

            {/* Loading trip overlay */}
            {loadingTrip && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-background rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl">
                        <div className="text-4xl animate-bounce">✈️</div>
                        <p className="font-medium text-sm">Preparando tu viaje...</p>
                        <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
                <Link href="/apps/mi-hogar">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <span>🌤️</span> ¿Qué me pongo?
                    </h1>
                    <p className="text-muted-foreground text-sm">Quioba te dice qué llevar según el tiempo</p>
                </div>
            </div>

            {/* Search + Settings */}
            <Card>
                <CardContent className="pt-4 pb-4 space-y-3">
                    <div className="space-y-1">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                                <Input
                                    placeholder="Escribe tu ciudad..."
                                    value={city}
                                    onChange={e => setCity(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { setCitySuggestions([]); handleSearchCity(); } }}
                                    onBlur={() => setTimeout(() => setCitySuggestions([]), 200)}
                                    className="pl-9"
                                    autoComplete="off"
                                />
                                {loadingCitySugg && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                            </div>
                            <Button onClick={() => { setCitySuggestions([]); handleSearchCity(); }} disabled={loading || !city.trim()} className="bg-sky-600 hover:bg-sky-700 text-white">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                            <Button variant="outline" onClick={handleGeolocate} disabled={loading || loadingGeo} title="Usar mi ubicación">
                                {loadingGeo ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                            </Button>
                            <Button
                                variant={Object.keys(trips).length > 0 ? 'default' : 'outline'}
                                onClick={openTripModal}
                                title="Planificar viaje"
                                className={Object.keys(trips).length > 0 ? 'bg-sky-600 hover:bg-sky-700 text-white' : ''}
                            >
                                <Plane className="h-4 w-4" />
                            </Button>
                            <Button variant={showSettings ? 'default' : 'outline'} onClick={() => setShowSettings(s => !s)} title="Personalizar">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </div>
                        {/* City autocomplete dropdown */}
                        {citySuggestions.length > 0 && (
                            <div className="rounded-xl border border-border overflow-hidden bg-background shadow-lg">
                                {citySuggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onMouseDown={() => {
                                            setCity(s.name);
                                            setCitySuggestions([]);
                                            fetchWeatherByCoords(s.lat, s.lon, s.name);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0"
                                    >
                                        <MapPin className="h-4 w-4 text-sky-500 flex-shrink-0" />
                                        <div>
                                            <span className="font-medium text-sm">{s.name}</span>
                                            {(s.admin1 || s.country) && (
                                                <span className="text-xs text-muted-foreground ml-1.5">
                                                    {[s.admin1, s.country].filter(Boolean).join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {showSettings && (
                        <div className="space-y-4 pt-3 border-t">
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Tu sensación térmica</p>
                                <div className="flex gap-2">
                                    {(['friolero', 'normal', 'caluroso'] as UserProfile[]).map(p => (
                                        <button
                                            key={p}
                                            onClick={() => handleProfileChange(p)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${profile === p ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300' : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/70'}`}
                                        >
                                            {p === 'friolero' ? '🥶' : p === 'caluroso' ? '🥵' : '😊'}
                                            <span className="capitalize">{p}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Actividad del día</p>
                                <div className="flex gap-2 flex-wrap">
                                    {ACTIVITIES.map(a => (
                                        <button
                                            key={a.key}
                                            onClick={() => setActivity(act => act === a.key ? '' : a.key)}
                                            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-full text-sm border-2 transition-all ${activity === a.key ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300' : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/70'}`}
                                        >
                                            {a.emoji} {a.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">¿A qué hora sales de casa?</p>
                                <div className="flex gap-2 items-center">
                                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <input
                                        type="time"
                                        value={departureTime}
                                        onChange={e => setDepartureTime(e.target.value)}
                                        className="bg-muted/40 border border-input rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-sky-400"
                                    />
                                    {departureTime && (
                                        <button onClick={() => setDepartureTime('')} className="text-xs text-muted-foreground hover:text-foreground underline">Quitar</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Favorites bar */}
            {favorites.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {favorites.map(fav => (
                        <div key={fav.name} className="flex items-center gap-1 flex-shrink-0">
                            <button
                                onClick={() => fetchWeatherByCoords(fav.lat, fav.lon, fav.name)}
                                disabled={loading}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 text-sm font-medium border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors"
                            >
                                <Star className="h-3 w-3 fill-current" />
                                {fav.name}
                            </button>
                            <button onClick={() => removeFavorite(fav.name)} className="p-1 text-muted-foreground hover:text-red-500 transition-colors">
                                <Trash2 className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <Card className="text-center py-14 border-dashed">
                    <CardContent className="flex flex-col items-center gap-4">
                        <div className="text-5xl animate-bounce">🌤️</div>
                        <p className="font-medium">Consultando el tiempo...</p>
                        <p className="text-muted-foreground text-sm">Quioba está mirando las nubes para ti</p>
                        <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
                    </CardContent>
                </Card>
            )}

            {/* Empty state */}
            {!loading && !hasResults && (
                <Card className="text-center py-14 bg-gradient-to-b from-sky-50 to-white dark:from-sky-950/20 dark:to-background border-dashed">
                    <CardContent className="flex flex-col items-center gap-4">
                        <div className="text-6xl">🌈</div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-medium">¿A dónde vas hoy?</h3>
                            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                                Escribe tu ciudad o usa tu ubicación y Quioba te dirá qué ponerte, qué llevar y qué no olvidar.
                            </p>
                        </div>
                        <Button variant="outline" onClick={handleGeolocate} disabled={loadingGeo}>
                            <MapPin className="h-4 w-4 mr-2" /> Usar mi ubicación
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {!loading && hasResults && currentRec && currentWeather && nivelConfig && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Location bar */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium text-foreground">{resolvedCity}</span>
                            <span className="text-sm">· 7 días</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={saveFavorite} disabled={isFavorite} title={isFavorite ? 'Ya guardado' : 'Guardar'}>
                                <Star className={`h-4 w-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
                                <RefreshCw className="h-4 w-4 mr-1" /> Regenerar
                            </Button>
                        </div>
                    </div>

                    {/* Weekly summary */}
                    {weeklySummary && (
                        <Card className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20 border-sky-200 dark:border-sky-800">
                            <CardContent className="pt-4 pb-4">
                                <div className="flex gap-3 items-start">
                                    <span className="text-2xl flex-shrink-0">📅</span>
                                    <div>
                                        <p className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wide mb-1">Resumen de la semana</p>
                                        <p className="text-sm italic text-muted-foreground">&ldquo;{weeklySummary}&rdquo;</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Day selector strip */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        {weatherDays.map((day, i) => {
                            const { weekday } = formatDate(day.date);
                            const isSelected = i === selectedDay;
                            const todayDay = isToday(day.date);
                            const trip = trips[day.date];
                            return (
                                <div key={day.date} className="flex-shrink-0 min-w-[72px]">
                                    <button
                                        onClick={() => setSelectedDay(i)}
                                        className={`w-full flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all border-2 ${isSelected ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30' : 'border-transparent bg-muted/40 hover:bg-muted/70'}`}
                                    >
                                        <span className={`text-xs font-medium capitalize ${todayDay ? 'text-sky-600 dark:text-sky-400' : 'text-muted-foreground'}`}>
                                            {todayDay ? 'Hoy' : weekday.slice(0, 3)}
                                        </span>
                                        <span className="text-lg">{day.temperature_max}°</span>
                                        <span className="text-xs text-muted-foreground">{day.temperature_min}°</span>
                                        {trip && (
                                            <span className="text-[10px] text-sky-500 font-semibold flex items-center gap-0.5 mt-0.5 leading-tight">
                                                ✈ {trip.cityName.slice(0, 7)}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Main day card */}
                    <Card className={`overflow-hidden border-2 bg-gradient-to-br ${nivelConfig.bg} ${nivelConfig.border}`}>
                        <CardHeader className="pb-3">
                            {/* Trip indicator */}
                            {currentTrip && (
                                <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 dark:text-sky-400 mb-2 bg-sky-50 dark:bg-sky-950/30 rounded-lg px-3 py-1.5 border border-sky-200 dark:border-sky-800">
                                    <PlaneLanding className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="flex-1">Estarás en {currentTrip.cityName}</span>
                                    <button onClick={() => removeTrip(currentTrip.date)} className="text-red-400 hover:text-red-600 transition-colors" title="Quitar viaje este día">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium capitalize text-muted-foreground">
                                            {isToday(currentWeather.date) ? 'Hoy' : formatDate(currentWeather.date).weekday}
                                            {' · '}{formatDate(currentWeather.date).day} {formatDate(currentWeather.date).month}
                                        </span>
                                        <Badge className={`text-xs ${nivelConfig.badge}`}>{currentRec.resumen_tiempo}</Badge>
                                    </div>
                                    <CardTitle className="text-xl">
                                        {currentWeather.temperature_max}° / {currentWeather.temperature_min}°
                                    </CardTitle>
                                    {(currentWeather.apparent_temperature_max !== currentWeather.temperature_max ||
                                      currentWeather.apparent_temperature_min !== currentWeather.temperature_min) && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Thermometer className="h-3 w-3" />
                                            Sensación: {currentWeather.apparent_temperature_max}° / {currentWeather.apparent_temperature_min}°
                                        </p>
                                    )}
                                </div>
                                <div className="text-right text-sm text-muted-foreground space-y-1 shrink-0">
                                    {currentWeather.precipitation_sum > 0 && (
                                        <div className="flex items-center gap-1 justify-end"><CloudRain className="h-3 w-3" />{currentWeather.precipitation_sum}mm</div>
                                    )}
                                    <div className="flex items-center gap-1 justify-end"><Wind className="h-3 w-3" />{currentWeather.windspeed_max}km/h</div>
                                    {(currentWeather.uv_index_max ?? 0) > 0 && (
                                        <div className="flex items-center gap-1 justify-end"><Sun className="h-3 w-3" />UV {currentWeather.uv_index_max}</div>
                                    )}
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {yesterdayData && isToday(currentWeather.date) && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/50 dark:bg-black/15 rounded-lg px-3 py-2">
                                    <span className="text-base">📊</span>
                                    <span>
                                        Ayer hizo{' '}
                                        {yesterdayData.temperature_max > currentWeather.temperature_max ? (
                                            <span className="text-blue-600 dark:text-blue-400 font-medium">{yesterdayData.temperature_max - currentWeather.temperature_max}° más de máxima</span>
                                        ) : yesterdayData.temperature_max < currentWeather.temperature_max ? (
                                            <span className="text-orange-600 dark:text-orange-400 font-medium">{currentWeather.temperature_max - yesterdayData.temperature_max}° menos de máxima</span>
                                        ) : (
                                            <span className="font-medium">la misma temperatura máxima</span>
                                        )}{' '}({yesterdayData.temperature_max}°)
                                    </span>
                                </div>
                            )}

                            {dayAlerts.length > 0 && (
                                <div className="space-y-1.5">
                                    {dayAlerts.map((alert, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />{alert}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {departureTime && currentRec.hora_salida_consejo && (
                                <div className="flex items-center gap-2 text-xs bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-lg px-3 py-2">
                                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span><strong>A las {departureTime}:</strong> {currentRec.hora_salida_consejo}</span>
                                </div>
                            )}

                            <div className="flex gap-3 bg-white/60 dark:bg-black/20 rounded-xl p-4 border border-white/40 dark:border-white/10">
                                <MessageCircle className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
                                <p className="text-sm leading-relaxed italic">&ldquo;{currentRec.comentario_quioba}&rdquo;</p>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 flex-wrap">
                                    <Thermometer className="h-4 w-4" />
                                    Lo que necesitas
                                    {activeActivity && <Badge variant="secondary" className="text-xs font-normal">{activeActivity.emoji} {activeActivity.label}</Badge>}
                                    {profile !== 'normal' && <Badge variant="secondary" className="text-xs font-normal">{profile === 'friolero' ? '🥶' : '🥵'} {profile}</Badge>}
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {currentRec.items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${item.urgente ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 font-medium' : 'bg-white/60 dark:bg-black/20 border border-white/40 dark:border-white/10'}`}
                                        >
                                            <span className="text-lg">{item.emoji}</span>
                                            <span className="leading-tight">{item.nombre}</span>
                                            {item.urgente && <span className="ml-auto text-red-500 text-xs font-bold">!</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Rest of week */}
                    {recommendations.length > 1 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-muted-foreground px-1">El resto de la semana</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {recommendations.slice(1).map((rec, i) => {
                                    const dayIndex = i + 1;
                                    const weather = weatherDays[dayIndex];
                                    if (!weather) return null;
                                    const { weekday } = formatDate(rec.fecha);
                                    const cfg = NIVEL_CALOR_CONFIG[rec.nivel_calor as keyof typeof NIVEL_CALOR_CONFIG] ?? NIVEL_CALOR_CONFIG.templado;
                                    const miniAlerts = computeAlerts(weather);
                                    const dayTrip = trips[weather.date];
                                    return (
                                        <button
                                            key={rec.fecha}
                                            onClick={() => setSelectedDay(dayIndex)}
                                            className={`text-left p-3 rounded-xl border-2 bg-gradient-to-br ${cfg.bg} ${cfg.border} hover:opacity-80 transition-opacity`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium capitalize flex items-center gap-1.5">
                                                    {weekday}
                                                    {dayTrip && <PlaneLanding className="h-3 w-3 text-sky-500" />}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    {(dayTrip?.weatherDay ?? weather).temperature_max}° / {(dayTrip?.weatherDay ?? weather).temperature_min}°
                                                </span>
                                            </div>
                                            {dayTrip && (
                                                <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mb-1">✈️ {dayTrip.cityName}</p>
                                            )}
                                            {miniAlerts.length > 0 && (
                                                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mb-1">
                                                    <AlertTriangle className="h-3 w-3" />{miniAlerts[0]}
                                                </div>
                                            )}
                                            <p className="text-xs text-muted-foreground line-clamp-1 italic mb-2">
                                                &ldquo;{(dayTrip?.recommendation ?? rec).comentario_quioba}&rdquo;
                                            </p>
                                            <div className="flex gap-1 flex-wrap">
                                                {(dayTrip?.recommendation ?? rec).items.slice(0, 4).map((item, j) => (
                                                    <span key={j} title={item.nombre} className="text-base">{item.emoji}</span>
                                                ))}
                                                {(dayTrip?.recommendation ?? rec).items.length > 4 && (
                                                    <span className="text-xs text-muted-foreground self-center">+{(dayTrip?.recommendation ?? rec).items.length - 4}</span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
