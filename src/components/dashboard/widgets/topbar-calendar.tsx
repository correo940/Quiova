import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import CalendarWidget from './calendar-widget';

interface TopbarCalendarProps {
    selectedDate: Date | undefined;
    onDateSelect: (date: Date | undefined) => void;
    user: User | null;
}

export default function TopbarCalendar({ selectedDate, onDateSelect, user }: TopbarCalendarProps) {
    const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
    const [taskDates, setTaskDates] = useState<Date[]>([]);
    const [journalDates, setJournalDates] = useState<Date[]>([]);
    const [shiftDates, setShiftDates] = useState<Date[]>([]);

    useEffect(() => {
        const fetchCalendarData = async () => {
            if (!user) return;
            const { data: tasks } = await supabase.from('tasks').select('due_date').eq('user_id', user.id).eq('is_completed', false).not('due_date', 'is', null);
            if (tasks) setTaskDates(tasks.map((task: any) => new Date(task.due_date)));

            const { data: entries } = await supabase.from('journal_entries').select('updated_at').eq('user_id', user.id);
            if (entries) setJournalDates(entries.map((entry: any) => new Date(entry.updated_at)));

            const { data: shifts } = await supabase.from('work_shifts').select('start_time').eq('user_id', user.id);
            if (shifts) setShiftDates(shifts.map((shift: any) => new Date(shift.start_time)));
        };
        fetchCalendarData();
    }, [user, selectedDate]);

    const hasTask = (day: Date) => taskDates.some(d => isSameDay(d, day));
    const hasJournal = (day: Date) => journalDates.some(d => isSameDay(d, day));
    const hasShift = (day: Date) => shiftDates.some(d => isSameDay(d, day));

    const current = selectedDate ?? new Date();

    const handlePrev = () => onDateSelect(addDays(current, viewMode === 'week' ? -7 : -1));
    const handleNext = () => onDateSelect(addDays(current, viewMode === 'week' ? 7 : 1));

    const startOfCurrentWeek = startOfWeek(current, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(current, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));

    const weekRangeLabel = `${format(startOfCurrentWeek, 'd MMM', { locale: es })} – ${format(endOfCurrentWeek, 'd MMM', { locale: es })}`;

    const viewControls = (
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 p-0.5 gap-0.5">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('day')}
                className={cn(
                    "h-6 px-2.5 text-[10px] font-semibold rounded-md transition-all duration-150",
                    viewMode === 'day'
                        ? "bg-white dark:bg-slate-950 text-green-700 dark:text-green-400 shadow-sm"
                        : "text-muted-foreground hover:text-foreground bg-transparent hover:bg-white/60 dark:hover:bg-slate-700"
                )}
            >
                DÍA
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('week')}
                className={cn(
                    "h-6 px-2.5 text-[10px] font-semibold rounded-md transition-all duration-150",
                    viewMode === 'week'
                        ? "bg-white dark:bg-slate-950 text-green-700 dark:text-green-400 shadow-sm"
                        : "text-muted-foreground hover:text-foreground bg-transparent hover:bg-white/60 dark:hover:bg-slate-700"
                )}
            >
                SEM
            </Button>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2.5 text-[10px] font-semibold rounded-md gap-1 text-muted-foreground hover:text-foreground bg-transparent hover:bg-white/60 dark:hover:bg-slate-700 transition-all duration-150"
                    >
                        <CalendarIcon className="w-3 h-3" />
                        MES
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                    <CalendarWidget
                        date={selectedDate}
                        onDateSelect={(date) => { onDateSelect(date); }}
                        user={user}
                        isWeekly={false}
                        className="border-0 shadow-none w-[280px]"
                    />
                </PopoverContent>
            </Popover>
        </div>
    );

    return (
        <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-900/30 p-2 rounded-xl border border-slate-100 dark:border-slate-800 w-full">

            {/* Fila 1: flechas + etiqueta + controles */}
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary">
                    <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex-1 flex justify-center">
                    {viewMode === 'day' ? (
                        <div className="flex flex-col items-center justify-center py-1 px-3 rounded-lg bg-green-800 text-white shadow font-bold min-w-[80px]">
                            <span className="text-[10px] uppercase tracking-wide leading-none mb-0.5 text-green-200">
                                {format(current, 'eeee', { locale: es })}
                            </span>
                            <span className="text-sm font-extrabold leading-none">{format(current, 'd')}</span>
                            <div className="flex gap-1 justify-center mt-1 h-1">
                                {hasTask(current) && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                {hasShift(current) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />}
                                {hasJournal(current) && <span className="w-1.5 h-1.5 rounded-full bg-orange-300" />}
                            </div>
                        </div>
                    ) : (
                        <span className="text-[11px] font-semibold text-muted-foreground capitalize">
                            {weekRangeLabel}
                        </span>
                    )}
                </div>

                <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary">
                    <ChevronRight className="w-4 h-4" />
                </Button>

                {viewControls}
            </div>

            {/* Fila 2: los 7 días de la semana (solo en modo semana) */}
            {viewMode === 'week' && (
                <div className="grid grid-cols-7 gap-1">
                    {weekDays.map(day => {
                        const isSelected = isSameDay(day, current);
                        const isTodayDate = isSameDay(day, new Date());
                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => onDateSelect(day)}
                                className={cn(
                                    "flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-200 active:scale-95",
                                    isSelected
                                        ? "bg-green-800 text-white shadow-md font-bold"
                                        : isTodayDate
                                            ? "bg-green-50 text-slate-800 border border-green-500/50 hover:bg-green-100 dark:bg-green-900/30 dark:text-slate-100"
                                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                )}
                            >
                                <span className={cn(
                                    "text-[9px] font-bold uppercase tracking-wide leading-none mb-1",
                                    isSelected ? "text-green-200" : "text-muted-foreground"
                                )}>
                                    {format(day, 'EEEEE', { locale: es })}
                                </span>
                                <span className="text-sm font-extrabold leading-none">
                                    {format(day, 'd')}
                                </span>
                                <div className="flex gap-0.5 justify-center mt-1 h-1">
                                    {hasTask(day) && <span className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-purple-500")} />}
                                    {hasShift(day) && <span className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-emerald-500")} />}
                                    {hasJournal(day) && <span className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-orange-500")} />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
