'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    LayoutGrid, ScanLine, ShoppingCart,
    ChevronRight, Battery, Signal, Wifi,
    Settings, Bell, Search, Monitor, Calendar,
    FileText, KeyRound, MessageCircle,
    ShoppingBag, ChefHat, ListTodo, Lock,
    Wallet, CreditCard, Sparkles
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import SmartScanner from './smart-scanner';
import ScanRosterDialog from '@/components/apps/mi-hogar/roster/scan-roster-dialog';
import ChatInterface from '@/components/apps/asistente/chat-interface';
import { AppWithStatus, MarketplaceApp, UserAppPurchase } from '@/types/marketplace';
import PurchaseDialog from './purchase-dialog';
import { useRouter } from 'next/navigation';

// Icon mapping for dynamic rendering
const IconMap: { [key: string]: any } = {
    Settings, ShoppingCart, ShoppingBag, ChefHat,
    ListTodo, Calendar, FileText, KeyRound, MessageCircle,
    Monitor
};

// Fallback apps - used when marketplace_apps table doesn't exist yet
const FALLBACK_APPS: AppWithStatus[] = [
    { id: 'fb-1', key: 'desktop', name: 'Quioba Web', description: 'Acceso al escritorio completo.', icon_key: 'Settings', route: '/desktop', price: 0, category: 'utility', is_active: true, isOwned: true, isLocked: false },
    { id: 'fb-2', key: 'shopping', name: 'Lista de la Compra', description: 'Gestiona tu lista de la compra y despensa.', icon_key: 'ShoppingBag', route: '/apps/mi-hogar/shopping', price: 4.99, category: 'lifestyle', is_active: true, isOwned: false, isLocked: true },
    { id: 'fb-3', key: 'chef-ia', name: 'Chef IA', description: 'Tu asistente de cocina y recetas.', icon_key: 'ChefHat', route: '/apps/mi-hogar/chef', price: 2.99, category: 'lifestyle', is_active: true, isOwned: false, isLocked: true },
    { id: 'fb-4', key: 'tasks', name: 'Gestor de Tareas', description: 'Organiza tu día a día.', icon_key: 'ListTodo', route: '/apps/mi-hogar/tasks', price: 1.99, category: 'productivity', is_active: true, isOwned: false, isLocked: true },
    { id: 'fb-5', key: 'roster', name: 'Cuadrante de Turnos', description: 'Gestiona tu cuadrante de trabajo.', icon_key: 'Calendar', route: '/apps/mi-hogar/roster', price: 3.99, category: 'productivity', is_active: true, isOwned: false, isLocked: true },
    { id: 'fb-6', key: 'documents', name: 'Gestor Documental', description: 'DNI, Seguros siempre a mano.', icon_key: 'FileText', route: '/apps/mi-hogar/documents', price: 4.99, category: 'utility', is_active: true, isOwned: false, isLocked: true },
    { id: 'fb-7', key: 'passwords', name: 'Gestor de Contraseñas', description: 'Almacena contraseñas seguras.', icon_key: 'KeyRound', route: '/apps/passwords', price: 5.99, category: 'utility', is_active: true, isOwned: false, isLocked: true },
    { id: 'fb-8', key: 'assistant', name: 'Asistente Quioba', description: 'Tu asistente personal con IA.', icon_key: 'MessageCircle', route: '/apps/mi-hogar/asistente', price: 9.99, category: 'productivity', is_active: true, isOwned: false, isLocked: true },
];

interface MobileLauncherProps {
    onLaunchDesktop: () => void;
}

export default function MobileLauncher({ onLaunchDesktop }: MobileLauncherProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [currentTime, setCurrentTime] = useState('');

    // Feature States
    const [showScanner, setShowScanner] = useState(false);
    const [showScanRoster, setShowScanRoster] = useState(false);
    const [showAssistant, setShowAssistant] = useState(false);

    // Marketplace States
    const [apps, setApps] = useState<AppWithStatus[]>([]);
    const [loadingApps, setLoadingApps] = useState(true);
    const [selectedAppForPurchase, setSelectedAppForPurchase] = useState<MarketplaceApp | null>(null);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchApps = async (userId: string) => {
        try {
            // 1. Fetch Catalog
            const { data: marketplaceApps, error: appsError } = await supabase
                .from('marketplace_apps')
                .select('*')
                .eq('is_active', true)
                .order('price', { ascending: true });

            // If table doesn't exist or error, use fallback
            if (appsError || !marketplaceApps || marketplaceApps.length === 0) {
                console.warn('📱 Marketplace: Using fallback apps (table may not exist yet)', appsError?.message);
                setApps(FALLBACK_APPS);
                setLoadingApps(false);
                return;
            }

            // 2. Check if user is Premium
            const { data: profileData } = await supabase
                .from('profiles')
                .select('subscription_tier')
                .eq('id', userId)
                .single();

            const isPremium = profileData?.subscription_tier === 'premium';

            if (isPremium) {
                const allUnlocked: AppWithStatus[] = marketplaceApps.map(app => ({
                    ...app,
                    isOwned: true,
                    isLocked: false
                }));
                setApps(allUnlocked);
                setLoadingApps(false);
                return;
            }

            // 3. Fetch Active Subscriptions
            const { data: purchases } = await supabase
                .from('user_app_purchases')
                .select('app_id, expires_at')
                .eq('user_id', userId)
                .eq('status', 'active');

            const ownedAppIds = new Set(
                (purchases || [])
                    .filter(p => !p.expires_at || new Date(p.expires_at) > new Date())
                    .map(p => p.app_id)
            );

            // 4. Merge Data (no free bypass)
            const processedApps: AppWithStatus[] = marketplaceApps.map(app => ({
                ...app,
                isOwned: ownedAppIds.has(app.id),
                isLocked: !ownedAppIds.has(app.id)
            }));

            setApps(processedApps);
        } catch (error) {
            console.error('📱 Marketplace: Error, using fallback', error);
            setApps(FALLBACK_APPS);
        } finally {
            setLoadingApps(false);
        }
    };

    useEffect(() => {
        if (!mounted) return;

        const init = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    setUser(session.user);
                    // Fetch Profile
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (profileData) setProfile(profileData);

                    // Fetch Apps
                    await fetchApps(session.user.id);
                } else {
                    // Guest mode - show fallback apps
                    setApps(FALLBACK_APPS);
                    setLoadingApps(false);
                }
            } catch (err) {
                console.error('📱 MobileLauncher: Initialization error', err);
                setApps(FALLBACK_APPS);
                setLoadingApps(false);
            }
        };

        init();

        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
        }, 1000);

        return () => clearInterval(timer);
    }, [mounted]);

    const handleAppClick = (app: AppWithStatus) => {
        if (app.isLocked) {
            setSelectedAppForPurchase(app);
            return;
        }

        // Handle Special Actions based on app key
        if (app.key === 'desktop') {
            onLaunchDesktop();
        } else if (app.key === 'scanner') {
            setShowScanner(true);
        } else if (app.key === 'roster') {
            setShowScanRoster(true);
        } else if (app.key === 'assistant') {
            // Navigate or open modal? Original code used modal for assistant on mobile
            // But route is /apps/mi-hogar/asistente. Let's stick to route unless it's the quick-action.
            // For now, let's treat the list as navigation, except for special cases.
            router.push(app.route);
        } else {
            router.push(app.route);
        }
    };

    // Helper to get color based on specific apps for visual variety
    const getAppStyle = (appKey: string) => {
        switch (appKey) {
            case 'desktop': return { bg: 'bg-emerald-50', text: 'text-emerald-600', decoration: 'bg-emerald-500', shadow: 'emerald' };
            case 'shopping': return { bg: 'bg-orange-50', text: 'text-orange-600', decoration: 'bg-orange-500', shadow: 'orange' };
            case 'chef-ia': return { bg: 'bg-red-50', text: 'text-red-600', decoration: 'bg-red-500', shadow: 'red' };
            case 'tasks': return { bg: 'bg-purple-50', text: 'text-purple-600', decoration: 'bg-purple-500', shadow: 'purple' };
            case 'roster': return { bg: 'bg-indigo-50', text: 'text-indigo-600', decoration: 'bg-indigo-500', shadow: 'indigo' };
            case 'documents': return { bg: 'bg-blue-50', text: 'text-blue-600', decoration: 'bg-blue-500', shadow: 'blue' };
            case 'passwords': return { bg: 'bg-amber-50', text: 'text-amber-600', decoration: 'bg-amber-500', shadow: 'amber' };
            case 'assistant': return { bg: 'bg-violet-50', text: 'text-violet-600', decoration: 'bg-violet-500', shadow: 'violet' };
            default: return { bg: 'bg-slate-50', text: 'text-slate-600', decoration: 'bg-slate-500', shadow: 'slate' };
        }
    };

    if (!mounted) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="animate-pulse text-emerald-600 font-semibold">Cargando Quioba...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans relative overflow-x-hidden selection:bg-emerald-100 pb-24">
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

                {/* Search Bar */}
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
                        placeholder="Buscar tareas, apps..."
                        className="w-full pl-14 pr-6 py-4 bg-white/80 backdrop-blur-md rounded-[24px] text-base font-medium outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all border-none shadow-sm placeholder:text-slate-300"
                    />
                </motion.div>
            </header>

            {/* Main Apps Grid */}
            <main className="px-6 relative z-10">
                <div className="flex items-center justify-between mb-5 px-1">
                    <h2 className="font-extrabold text-xl text-slate-900 tracking-tight">Mis Aplicaciones</h2>
                    <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                        {apps.filter(a => a.isOwned).length} Activas
                    </span>
                </div>

                {loadingApps ? (
                    <div className="grid grid-cols-2 gap-5 animate-pulse">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-40 bg-white/50 rounded-[28px]" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-5 mb-20">
                        {apps.map((app) => {
                            const Icon = IconMap[app.icon_key] || LayoutGrid;
                            const style = getAppStyle(app.key);

                            return (
                                <motion.button
                                    key={app.id}
                                    whileHover={{ y: -4 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleAppClick(app)}
                                    className={`
                                        bg-white/70 backdrop-blur-md p-6 rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] 
                                        border border-white/60 flex flex-col items-start text-left relative overflow-hidden group
                                        ${app.isLocked ? 'opacity-80 grayscale-[0.3]' : ''}
                                    `}
                                >
                                    {/* App Icon Circle */}
                                    <div className={`w-12 h-12 ${app.isLocked ? 'bg-slate-100 text-slate-400' : style.bg + ' ' + style.text} rounded-[18px] flex items-center justify-center mb-4 border border-white/50 shadow-sm z-10 relative transition-transform group-hover:scale-110`}>
                                        {app.isLocked ? <Lock className="w-5 h-5" /> : <Icon className="w-6 h-6" />}
                                    </div>

                                    {app.isLocked && (
                                        <div className="absolute top-4 right-4 bg-slate-900/10 p-1.5 rounded-full backdrop-blur-sm">
                                            <ShoppingCart className="w-3 h-3 text-slate-600" />
                                        </div>
                                    )}

                                    <h4 className="font-bold text-slate-900 text-base leading-tight w-full truncate">
                                        {app.name}
                                    </h4>

                                    <p className="text-[11px] font-medium text-slate-500 mt-1 leading-tight mb-3 line-clamp-1">
                                        {app.description}
                                    </p>

                                    {/* Price Tag or Progress Bar */}
                                    {app.isLocked ? (
                                        <div className="mt-auto flex items-center gap-1.5 bg-violet-100 px-2 py-1 rounded-lg">
                                            <Sparkles className="w-3 h-3 text-violet-600" />
                                            <span className="text-xs font-bold text-violet-700">{app.price}€</span>
                                        </div>
                                    ) : (
                                        <div className="mt-auto w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div
                                                className={`h-full ${style.decoration}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: "100%" }} // You could make this real usage data later
                                                transition={{ duration: 1.5, delay: 0.2 }}
                                            />
                                        </div>
                                    )}

                                    {/* Decorative Blob */}
                                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[60px] -mr-8 -mt-8 pointer-events-none transition-transform group-hover:scale-110 
                                        ${app.isLocked ? 'bg-slate-200/20' : style.text.replace('text-', 'bg-').replace('600', '500') + '/5'}
                                    `} />
                                </motion.button>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Assistant Floating Panel */}
            {showAssistant && (
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 h-[25vh] bg-white dark:bg-slate-900 rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-[60] overflow-hidden"
                >
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between px-4 py-2 border-b bg-violet-50 dark:bg-violet-900/20">
                            <span className="font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-2">
                                <MessageCircle className="w-4 h-4" /> Asistente Quioba
                            </span>
                            <button
                                onClick={() => setShowAssistant(false)}
                                className="p-1 hover:bg-violet-100 dark:hover:bg-violet-800/30 rounded-full"
                            >
                                <X className="w-4 h-4" /> {/* Ensure X is imported if used here, replacing text X */}
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <ChatInterface userId={user?.id || ''} userName={profile?.nickname} compact />
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Bottom Navigation */}
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md h-16 bg-white/60 backdrop-blur-2xl rounded-[24px] border border-white/40 shadow-[0_20px_40px_rgba(0,0,0,0.1)] z-50 flex items-center justify-around px-4`}>
                <button className="p-2 text-emerald-600 bg-emerald-50 rounded-xl transition-all"><LayoutGrid className="w-6 h-6" /></button>
                <button
                    onClick={() => setShowScanner(true)}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-all"
                >
                    <ShoppingCart className="w-6 h-6" />
                </button>
                <button
                    onClick={() => setShowAssistant(!showAssistant)}
                    className={`p-2 rounded-xl transition-all ${showAssistant ? 'text-violet-600 bg-violet-50' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <MessageCircle className="w-6 h-6" />
                </button>
                <Link href="/profile">
                    <button className="p-2 text-slate-400 hover:text-slate-600 transition-all"><Settings className="w-6 h-6" /></button>
                </Link>
            </div>

            {/* Modals */}
            {showScanner && (
                <SmartScanner
                    onClose={() => setShowScanner(false)}
                    onProductAdded={async (product) => {
                        // Logic remains similar, could be moved to a hook
                        console.log('Product added', product);
                    }}
                />
            )}

            <ScanRosterDialog
                open={showScanRoster}
                onOpenChange={setShowScanRoster}
                onSuccess={() => setShowScanRoster(false)}
            />

            <PurchaseDialog
                app={selectedAppForPurchase}
                open={!!selectedAppForPurchase}
                onClose={() => setSelectedAppForPurchase(null)}
                onPurchaseComplete={() => {
                    // Refresh apps list to see unlock
                    if (user) fetchApps(user.id);
                }}
            />
        </div>
    );
}

// Icon fallbacks (ensure 'X' is imported for the assistant close button if used)
import { X } from 'lucide-react'; 
