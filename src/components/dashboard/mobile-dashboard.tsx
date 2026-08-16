'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    ShoppingCart, CheckSquare, PiggyBank, MessageCircle,
    Car, Pill, FileText, Receipt, ShieldCheck, Utensils,
    Book, Key, Shield, CalendarDays, Newspaper, Brain, Bot,
    GraduationCap, Sparkles, Users, Plane, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import OrganizerWidget from './widgets/organizer-widget';

const ICON_MAP: Record<string, any> = {
    ShoppingCart, CheckSquare, PiggyBank, MessageCircle,
    Car, Pill, FileText, Receipt, ShieldCheck, Utensils,
    Book, Key, Shield, CalendarDays, Newspaper, Brain, Bot, GraduationCap, Sparkles, Users, Plane
};

const APPS = [
    { key: 'shopping', label: 'Compra', iconKey: 'ShoppingCart', color: '#166534', bg: '#f0fdf4', href: '/apps/mi-hogar/shopping' },
    { key: 'tasks', label: 'Tareas', iconKey: 'CheckSquare', color: '#1d4ed8', bg: '#eff6ff', href: '/apps/mi-hogar/tasks' },
    { key: 'savings', label: 'Economía', iconKey: 'PiggyBank', color: '#b45309', bg: '#fffbeb', href: '/apps/mi-hogar/savings' },
    { key: 'expenses', label: 'Gastos', iconKey: 'Receipt', color: '#c2410c', bg: '#fff7ed', href: '/apps/mi-hogar/expenses' },
    { key: 'chat', label: 'Chat', iconKey: 'MessageCircle', color: '#166534', bg: '#f0fdf4', href: '/apps/mi-hogar/chat' },
    { key: 'pharmacy', label: 'Botiquín', iconKey: 'Pill', color: '#059669', bg: '#ecfdf5', href: '/apps/mi-hogar/pharmacy' },
    { key: 'vehicles', label: 'Vehículos', iconKey: 'Car', color: '#4338ca', bg: '#eef2ff', href: '/apps/mi-hogar/garage' },
    { key: 'documents', label: 'Docs', iconKey: 'FileText', color: '#475569', bg: '#f8fafc', href: '/apps/mi-hogar/documents' },
    { key: 'meditation', label: 'Pausa', iconKey: 'Brain', color: '#166534', bg: '#f0fdf4', href: '/apps/mi-hogar/meditation' },
    { key: 'insurance', label: 'Seguros', iconKey: 'Shield', color: '#b45309', bg: '#fffbeb', href: '/apps/mi-hogar/insurance' },
    { key: 'passwords', label: 'Claves', iconKey: 'Key', color: '#475569', bg: '#f8fafc', href: '/apps/mi-hogar/passwords' },
    { key: 'roster', label: 'Turnos', iconKey: 'CalendarDays', color: '#1d4ed8', bg: '#eff6ff', href: '/apps/mi-hogar/roster' },
    { key: 'warranties', label: 'Garantías', iconKey: 'ShieldCheck', color: '#475569', bg: '#f8fafc', href: '/apps/mi-hogar/warranties' },
    { key: 'recipes', label: 'Recetas', iconKey: 'Utensils', color: '#166534', bg: '#f0fdf4', href: '/apps/mi-hogar/recipes' },
    { key: 'mi-viaje', label: 'Viaje', iconKey: 'Plane', color: '#1d4ed8', bg: '#eff6ff', href: '/apps/mi-viaje' },
    { key: 'familia', label: 'Familia', iconKey: 'Users', color: '#1d4ed8', bg: '#eff6ff', href: '/apps/mi-hogar/familia' },
];

const PAGES = (() => {
    const pages: typeof APPS[] = [];
    for (let i = 0; i < APPS.length; i += 4) {
        pages.push(APPS.slice(i, i + 4));
    }
    return pages;
})();

export default function MobileDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<Record<string, number>>({});
    const [nickname, setNickname] = useState('');
    const [loading, setLoading] = useState(true);
    const [showAllApps, setShowAllApps] = useState(false);
    const [selectedDate] = useState<Date>(new Date());
    const [currentPage, setCurrentPage] = useState(0);
    const carouselRef = useRef<HTMLDivElement>(null);

    const [dateInfo, setDateInfo] = useState({ greeting: 'Hola', shortDate: '' });

    useEffect(() => {
        const now = new Date();
        const hrs = now.getHours();
        let greeting = 'Buenas noches';
        if (hrs >= 6 && hrs < 12) greeting = 'Buenos días';
        else if (hrs >= 12 && hrs < 21) greeting = 'Buenas tardes';
        const shortDate = format(now, "EEEE d 'de' MMMM", { locale: es });
        setDateInfo({ greeting, shortDate: shortDate.charAt(0).toUpperCase() + shortDate.slice(1) });
    }, []);

    useEffect(() => {
        if (!user) return;
        const fetchAll = async () => {
            setLoading(true);
            const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single();
            if (profile?.nickname) setNickname(profile.nickname.split(' ')[0]);

            const results: Record<string, number> = {};
            try { const { count } = await supabase.from('shopping_items').select('*', { count: 'exact', head: true }).eq('is_checked', false); results.shopping = count || 0; } catch {}
            try { const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('is_completed', false); results.tasks = count || 0; } catch {}
            try {
                const { data: accounts } = await supabase.from('savings_accounts').select('current_balance');
                const { data: goals } = await supabase.from('savings_goals').select('current_amount, linked_account_id');
                const at = accounts?.reduce((a, c) => a + (c.current_balance || 0), 0) || 0;
                const gt = goals?.filter(g => !g.linked_account_id).reduce((a, c) => a + (c.current_amount || 0), 0) || 0;
                results.savings = at + gt;
            } catch {}
            try {
                const { data: grupos } = await supabase.from('splitsmart_grupos').select('id');
                if (grupos?.length) {
                    const { data: gastos } = await supabase.from('splitsmart_gastos').select('monto').in('grupo_id', grupos.map(g => g.id));
                    results.expenses = gastos?.reduce((s, i) => s + (Number(i.monto) || 0), 0) || 0;
                }
            } catch {}
            try { const { count } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }); results.vehicles = count || 0; } catch {}
            try { const { count } = await supabase.from('medicines').select('*', { count: 'exact', head: true }); results.pharmacy = count || 0; } catch {}
            try { const { count } = await supabase.from('documents').select('*', { count: 'exact', head: true }); results.documents = count || 0; } catch {}

            setStats(results);
            setLoading(false);
        };
        fetchAll();
    }, [user]);

    const getValue = useCallback((key: string): string => {
        const v = stats[key];
        if (key === 'savings' && v) return `${(v / 1000).toFixed(1)}k`;
        if (key === 'expenses' && v) return `${v.toFixed(0)}`;
        if (key === 'meditation') return '';
        if (v && v > 0) return `${v}`;
        return '';
    }, [stats]);

    useEffect(() => {
        const el = carouselRef.current;
        if (!el) return;
        const onScroll = () => {
            const page = Math.round(el.scrollLeft / el.clientWidth);
            setCurrentPage(page);
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    if (!user) return null;

    const AppCard = ({ app }: { app: typeof APPS[0] }) => {
        const Icon = ICON_MAP[app.iconKey];
        const val = getValue(app.key);
        return (
            <Link
                href={app.href}
                className="flex flex-col items-center gap-2 active:scale-95 transition-transform py-1"
            >
                <div className="w-[72px] h-[72px] rounded-3xl flex items-center justify-center relative shadow-sm" style={{ backgroundColor: app.bg }}>
                    <Icon className="w-8 h-8" style={{ color: app.color }} />
                    {val && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[26px] h-[26px] rounded-full bg-[#1a5c2e] text-white text-sm font-bold flex items-center justify-center px-1.5 shadow-sm">
                            {val}
                        </span>
                    )}
                </div>
                <span className="text-base font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight">{app.label}</span>
            </Link>
        );
    };

    return (
        <div className="flex flex-col h-[calc(100dvh-64px)] bg-[#f8faf8] dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-5 pt-5 pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">
                            {dateInfo.greeting}{nickname ? `, ${nickname}` : ''}
                        </h1>
                        <p className="text-base text-slate-500 dark:text-slate-400 mt-1 capitalize">{dateInfo.shortDate}</p>
                    </div>
                    {stats.tasks > 0 && (
                        <Link href="/apps/mi-hogar/tasks" className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-full px-4 py-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-base font-bold text-amber-700 dark:text-amber-400">{stats.tasks} pend.</span>
                        </Link>
                    )}
                </div>
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 overflow-y-auto pb-28">

                {/* Organizador ARRIBA */}
                <div className="px-4 pt-1 pb-2">
                    <OrganizerWidget
                        selectedDate={selectedDate}
                        user={user}
                        className="h-auto"
                    />
                </div>

                {/* Apps: carrusel deslizable */}
                {!showAllApps && (
                    <div className="px-0 pt-2">
                        <div
                            ref={carouselRef}
                            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                        >
                            {PAGES.map((page, pageIdx) => (
                                <div
                                    key={pageIdx}
                                    className="snap-center shrink-0 w-full grid grid-cols-4 gap-2 px-5"
                                >
                                    {page.map(app => (
                                        <AppCard key={app.key} app={app} />
                                    ))}
                                </div>
                            ))}
                        </div>
                        {/* Indicadores de página */}
                        <div className="flex justify-center gap-1.5 pt-2 pb-1">
                            {PAGES.map((_, idx) => (
                                <span
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                        idx === currentPage ? 'w-5 bg-green-600' : 'w-1.5 bg-slate-300 dark:bg-slate-600'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Botón ver más / ver menos */}
                <div className="px-5">
                    <button
                        onClick={() => setShowAllApps(!showAllApps)}
                        className="w-full py-3 text-base font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2 active:bg-slate-100 dark:active:bg-slate-800 rounded-xl transition-colors"
                    >
                        {showAllApps ? 'Ver menos' : `Ver todas las apps (${APPS.length})`}
                        {showAllApps ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                </div>

                {/* Grid completo cuando se pulsa "Ver más" */}
                {showAllApps && (
                    <div className="px-5 pt-1 pb-4">
                        <div className="grid grid-cols-4 gap-3">
                            {APPS.map(app => (
                                <AppCard key={app.key} app={app} />
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
