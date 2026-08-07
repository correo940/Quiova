'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';

type AppData = { label: string; emoji: string; count: number; items: { text: string; sub?: string }[] };

const APP_ORDER = ['tasks', 'shopping', 'savings', 'expenses', 'pharmacy', 'roster', 'garage', 'insurance', 'mortgages', 'utilities', 'recipes', 'documents', 'warranties', 'passwords', 'manuals'];

export default function ChatAppsPanel({ familyId }: { familyId: string }) {
    const [apps, setApps] = useState<Record<string, AppData> | null>(null);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [showStrip, setShowStrip] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch('/api/chat/app-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ familyId }),
            });
            const data = await res.json();
            if (data?.apps) setApps(data.apps);
        } catch {}
        setLoading(false);
    }, [familyId]);

    useEffect(() => {
        if (showStrip && !apps && !loading) fetchData();
    }, [showStrip, apps, loading, fetchData]);

    const activeApps = apps ? APP_ORDER.filter(k => apps[k] && apps[k].count > 0) : [];

    return (
        <>
            {/* Toggle button - small bar below header */}
            <button
                type="button"
                onClick={() => setShowStrip(!showStrip)}
                className="w-full flex items-center justify-center gap-1.5 py-1 bg-[#eae6df] dark:bg-[#141e16] border-b border-[#d4d0c8] dark:border-[#1e2a20] text-[11px] font-medium text-[#1a5c2e] dark:text-[#7ecf6d] hover:bg-[#e0dcd6] dark:hover:bg-[#1a2a1e] transition-colors"
            >
                <span>{showStrip ? '▾' : '▸'}</span>
                <span>Apps de la familia</span>
                {apps && activeApps.length > 0 && (
                    <span className="bg-[#1a5c2e]/10 dark:bg-[#1a5c2e]/20 text-[#1a5c2e] dark:text-[#7ecf6d] px-1.5 py-0 rounded-full text-[10px]">
                        {activeApps.length}
                    </span>
                )}
            </button>

            {/* App strip */}
            <AnimatePresence>
                {showStrip && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-[#eae6df] dark:bg-[#141e16] border-b border-[#d4d0c8] dark:border-[#1e2a20]"
                    >
                        {loading && !apps ? (
                            <div className="flex justify-center py-3">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-[#1a5c2e]/40 border-t-[#1a5c2e] rounded-full" />
                            </div>
                        ) : activeApps.length === 0 ? (
                            <p className="text-center text-[12px] text-[#6b7b6e] py-3">No hay datos en tus apps</p>
                        ) : (
                            <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-none">
                                {activeApps.map(key => {
                                    const app = apps![key];
                                    const isActive = expanded === key;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setExpanded(isActive ? null : key)}
                                            className={`flex flex-col items-center gap-0.5 min-w-[52px] px-1.5 py-1.5 rounded-xl transition-all flex-shrink-0 ${
                                                isActive
                                                    ? 'bg-[#1a5c2e] shadow-md scale-105'
                                                    : 'bg-white dark:bg-[#1e2a20] shadow-sm hover:shadow-md hover:scale-[1.02] border border-[#e0dcd6] dark:border-[#2a3a2e]'
                                            }`}
                                        >
                                            <span className="text-[20px] leading-none">{app.emoji}</span>
                                            <span className={`text-[9px] font-medium leading-tight truncate max-w-[48px] ${
                                                isActive ? 'text-white' : 'text-[#4a5a4e] dark:text-[#a0b0a4]'
                                            }`}>
                                                {app.label}
                                            </span>
                                            <span className={`text-[8px] font-bold px-1.5 py-0 rounded-full ${
                                                isActive
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-[#1a5c2e]/10 text-[#1a5c2e] dark:bg-[#1a5c2e]/20 dark:text-[#7ecf6d]'
                                            }`}>
                                                {app.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Expanded app card */}
            <AnimatePresence>
                {expanded && apps?.[expanded] && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
                        onClick={() => setExpanded(null)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="bg-white dark:bg-[#162018] w-full max-w-md max-h-[65vh] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Handle bar */}
                            <div className="flex justify-center pt-3 pb-1 sm:hidden">
                                <div className="w-10 h-1 rounded-full bg-[#6b7b6e]/30" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a5c2e] to-[#1e7a3a] text-white">
                                <div className="flex items-center gap-2">
                                    <span className="text-[22px]">{apps[expanded].emoji}</span>
                                    <div>
                                        <h2 className="text-[17px] font-semibold leading-tight">{apps[expanded].label}</h2>
                                        <p className="text-[11px] text-white/70">{apps[expanded].count} elementos</p>
                                    </div>
                                </div>
                                <button onClick={() => setExpanded(null)} className="p-1.5 rounded-full hover:bg-white/10">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Items list */}
                            <div className="flex-1 overflow-y-auto">
                                {apps[expanded].items.length === 0 ? (
                                    <p className="text-center text-[13px] text-[#6b7b6e] py-8">Sin datos</p>
                                ) : (
                                    <div className="divide-y divide-[#e9ebe6] dark:divide-[#1e2a20]">
                                        {apps[expanded].items.map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 px-4 py-3">
                                                <div className="w-2 h-2 rounded-full bg-[#1a5c2e]/30 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[14px] text-[#1a2318] dark:text-[#e0e8e2] truncate">{item.text}</p>
                                                    {item.sub && (
                                                        <p className="text-[12px] text-[#6b7b6e] dark:text-[#8a9b8e] truncate">{item.sub}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
