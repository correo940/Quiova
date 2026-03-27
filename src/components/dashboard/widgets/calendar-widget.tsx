'use client';

import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { CalendarDays } from 'lucide-react';
import { useJournal } from '@/context/JournalContext';

interface CalendarWidgetProps {
    date: Date | undefined;
    onDateSelect: (date: Date | undefined) => void;
}

export default function CalendarWidget({ date, onDateSelect }: CalendarWidgetProps) {
    const [taskDates, setTaskDates] = useState<Date[]>([]);
    const [journalDates, setJournalDates] = useState<Date[]>([]);
    const [shiftDates, setShiftDates] = useState<Date[]>([]);
    const { setSelectedDate } = useJournal();

    useEffect(() => {
        const fetchData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data: tasks } = await supabase
                .from('tasks')
                .select('due_date')
                .eq('user_id', session.user.id)
                .eq('is_completed', false);
            if (tasks) setTaskDates(tasks.map((task: any) => new Date(task.due_date)));

            const { data: entries } = await supabase
                .from('journal_entries')
                .select('updated_at')
                .eq('user_id', session.user.id);
            if (entries) setJournalDates(entries.map((entry: any) => new Date(entry.updated_at)));

            const { data: shifts } = await supabase
                .from('work_shifts')
                .select('start_time')
                .eq('user_id', session.user.id);
            if (shifts) setShiftDates(shifts.map((shift: any) => new Date(shift.start_time)));
        };

        fetchData();
    }, []);

    const handleDateSelect = (nextDate: Date | undefined) => {
        onDateSelect(nextDate);
        setSelectedDate(nextDate);
    };

    const handleToday = () => {
        const today = new Date();
        handleDateSelect(today);
    };

    return (
        <Card className="h-full flex flex-col overflow-hidden border-none shadow-md">
            <CardHeader className="py-2 px-4 bg-emerald-50/50 dark:bg-emerald-950/10 border-b border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-emerald-800 dark:text-emerald-400 font-headline text-lg">Calendario</CardTitle>
                    <Button size="sm" variant="outline" onClick={handleToday}>Hoy</Button>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {date ? `Fecha seleccionada: ${format(date, 'PPP', { locale: es })}` : 'Selecciona una fecha'}
                </div>
            </CardHeader>
            <CardContent className="flex justify-center p-2 flex-1 min-h-0 items-start bg-white dark:bg-slate-950">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    locale={es}
                    initialFocus
                    className="rounded-lg"
                    classNames={{
                        head_cell: 'text-emerald-600 dark:text-emerald-500 rounded-md w-9 font-bold text-[0.8rem]',
                        day_selected: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:bg-emerald-700 shadow-lg transition-transform z-10 font-bold rounded-lg',
                        day_today: 'bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500/50 rounded-lg',
                    }}
                    modifiers={{
                        hasTask: taskDates,
                        hasJournal: journalDates,
                        hasShift: shiftDates,
                    }}
                    modifiersStyles={{
                        hasTask: { textDecoration: 'underline', textDecorationColor: '#9333ea', textDecorationThickness: '3px', fontWeight: 'bold' },
                        hasJournal: { color: '#ea580c', fontWeight: '600', fontStyle: 'italic' },
                        hasShift: { backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', fontWeight: 'bold' },
                    }}
                />
            </CardContent>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-2 border-t border-slate-100 dark:border-slate-800 flex justify-around text-[10px] text-muted-foreground shrink-0">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-purple-500"></div><span>Tarea</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-200 border border-emerald-600"></div><span>Turno</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div><span>Diario</span></div>
            </div>
        </Card>
    );
}
