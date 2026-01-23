'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Home, Shield, FileText, Bell, ChevronUp, ChevronDown, LogOut, Book, ChefHat, Pill, Car, Receipt, ShieldCheck, PiggyBank, Calendar, MessageCircle, Wallet, LayoutDashboard, BookOpen, Brain, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import JournalPanel from '@/components/journal/journal-panel';
import { useJournal } from '@/context/JournalContext';
import BrowserWidget from '@/components/journal/browser-widget';
import { useGlobalMenu } from '@/context/GlobalMenuContext';

export default function StartMenu() {
    const { isStartMenuOpen, closeStartMenu } = useGlobalMenu();
    const [activeView, setActiveView] = useState<'menu' | 'apps'>('menu');
    const { isOpen: isJournalOpen, setIsOpen: setIsJournalOpen } = useJournal();
    const [user, setUser] = useState<any>(null);
    const [shoppingCount, setShoppingCount] = useState(0);
    const [taskCount, setTaskCount] = useState(0);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (isStartMenuOpen &&
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('#start-button') // Ignore clicks on start button
            ) {
                closeStartMenu();
            }
        };

        if (isStartMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isStartMenuOpen, closeStartMenu]); // Added closeStartMenu dependency

    useEffect(() => {
        setMounted(true);
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchCounts(session.user.id);
            }
        });

        // Set up real-time subscription for immediate updates
        const channel = supabase
            .channel('dashboard_badges')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
                if (user) fetchCounts(user.id);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, () => {
                if (user) fetchCounts(user.id);
            })
            .subscribe();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchCounts(session.user.id);
            } else {
                setShoppingCount(0);
                setTaskCount(0);
            }
        });

        return () => {
            subscription.unsubscribe();
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchCounts = async (userId: string) => {
        // Shopping Count
        const { count: sCount } = await supabase
            .from('shopping_items')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_checked', false);

        if (sCount !== null) setShoppingCount(sCount);

        // Task Count
        const { count: tCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_completed', false);

        if (tCount !== null) setTaskCount(tCount);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success('Sesión cerrada');
        router.refresh();
        closeStartMenu();
    };

    if (!mounted || !user) return null;

    const totalNotifications = shoppingCount + taskCount;

    return (
        <>
            <JournalPanel isOpen={isJournalOpen} onClose={() => setIsJournalOpen(false)} />
            <BrowserWidget />

            <AnimatePresence>
                {isStartMenuOpen && (
                    <div className="fixed inset-0 z-40 flex items-end justify-center pointer-events-none pb-24">
                        <motion.div
                            ref={menuRef}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", bounce: 0.3, duration: 0.3 }}
                            className="pointer-events-auto bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden w-72 mx-auto mb-2"
                        >
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/50 dark:bg-black/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10">
                                        <img src={user.user_metadata?.avatar_url || "/images/logo.png"} alt="User" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">Mi Quioba</h3>
                                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{user.email}</p>
                                    </div>
                                </div>
                                {activeView === 'apps' && (
                                    <Button variant="ghost" size="sm" onClick={() => setActiveView('menu')} className="h-8 w-8 p-0">
                                        <ChevronDown className="h-4 w-4 rotate-90" />
                                    </Button>
                                )}
                            </div>

                            <div className="p-2 max-h-[60vh] overflow-y-auto">
                                {activeView === 'menu' ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Link
                                                href="/"
                                                onClick={() => closeStartMenu()}
                                                className="col-span-2 flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors bg-white/40 dark:bg-zinc-800/40 shadow-sm group"
                                            >
                                                <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-500">
                                                    <LayoutDashboard className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm">Inicio</div>
                                                </div>
                                            </Link>

                                            <button
                                                onClick={() => setActiveView('apps')}
                                                className="col-span-2 flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors bg-white/40 dark:bg-zinc-800/40 shadow-sm group text-left"
                                            >
                                                <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-500">
                                                    <Home className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-semibold text-sm">Aplicaciones</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {totalNotifications > 0 && (
                                                        <Badge variant="destructive" className="rounded-full h-5 px-2">
                                                            {totalNotifications}
                                                        </Badge>
                                                    )}
                                                    <ChevronDown className="w-4 h-4 -rotate-90 text-muted-foreground" />
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setIsJournalOpen(true);
                                                    closeStartMenu();
                                                }}
                                                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors bg-white/40 dark:bg-zinc-800/40 shadow-sm text-center"
                                            >
                                                <div className="p-2 bg-amber-500/10 rounded-full text-amber-500">
                                                    <Book className="w-6 h-6" />
                                                </div>
                                                <span className="text-xs font-medium">Apuntes</span>
                                            </button>

                                            <Link
                                                href="/apps/debate"
                                                onClick={() => closeStartMenu()}
                                                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors bg-white/40 dark:bg-zinc-800/40 shadow-sm text-center"
                                            >
                                                <div className="p-2 bg-green-500/10 rounded-full text-green-500">
                                                    <MessageCircle className="w-6 h-6" />
                                                </div>
                                                <span className="text-xs font-medium">Debate</span>
                                            </Link>

                                            <Link
                                                href="/apps/mi-hogar/confessions"
                                                onClick={() => closeStartMenu()}
                                                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors bg-white/40 dark:bg-zinc-800/40 shadow-sm text-center"
                                            >
                                                <div className="p-2 bg-violet-500/10 rounded-full text-violet-500">
                                                    <span className="text-xl">🤔</span>
                                                </div>
                                                <span className="text-xs font-medium">Pensar</span>
                                            </Link>

                                            <Link
                                                href="/apps/organizador-vital"
                                                onClick={() => closeStartMenu()}
                                                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors bg-white/40 dark:bg-zinc-800/40 shadow-sm text-center"
                                            >
                                                <div className="p-2 bg-blue-500/10 rounded-full text-blue-500">
                                                    <span className="text-xl">📅</span>
                                                </div>
                                                <span className="text-xs font-medium">Agenda</span>
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-1">
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start mb-2 pl-2 gap-2 text-muted-foreground hover:text-foreground"
                                            onClick={() => setActiveView('menu')}
                                        >
                                            <ChevronDown className="h-4 w-4 rotate-90" />
                                            Volver
                                        </Button>

                                        <div className="grid grid-cols-2 gap-2">
                                            <Link href="/apps/mi-hogar/shopping" className="flex items-center gap-2 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-sm">
                                                <ShoppingCart className="w-4 h-4 text-blue-500" />
                                                <span>Compras</span>
                                                {shoppingCount > 0 && <Badge className="ml-auto h-4 px-1">{shoppingCount}</Badge>}
                                            </Link>
                                            <Link href="/apps/mi-hogar/tasks" className="flex items-center gap-2 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-sm">
                                                <Bell className="w-4 h-4 text-green-500" />
                                                <span>Tareas</span>
                                                {taskCount > 0 && <Badge className="ml-auto h-4 px-1">{taskCount}</Badge>}
                                            </Link>
                                            <Link href="/apps/mi-hogar/passwords" className="flex items-center gap-2 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-sm">
                                                <Shield className="w-4 h-4 text-purple-500" />
                                                <span>Claves</span>
                                            </Link>
                                            <Link href="/apps/mi-hogar/pharmacy" className="flex items-center gap-2 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-sm">
                                                <Pill className="w-4 h-4 text-red-500" />
                                                <span>Salud</span>
                                            </Link>
                                            <Link href="/apps/mi-hogar/garage" className="flex items-center gap-2 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-sm">
                                                <Car className="w-4 h-4 text-blue-500" />
                                                <span>Garaje</span>
                                            </Link>
                                            <Link href="/apps/mi-hogar/expenses" className="flex items-center gap-2 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-sm">
                                                <Wallet className="w-4 h-4 text-emerald-500" />
                                                <span>Gastos</span>
                                            </Link>
                                            <Link href="/apps/mi-hogar/savings" className="flex items-center gap-2 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-sm">
                                                <PiggyBank className="w-4 h-4 text-amber-500" />
                                                <span>Ahorros</span>
                                            </Link>
                                            <Link href="/apps/mi-hogar/roster" className="flex items-center gap-2 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-sm">
                                                <Calendar className="w-4 h-4 text-cyan-500" />
                                                <span>Turnos</span>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 border-t border-white/10 bg-muted/30 flex justify-between items-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-muted-foreground hover:text-destructive gap-2"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="w-3 h-3" />
                                    Cerrar Sesión
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
