'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, CheckSquare, PiggyBank, MessageCircle, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import NotificationSettingsDialog from '@/components/dashboard/notifications/notification-settings-dialog';
import { useDailyNotifications } from '@/hooks/useDailyNotifications';

export default function AppsSummaryWidget({ selectedDate }: { selectedDate?: Date }) {
    const [stats, setStats] = useState({
        shoppingCount: 0,
        taskCount: 0,
        totalSavings: 0,
        debateCount: 0
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
                    // Start of day
                    const startOfDay = new Date(selectedDate);
                    startOfDay.setHours(0, 0, 0, 0);
                    // End of day
                    const endOfDay = new Date(selectedDate);
                    endOfDay.setHours(23, 59, 59, 999);

                    taskQuery = taskQuery
                        .gte('due_date', startOfDay.toISOString())
                        .lte('due_date', endOfDay.toISOString());
                } else {
                    taskQuery = taskQuery.eq('is_completed', false);
                }

                const { count: tCount } = await taskQuery;

                // 3. Savings (Total Balance = Accounts + Unlinked Goals)
                const { data: accounts } = await supabase
                    .from('savings_accounts')
                    .select('current_balance')
                    .eq('user_id', user.id);

                const { data: goals } = await supabase
                    .from('savings_goals')
                    .select('current_amount, linked_account_id')
                    .eq('user_id', user.id);

                const accountsTotal = accounts?.reduce((acc, curr) => acc + (curr.current_balance || 0), 0) || 0;

                // Only add goals that are NOT linked to an account to avoid double counting
                const unlinkedGoalsTotal = goals?.filter(g => !g.linked_account_id)
                    .reduce((acc, curr) => acc + (curr.current_amount || 0), 0) || 0;

                const totalSavings = accountsTotal + unlinkedGoalsTotal;

                // 4. Active Debates
                const { count: dCount } = await supabase
                    .from('debates')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'active');

                // 5. Daily Events (Agenda)
                const dailyEvents: any[] = [];

                if (selectedDate) {
                    const startOfDay = new Date(selectedDate);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(selectedDate);
                    endOfDay.setHours(23, 59, 59, 999);
                    const dateStr = startOfDay.toISOString().split('T')[0];

                    // A. Work Shifts
                    const { data: shifts } = await supabase
                        .from('work_shifts')
                        .select('title, start_time, end_time')
                        .eq('user_id', user.id)
                        .gte('start_time', startOfDay.toISOString())
                        .lte('start_time', endOfDay.toISOString());

                    if (shifts) {
                        shifts.forEach(s => dailyEvents.push({
                            type: 'shift',
                            label: s.title,
                            time: `${new Date(s.start_time).getHours()}:${new Date(s.start_time).getMinutes().toString().padStart(2, '0')}`,
                            icon: 'Briefcase',
                            color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300'
                        }));
                    }

                    // B. Garage (ITV & Insurance) using a broad fetch then filter, as dates can be unpredictable in text columns
                    // Note: Ideally these should be date columns in DB.
                    const { data: vehicles } = await supabase
                        .from('vehicles')
                        .select('name, brand, model, next_itv_date, insurance_expiry_date')
                        .eq('user_id', user.id);

                    if (vehicles) {
                        vehicles.forEach(v => {
                            // Assuming YYYY-MM-DD string in DB
                            if (v.next_itv_date && v.next_itv_date.startsWith(dateStr)) {
                                dailyEvents.push({
                                    type: 'itv',
                                    label: `ITV: ${v.brand} ${v.model || v.name}`,
                                    icon: 'AlertTriangle',
                                    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400'
                                });
                            }
                            if (v.insurance_expiry_date && v.insurance_expiry_date.startsWith(dateStr)) {
                                dailyEvents.push({
                                    type: 'car_insurance',
                                    label: `Seguro Coche: ${v.brand} ${v.model || v.name}`,
                                    icon: 'Car',
                                    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'
                                });
                            }
                        });
                    }

                    // C. Insurances
                    const { data: insurances } = await supabase
                        .from('insurances')
                        .select('name, provider, expiration_date')
                        .eq('user_id', user.id)
                        .eq('expiration_date', dateStr);

                    if (insurances) {
                        insurances.forEach(i => dailyEvents.push({
                            type: 'insurance',
                            label: `Vence Seguro: ${i.name}`,
                            sub: i.provider,
                            icon: 'Shield',
                            color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
                        }));
                    }

                    // D. Documents
                    try {
                        const { data: docs } = await supabase
                            .from('documents')
                            .select('name, expiration_date')
                            .eq('user_id', user.id)
                            .eq('expiration_date', dateStr);

                        if (docs) {
                            docs.forEach(d => dailyEvents.push({
                                type: 'document',
                                label: `Caduca: ${d.name}`,
                                icon: 'FileText',
                                color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
                            }));
                        }
                    } catch (e) {
                        // Ignore
                    }
                }

                setEvents(dailyEvents);

                setStats({
                    shoppingCount: sCount || 0,
                    taskCount: tCount || 0,
                    totalSavings,
                    debateCount: dCount || 0
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
        {
            label: 'Lista de Compra',
            value: `${stats.shoppingCount} productos`,
            icon: ShoppingCart,
            color: 'bg-blue-500',
            href: '/apps/mi-hogar/shopping',
            detail: 'Pendientes de comprar'
        },
        {
            label: 'Tareas Pendientes',
            value: `${stats.taskCount} tareas`,
            icon: CheckSquare,
            color: 'bg-purple-500',
            href: '/apps/mi-hogar/tasks',
            detail: selectedDate ? 'Para este día' : 'Por hacer hoy'
        },
        {
            label: 'Mis Ahorros',
            value: stats.totalSavings.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }),
            icon: PiggyBank,
            color: 'bg-amber-500',
            href: '/apps/mi-hogar/savings',
            detail: 'Balance total'
        },
        {
            label: 'Debates Activos',
            value: `${stats.debateCount} debates`,
            icon: MessageCircle,
            color: 'bg-red-500',
            href: '/apps/debate',
            detail: 'En curso ahora'
        }
    ];

    return (
        <Card className="h-full overflow-hidden border-none shadow-md bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        Resumen General
                    </CardTitle>
                    <NotificationSettingsDialog />
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {items.map((item, index) => (
                            <Link key={index} href={item.href} className="block group">
                                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border hover:border-primary/50 transition-all hover:shadow-md h-full flex flex-col justify-between">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={`p-2 rounded-lg ${item.color} text-white shadow-sm group-hover:scale-110 transition-transform`}>
                                            <item.icon className="w-4 h-4" />
                                        </div>
                                        <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg leading-tight mb-1 truncate">{item.value}</div>
                                        <div className="text-xs font-medium text-muted-foreground">{item.label}</div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Agenda del Día */}
                {!loading && events.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Agenda del Día</h3>
                        <div className="space-y-2">
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
                {!loading && selectedDate && events.length === 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                        <span className="text-xs text-muted-foreground">Sin eventos especiales para hoy</span>
                    </div>
                )}
            </CardContent>
        </Card >
    );
}

// Helper for dynamic icons
import { Briefcase, AlertTriangle, Car, Shield, FileText } from 'lucide-react';
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
