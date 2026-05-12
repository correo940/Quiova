'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ShoppingCart, CheckSquare, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

const actions = [
    {
        label: 'Nueva tarea',
        icon: CheckSquare,
        href: '/apps/mi-hogar/tasks',
        color: 'bg-blue-600',
    },
    {
        label: 'Lista compra',
        icon: ShoppingCart,
        href: '/apps/mi-hogar/shopping',
        color: 'bg-green-800',
    },
    {
        label: 'Nuevo gasto',
        icon: Wallet,
        href: '/apps/mi-hogar/expenses',
        color: 'bg-amber-600',
    },
];

export default function QuickActionFab() {
    const [isOpen, setIsOpen] = useState(false);
    const fabRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    return (
        <div ref={fabRef} className="fixed bottom-28 right-6 md:bottom-28 md:right-8 z-40">
            {/* Action items */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/10 backdrop-blur-[2px] -z-10"
                            onClick={() => setIsOpen(false)}
                        />
                        {/* Actions */}
                        <div className="absolute bottom-16 right-0 flex flex-col items-end gap-3 mb-2">
                            {actions.map((action, i) => (
                                <motion.button
                                    key={action.label}
                                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
                                    onClick={() => {
                                        setIsOpen(false);
                                        router.push(action.href);
                                    }}
                                    className="flex items-center gap-3 group"
                                >
                                    <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md border border-slate-100 dark:border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                        {action.label}
                                    </span>
                                    <div className={`w-11 h-11 ${action.color} rounded-full flex items-center justify-center shadow-lg text-white hover:scale-110 transition-transform`}>
                                        <action.icon className="w-5 h-5" />
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* Main FAB button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-green-800 hover:bg-green-700 rounded-full flex items-center justify-center shadow-xl shadow-green-900/30 text-white transition-colors"
            >
                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                    <Plus className="w-7 h-7" strokeWidth={2.5} />
                </motion.div>
            </motion.button>
        </div>
    );
}
