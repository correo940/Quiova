'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ManualsGallery from '@/components/apps/mi-hogar/manuals/manuals-gallery';
import { MaintenanceAgendaPanel } from '@/components/apps/mi-hogar/manuals/maintenance-agenda';
import { useAppPermission } from '@/hooks/useAppPermission';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Home, BookOpen, CalendarCheck, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function MiHogarManualsPage() {
    const router = useRouter();
    const { level: permLevel, loading: permLoading } = useAppPermission('mi-hogar.manuals');
    const readOnly = permLevel === 'view';
    const [tab, setTab] = useState<'guide' | 'agenda'>('guide');

    if (!permLoading && permLevel === 'none') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-center">
                <Card className="p-8 max-w-sm">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h2 className="text-lg font-bold mb-1">No tienes acceso a esta app</h2>
                    <p className="text-sm text-muted-foreground">Pide al propietario de la familia que te conceda acceso a Manuales.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#020617] p-4 md:p-8 pb-nav relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-green-500/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-indigo-500/5 blur-[100px] pointer-events-none" />

            <div className="max-w-6xl mx-auto mb-8 relative z-10">
                {/* Navigation */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mb-8"
                >
                    <Link href="/">
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-slate-200 dark:border-slate-800 rounded-full px-4 h-9 shadow-sm hover:shadow-md transition-all flex items-center gap-2 group"
                        >
                            <Home className="h-4 w-4 text-slate-500 group-hover:text-green-500 transition-colors" />
                            <span className="hidden sm:inline font-bold text-xs uppercase tracking-wider">Inicio</span>
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="bg-slate-100/30 dark:bg-slate-800/20 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-full px-4 h-9 flex items-center gap-2 transition-all group"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-4 w-4 text-slate-500 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold text-xs uppercase tracking-wider">Volver</span>
                    </Button>
                </motion.div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-500 dark:bg-green-800 rounded-xl shadow-lg shadow-green-500/20">
                                <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                                Guía de <span className="text-green-500">Tu Hogar</span>
                            </h1>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-base font-medium ml-12">
                            Instrucciones, manuales y recordatorios de mantenimiento.
                        </p>
                    </motion.div>

                    {/* Tab switcher */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 gap-1 self-end"
                    >
                        <button
                            onClick={() => setTab('guide')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'guide'
                                ? 'bg-white dark:bg-slate-900 text-green-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <BookOpen className="h-4 w-4" />
                            Mi Guía
                        </button>
                        <button
                            onClick={() => setTab('agenda')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'agenda'
                                ? 'bg-white dark:bg-slate-900 text-green-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <CalendarCheck className="h-4 w-4" />
                            Agenda Mantenimiento
                        </button>
                    </motion.div>
                </div>
            </div>

            <motion.div
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-6xl mx-auto"
            >
                {tab === 'guide' ? <ManualsGallery readOnly={readOnly} /> : <MaintenanceAgendaPanel readOnly={readOnly} />}
            </motion.div>
        </div>
    );
}

