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
import SmartScanner from './smart-scanner';

interface MobileLauncherProps {
    onLaunchDesktop: () => void;
}

export default function MobileLauncher({ onLaunchDesktop }: MobileLauncherProps) {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [currentTime, setCurrentTime] = useState('');
    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        const init = async () => {
            console.log('📱 MobileLauncher: Initializing...');
            try {
                const { data: { session } } = await supabase.auth.getSession();
                console.log('📱 MobileLauncher: Session received', session ? 'Logged In' : 'Guest');

                if (session?.user) {
                    setUser(session.user);
                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (profileError) {
                        console.error('📱 MobileLauncher: Profile fetch error', profileError);
                    } else {
                        console.log('📱 MobileLauncher: Profile received', profileData?.nickname);
                        setProfile(profileData);
                    }
                }
            } catch (err) {
                console.error('📱 MobileLauncher: Initialization error', err);
            }
        };

        init();

        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const QuiovaGreen = "bg-[#10B981]";
    const QuiovaTextGreen = "text-[#10B981]";

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans relative overflow-x-hidden selection:bg-emerald-100">
            {/* Ambient Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[30%] bg-emerald-100/40 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[40%] bg-blue-100/30 blur-[120px] rounded-full pointer-events-none" />

            {/* Header Section */}
            <header className="px-6 pt-8 pb-10 bg-white/60 backdrop-blur-xl rounded-b-[48px] shadow-[0_8px_32px_rgba(0,0,0,0.04)] border-b border-white/40 mb-8 relative z-10 mx-2 mt-2">
                <div className="flex justify-between items-start mb-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <p className="text-slate-400 text-sm font-medium mb-1 tracking-wide">👋 ¡Hola de nuevo!</p>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            {profile?.nickname || user?.email?.split('@')[0] || 'Explorador'}
                        </h1>
                    </motion.div>
                    <Link href="/profile">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Avatar className="w-14 h-14 ring-4 ring-white shadow-xl cursor-pointer">
                                <AvatarImage src={profile?.custom_avatar_url || user?.user_metadata?.avatar_url} className="object-cover" />
                                <AvatarFallback className="bg-emerald-500 text-white font-bold text-xl">
                                    {profile?.nickname?.[0]?.toUpperCase() || 'Q'}
                                </AvatarFallback>
                            </Avatar>
                        </motion.div>
                    </Link>
                </div>

                {/* Search Bar - Modern Glass style */}
                <motion.div
                    className="relative group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="absolute inset-0 bg-emerald-500/5 blur-xl group-focus-within:bg-emerald-500/10 transition-all rounded-3xl" />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar en el ecosistema Quioba..."
                        className="w-full pl-14 pr-6 py-4 bg-white/80 backdrop-blur-md rounded-[24px] text-base font-medium outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all border-none shadow-sm placeholder:text-slate-300"
                    />
                </motion.div>
            </header>

            {/* Main Content Grid */}
            <main className="px-6 pb-24 space-y-8 relative z-10">

                {/* 1. QUIOVA OS CARD - Premium Interaction */}


                {/* 2. MOBILE TOOLS SECTION */}
                <section>
                    <div className="flex items-center justify-between mb-5 px-1">
                        <h2 className="font-extrabold text-xl text-slate-900 tracking-tight">Herramientas Pro</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        {/* Quiova Desktop - Now standard square card */}
                        <motion.button
                            whileHover={{ y: -4 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onLaunchDesktop}
                            className="bg-white/70 backdrop-blur-md p-6 rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/60 flex flex-col items-start text-left relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-[60px] -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
                            <div className="w-12 h-12 bg-emerald-50 rounded-[18px] flex items-center justify-center text-emerald-600 mb-4 border border-emerald-100/50 shadow-sm">
                                <Settings className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg">Quiova OS</h4>
                            <p className="text-[11px] font-medium text-slate-500 mt-1 leading-tight mb-2">Escritorio Completo</p>
                            <div className="mt-auto w-full h-1 bg-emerald-100 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-emerald-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 1.5, delay: 0.2 }}
                                />
                            </div>
                        </motion.button>

                        {/* Smart Shopping Scanner */}
                        <motion.button
                            whileHover={{ y: -4 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-white/70 backdrop-blur-md p-6 rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/60 flex flex-col items-start text-left relative overflow-hidden group"
                            onClick={() => setShowScanner(true)}
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-[60px] -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
                            <div className="w-12 h-12 bg-emerald-50 rounded-[18px] flex items-center justify-center text-emerald-600 mb-4 border border-emerald-100/50 shadow-sm">
                                <ShoppingCart className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg">Añadir Productos</h4>
                            <p className="text-[11px] font-medium text-slate-500 mt-1 leading-tight mb-2">Escanea, fotografía o dicta</p>
                            <div className="mt-auto w-full h-1 bg-emerald-100 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-emerald-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: "75%" }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                />
                            </div>
                        </motion.button>

                        {/* Photo Inventory */}
                        <motion.button
                            whileHover={{ y: -4 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-white/70 backdrop-blur-md p-6 rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/60 flex flex-col items-start text-left relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-bl-[60px] -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
                            <div className="w-12 h-12 bg-orange-50 rounded-[18px] flex items-center justify-center text-orange-600 mb-4 border border-orange-100/50 shadow-sm">
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg">Despensa</h4>
                            <p className="text-[11px] font-medium text-slate-500 mt-1 leading-tight mb-2">Control de inventario</p>
                            <span className="text-[10px] font-bold py-0.5 px-2 bg-orange-100 text-orange-700 rounded-md">12 Pendientes</span>
                        </motion.button>

                        {/* Kitchen / Recipes */}
                        <motion.button
                            whileHover={{ y: -4 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-white/70 backdrop-blur-md p-6 rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/60 flex flex-col items-start text-left relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-[60px] -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
                            <div className="w-12 h-12 bg-red-50 rounded-[18px] flex items-center justify-center text-red-600 mb-4 border border-red-100/50 shadow-sm">
                                <ChefHat className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg">Chef IA</h4>
                            <p className="text-[11px] font-medium text-slate-500 mt-1 leading-tight">Sugerencias del día</p>
                        </motion.button>

                        {/* Quick Tasks */}
                        <motion.button
                            whileHover={{ y: -4 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-white/70 backdrop-blur-md p-6 rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/60 flex flex-col items-start text-left relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-[60px] -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
                            <div className="w-12 h-12 bg-purple-50 rounded-[18px] flex items-center justify-center text-purple-600 mb-4 border border-purple-100/50 shadow-sm">
                                <ListTodo className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg">Tareas</h4>
                            <p className="text-[11px] font-medium text-slate-500 mt-1 leading-tight">Captura rápida</p>
                        </motion.button>
                    </div>
                </section>
            </main>

            {/* Bottom Floating Navigation (Optional but makes it feel more "Native") */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md h-16 bg-white/60 backdrop-blur-2xl rounded-[24px] border border-white/40 shadow-[0_20px_40px_rgba(0,0,0,0.1)] z-50 flex items-center justify-around px-4">
                <button className="p-2 text-emerald-600 bg-emerald-50 rounded-xl transition-all"><LayoutGrid className="w-6 h-6" /></button>
                <button className="p-2 text-slate-400 hover:text-slate-600 transition-all"><ShoppingCart className="w-6 h-6" /></button>
                <button className="p-2 text-slate-400 hover:text-slate-600 transition-all"><Bell className="w-6 h-6" /></button>
                <button className="p-2 text-slate-400 hover:text-slate-600 transition-all"><Settings className="w-6 h-6" /></button>
            </div>

            {/* Smart Scanner Modal */}
            {showScanner && (
                <SmartScanner
                    onClose={() => setShowScanner(false)}
                    onProductAdded={async (product) => {
                        // Add product to shopping list
                        try {
                            console.log('🛒 Adding product to shopping list:', product);
                            const { data: { session } } = await supabase.auth.getSession();
                            console.log('👤 Session:', session?.user?.id);

                            if (session?.user) {
                                const { data, error } = await supabase.from('shopping_items').insert({
                                    user_id: session.user.id,
                                    name: product.name,
                                    barcode: product.barcode,
                                    checked: false
                                }).select();

                                if (error) {
                                    console.error('❌ Database error:', error);
                                    alert(`Error al guardar: ${error.message}`);
                                } else {
                                    console.log('✅ Product saved:', data);
                                    alert(`✅ "${product.name}" añadido a la lista`);
                                }
                            } else {
                                console.error('❌ No user session');
                                alert('Error: No hay sesión activa');
                            }
                        } catch (err: any) {
                            console.error('❌ Error adding product:', err);
                            alert(`Error: ${err.message}`);
                        }
                    }}
                />
            )}
        </div>
    );
}

// Icon imports fallback
import { ShoppingBag, ChefHat, ListTodo } from 'lucide-react';
