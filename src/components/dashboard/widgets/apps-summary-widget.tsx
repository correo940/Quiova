'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ShoppingCart, CheckSquare, PiggyBank, MessageCircle, ArrowRight, Loader2,
    Car, Pill, FileText, Receipt, ShieldCheck, Utensils, Book, Key, Shield, CalendarDays, Newspaper, GripVertical, Brain
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import NotificationSettingsDialog from '@/components/dashboard/notifications/notification-settings-dialog';
import { useDailyNotifications } from '@/hooks/useDailyNotifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import LogoLoader from '@/components/ui/logo-loader';

// Icon map for serialization
const ICON_MAP: Record<string, any> = {
    ShoppingCart, CheckSquare, PiggyBank, MessageCircle,
    Car, Pill, FileText, Receipt, ShieldCheck, Utensils,
    Book, Key, Shield, CalendarDays, Newspaper, Brain
};

// Default item order (keys used for persistence)
const DEFAULT_ITEMS_CONFIG = [
    { key: 'shopping', label: 'Lista Compra', iconKey: 'ShoppingCart', color: 'bg-blue-500', href: '/apps/mi-hogar/shopping' },
    { key: 'tasks', label: 'Tareas', iconKey: 'CheckSquare', color: 'bg-purple-500', href: '/apps/mi-hogar/tasks' },
    { key: 'savings', label: 'Mi Economía', iconKey: 'PiggyBank', color: 'bg-amber-500', href: '/apps/mi-hogar/savings' },
    { key: 'meditation', label: 'Pausa', iconKey: 'Brain', color: 'bg-emerald-500', href: '/apps/mi-hogar/meditation' },
    { key: 'debates', label: 'Debates', iconKey: 'MessageCircle', color: 'bg-red-500', href: '/apps/debate' },
    { key: 'vehicles', label: 'Vehículos', iconKey: 'Car', color: 'bg-slate-500', href: '/apps/mi-hogar/garage' },
    { key: 'pharmacy', label: 'Botiquín', iconKey: 'Pill', color: 'bg-emerald-500', href: '/apps/mi-hogar/pharmacy' },
    { key: 'documents', label: 'Documentos', iconKey: 'FileText', color: 'bg-orange-500', href: '/apps/mi-hogar/documents' },
    { key: 'expenses', label: 'Gastos Compartidos', iconKey: 'Receipt', color: 'bg-pink-500', href: '/apps/mi-hogar/expenses' },
    { key: 'warranties', label: 'Garantías', iconKey: 'ShieldCheck', color: 'bg-indigo-500', href: '/apps/mi-hogar/warranties' },
    { key: 'recipes', label: 'Recetas', iconKey: 'Utensils', color: 'bg-lime-500', href: '/apps/mi-hogar/recipes' },
    { key: 'manuals', label: 'Manual y Mantenimiento', iconKey: 'Book', color: 'bg-cyan-500', href: '/apps/mi-hogar/manuals' },
    { key: 'passwords', label: 'Claves', iconKey: 'Key', color: 'bg-zinc-600', href: '/apps/mi-hogar/passwords' },
    { key: 'insurance', label: 'Seguros', iconKey: 'Shield', color: 'bg-teal-600', href: '/apps/mi-hogar/insurance' },
    { key: 'roster', label: 'Turnos', iconKey: 'CalendarDays', color: 'bg-green-600', href: '/apps/mi-hogar/roster' },
    { key: 'summary', label: 'Resumen', iconKey: 'Newspaper', color: 'bg-violet-500', href: '/apps/resumen-diario' },
];

function getStorageKey(userId: string) {
    return `quioba_widget_order_${userId}`;
}

function loadSavedOrder(userId: string): string[] | null {
    try {
        const saved = localStorage.getItem(getStorageKey(userId));
        if (saved) return JSON.parse(saved);
    } catch { }
    return null;
}

function saveOrder(userId: string, keys: string[]) {
    try {
        localStorage.setItem(getStorageKey(userId), JSON.stringify(keys));
    } catch { }
}

export default function AppsSummaryWidget({ selectedDate, user }: { selectedDate?: Date; user: User | null }) {
    const [stats, setStats] = useState({
        shoppingCount: 0,
        taskCount: 0,
        totalSavings: 0,
        debateCount: 0,
        vehicleCount: 0,
        medicineCount: 0,
        documentCount: 0,
        expenseFolderCount: 0,
        warrantyCount: 0,
        recipeCount: 0,
        manualCount: 0,
        passwordCount: 0,
        insuranceCount: 0
    });
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [orderedKeys, setOrderedKeys] = useState<string[]>(DEFAULT_ITEMS_CONFIG.map(i => i.key));

    // Drag state
    const [draggedKey, setDraggedKey] = useState<string | null>(null);
    const [dragOverKey, setDragOverKey] = useState<string | null>(null);
    const dragStartIndex = useRef<number | null>(null);

    // Initialize daily notifications logic
    useDailyNotifications();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                // ✅ Usar el user recibido como prop — sin llamadas extra a Supabase
                if (!user) {
                    setLoading(false);
                    return;
                }

                // Load saved order
                const savedOrder = loadSavedOrder(user.id);
                if (savedOrder && savedOrder.length > 0) {
                    // Merge: saved order first, then any new keys not in saved order
                    const allKeys = DEFAULT_ITEMS_CONFIG.map(i => i.key);
                    const merged = [
                        ...savedOrder.filter(k => allKeys.includes(k)),
                        ...allKeys.filter(k => !savedOrder.includes(k))
                    ];
                    setOrderedKeys(merged);
                }

                // Fetch Profile for Avatar
                const { data: profile } = await supabase.from('profiles').select('custom_avatar_url, nickname').eq('id', user.id).single();
                setUserProfile({ ...user, profile });

                // 1. Shopping (Global)
                const { count: sCount } = await supabase
                    .from('shopping_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('is_checked', false);

                // 2. Tasks (Filtered by Date if provided, else pending)
                let taskQuery = supabase
                    .from('tasks')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                if (selectedDate) {
                    const startOfDay = new Date(selectedDate);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(selectedDate);
                    endOfDay.setHours(23, 59, 59, 999);
                    taskQuery = taskQuery
                        .gte('due_date', startOfDay.toISOString())
                        .lte('due_date', endOfDay.toISOString());
                } else {
                    taskQuery = taskQuery.eq('is_completed', false);
                }
                const { count: tCount } = await taskQuery;

                // 3. Savings
                const { data: accounts } = await supabase.from('savings_accounts').select('current_balance').eq('user_id', user.id);
                const { data: goals } = await supabase.from('savings_goals').select('current_amount, linked_account_id').eq('user_id', user.id);
                const accountsTotal = accounts?.reduce((acc, curr) => acc + (curr.current_balance || 0), 0) || 0;
                const unlinkedGoalsTotal = goals?.filter(g => !g.linked_account_id).reduce((acc, curr) => acc + (curr.current_amount || 0), 0) || 0;
                const totalSavings = accountsTotal + unlinkedGoalsTotal;

                // 4. Debates
                const { count: dCount } = await supabase.from('debates').select('*', { count: 'exact', head: true }).eq('status', 'active');

                // 5. New Apps Counts (Try/Catch for safety individually)
                let vCount = 0, mCount = 0, docCount = 0, expCount = 0, wCount = 0, rCount = 0, manCount = 0, passCount = 0, iCount = 0;

                try { const { count } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('user_id', user.id); vCount = count || 0; } catch (e) { }
                try { const { count } = await supabase.from('medicines').select('*', { count: 'exact', head: true }).eq('user_id', user.id); mCount = count || 0; } catch (e) { }
                try { const { count } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('user_id', user.id); docCount = count || 0; } catch (e) { }
                try { const { data } = await supabase.from('expenses').select('amount').is('folder_id', null); expCount = data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0; } catch (e) { }
                try { const { count } = await supabase.from('warranties').select('*', { count: 'exact', head: true }).eq('user_id', user.id); wCount = count || 0; } catch (e) { }
                try { const { count } = await supabase.from('recipes').select('*', { count: 'exact', head: true }).eq('user_id', user.id); rCount = count || 0; } catch (e) { }
                try { const { count } = await supabase.from('instruction_manuals').select('*', { count: 'exact', head: true }).eq('user_id', user.id); manCount = count || 0; } catch (e) { }
                try { const { count } = await supabase.from('passwords').select('*', { count: 'exact', head: true }).eq('user_id', user.id); passCount = count || 0; } catch (e) { }
                try { const { count } = await supabase.from('insurances').select('*', { count: 'exact', head: true }).eq('user_id', user.id); iCount = count || 0; } catch (e) { }

                // Agenda Logic
                const dailyEvents: any[] = [];
                if (selectedDate) {
                    const startOfDay = new Date(selectedDate); startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(selectedDate); endOfDay.setHours(23, 59, 59, 999);
                    const dateStr = startOfDay.toISOString().split('T')[0];

                    const { data: shifts } = await supabase.from('work_shifts').select('title, start_time, end_time').eq('user_id', user.id).gte('start_time', startOfDay.toISOString()).lte('start_time', endOfDay.toISOString());
                    shifts?.forEach(s => dailyEvents.push({ type: 'shift', label: s.title, time: `${new Date(s.start_time).getHours()}:${new Date(s.start_time).getMinutes().toString().padStart(2, '0')}`, icon: 'Briefcase', color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300' }));

                    const { data: vehicles } = await supabase.from('vehicles').select('name, brand, model, next_itv_date, insurance_expiry_date').eq('user_id', user.id);
                    vehicles?.forEach(v => {
                        if (v.next_itv_date?.startsWith(dateStr)) dailyEvents.push({ type: 'itv', label: `ITV: ${v.brand}`, icon: 'AlertTriangle', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' });
                        if (v.insurance_expiry_date?.startsWith(dateStr)) dailyEvents.push({ type: 'car_insurance', label: `Seguro: ${v.brand}`, icon: 'Car', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' });
                    });

                    const { data: insurances } = await supabase.from('insurances').select('name, provider, expiration_date').eq('user_id', user.id).eq('expiration_date', dateStr);
                    insurances?.forEach(i => dailyEvents.push({ type: 'insurance', label: `Vence: ${i.name}`, icon: 'Shield', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' }));

                    const { data: docs } = await supabase.from('documents').select('name, expiration_date').eq('user_id', user.id).eq('expiration_date', dateStr);
                    docs?.forEach(d => dailyEvents.push({ type: 'document', label: `Caduca: ${d.name}`, icon: 'FileText', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' }));
                }
                setEvents(dailyEvents);

                setStats({
                    shoppingCount: sCount || 0,
                    taskCount: tCount || 0,
                    totalSavings,
                    debateCount: dCount || 0,
                    vehicleCount: vCount,
                    medicineCount: mCount,
                    documentCount: docCount,
                    expenseFolderCount: expCount,
                    warrantyCount: wCount,
                    recipeCount: rCount,
                    manualCount: manCount,
                    passwordCount: passCount,
                    insuranceCount: iCount
                });
            } catch (error) {
                console.error("Error fetching stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [selectedDate, user]); // ✅ re-ejecutar cuando user cambia de null → User

    // Build display value for each key
    const getItemValue = useCallback((key: string): string => {
        switch (key) {
            case 'shopping': return `${stats.shoppingCount}`;
            case 'tasks': return `${stats.taskCount}`;
            case 'savings': return `${(stats.totalSavings / 1000).toFixed(1)}k€`;
            case 'meditation': return 'Respira';
            case 'debates': return `${stats.debateCount}`;
            case 'vehicles': return `${stats.vehicleCount}`;
            case 'pharmacy': return `${stats.medicineCount}`;
            case 'documents': return `${stats.documentCount}`;
            case 'expenses': return `${Number(stats.expenseFolderCount).toFixed(0)}€`;
            case 'warranties': return `${stats.warrantyCount}`;
            case 'recipes': return `${stats.recipeCount}`;
            case 'manuals': return `${stats.manualCount}`;
            case 'passwords': return `${stats.passwordCount}`;
            case 'insurance': return `${stats.insuranceCount}`;
            case 'roster': return 'Ver';
            case 'summary': return 'Hoy';
            default: return '0';
        }
    }, [stats]);

    const getItemCount = useCallback((key: string): number => {
        switch (key) {
            case 'shopping': return stats.shoppingCount;
            case 'tasks': return stats.taskCount;
            case 'savings': return stats.totalSavings > 0 ? 1 : 0;
            case 'meditation': return 1;
            case 'debates': return stats.debateCount;
            case 'vehicles': return stats.vehicleCount;
            case 'pharmacy': return stats.medicineCount;
            case 'documents': return stats.documentCount;
            case 'expenses': return stats.expenseFolderCount;
            case 'warranties': return stats.warrantyCount;
            case 'recipes': return stats.recipeCount;
            case 'manuals': return stats.manualCount;
            case 'passwords': return stats.passwordCount;
            case 'insurance': return stats.insuranceCount;
            default: return 0;
        }
    }, [stats]);

    // Build ordered items for rendering
    const orderedItems = orderedKeys.map(key => {
        const config = DEFAULT_ITEMS_CONFIG.find(c => c.key === key);
        if (!config) return null;
        return {
            ...config,
            value: getItemValue(key),
            count: getItemCount(key),
            icon: ICON_MAP[config.iconKey],
        };
    }).filter(Boolean) as (typeof DEFAULT_ITEMS_CONFIG[0] & { value: string; count: number; icon: any })[];

    // Sort: active items first (same logic as before), but respect user drag order
    const sortedItems = [...orderedItems].sort((a, b) => {
        const aActive = a.count > 0;
        const bActive = b.count > 0;
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        return 0;
    });

    // Drag handlers (HTML5 Drag & Drop)
    const handleDragStart = (e: React.DragEvent, key: string, index: number) => {
        setDraggedKey(key);
        dragStartIndex.current = index;
        e.dataTransfer.effectAllowed = 'move';
        // For Firefox compatibility
        e.dataTransfer.setData('text/plain', key);
    };

    const handleDragOver = (e: React.DragEvent, key: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (key !== draggedKey) {
            setDragOverKey(key);
        }
    };

    const handleDragLeave = () => {
        setDragOverKey(null);
    };

    const handleDrop = (e: React.DragEvent, targetKey: string) => {
        e.preventDefault();
        if (!draggedKey || draggedKey === targetKey) {
            setDraggedKey(null);
            setDragOverKey(null);
            return;
        }

        const newOrder = [...orderedKeys];
        const fromIndex = newOrder.indexOf(draggedKey);
        const toIndex = newOrder.indexOf(targetKey);

        if (fromIndex === -1 || toIndex === -1) return;

        // Remove from old position and insert at new
        newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, draggedKey);

        setOrderedKeys(newOrder);
        if (user) saveOrder(user.id, newOrder);

        setDraggedKey(null);
        setDragOverKey(null);
    };

    const handleDragEnd = () => {
        setDraggedKey(null);
        setDragOverKey(null);
    };

    // Date & Greeting Logic
    const [dateInfo, setDateInfo] = useState({ greeting: 'Hola', fullDate: '', time: '' });
    useEffect(() => {
        const updateDate = () => {
            const now = new Date();
            const hrs = now.getHours();
            let greeting = 'Buenas noches';
            if (hrs >= 6 && hrs < 12) greeting = 'Buenos días';
            else if (hrs >= 12 && hrs < 21) greeting = 'Buenas tardes';

            const formatter = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            let fullDate = formatter.format(now);
            fullDate = fullDate.charAt(0).toUpperCase() + fullDate.slice(1);

            const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            setDateInfo({ greeting, fullDate, time });
        };

        updateDate();
        const interval = setInterval(updateDate, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Card className="h-full overflow-hidden border-none shadow-md bg-white dark:bg-slate-950 flex flex-col relative group/card">
            {/* Background Texture: Subtle Dot Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)]"></div>

            <CardHeader className="pb-2 pt-3 shrink-0 relative z-10 px-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CardTitle className="text-xl font-bold flex items-center gap-3 text-slate-800 dark:text-slate-100 font-headline tracking-tight">
                            <Link href="/profile">
                                <Avatar className="w-8 h-8 cursor-pointer hover:opacity-80 transition-opacity ring-2 ring-primary/20">
                                    <AvatarImage src={userProfile?.profile?.custom_avatar_url || userProfile?.user_metadata?.avatar_url} className="object-cover" />
                                    <AvatarFallback>{userProfile?.profile?.nickname?.[0] || 'U'}</AvatarFallback>
                                </Avatar>
                            </Link>
                            {dateInfo.greeting}
                        </CardTitle>
                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 hidden sm:block">
                            {dateInfo.fullDate} • {dateInfo.time}
                        </span>
                    </div>
                    <NotificationSettingsDialog />
                </div>
                {/* Mobile Date fallback */}
                <div className="sm:hidden text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    {dateInfo.fullDate} • {dateInfo.time}
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col gap-2">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <LogoLoader size="md" />
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                        <div className="flex w-max space-x-3 p-1">
                            {sortedItems.map((item) => (
                                <div
                                    key={item.key}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, item.key, orderedKeys.indexOf(item.key))}
                                    onDragOver={(e) => handleDragOver(e, item.key)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, item.key)}
                                    onDragEnd={handleDragEnd}
                                    className={`relative w-[130px] py-1 pl-1 transition-all duration-200 ${draggedKey === item.key ? 'opacity-40 scale-95' : ''
                                        } ${dragOverKey === item.key ? 'scale-105' : ''
                                        }`}
                                    style={{ cursor: 'grab' }}
                                >
                                    {/* Drop indicator */}
                                    {dragOverKey === item.key && draggedKey !== item.key && (
                                        <div className="absolute left-0 top-1 bottom-1 w-1 bg-primary rounded-full z-10 animate-pulse" />
                                    )}
                                    <Link
                                        href={item.href}
                                        className="block group"
                                        onClick={(e) => {
                                            // Prevent navigation when dragging
                                            if (draggedKey) e.preventDefault();
                                        }}
                                        draggable={false}
                                    >
                                        <div className={`p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-[72px] flex flex-col justify-between backdrop-blur-sm ${dragOverKey === item.key && draggedKey !== item.key
                                            ? 'border-primary/70 shadow-lg shadow-primary/10'
                                            : 'border-slate-100 dark:border-slate-700 hover:border-primary/50'
                                            }`}>
                                            <div className="flex justify-between items-start mb-0.5">
                                                <div className={`p-1 rounded-lg ${item.color} text-white shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                                                    <item.icon className="w-3 h-3" />
                                                </div>
                                                <div className="flex items-center gap-0.5">
                                                    <GripVertical className="w-2.5 h-2.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                                    <ArrowRight className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm leading-tight mb-0 truncate text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">{item.value}</div>
                                                <div className="text-[9px] font-medium text-muted-foreground truncate">{item.label}</div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Agenda del Día */}
                {!loading && events.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex-1 min-h-0 overflow-y-auto">
                        <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider sticky top-0 bg-inherit z-10">Agenda del Día</h3>
                        <div className="space-y-2 pr-2">
                            {events.map((event, i) => (
                                <div key={i} className={`flex items-center p-2 rounded-lg ${event.color} border border-transparent`}>
                                    <EventIcon iconName={event.icon} className="w-4 h-4 mr-3 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{event.label}</div>
                                        {event.time && <div className="text-xs opacity-80">{event.time}</div>}
                                        {event.sub && <div className="text-xs opacity-80">{event.sub}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Helper for dynamic icons
import { Briefcase, AlertTriangle } from 'lucide-react';
function EventIcon({ iconName, className }: { iconName: string, className?: string }) {
    switch (iconName) {
        case 'Briefcase': return <Briefcase className={className} />;
        case 'AlertTriangle': return <AlertTriangle className={className} />;
        case 'Car': return <Car className={className} />;
        case 'Shield': return <Shield className={className} />;
        case 'FileText': return <FileText className={className} />;
        default: return <CheckSquare className={className} />;
    }
}
