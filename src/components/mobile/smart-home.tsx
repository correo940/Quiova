'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, CheckSquare, ShoppingBag, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAi } from '@/context/AiContext';

interface SmartHomeProps {
    user: { id: string; email?: string };
}

function getGreeting(): string {
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return 'Buenos días';
    if (h >= 12 && h < 20) return 'Buenas tardes';
    return 'Buenas noches';
}

function getFormattedDate(): string {
    const now = new Date();
    const dayName = now.toLocaleDateString('es-ES', { weekday: 'long' });
    const day = now.getDate();
    const month = now.toLocaleDateString('es-ES', { month: 'long' });
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${day} de ${month}`;
}

export default function SmartHome({ user }: SmartHomeProps) {
    const { setIsOpen: openAi } = useAi();
    const [mounted, setMounted] = useState(false);
    const [profile, setProfile] = useState<{ nickname?: string } | null>(null);
    const [taskCount, setTaskCount] = useState<number | null>(null);
    const [shoppingCount, setShoppingCount] = useState<number | null>(null);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!mounted) return;
        supabase
            .from('profiles')
            .select('nickname')
            .eq('id', user.id)
            .single()
            .then(({ data }) => { if (data) setProfile(data); });
    }, [mounted, user.id]);

    useEffect(() => {
        if (!mounted) return;
        supabase
            .from('personal_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('completed', false)
            .then(({ count }) => { setTaskCount(count ?? 0); });
    }, [mounted, user.id]);

    useEffect(() => {
        if (!mounted) return;
        supabase
            .from('shopping_items')
            .select('*', { count: 'exact', head: true })
            .eq('is_checked', false)
            .then(({ count }) => { setShoppingCount(count ?? 0); });
    }, [mounted]);

    const displayName = profile?.nickname || user?.email?.split('@')[0] || 'tú';

    if (!mounted) return null;

    const taskText = taskCount === null
        ? 'Cargando...'
        : taskCount === 0
        ? 'Todo al día ✓'
        : `${taskCount} para completar`;

    const shoppingText = shoppingCount === null
        ? 'Cargando...'
        : shoppingCount === 0
        ? 'Lista vacía'
        : `${shoppingCount} producto${shoppingCount !== 1 ? 's' : ''} pendiente${shoppingCount !== 1 ? 's' : ''}`;

    return (
        <main className="min-h-screen bg-[#F8FAFC] overflow-y-auto pb-32">

            {/* Fecha */}
            <header className="px-5 pt-14 pb-2">
                <p className="text-[10px] font-medium text-slate-400 tracking-widest uppercase">
                    {getFormattedDate()}
                </p>
            </header>

            {/* Saludo */}
            <section className="px-5 pt-2 pb-9">
                <p className="text-sm font-normal text-green-700">{getGreeting()},</p>
                <h1 className="text-[36px] font-extrabold text-slate-900 leading-tight capitalize">
                    {displayName}
                </h1>
            </section>

            {/* Botón principal */}
            <section className="px-5 pb-8">
                <button
                    onClick={() => openAi(true)}
                    className="w-full flex items-center justify-center gap-3 bg-green-800 active:bg-green-900 active:scale-[0.98] transition-all rounded-[24px] h-[72px] font-semibold text-white text-base shadow-lg shadow-green-900/20"
                >
                    <Sparkles className="w-[18px] h-[18px] flex-shrink-0" />
                    Hablar con QUIOBA
                </button>
            </section>

            {/* Hoy tienes */}
            <section className="px-5">
                <p className="text-[13px] font-medium text-slate-500 mb-2.5">Hoy tienes</p>

                <div className="bg-white rounded-[24px] shadow-sm overflow-hidden">

                    <Link
                        href="/apps/mi-hogar/tasks"
                        className="flex items-center gap-4 px-4 h-[68px] active:bg-slate-50 transition-colors"
                    >
                        <div className="w-11 h-11 flex-shrink-0 rounded-[14px] bg-green-100 flex items-center justify-center">
                            <CheckSquare className="w-5 h-5 text-green-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-slate-800">Tareas pendientes</p>
                            <p className="text-[13px] text-slate-400">{taskText}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    </Link>

                    <div className="mx-4 h-px bg-slate-100" />

                    <Link
                        href="/apps/mi-hogar/shopping"
                        className="flex items-center gap-4 px-4 h-[68px] active:bg-slate-50 transition-colors"
                    >
                        <div className="w-11 h-11 flex-shrink-0 rounded-[14px] bg-orange-100 flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-slate-800">Lista de la compra</p>
                            <p className="text-[13px] text-slate-400">{shoppingText}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    </Link>

                </div>
            </section>

        </main>
    );
}
