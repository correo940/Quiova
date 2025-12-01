'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

type Task = {
    id: string;
    title: string;
    date: string;
    time: string;
};

export default function TaskPostIts() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [hiddenTaskIds, setHiddenTaskIds] = useState<Set<string>>(new Set());
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchTasks(session.user.id);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchTasks(session.user.id);
            } else {
                setTasks([]);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchTasks = async (userId: string) => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .eq('is_completed', false)
            .order('due_date', { ascending: true });

        if (!error && data) {
            const mappedTasks: Task[] = data.map((item: any) => ({
                id: item.id,
                title: item.title,
                date: format(new Date(item.due_date), 'd MMM', { locale: es }),
                time: format(new Date(item.due_date), 'HH:mm'),
            }));
            setTasks(mappedTasks);
        }
    };

    const hideTask = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent navigation when clicking X
        setHiddenTaskIds(prev => new Set(prev).add(id));

        // Re-show after 3 minutes (180000 ms)
        setTimeout(() => {
            setHiddenTaskIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }, 3 * 60 * 1000);
    };

    const handleTaskClick = () => {
        router.push('/apps/mi-hogar/tasks');
    };

    if (!user || tasks.length === 0) return null;

    // Filter out hidden tasks
    const visibleTasks = tasks.filter(task => !hiddenTaskIds.has(task.id));

    if (visibleTasks.length === 0) return null;

    return (
        <div className="fixed top-24 left-4 z-40 flex flex-col gap-4 pointer-events-none">
            <AnimatePresence>
                {visibleTasks.map((task, index) => (
                    <motion.div
                        key={task.id}
                        initial={{ opacity: 0, scale: 0.8, x: -50, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0, rotate: index % 2 === 0 ? -2 : 2 }}
                        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                        className="pointer-events-auto relative w-48 bg-[#fef3c7] dark:bg-[#fcd34d] text-black p-4 shadow-lg transform transition-transform hover:scale-105 hover:z-50 cursor-pointer"
                        style={{
                            boxShadow: '2px 2px 10px rgba(0,0,0,0.1)',
                            fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif', // Fallback to handwritten-ish font
                        }}
                        onClick={handleTaskClick}
                    >
                        {/* Pin effect */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500 shadow-sm border border-red-600" />

                        <button
                            onClick={(e) => hideTask(e, task.id)}
                            className="absolute top-1 right-1 p-1 hover:bg-black/10 rounded-full transition-colors"
                            title="Ocultar por 3 minutos"
                        >
                            <X className="w-3 h-3 text-black/60" />
                        </button>

                        <p className="font-medium text-sm mb-2 leading-tight">{task.title}</p>

                        <div className="flex items-center text-xs text-black/60 gap-1 mt-2 border-t border-black/10 pt-2">
                            <Clock className="w-3 h-3" />
                            <span>{task.date} - {task.time}</span>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
