'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { motion } from 'framer-motion';
import { useGlobalMenu } from '@/context/GlobalMenuContext';

export default function Taskbar() {
    const pathname = usePathname();
    const [hoveredApp, setHoveredApp] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const { toggleStartMenu, isStartMenuOpen, isLauncherMode, setIsLauncherMode } = useGlobalMenu();

    // Prevent hydration mismatch - only check window after mount
    useEffect(() => {
        setMounted(true);
        setIsMobile(window.innerWidth < 768);

        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (isLauncherMode) return null;

    const handleNavClick = async () => {
        try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (e) {
            // Ignore errors (e.g. on web)
        }
    };

    // Estilos premium para los iconos
    const getIconStyles = (id: string, active: boolean) => {
        switch (id) {
            case 'home':
                return {
                    bg: active ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-50 dark:bg-slate-800/40',
                    icon: active ? 'text-emerald-600' : 'text-slate-500',
                    border: active ? 'border-emerald-200' : 'border-transparent'
                };
            case 'articles':
                return {
                    bg: active ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-50 dark:bg-slate-800/40',
                    icon: active ? 'text-blue-600' : 'text-slate-500',
                    border: active ? 'border-blue-200' : 'border-transparent'
                };
            case 'profile':
                return {
                    bg: active ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-slate-50 dark:bg-slate-800/40',
                    icon: active ? 'text-violet-600' : 'text-slate-500',
                    border: active ? 'border-violet-200' : 'border-transparent'
                };
            default:
                return { bg: 'bg-transparent', icon: 'text-slate-500', border: 'border-transparent' };
        }
    };

    const apps = [
        {
            id: 'start',
            label: 'Menú',
            icon: (active: boolean) => (
                <div className={cn(
                    "w-10 h-10 rounded-2xl overflow-hidden p-1 transition-all duration-300 ring-2 ring-transparent",
                    active && "ring-emerald-400/50 shadow-lg shadow-emerald-500/20"
                )}>
                    <div className="w-full h-full bg-white rounded-xl flex items-center justify-center p-0.5 shadow-inner">
                        <img src="/images/logo.png" alt="Quioba" className="w-full h-full object-contain" />
                    </div>
                </div>
            ),
            href: '#start',
            isStart: true,
        },
        {
            id: 'home',
            label: 'Dashboard',
            icon: (active: boolean) => {
                const styles = getIconStyles('home', active);
                return (
                    <div className={cn(
                        "w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-300 border shadow-sm",
                        styles.bg,
                        styles.border
                    )}>
                        <Home className={cn("w-6 h-6", styles.icon)} />
                    </div>
                );
            },
            href: '/',
        },
        {
            id: 'articles',
            label: 'Artículos',
            icon: (active: boolean) => {
                const styles = getIconStyles('articles', active);
                return (
                    <div className={cn(
                        "w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-300 border shadow-sm",
                        styles.bg,
                        styles.border
                    )}>
                        <Newspaper className={cn("w-6 h-6", styles.icon)} />
                    </div>
                );
            },
            href: '/articles',
        },
        {
            id: 'profile',
            label: 'Perfil',
            icon: (active: boolean) => {
                const styles = getIconStyles('profile', active);
                return (
                    <div className={cn(
                        "w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-300 border shadow-sm",
                        styles.bg,
                        styles.border
                    )}>
                        <User className={cn("w-6 h-6", styles.icon)} />
                    </div>
                );
            },
            href: '/profile',
        },
    ];

    return (
        <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={cn(
                    "pointer-events-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-2xl rounded-[2.5rem] p-3 flex items-center gap-3 transition-all duration-300 ring-1 ring-black/5 dark:ring-white/10"
                )}
            >
                {apps.map((app) => {
                    const isActive = !!(app.isStart
                        ? isStartMenuOpen
                        : (pathname === app.href || (app.href !== '/' && pathname?.startsWith(app.href))));

                    const isHovered = hoveredApp === app.id;

                    return (
                        <div key={app.id} className="relative flex flex-col items-center group">
                            <Link
                                href={app.href}
                                onClick={(e) => {
                                    handleNavClick();
                                    if (app.isStart) {
                                        e.preventDefault();
                                        toggleStartMenu();
                                    }
                                }}
                                onMouseEnter={() => setHoveredApp(app.id)}
                                onMouseLeave={() => setHoveredApp(null)}
                                className="relative flex items-center justify-center active:scale-90 transition-transform duration-200"
                            >
                                {app.icon(isActive)}

                                {/* Tooltip Minimalista */}
                                {isHovered && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: -0 }}
                                        className="absolute -top-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold tracking-wider px-3 py-1.5 rounded-full whitespace-nowrap shadow-xl uppercase"
                                    >
                                        {app.label}
                                    </motion.div>
                                )}

                                {/* Dot Indicador inferior (Opcional, los iconos ya cambian de color) */}
                                {isActive && !app.isStart && (
                                    <motion.div
                                        layoutId="activeIndicator"
                                        className="absolute -bottom-1.5 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                                    />
                                )}
                            </Link>
                        </div>
                    );
                })}
            </motion.div>
        </div>
    );
}

