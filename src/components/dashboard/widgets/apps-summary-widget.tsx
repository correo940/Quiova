'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ShoppingCart, CheckSquare, PiggyBank, MessageCircle, ArrowRight, Loader2,
    Car, Pill, FileText, Receipt, ShieldCheck, Utensils, Book, Key, Shield, CalendarDays, Newspaper
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import NotificationSettingsDialog from '@/components/dashboard/notifications/notification-settings-dialog';
import { useDailyNotifications } from '@/hooks/useDailyNotifications';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function AppsSummaryWidget({ selectedDate }: { selectedDate?: Date }) {
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

    // Initialize daily notifications logic
    useDailyNotifications();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

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
                try { const { count } = await supabase.from('instruction_manuals').select('*', { count: 'exact', head: true }).eq('user_id', user.id); manCount = count || 0; } catch (e) { } // Assuming table name
                try { const { count } = await supabase.from('passwords').select('*', { count: 'exact', head: true }).eq('user_id', user.id); passCount = count || 0; } catch (e) { }
                try { const { count } = await supabase.from('insurances').select('*', { count: 'exact', head: true }).eq('user_id', user.id); iCount = count || 0; } catch (e) { }

                // Agenda Logic (Existing) - Simplified for brevity in this rewrite plan, identical logic
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
    }, [selectedDate]);

    const items = [
        { label: 'Lista Compra', value: `${stats.shoppingCount}`, count: stats.shoppingCount, icon: ShoppingCart, color: 'bg-blue-500', href: '/apps/mi-hogar/shopping', detail: 'Artículos' },
        { label: 'Tareas', value: `${stats.taskCount}`, count: stats.taskCount, icon: CheckSquare, color: 'bg-purple-500', href: '/apps/mi-hogar/tasks', detail: 'Pendientes' },
        { label: 'Ahorros', value: `${(stats.totalSavings / 1000).toFixed(1)}k€`, count: stats.totalSavings > 0 ? 1 : 0, icon: PiggyBank, color: 'bg-amber-500', href: '/apps/mi-hogar/savings', detail: 'Total' },
        { label: 'Debates', value: `${stats.debateCount}`, count: stats.debateCount, icon: MessageCircle, color: 'bg-red-500', href: '/apps/debate', detail: 'Activos' },
        { label: 'Vehículos', value: `${stats.vehicleCount}`, count: stats.vehicleCount, icon: Car, color: 'bg-slate-500', href: '/apps/mi-hogar/garage', detail: 'En garaje' },
        { label: 'Botiquín', value: `${stats.medicineCount}`, count: stats.medicineCount, icon: Pill, color: 'bg-emerald-500', href: '/apps/mi-hogar/pharmacy', detail: 'Medicinas' },
        { label: 'Documentos', value: `${stats.documentCount}`, count: stats.documentCount, icon: FileText, color: 'bg-orange-500', href: '/apps/mi-hogar/documents', detail: 'Archivados' },
        { label: 'Gastos', value: `${Number(stats.expenseFolderCount).toFixed(0)}€`, count: stats.expenseFolderCount, icon: Receipt, color: 'bg-pink-500', href: '/apps/mi-hogar/expenses', detail: 'Total' },
        { label: 'Garantías', value: `${stats.warrantyCount}`, count: stats.warrantyCount, icon: ShieldCheck, color: 'bg-indigo-500', href: '/apps/mi-hogar/warranties', detail: 'Activas' },
        { label: 'Recetas', value: `${stats.recipeCount}`, count: stats.recipeCount, icon: Utensils, color: 'bg-lime-500', href: '/apps/mi-hogar/recipes', detail: 'Guardadas' },
        { label: 'Manuales', value: `${stats.manualCount}`, count: stats.manualCount, icon: Book, color: 'bg-cyan-500', href: '/apps/mi-hogar/manuals', detail: 'Instrucc.' },
        { label: 'Claves', value: `${stats.passwordCount}`, count: stats.passwordCount, icon: Key, color: 'bg-zinc-600', href: '/apps/mi-hogar/passwords', detail: 'Seguras' },
        { label: 'Seguros', value: `${stats.insuranceCount}`, count: stats.insuranceCount, icon: Shield, color: 'bg-teal-600', href: '/apps/mi-hogar/insurance', detail: 'Pólizas' },
        { label: 'Turnos', value: 'Ver', count: 0, icon: CalendarDays, color: 'bg-green-600', href: '/apps/mi-hogar/roster', detail: 'Cuadrante' },
        { label: 'Resumen', value: 'Hoy', count: 0, icon: Newspaper, color: 'bg-violet-500', href: '/apps/resumen-diario', detail: 'Diario' },
    ].sort((a, b) => {
        // Sort by active (count > 0) first
        const aActive = a.count > 0;
        const bActive = b.count > 0;
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        // Then by count descending (optional, but good)
        // return b.count - a.count; 
        // Or keep default order for active vs active? The prompt implies "those that have something [left]"
        return 0; // Keep original order within groups (or change to b.count - a.count to prefer higher numbers)
    });

    // Date & Greeting Logic
    const [dateInfo, setDateInfo] = useState({ greeting: 'Hola', fullDate: '' });
    useEffect(() => {
        const now = new Date();
        const hrs = now.getHours();
        let greeting = 'Buenas noches';
        if (hrs >= 6 && hrs < 12) greeting = 'Buenos días';
        else if (hrs >= 12 && hrs < 21) greeting = 'Buenas tardes';

        const formatter = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        // Capitalize first letter
        let fullDate = formatter.format(now);
        fullDate = fullDate.charAt(0).toUpperCase() + fullDate.slice(1);

        setDateInfo({ greeting, fullDate });
    }, []);

    return (
        <Card className="h-full overflow-hidden border-none shadow-md bg-white dark:bg-slate-950 flex flex-col relative group/card">
            {/* Background Texture: Subtle Dot Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)]"></div>

            <CardHeader className="pb-2 pt-3 shrink-0 relative z-10 px-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100 font-headline tracking-tight">
                            {dateInfo.greeting}
                            <span className="text-xl animate-pulse">👋</span>
                        </CardTitle>
                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 hidden sm:block">
                            {dateInfo.fullDate}
                        </span>
                    </div>
                    <NotificationSettingsDialog />
                </div>
                {/* Mobile Date fallback if needed, or just hide on mobile to save space */}
                <div className="sm:hidden text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    {dateInfo.fullDate}
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col gap-2">
                {loading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <ScrollArea className="w-full whitespace-nowrap pb-2">
                        <div className="flex w-max space-x-3 p-1">
                            {items.map((item, index) => (
                                <Link key={index} href={item.href} className="block group w-[130px] py-1 pl-1">
                                    <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-[72px] flex flex-col justify-between backdrop-blur-sm">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <div className={`p-1 rounded-lg ${item.color} text-white shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                                                <item.icon className="w-3 h-3" />
                                            </div>
                                            <ArrowRight className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm leading-tight mb-0 truncate text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">{item.value}</div>
                                            <div className="text-[9px] font-medium text-muted-foreground truncate">{item.label}</div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
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
                {/* {!loading && selectedDate && events.length === 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                        <span className="text-[10px] text-muted-foreground">Sin eventos hoy</span>
                    </div>
                )} */}
            </CardContent>
        </Card >
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
