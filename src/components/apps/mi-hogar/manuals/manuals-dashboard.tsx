'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { FileText, Star, Bell, AlertCircle, Calendar, TrendingUp, Droplet, ChefHat, Tv, Bed, Car, FolderOpen, Home } from 'lucide-react';
import { formatDistanceToNow, isBefore, addDays, addMonths } from 'date-fns';

const ICON_MAP: Record<string, any> = {
    'Droplet': Droplet,
    'ChefHat': ChefHat,
    'Tv': Tv,
    'Bed': Bed,
    'Car': Car,
    'FolderOpen': FolderOpen,
    'Home': Home,
    'bathroom': Droplet,
    'kitchen': ChefHat,
    'living': Tv,
    'bedroom': Bed,
    'garage': Car,
    'office': FolderOpen,
    'other': Home
};
import { es } from 'date-fns/locale';

interface Stats {
    totalManuals: number;
    favoritesCount: number;
    upcomingReminders: number;
    expiringWarranties: number;
    manualsByRoom: { name: string; count: number; icon?: string }[];
    recentReminders: { title: string; manual_title: string; next_date: string }[];
}

export function ManualsDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stats>({
        totalManuals: 0,
        favoritesCount: 0,
        upcomingReminders: 0,
        expiringWarranties: 0,
        manualsByRoom: [],
        recentReminders: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchStats();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            setLoading(true);

            // Fetch manuals
            const { data: manuals, error: manualsError } = await supabase
                .from('manuals')
                .select(`
                    *,
                    room:rooms(name, icon)
                `);

            if (manualsError) throw manualsError;

            // Fetch rooms
            const { data: rooms } = await supabase
                .from('rooms')
                .select('*');

            // Fetch upcoming reminders (next 30 days)
            const next30Days = addDays(new Date(), 30).toISOString().split('T')[0];
            const { data: reminders } = await supabase
                .from('manual_reminders')
                .select(`
                    *,
                    manual:manuals(title)
                `)
                .eq('is_active', true)
                .lte('next_date', next30Days)
                .order('next_date')
                .limit(5);

            // Calculate stats
            const totalManuals = manuals?.length || 0;
            const favoritesCount = manuals?.filter(m => m.is_favorite).length || 0;
            const upcomingReminders = reminders?.length || 0;

            // Warranties expiring in next 60 days
            const next60Days = addDays(new Date(), 60).toISOString().split('T')[0];
            const expiringWarranties = manuals?.filter(m =>
                m.warranty_expires && m.warranty_expires <= next60Days
            ).length || 0;

            // Group by room
            const roomCounts = new Map<string, { name: string; count: number; icon?: string }>();
            manuals?.forEach(manual => {
                const roomName = manual.room?.name || 'Sin asignar';
                const roomIcon = manual.room?.icon;
                const current = roomCounts.get(roomName) || { name: roomName, count: 0, icon: roomIcon };
                current.count++;
                roomCounts.set(roomName, current);
            });

            setStats({
                totalManuals,
                favoritesCount,
                upcomingReminders,
                expiringWarranties,
                manualsByRoom: Array.from(roomCounts.values()).sort((a, b) => b.count - a.count).slice(0, 6),
                recentReminders: reminders?.map(r => ({
                    title: r.title,
                    manual_title: r.manual?.title || '',
                    next_date: r.next_date
                })) || []
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="pb-2">
                            <div className="h-4 bg-muted rounded w-1/2"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 bg-muted rounded w-1/3"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4 mb-6">
            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Manuals */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Total Manuales
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalManuals}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Documentados
                        </p>
                    </CardContent>
                </Card>

                {/* Favorites */}
                <Card className="border-l-4 border-l-emerald-500 hover:shadow-md hover:shadow-emerald-100 transition-all">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Star className="h-4 w-4 text-emerald-600" />
                            Favoritos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">{stats.favoritesCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Marcados como importantes
                        </p>
                    </CardContent>
                </Card>

                {/* Upcoming Reminders */}
                <Card className={`border-l-4 transition-all ${stats.upcomingReminders > 0 ? 'border-l-emerald-500 bg-emerald-50/50 hover:shadow-md hover:shadow-emerald-100' : 'border-l-slate-200'}`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            Próximos Recordatorios
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{stats.upcomingReminders}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            En los próximos 30 días
                        </p>
                    </CardContent>
                </Card>

                {/* Expiring Warranties */}
                <Card className={stats.expiringWarranties > 0 ? 'border-orange-200 bg-orange-50/50' : ''}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Garantías por Vencer
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-600">{stats.expiringWarranties}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            En los próximos 60 días
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Manuals by Room */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Distribución por Habitaciones
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.manualsByRoom.length > 0 ? (
                            <div className="space-y-3">
                                {stats.manualsByRoom.map(room => (
                                    <div key={room.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {ICON_MAP[room.icon || ''] ? (
                                                (() => {
                                                    const Icon = ICON_MAP[room.icon || ''];
                                                    return <Icon className="h-5 w-5 text-muted-foreground" />;
                                                })()
                                            ) : (
                                                <span className="text-lg">{room.icon || '📦'}</span>
                                            )}
                                            <span className="text-sm font-medium">{room.name}</span>
                                        </div>
                                        <Badge variant="secondary">{room.count}</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No hay manuales organizados por habitaciones
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Upcoming Reminders Detail */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Próximas Tareas de Mantenimiento
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.recentReminders.length > 0 ? (
                            <div className="space-y-3">
                                {stats.recentReminders.map((reminder, index) => (
                                    <div key={index} className="flex items-start justify-between border-l-2 border-blue-500 pl-3 py-1">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{reminder.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{reminder.manual_title}</p>
                                        </div>
                                        <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                                            {formatDistanceToNow(new Date(reminder.next_date), { addSuffix: true, locale: es })}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No hay recordatorios próximos
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
