'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    LayoutGrid, ScanLine, ShoppingCart,
    ChevronRight, Battery, Signal, Wifi,
    Settings, Bell, Search, Monitor
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface MobileLauncherProps {
    onLaunchDesktop: () => void;
}

export default function MobileLauncher({ onLaunchDesktop }: MobileLauncherProps) {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUser(session.user);
                supabase.from('profiles').select('*').eq('id', session.user.id).single()
                    .then(({ data }) => setProfile(data));
            }
        });

        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const QuiovaGreen = "bg-[#10B981]"; // Emerald-500 equivalent
    const QuiovaTextGreen = "text-[#10B981]";

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative overflow-hidden selection:bg-emerald-100">
            {/* Status Bar Mockup */}
            <div className="flex justify-between items-center px-6 py-3 text-xs font-medium text-slate-400 bg-white">
                <span>{currentTime}</span>
                <div className="flex gap-2 items-center">
                    <Signal className="w-3 h-3" />
                    <Wifi className="w-3 h-3" />
                    <Battery className="w-4 h-4" />
                </div>
            </div>

            {/* Header Section */}
            <header className="px-6 pt-6 pb-8 bg-white rounded-b-[40px] shadow-sm mb-6 relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-slate-400 text-sm font-medium mb-1">Bienvenido de nuevo,</p>
                        <h1 className="text-2xl font-bold text-slate-800">
                            {profile?.nickname || user?.email?.split('@')[0] || 'Usuario'}
                        </h1>
                    </div>
                    <Link href="/profile">
                        <Avatar className="w-12 h-12 ring-4 ring-emerald-50 cursor-pointer">
                            <AvatarImage src={profile?.custom_avatar_url || user?.user_metadata?.avatar_url} className="object-cover" />
                            <AvatarFallback className="bg-emerald-100 text-emerald-700">
                                {profile?.nickname?.[0]?.toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </Link>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar en Quioba..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all border-none"
                    />
                </div>
            </header>

            {/* Main Content Grid */}
            <main className="px-6 pb-20 space-y-6">

                {/* 1. QUIOVA OS CARD (The "Capacitor" App) */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-lg text-slate-800">Sistema Principal</h2>
                    </div>

                    <motion.div
                        whileTap={{ scale: 0.98 }}
                        onClick={onLaunchDesktop}
                        className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 relative overflow-hidden group cursor-pointer"
                    >
                        <div className={`absolute top-0 right-0 w-32 h-32 ${QuiovaGreen} opacity-10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700`} />

                        <div className="relative z-10 flex flex-col h-full">
                            <div className={`w-12 h-12 ${QuiovaGreen} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 mb-4`}>
                                <Monitor className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-1">Quioba Desktop</h3>
                            <p className="text-slate-500 text-sm mb-4">Accede a tu escritorio completo, ventanas y gestión avanzada.</p>

                            <div className={`mt-auto flex items-center text-sm font-bold ${QuiovaTextGreen}`}>
                                Abrir Sistema <ChevronRight className="w-4 h-4 ml-1" />
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* 2. MOBILE TOOLS (Scanner, etc) */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-lg text-slate-800">Herramientas Móviles</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Smart Scanner */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-start text-left relative overflow-hidden"
                            onClick={() => { /* TODO: Open Camera */ }}
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500 opacity-5 rounded-bl-full -mr-8 -mt-8" />
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-3">
                                <ScanLine className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-slate-800">Escáner IA</h4>
                            <p className="text-[10px] text-slate-500 mt-1 leading-tight">Analizar productos y códigos</p>
                        </motion.button>

                        {/* Photo Inventory */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-start text-left relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500 opacity-5 rounded-bl-full -mr-8 -mt-8" />
                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-3">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-slate-800">Inventario</h4>
                            <p className="text-[10px] text-slate-500 mt-1 leading-tight">Visualizar despensa</p>
                        </motion.button>

                        {/* Recipes / Chef */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-start text-left relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500 opacity-5 rounded-bl-full -mr-8 -mt-8" />
                            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600 mb-3">
                                <ChefHat className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-slate-800">Cocina</h4>
                            <p className="text-[10px] text-slate-500 mt-1 leading-tight">Recetas sugeridas</p>
                        </motion.button>

                        {/* Tasks */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-start text-left relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500 opacity-5 rounded-bl-full -mr-8 -mt-8" />
                            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-3">
                                <ListTodo className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-slate-800">Tareas</h4>
                            <p className="text-[10px] text-slate-500 mt-1 leading-tight">Lista rápida</p>
                        </motion.button>
                    </div>
                </section>
            </main>
        </div>
    );
}

// Icon imports fallback
import { ShoppingBag, ChefHat, ListTodo } from 'lucide-react';
