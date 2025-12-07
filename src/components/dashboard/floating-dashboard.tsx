'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Home, Shield, FileText, Bell, ChevronUp, ChevronDown, LogOut, Book, ChefHat } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import JournalPanel from '@/components/journal/journal-panel';
import { useJournal } from '@/context/JournalContext';

export default function FloatingDashboard() {
    const [isOpen, setIsOpen] = useState(false);
    const [menuView, setMenuView] = useState<'main' | 'mi-hogar'>('main');
    const { isOpen: isJournalOpen, setIsOpen: setIsJournalOpen } = useJournal();
    const [user, setUser] = useState<any>(null);
    const [shoppingCount, setShoppingCount] = useState(0);
    const [taskCount, setTaskCount] = useState(0);
    const router = useRouter();

    const dashboardRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchCounts(session.user.id);
            }
        });

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

        const handleClickOutside = (event: MouseEvent) => {
            if (dashboardRef.current && !dashboardRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            subscription.unsubscribe();
            document.removeEventListener('mousedown', handleClickOutside);
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
    };

    if (!user) return null;

    const totalNotifications = shoppingCount + taskCount;

    return (
        <>
            <JournalPanel isOpen={isJournalOpen} onClose={() => setIsJournalOpen(false)} />

            <div ref={dashboardRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
                {/* Journal Button */}
                {/* Journal Button */}
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsJournalOpen(!isJournalOpen)}
                    className="flex items-center gap-2 px-4 py-3 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded-full shadow-lg border border-amber-200 dark:border-amber-800 backdrop-blur-sm"
                    title="Mis Apuntes"
                >
                    <Book className="w-5 h-5" />
                    <span className="font-medium text-sm">Mis Apuntes</span>
                </motion.button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 20 }}
                            className="mb-4 w-72 bg-white/80 dark:bg-black/80 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-4 border-b border-white/10">
                                <h3 className="font-bold text-lg">Mi Hogar</h3>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>

                            <div className="p-2 grid gap-2">
                                {menuView === 'main' ? (
                                    <button
                                        onClick={() => setMenuView('mi-hogar')}
                                        className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/10 transition-colors group w-full text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                <Home className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium">Mi Hogar</span>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90" />
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setMenuView('main')}
                                            className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-foreground mb-1"
                                        >
                                            <ChevronDown className="w-3 h-3 rotate-90" />
                                            Volver
                                        </button>
                                        <Link href="/apps/mi-hogar/shopping" className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/10 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                                    <ShoppingCart className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-medium">Lista de Compra</span>
                                            </div>
                                            {shoppingCount > 0 && (
                                                <Badge variant="destructive" className="rounded-full h-5 px-2">
                                                    {shoppingCount}
                                                </Badge>
                                            )}
                                        </Link>

                                        <Link href="/apps/mi-hogar/tasks" className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/10 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                                                    <Bell className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-medium">Tareas</span>
                                            </div>
                                            {taskCount > 0 && (
                                                <Badge variant="destructive" className="rounded-full h-5 px-2">
                                                    {taskCount}
                                                </Badge>
                                            )}
                                        </Link>

                                        <Link href="/apps/mi-hogar/passwords" className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary/10 transition-colors">
                                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                                                <Shield className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium">Contraseñas</span>
                                        </Link>



                                        <Link href="/apps/mi-hogar/manuals" className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary/10 transition-colors">
                                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium">Manuales</span>
                                        </Link>
                                    </>
                                )}
                            </div>

                            <div className="p-2 border-t border-white/10 bg-muted/30">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-muted-foreground hover:text-destructive"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Cerrar Sesión
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className="group flex items-center gap-3 px-4 py-3 bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                    <div className="relative">
                        <Home className="w-5 h-5 text-primary" />
                        {totalNotifications > 0 && !isOpen && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-black" />
                        )}
                    </div>
                    <span className="font-medium text-sm">Mis aplicaciones</span>
                    {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                </motion.button>
            </div >
        </>
    );
}
