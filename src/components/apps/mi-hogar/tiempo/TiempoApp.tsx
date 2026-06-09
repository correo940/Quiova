'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    MapPin,
    Search,
    ArrowLeft,
    RefreshCw,
    CloudRain,
    Sun,
    Thermometer,
    Wind,
    MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api-utils';

interface WeatherDay {
    date: string;
    temperature_max: number;
    temperature_min: number;
    precipitation_sum: number;
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
    items: ClothingItem[];
    resumen_tiempo: string;
    nivel_calor: 'calor' | 'templado' | 'fresco' | 'frio' | 'mucho_frio';
}

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
    calor: { bg: 'from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20', border: 'border-orange-200 dark:border-orange-800', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
    templado: { bg: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20', border: 'border-green-200 dark:border-green-800', badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    fresco: { bg: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20', border: 'border-blue-200 dark:border-blue-800', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    frio: { bg: 'from-slate-50 to-blue-50 dark:from-slate-950/20 dark:to-blue-950/20', border: 'border-slate-200 dark:border-slate-700', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    mucho_frio: { bg: 'from-indigo-50 to-slate-50 dark:from-indigo-950/20 dark:to-slate-950/20', border: 'border-indigo-200 dark:border-indigo-800', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
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
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
}

export default function TiempoApp() {
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingGeo, setLoadingGeo] = useState(false);
    const [resolvedCity, setResolvedCity] = useState('');
    const [weatherDays, setWeatherDays] = useState<WeatherDay[]>([]);
    const [recommendations, setRecommendations] = useState<DayRecommendation[]>([]);
    const [selectedDay, setSelectedDay] = useState(0);
    const [hasResults, setHasResults] = useState(false);

    const fetchWeatherByCoords = async (lat: number, lon: number, cityName: string) => {
        setLoading(true);
        setHasResults(false);
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,uv_index_max&timezone=auto&forecast_days=7`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Error al obtener el tiempo');
            const json = await res.json();
            const daily = json.daily;

            const days: WeatherDay[] = daily.time.map((date: string, i: number) => ({
                date,
                temperature_max: Math.round(daily.temperature_2m_max[i]),
                temperature_min: Math.round(daily.temperature_2m_min[i]),
                precipitation_sum: daily.precipitation_sum[i] ?? 0,
                windspeed_max: Math.round(daily.windspeed_10m_max[i]),
                weathercode: daily.weathercode[i],
                uv_index_max: daily.uv_index_max?.[i] ?? 0,
            }));

            setWeatherDays(days);
            setResolvedCity(cityName);
            await fetchRecommendations(days, cityName);
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
            lluvia_mm: d.precipitation_sum,
            viento_kmh: d.windspeed_max,
            descripcion: WMO_DESCRIPTIONS[d.weathercode] || 'Variable',
            uv_max: d.uv_index_max,
        }));

        const response = await fetch(getApiUrl('api/mi-hogar/weather-clothing'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weatherData, city: cityName }),
        });

        if (!response.ok) throw new Error('Error al generar recomendaciones');
        const result = await response.json();
        if (result.success && result.data?.dias) {
            setRecommendations(result.data.dias);
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
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=es&format=json`;
            const geoRes = await fetch(geoUrl);
            const geoJson = await geoRes.json();
            if (!geoJson.results?.length) {
                toast.error(`No encontré la ciudad "${trimmed}". Prueba con otra.`);
                setLoading(false);
                return;
            }
            const place = geoJson.results[0];
            await fetchWeatherByCoords(place.latitude, place.longitude, place.name);
        } catch (err: any) {
            toast.error('Error buscando la ciudad');
            setLoading(false);
        }
    };

    const handleGeolocate = () => {
        if (!navigator.geolocation) {
            toast.error('Tu navegador no soporta geolocalización');
            return;
        }
        setLoadingGeo(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude, longitude } = pos.coords;
                    const revUrl = `https://geocoding-api.open-meteo.com/v1/search?name=&count=1&language=es&format=json`;
                    // Use nominatim for reverse geocoding
                    const nomUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=es`;
                    let cityName = 'Tu ubicación';
                    try {
                        const nomRes = await fetch(nomUrl, { headers: { 'User-Agent': 'QuiobaApp/1.0' } });
                        const nomJson = await nomRes.json();
                        cityName = nomJson.address?.city || nomJson.address?.town || nomJson.address?.village || nomJson.address?.county || 'Tu ubicación';
                    } catch {
                        // ignore reverse geocode error, proceed with coords
                    }
                    await fetchWeatherByCoords(latitude, longitude, cityName);
                } catch (err: any) {
                    toast.error('Error al obtener tu ubicación');
                } finally {
                    setLoadingGeo(false);
                }
            },
            () => {
                toast.error('No pudimos acceder a tu ubicación');
                setLoadingGeo(false);
            }
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

    const currentRec = recommendations[selectedDay];
    const currentWeather = weatherDays[selectedDay];
    const nivelConfig = currentRec ? NIVEL_CALOR_CONFIG[currentRec.nivel_calor] ?? NIVEL_CALOR_CONFIG.templado : null;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 p-4">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/apps/mi-hogar">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <span className="text-2xl">🌤️</span>
                        ¿Qué me pongo?
                    </h1>
                    <p className="text-muted-foreground text-sm">Quioba te dice qué llevar según el tiempo</p>
                </div>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Escribe tu ciudad..."
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchCity()}
                                className="pl-9"
                            />
                        </div>
                        <Button
                            onClick={handleSearchCity}
                            disabled={loading || !city.trim()}
                            className="bg-sky-600 hover:bg-sky-700 text-white"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleGeolocate}
                            disabled={loading || loadingGeo}
                            title="Usar mi ubicación"
                        >
                            {loadingGeo ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Loading state */}
            {loading && (
                <Card className="text-center py-14 border-dashed">
                    <CardContent className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="text-5xl animate-bounce">🌤️</div>
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium">Consultando el tiempo...</p>
                            <p className="text-muted-foreground text-sm">Quioba está mirando las nubes para ti</p>
                        </div>
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
                            <MapPin className="h-4 w-4 mr-2" />
                            Usar mi ubicación
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {!loading && hasResults && currentRec && currentWeather && nivelConfig && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Location + refresh */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium text-foreground">{resolvedCity}</span>
                            <span className="text-sm">· 7 días</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Regenerar
                        </Button>
                    </div>

                    {/* Day selector strip */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        {weatherDays.map((day, i) => {
                            const { weekday, day: dayNum, month } = formatDate(day.date);
                            const isSelected = i === selectedDay;
                            const todayDay = isToday(day.date);
                            return (
                                <button
                                    key={day.date}
                                    onClick={() => setSelectedDay(i)}
                                    className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all border-2 min-w-[72px] ${isSelected
                                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30'
                                        : 'border-transparent bg-muted/40 hover:bg-muted/70'
                                        }`}
                                >
                                    <span className={`text-xs font-medium capitalize ${todayDay ? 'text-sky-600 dark:text-sky-400' : 'text-muted-foreground'}`}>
                                        {todayDay ? 'Hoy' : weekday.slice(0, 3)}
                                    </span>
                                    <span className="text-lg">{day.temperature_max}°</span>
                                    <span className="text-xs text-muted-foreground">{day.temperature_min}°</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Main card */}
                    <Card className={`overflow-hidden border-2 bg-gradient-to-br ${nivelConfig.bg} ${nivelConfig.border}`}>
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium capitalize text-muted-foreground">
                                            {isToday(currentWeather.date) ? 'Hoy' : formatDate(currentWeather.date).weekday}
                                            {' · '}
                                            {formatDate(currentWeather.date).day} {formatDate(currentWeather.date).month}
                                        </span>
                                        <Badge className={`text-xs ${nivelConfig.badge}`}>
                                            {currentRec.resumen_tiempo}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-xl">
                                        {currentWeather.temperature_max}° / {currentWeather.temperature_min}°
                                    </CardTitle>
                                </div>
                                <div className="text-right text-sm text-muted-foreground space-y-1 shrink-0">
                                    {currentWeather.precipitation_sum > 0 && (
                                        <div className="flex items-center gap-1 justify-end">
                                            <CloudRain className="h-3 w-3" />
                                            {currentWeather.precipitation_sum}mm
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 justify-end">
                                        <Wind className="h-3 w-3" />
                                        {currentWeather.windspeed_max}km/h
                                    </div>
                                    {currentWeather.uv_index_max !== undefined && currentWeather.uv_index_max > 0 && (
                                        <div className="flex items-center gap-1 justify-end">
                                            <Sun className="h-3 w-3" />
                                            UV {currentWeather.uv_index_max}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* Quioba comment */}
                            <div className="flex gap-3 bg-white/60 dark:bg-black/20 rounded-xl p-4 border border-white/40 dark:border-white/10">
                                <MessageCircle className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
                                <p className="text-sm leading-relaxed italic">
                                    &ldquo;{currentRec.comentario_quioba}&rdquo;
                                </p>
                            </div>

                            {/* Clothing items */}
                            <div>
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Thermometer className="h-4 w-4" />
                                    Lo que necesitas
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {currentRec.items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${item.urgente
                                                ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 font-medium'
                                                : 'bg-white/60 dark:bg-black/20 border border-white/40 dark:border-white/10'
                                                }`}
                                        >
                                            <span className="text-lg">{item.emoji}</span>
                                            <span className="leading-tight">{item.nombre}</span>
                                            {item.urgente && (
                                                <span className="ml-auto text-red-500 text-xs font-bold">!</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Rest of the week - mini cards */}
                    {recommendations.length > 1 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-muted-foreground px-1">El resto de la semana</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {recommendations.slice(1).map((rec, i) => {
                                    const dayIndex = i + 1;
                                    const weather = weatherDays[dayIndex];
                                    if (!weather) return null;
                                    const { weekday } = formatDate(rec.fecha);
                                    const cfg = NIVEL_CALOR_CONFIG[rec.nivel_calor] ?? NIVEL_CALOR_CONFIG.templado;
                                    return (
                                        <button
                                            key={rec.fecha}
                                            onClick={() => setSelectedDay(dayIndex)}
                                            className={`text-left p-3 rounded-xl border-2 bg-gradient-to-br ${cfg.bg} ${cfg.border} hover:opacity-80 transition-opacity`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium capitalize">{weekday}</span>
                                                <span className="text-sm text-muted-foreground">{weather.temperature_max}° / {weather.temperature_min}°</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1 italic">
                                                &ldquo;{rec.comentario_quioba}&rdquo;
                                            </p>
                                            <div className="flex gap-1 mt-2 flex-wrap">
                                                {rec.items.slice(0, 4).map((item, j) => (
                                                    <span key={j} title={item.nombre} className="text-base">{item.emoji}</span>
                                                ))}
                                                {rec.items.length > 4 && (
                                                    <span className="text-xs text-muted-foreground self-center">+{rec.items.length - 4}</span>
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
