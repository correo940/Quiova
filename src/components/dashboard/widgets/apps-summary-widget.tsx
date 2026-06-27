'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ShoppingCart, CheckSquare, PiggyBank, MessageCircle, ArrowRight, Loader2,
    Car, Pill, FileText, Receipt, ShieldCheck, Utensils, Book, Key, Shield, CalendarDays, Newspaper, GripVertical, Brain, Bot, Mic, MicOff,
    ChevronUp, ChevronDown, GraduationCap, Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAi } from '@/context/AiContext';
import NotificationSettingsDialog from '@/components/dashboard/notifications/notification-settings-dialog';
import { useDailyNotifications } from '@/hooks/useDailyNotifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import LogoLoader from '@/components/ui/logo-loader';
import { getSecretarySettings, getAvatarById } from '@/lib/secretary-settings';
import TopbarCalendar from './topbar-calendar';

// Icon map for serialization
const ICON_MAP: Record<string, any> = {
    ShoppingCart, CheckSquare, PiggyBank, MessageCircle,
    Car, Pill, FileText, Receipt, ShieldCheck, Utensils,
    Book, Key, Shield, CalendarDays, Newspaper, Brain, Bot, GraduationCap, Sparkles
};

// Default item order (keys used for persistence)
// Paleta reducida: verde=hogar, amber=economía, blue=organización, slate=documentos
const DEFAULT_ITEMS_CONFIG = [
    { key: 'shopping', label: 'Lista Compra', iconKey: 'ShoppingCart', color: 'bg-green-800', href: '/apps/mi-hogar/shopping' },
    { key: 'tasks', label: 'Tareas', iconKey: 'CheckSquare', color: 'bg-blue-600', href: '/apps/mi-hogar/tasks' },
    { key: 'savings', label: 'Mi Economía', iconKey: 'PiggyBank', color: 'bg-amber-600', href: '/apps/mi-hogar/savings' },
    { key: 'meditation', label: 'Pausa', iconKey: 'Brain', color: 'bg-green-800', href: '/apps/mi-hogar/meditation' },
    { key: 'debates', label: 'Debates', iconKey: 'MessageCircle', color: 'bg-blue-600', href: '/apps/debate' },
    { key: 'vehicles', label: 'Vehículos', iconKey: 'Car', color: 'bg-green-800', href: '/apps/mi-hogar/garage' },
    { key: 'pharmacy', label: 'Botiquín', iconKey: 'Pill', color: 'bg-green-800', href: '/apps/mi-hogar/pharmacy' },
    { key: 'documents', label: 'Documentos', iconKey: 'FileText', color: 'bg-slate-600', href: '/apps/mi-hogar/documents' },
    { key: 'expenses', label: 'Gastos', iconKey: 'Receipt', color: 'bg-amber-600', href: '/apps/mi-hogar/expenses' },
    { key: 'warranties', label: 'Garantías', iconKey: 'ShieldCheck', color: 'bg-slate-600', href: '/apps/mi-hogar/warranties' },
    { key: 'recipes', label: 'Recetas', iconKey: 'Utensils', color: 'bg-green-800', href: '/apps/mi-hogar/recipes' },
    { key: 'manuals', label: 'Mantenimiento', iconKey: 'Book', color: 'bg-green-800', href: '/apps/mi-hogar/manuals' },
    { key: 'passwords', label: 'Claves', iconKey: 'Key', color: 'bg-slate-600', href: '/apps/mi-hogar/passwords' },
    { key: 'insurance', label: 'Seguros', iconKey: 'Shield', color: 'bg-amber-600', href: '/apps/mi-hogar/insurance' },
    { key: 'roster', label: 'Turnos', iconKey: 'CalendarDays', color: 'bg-blue-600', href: '/apps/mi-hogar/roster' },
    { key: 'summary', label: 'Resumen', iconKey: 'Newspaper', color: 'bg-blue-600', href: '/apps/resumen-diario' },
    { key: 'el-campus', label: 'Campus', iconKey: 'GraduationCap', color: 'bg-blue-600', href: '/apps/el-campus' },
    { key: 'workspace', label: 'Quioba Studios', iconKey: 'Sparkles', color: 'bg-emerald-600', href: '/apps/mi-hogar/workspace' },
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

export default function AppsSummaryWidget({ selectedDate, onDateSelect, user }: { selectedDate?: Date; onDateSelect?: (date: Date | undefined) => void; user: User | null }) {
    const { setIsOpen: setAiPanelOpen, isWakeWordEnabled, setIsWakeWordEnabled } = useAi();
    const pathname = usePathname();
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
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [orderedKeys, setOrderedKeys] = useState<string[]>(DEFAULT_ITEMS_CONFIG.map(i => i.key));
    const [showAll, setShowAll] = useState(false);
    const [isAppsMinimized, setIsAppsMinimized] = useState(false);
    const VISIBLE_COUNT = 8; // Show 8 items by default, rest behind "Ver todo"

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('quioba_apps_minimized');
            if (saved === 'true') {
                setIsAppsMinimized(true);
            }
        }
    }, []);

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
                try {
                    const { data: grupos } = await supabase.from('splitsmart_grupos').select('id');
                    if (grupos && grupos.length > 0) {
                        const grupoIds = grupos.map((g: any) => g.id);
                        const { data: gastoRows } = await supabase.from('splitsmart_gastos').select('monto').in('grupo_id', grupoIds);
                        expCount = gastoRows?.reduce((sum: number, item: any) => sum + (Number(item.monto) || 0), 0) || 0;
                    }
                } catch (e) { }

                try { const { count } = await supabase.from('warranties').select('*', { count: 'exact', head: true }).eq('user_id', user.id); wCount = count || 0; } catch (e) { }
                try { const { count } = await supabase.from('recipes').select('*', { count: 'exact', head: true }).eq('user_id', user.id); rCount = count || 0; } catch (e) { }
                try { const { count } = await supabase.from('manuals').select('*', { count: 'exact', head: true }).eq('user_id', user.id); manCount = count || 0; } catch (e) { }
                try { const { count } = await supabase.from('passwords').select('*', { count: 'exact', head: true }).eq('user_id', user.id); passCount = count || 0; } catch (e) { }
                try { const { count } = await supabase.from('knowledge_entities').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('entity_type', 'insurance_policy').eq('status', 'active'); iCount = count || 0; } catch (e) { }
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
            case 'shopping': return stats.shoppingCount > 0 ? `${stats.shoppingCount}` : '—';
            case 'tasks': return stats.taskCount > 0 ? `${stats.taskCount}` : '—';
            case 'savings': return stats.totalSavings > 0 ? `${(stats.totalSavings / 1000).toFixed(1)}k€` : '—';
            case 'meditation': return 'Respira';
            case 'debates': return stats.debateCount > 0 ? `${stats.debateCount}` : '—';
            case 'vehicles': return stats.vehicleCount > 0 ? `${stats.vehicleCount}` : '—';
            case 'pharmacy': return stats.medicineCount > 0 ? `${stats.medicineCount}` : '—';
            case 'documents': return stats.documentCount > 0 ? `${stats.documentCount}` : '—';
            case 'expenses': return stats.expenseFolderCount > 0 ? `${Number(stats.expenseFolderCount).toFixed(0)}€` : '—';
            case 'warranties': return stats.warrantyCount > 0 ? `${stats.warrantyCount}` : '—';
            case 'recipes': return stats.recipeCount > 0 ? `${stats.recipeCount}` : '—';
            case 'manuals': return stats.manualCount > 0 ? `${stats.manualCount}` : '—';
            case 'passwords': return stats.passwordCount > 0 ? `${stats.passwordCount}` : '—';
            case 'insurance': return stats.insuranceCount > 0 ? `${stats.insuranceCount}` : '—';
            case 'roster': return 'Ver';
            case 'el-campus': return 'Campus';
            case 'summary': return 'Hoy';
            case 'workspace': return 'Studios';
            default: return '—';
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
            case 'el-campus': return 1;
            case 'workspace': return 1;
            default: return 0;
        }
    }, [stats]);

    // Build ordered items for rendering
    const orderedItems = orderedKeys.map(key => {
        if (key === 'workspace' && user?.email !== 'todojuntomirar@gmail.com') {
            return null;
        }
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

    const displayedItems = showAll ? sortedItems : sortedItems.slice(0, VISIBLE_COUNT);
    const hiddenCount = sortedItems.length - VISIBLE_COUNT;

    const isCalm = !loading && stats.taskCount === 0;
    const statusColor = isCalm
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400';
    const statusDot = isCalm ? 'bg-emerald-500' : 'bg-amber-500';
    const statusLabel = isCalm ? 'Todo está bajo control' : 'Hoy tienes cosas importantes';
    const statusDesc = isCalm
        ? 'No tienes tareas urgentes ni vencimientos importantes hoy.'
        : `Tienes ${stats.taskCount} tarea${stats.taskCount > 1 ? 's' : ''} pendiente${stats.taskCount > 1 ? 's' : ''} para hoy.`;

    return (
        <Card className="h-full overflow-hidden border-none shadow-md bg-white dark:bg-slate-950 flex flex-col relative">
            <CardHeader className="pb-2 pt-3 shrink-0 relative z-10 px-6 lg:px-8">
                <div className="flex items-center justify-between gap-4">

                    {/* ── Bienvenida ─────────────────────────────────────── */}
                    <div className="flex flex-col gap-1 min-w-0">
                        <h1 className="text-2xl lg:text-3xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
                            {dateInfo.greeting}{userProfile?.profile?.nickname ? `, ${userProfile.profile.nickname.split(' ')[0]}` : ''} 👋
                        </h1>
                        <p className="text-sm font-medium text-slate-400 dark:text-slate-500 capitalize">
                            {dateInfo.fullDate}
                        </p>
                        {!loading && (
                            <span className={`self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
                                {statusLabel}
                            </span>
                        )}
                    </div>

                    {/* ── Calendario (desktop) ────────────────────────────── */}
                    <div className="flex-1 min-w-0 hidden lg:flex justify-center px-4 max-w-2xl">
                        {onDateSelect && (
                            <TopbarCalendar
                                selectedDate={selectedDate}
                                onDateSelect={onDateSelect}
                                user={user}
                            />
                        )}
                    </div>

                    {/* ── Botón Apps + Diario ─────────────────────────────── */}
                    <div className="shrink-0 flex items-center gap-2">
                        <button
                            onClick={() => {
                                const newVal = !isAppsMinimized;
                                setIsAppsMinimized(newVal);
                                localStorage.setItem('quioba_apps_minimized', String(newVal));
                            }}
                            className="w-[52px] h-[22px] flex items-center justify-center gap-1 rounded-full text-[10px] font-semibold transition-all duration-200 bg-gradient-to-br from-green-600 to-green-800 text-white shadow-md shadow-green-900/30 hover:shadow-green-900/50 hover:scale-105"
                            title={isAppsMinimized ? 'Mostrar aplicaciones' : 'Minimizar aplicaciones'}
                        >
                            <span className="hidden sm:inline">Apps</span>
                            {isAppsMinimized ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                        </button>
                        <span className="w-px h-3 bg-border" />
                        <div className="hidden sm:flex flex-col items-center gap-1">
                            <span className="text-[9px] font-semibold uppercase tracking-widest text-amber-700/50 leading-none text-center w-full">Dashboard</span>
                            <div className="relative flex items-center bg-amber-50 border border-amber-200/60 rounded-full p-0.5 gap-0">
                                <div className={`absolute top-0.5 h-[22px] w-[52px] rounded-full bg-amber-200 shadow-sm transition-all duration-200 ease-out ${pathname === '/apps/resumen-diario' ? 'left-[54px]' : 'left-0.5'}`} />
                                <Link
                                    href="/desktop"
                                    className={`relative z-10 w-[52px] h-[22px] flex items-center justify-center rounded-full text-[10px] font-semibold transition-colors duration-150 ${pathname === '/desktop' ? 'text-amber-900' : 'text-amber-400 hover:text-amber-600'}`}
                                >
                                    Classic
                                </Link>
                                <Link
                                    href="/apps/resumen-diario"
                                    className={`relative z-10 w-[52px] h-[22px] flex items-center justify-center rounded-full text-[10px] font-semibold transition-colors duration-150 ${pathname === '/apps/resumen-diario' ? 'text-amber-900' : 'text-amber-400 hover:text-amber-600'}`}
                                >
                                    Modern
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Calendario (mobile) ─────────────────────────────────── */}
                <div className="lg:hidden mt-4">
                    {onDateSelect && (
                        <TopbarCalendar
                            selectedDate={selectedDate}
                            onDateSelect={onDateSelect}
                            user={user}
                        />
                    )}
                </div>
            </CardHeader>
            <div className={`grid transition-all duration-300 ease-in-out ${
                isAppsMinimized ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
            }`}>
                <div className="overflow-hidden">
                    <CardContent className="flex-1 min-h-0 flex flex-col gap-2 pb-2 pt-0">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <LogoLoader size="md" />
                            </div>
                        ) : (
                            <div className="w-full">
                                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 p-1">
                                    {displayedItems.map((item) => (
                                        <div
                                            key={item.key}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, item.key, orderedKeys.indexOf(item.key))}
                                            onDragOver={(e) => handleDragOver(e, item.key)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, item.key)}
                                            onDragEnd={handleDragEnd}
                                            className={`relative transition-all duration-200 ${draggedKey === item.key ? 'opacity-40 scale-95' : ''
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
                                                    if (draggedKey) e.preventDefault();
                                                }}
                                                draggable={false}
                                            >
                                                <div className={`p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 h-[60px] flex flex-col justify-between ${dragOverKey === item.key && draggedKey !== item.key
                                                    ? 'border-primary/70 shadow-sm shadow-primary/10'
                                                    : 'border-slate-100 dark:border-slate-700 hover:border-primary/30'
                                                    } ${item.count === 0 ? 'opacity-50' : ''}`}>
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <div className={`p-1 rounded-lg ${item.color} text-white group-hover:scale-110 transition-transform duration-200`}>
                                                            <item.icon className="w-3 h-3" />
                                                        </div>
                                                        <ArrowRight className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5" />
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
                                {/* Ver todo / Ocultar toggle */}
                                {hiddenCount > 0 && (
                                    <button
                                        onClick={() => setShowAll(!showAll)}
                                        className="w-full mt-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
                                    >
                                        {showAll ? 'Ocultar' : `Ver todo (+${hiddenCount})`}
                                        <ArrowRight className={`w-3 h-3 transition-transform ${showAll ? 'rotate-90' : ''}`} />
                                    </button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </div>
            </div>
        </Card>
    );
}

