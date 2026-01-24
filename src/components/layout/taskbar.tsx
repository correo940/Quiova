'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid, User, Cloud, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useGlobalMenu } from '@/context/GlobalMenuContext';

export default function Taskbar() {
    const pathname = usePathname();
    const [hoveredApp, setHoveredApp] = useState<string | null>(null);
    const { toggleStartMenu, isStartMenuOpen, isLauncherMode, setIsLauncherMode } = useGlobalMenu();

    if (isLauncherMode) return null;

    const handleNavClick = async () => {
        try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (e) {
            // Ignore errors (e.g. on web)
        }
    };

    const apps = [
        {
            id: 'start',
            label: 'Inicio',
            // Quioba Logo Icon
            icon: () => (
                <div className="w-8 h-8 rounded-full overflow-hidden p-0.5 bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                    <img src="/images/logo.png" alt="Quioba" className="w-full h-full object-contain" />
                </div>
            ),
            href: '#start', // Special href for handler
            isStart: true,
        },
        {
            id: 'apps',
            label: 'Apps',
            icon: Grid,
            href: '/apps',
        },
        {
            id: 'mi-hogar',
            label: 'Mi Hogar',
            icon: () => <span className="text-xl">🏠</span>, // Using emoji for colorful icon feel for now
            href: '/apps/mi-hogar',
        },
        {
            id: 'journal',
            label: 'Apuntes',
            icon: () => <span className="text-xl">📒</span>,
            href: '/journal',
        },
        {
            id: 'debate',
            label: 'Debate',
            icon: () => <span className="text-xl">⚔️</span>,
            href: '/apps/debate',
        },
        {
            id: 'profile',
            label: 'Perfil',
            icon: User,
            href: '/profile',
        },
        {
            id: 'launcher',
            label: 'Dashboard',
            icon: LayoutGrid,
            href: '#launcher',
            isLauncher: true,
        },
    ];

    return (
        <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <div className={cn("pointer-events-auto bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl rounded-2xl p-2 flex items-center gap-2 transition-all duration-300 hover:bg-white/80 hover:scale-105 hover:shadow-xl ring-1 ring-black/5 dark:bg-black/60 dark:border-white/10 dark:ring-white/10 mb-4")}>
                {apps.map((app) => {
                    // Solo mostrar el botón de launcher en dispositivos táctiles/móviles
                    if (app.isLauncher && typeof window !== 'undefined' && window.innerWidth >= 768) return null;

                    // Start button is active if menu is open
                    const isActive = app.isStart
                        ? isStartMenuOpen
                        : (pathname === app.href || (app.href && pathname?.startsWith(app.href)));

                    const isHovered = hoveredApp === app.id;

                    return (
                        <div key={app.id} className="relative flex flex-col items-center group">
                            {/* Hover Tooltip */}
                            {isHovered && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: -0 }}
                                    className="absolute -top-12 bg-black/80 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap backdrop-blur-sm"
                                >
                                    {app.label}
                                </motion.div>
                            )}

                            {/* Active Dot */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeDot"
                                    className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full mb-1"
                                />
                            )}

                            <Link
                                href={app.href}
                                onClick={(e) => {
                                    handleNavClick();
                                    if (app.isStart) {
                                        e.preventDefault();
                                        toggleStartMenu();
                                    }
                                    if (app.isLauncher) {
                                        e.preventDefault();
                                        setIsLauncherMode(true);
                                    }
                                }}
                                onMouseEnter={() => setHoveredApp(app.id)}
                                onMouseLeave={() => setHoveredApp(null)}
                                className={cn(
                                    "relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200",
                                    app.isStart
                                        ? "bg-transparent hover:bg-white/50 active:scale-95 transition-transform"
                                        : "hover:bg-white/50 text-muted-foreground hover:text-foreground active:scale-95 dark:hover:bg-white/10",
                                    isActive && !app.isStart && "bg-white/40 text-primary shadow-sm dark:bg-white/5"
                                )
                                }
                            >
                                <app.icon className={cn("w-5 h-5", app.isStart && "w-8 h-8")} />
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
