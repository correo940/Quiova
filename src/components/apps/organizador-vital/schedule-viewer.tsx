'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Calendar as CalendarIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { generateSchedule } from '@/lib/smart-scheduler/engine';
import { toast } from 'sonner';

interface ScheduleBlock {
    id: string;
    type: 'fixed' | 'generated' | 'task';
    title: string;
    start: string; // HH:MM
    end: string;   // HH:MM
    date: string;  // YYYY-MM-DD
    color?: string;
    is_completed?: boolean;
}

const EVENTS_COLORS = {
    fixed: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', dark: { bg: 'dark:bg-blue-900/20', border: 'dark:border-blue-800', text: 'dark:text-blue-300' } },
    generated: { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', dark: { bg: 'dark:bg-green-900/20', border: 'dark:border-green-800', text: 'dark:text-green-300' } },
    task: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', dark: { bg: 'dark:bg-amber-900/20', border: 'dark:border-amber-800', text: 'dark:text-amber-300' } }
};

const DAY_LABELS: any = { Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles', Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo' };

export function ScheduleViewer({ onBack }: { onBack: () => void }) {
    const [loading, setLoading] = useState(false);
    const [schedule, setSchedule] = useState<ScheduleBlock[]>([]);

    // Default to current week's Monday
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
        return new Date(d.setDate(diff));
    });

    useEffect(() => {
        fetchSchedule();
    }, [currentWeekStart]);

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Calculate date range
            const startStr = currentWeekStart.toISOString().split('T')[0];
            const endDate = new Date(currentWeekStart);
            endDate.setDate(endDate.getDate() + 6);
            const endStr = endDate.toISOString().split('T')[0];

            // 1. Fetch Fixed Blocks
            const { data: fixed } = await supabase.from('smart_scheduler_fixed_blocks').select('*').eq('user_id', user.id);

            // 2. Fetch Generated Blocks for this week
            const { data: generated, error } = await supabase
                .from('smart_scheduler_generated_blocks')
                .select(`
                    *,
                    activity:smart_scheduler_activities(name)
                `)
                .eq('user_id', user.id)
                .gte('date', startStr)
                .lte('date', endStr);

            if (error) throw error;

            // 3. Fetch Tasks for this week
            const { data: tasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.id)
                .gte('due_date', startStr) // Assuming due_date is ISO string
                .lte('due_date', endStr + 'T23:59:59');

            // Combine
            const blocks: ScheduleBlock[] = [];

            // Add Fixed Blocks (mapped to dates of this week)
            fixed?.forEach((f: any) => {
                const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(f.day_of_week);
                if (dayIndex >= 0) {
                    const d = new Date(currentWeekStart);
                    d.setDate(d.getDate() + dayIndex);
                    blocks.push({
                        id: f.id,
                        type: 'fixed',
                        title: f.label,
                        start: f.start_time.slice(0, 5),
                        end: f.end_time.slice(0, 5),
                        date: d.toISOString().split('T')[0],
                        color: f.color
                    });
                }
            });

            // Add Generated Blocks
            generated?.forEach((g: any) => {
                blocks.push({
                    id: g.id,
                    type: 'generated',
                    title: g.activity?.name || 'Actividad',
                    start: g.start_time.slice(0, 5),
                    end: g.end_time.slice(0, 5),
                    date: g.date,
                    color: '#10b981'
                });
            });

            // Add Tasks
            tasks?.forEach((t: any) => {
                // Ensure task has a time, or default to all-day / specific fake time?
                // Tasks usually have a due DATE. If they have time, use it.
                // Assuming due_date is ISO timestamp.
                const d = new Date(t.due_date);
                const dateStr = d.toISOString().split('T')[0];
                const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                blocks.push({
                    id: t.id,
                    type: 'task',
                    title: t.title,
                    start: timeStr,
                    end: '', // Tasks are points in time usually, or just checked off
                    date: dateStr,
                    is_completed: t.is_completed
                });
            });

            setSchedule(blocks);

        } catch (error) {
            console.error(error);
            toast.error('Error cargando la agenda');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            await generateSchedule(user.id, currentWeekStart);
            toast.success('Agenda generada exitosamente');
            fetchSchedule();
        } catch (error) {
            console.error(error);
            toast.error('Error al generar la agenda');
        } finally {
            setLoading(false);
        }
    };

    const getDayDate = (offset: number) => {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + offset);
        return d;
    };

    return (
        <div className="h-full flex flex-col p-4 bg-slate-50 dark:bg-slate-950">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5" /> Agenda Semanal
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Semana del {currentWeekStart.toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleGenerate} disabled={loading} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Generar Inteligente
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border bg-white dark:bg-slate-900 shadow-sm p-4">
                <div className="grid grid-cols-7 gap-4 min-w-[800px]">
                    {[0, 1, 2, 3, 4, 5, 6].map(i => {
                        const date = getDayDate(i);
                        const dateStr = date.toISOString().split('T')[0];
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                        const dayBlocks = schedule
                            .filter(b => b.date === dateStr)
                            .sort((a, b) => a.start.localeCompare(b.start));

                        return (
                            <div key={i} className="flex flex-col gap-2">
                                <div className="sticky top-0 bg-white dark:bg-slate-900 pb-2 z-10 border-b mb-2">
                                    <div className="font-semibold text-center">{DAY_LABELS[dayName]}</div>
                                    <div className="text-xs text-center text-muted-foreground">{date.getDate()} {date.toLocaleDateString('es-ES', { month: 'short' })}</div>
                                </div>

                                <div className="space-y-2">
                                    {dayBlocks.length === 0 && (
                                        <div className="text-xs text-center text-muted-foreground py-8 italic border-2 border-dashed rounded-md">
                                            Libre
                                        </div>
                                    )}
                                    {dayBlocks.map(block => {
                                        const styles = EVENTS_COLORS[block.type] || EVENTS_COLORS.fixed;
                                        return (
                                            <div
                                                key={block.id}
                                                className={`p-2 rounded-md text-xs border ${styles.bg} ${styles.border} ${styles.text} ${styles.dark.bg} ${styles.dark.border} ${styles.dark.text} ${block.is_completed ? 'opacity-50 line-through' : ''}`}
                                            >
                                                <div className="font-bold truncate flex items-center gap-1">
                                                    {block.type === 'task' && <CheckCircle2 className="w-3 h-3" />}
                                                    {block.title}
                                                </div>
                                                <div className="opacity-80 font-mono text-[10px]">
                                                    {block.type === 'task' ? 'Tarea' : `${block.start} - ${block.end}`}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
