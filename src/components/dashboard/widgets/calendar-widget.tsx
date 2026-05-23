'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { addMonths, format, setMonth, setYear, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useJournal } from '@/context/JournalContext';
import { supabase } from '@/lib/supabase';

interface CalendarWidgetProps {
    date: Date | undefined;
    onDateSelect: (date: Date | undefined) => void;
    user: User | null; // ✅ recibido del padre, sin llamadas extra a Supabase
    className?: string;
    isWeekly?: boolean;
    onToggleView?: () => void;
}

export default function CalendarWidget({ 
    date, 
    onDateSelect, 
    user, 
    className, 
    isWeekly = false, 
    onToggleView 
}: CalendarWidgetProps) {
    const [taskDates, setTaskDates] = useState<Date[]>([]);
    const [journalDates, setJournalDates] = useState<Date[]>([]);
    const [shiftDates, setShiftDates] = useState<Date[]>([]);
    const [visibleMonth, setVisibleMonth] = useState<Date>(date ?? new Date());
    const { setSelectedDate } = useJournal();

    useEffect(() => {
        const fetchCalendarData = async () => {
            // ✅ Usar el user recibido como prop — sin llamadas extra a Supabase
            if (!user) return;

            const { data: tasks } = await supabase
                .from('tasks')
                .select('due_date')
                .eq('user_id', user.id)
                .eq('is_completed', false)
                .not('due_date', 'is', null);
            if (tasks) setTaskDates(tasks.map((task: any) => new Date(task.due_date)));

            const { data: entries } = await supabase
                .from('journal_entries')
                .select('updated_at')
                .eq('user_id', user.id);
            if (entries) setJournalDates(entries.map((entry: any) => new Date(entry.updated_at)));

            const { data: shifts } = await supabase
                .from('work_shifts')
                .select('start_time')
                .eq('user_id', user.id);
            if (shifts) setShiftDates(shifts.map((shift: any) => new Date(shift.start_time)));
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void fetchCalendarData();
            }
        };

        const handleWindowFocus = () => {
            void fetchCalendarData();
        };

        const handleExternalRefresh = () => {
            void fetchCalendarData();
        };

        void fetchCalendarData();
        window.addEventListener('focus', handleWindowFocus);
        window.addEventListener('quioba-calendar-refresh', handleExternalRefresh);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('focus', handleWindowFocus);
            window.removeEventListener('quioba-calendar-refresh', handleExternalRefresh);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user, date]); // ✅ re-ejecutar cuando user cambia de null → User

    useEffect(() => {
        if (date) {
            setVisibleMonth(date);
        }
    }, [date]);

    const monthOptions = useMemo(
        () =>
            Array.from({ length: 12 }, (_, index) => ({
                value: index.toString(),
                label: format(new Date(2026, index, 1), 'MMMM', { locale: es }),
            })),
        []
    );

    const currentYear = new Date().getFullYear();
    const yearOptions = useMemo(
        () => Array.from({ length: 41 }, (_, index) => currentYear - 20 + index),
        [currentYear]
    );

    const handleDateSelect = (nextDate: Date | undefined) => {
        onDateSelect(nextDate);
        setSelectedDate(nextDate);
    };

    const handleToday = () => {
        const today = new Date();
        setVisibleMonth(today);
        handleDateSelect(today);
    };

    const handleMonthSelect = (monthValue: string) => {
        setVisibleMonth((current) => setMonth(current, Number(monthValue)));
    };

    const handleYearSelect = (yearValue: string) => {
        setVisibleMonth((current) => setYear(current, Number(yearValue)));
    };

    if (isWeekly) {
        const selected = date ?? new Date();
        const startOfCurrentWeek = startOfWeek(selected, { weekStartsOn: 1 });
        const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));

        const hasTask = (day: Date) => taskDates.some(d => isSameDay(d, day));
        const hasJournal = (day: Date) => journalDates.some(d => isSameDay(d, day));
        const hasShift = (day: Date) => shiftDates.some(d => isSameDay(d, day));

        return (
            <Card className={cn("overflow-hidden border-none shadow-md flex flex-col shrink-0 bg-white dark:bg-slate-950", className)}>
                <div className="flex flex-row items-center justify-between py-1.5 px-3 bg-green-50/50 dark:bg-green-950/10 border-b border-green-100 dark:border-green-900/30 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs capitalize">
                            {format(selected, 'MMMM yyyy', { locale: es })}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-medium hidden md:inline">
                            • Sem {format(selected, 'w')}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-primary rounded-full hover:bg-slate-100 dark:hover:bg-slate-900"
                            onClick={() => handleDateSelect(addDays(selected, -7))}
                            title="Semana anterior"
                        >
                            <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] font-semibold px-2 border-slate-200 dark:border-slate-800"
                            onClick={handleToday}
                        >
                            Hoy
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-primary rounded-full hover:bg-slate-100 dark:hover:bg-slate-900"
                            onClick={() => handleDateSelect(addDays(selected, 7))}
                            title="Semana siguiente"
                        >
                            <ChevronRight className="h-3 w-3" />
                        </Button>
                        {onToggleView && (
                            <>
                                <div className="h-3 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5"></div>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                                    onClick={onToggleView}
                                    title="Maximizar calendario"
                                >
                                    <Maximize2 className="h-3 w-3" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <CardContent className="p-1.5 bg-white dark:bg-slate-950 flex flex-col justify-center shrink-0">
                    <div className="grid grid-cols-7 gap-1 w-full">
                        {weekDays.map((day) => {
                            const isSelected = date ? isSameDay(day, date) : false;
                            const isTodayDate = isSameDay(day, new Date());
                            
                            const dayHasTask = hasTask(day);
                            const dayHasShift = hasShift(day);
                            const dayHasJournal = hasJournal(day);

                            return (
                                <button
                                    key={day.toISOString()}
                                    type="button"
                                    onClick={() => handleDateSelect(day)}
                                    className={cn(
                                        "flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all duration-200 group relative",
                                        isSelected
                                            ? "bg-green-800 text-white shadow shadow-green-800/20 scale-105 font-bold"
                                            : isTodayDate
                                                ? "bg-green-50/50 text-slate-800 border border-green-500/50 hover:bg-green-50 dark:bg-green-950/20 dark:text-slate-100"
                                                : "hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                                    )}
                                >
                                    <span className={cn(
                                        "text-[9px] font-bold uppercase tracking-wide leading-none mb-0.5",
                                        isSelected ? "text-green-200" : "text-muted-foreground"
                                    )}>
                                        {format(day, 'eee', { locale: es })}
                                    </span>
                                    <span className="text-sm font-extrabold leading-none">
                                        {format(day, 'd')}
                                    </span>
                                    
                                    <div className="flex gap-0.5 justify-center mt-0.5 h-1">
                                        {dayHasTask && (
                                            <span className={cn(
                                                "w-1 h-1 rounded-full",
                                                isSelected ? "bg-white" : "bg-purple-500"
                                            )} />
                                        )}
                                        {dayHasShift && (
                                            <span className={cn(
                                                "w-1 h-1 rounded-full",
                                                isSelected ? "bg-white" : "bg-emerald-500"
                                            )} />
                                        )}
                                        {dayHasJournal && (
                                            <span className={cn(
                                                "w-1 h-1 rounded-full",
                                                isSelected ? "bg-white" : "bg-orange-500"
                                            )} />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("overflow-hidden border-none shadow-md flex flex-col bg-white dark:bg-slate-950", className)}>
            {/* Cabecera compacta: nav + selectores + Hoy + minimizar en una sola fila */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 px-2 py-2 bg-green-50/50 dark:bg-green-950/10 border-b border-green-100 dark:border-green-900/30 shrink-0">
                <div className="flex items-center gap-1">
                    {/* Botón mes anterior */}
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 border border-slate-200 dark:border-slate-700 rounded-lg"
                        onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>

                    {/* Selector de mes */}
                    <Select value={visibleMonth.getMonth().toString()} onValueChange={handleMonthSelect}>
                        <SelectTrigger className="h-7 text-xs w-[90px] bg-white dark:bg-slate-950 capitalize border-slate-200 dark:border-slate-700 px-2">
                            <SelectValue placeholder="Mes" />
                        </SelectTrigger>
                        <SelectContent>
                            {monthOptions.map((month) => (
                                <SelectItem key={month.value} value={month.value} className="capitalize text-xs">
                                    {month.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Selector de año */}
                    <Select value={visibleMonth.getFullYear().toString()} onValueChange={handleYearSelect}>
                        <SelectTrigger className="h-7 text-xs w-[68px] shrink-0 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 px-2">
                            <SelectValue placeholder="Año" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                            {yearOptions.map((year) => (
                                <SelectItem key={year} value={year.toString()} className="text-xs">
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Botón mes siguiente */}
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 border border-slate-200 dark:border-slate-700 rounded-lg"
                        onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                    >
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                </div>

                <div className="flex items-center gap-1">
                    <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />

                    {/* Botón Hoy */}
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 shrink-0 border-slate-200 dark:border-slate-700"
                        onClick={handleToday}
                    >
                        Hoy
                    </Button>

                    {/* Botón minimizar */}
                    {onToggleView && (
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                            onClick={onToggleView}
                            title="Minimizar calendario"
                        >
                            <Minimize2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            <CardContent className="flex-1 flex justify-center items-start p-1 bg-white dark:bg-slate-950">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    month={visibleMonth}
                    onMonthChange={setVisibleMonth}
                    locale={es}
                    initialFocus
                    className="rounded-lg w-full"
                    classNames={{
                        caption: 'hidden',
                        months: 'w-full',
                        month: 'w-full space-y-1',
                        table: 'w-full border-collapse',
                        head_row: 'flex w-full',
                        head_cell: 'text-green-800 dark:text-green-500 rounded-md flex-1 font-bold text-[0.7rem] text-center',
                        row: 'flex w-full mt-1',
                        cell: 'flex-1 h-8 text-center text-xs p-0 relative focus-within:relative focus-within:z-20',
                        day: 'h-8 w-full p-0 font-normal aria-selected:opacity-100 text-xs rounded-md hover:bg-slate-100 dark:hover:bg-slate-800',
                        day_selected:
                            'bg-green-800 text-white hover:bg-green-900 focus:bg-green-900 shadow transition-transform z-10 font-bold rounded-md',
                        day_today: 'bg-green-50 text-green-950 font-bold ring-1 ring-green-500/50 rounded-md',
                        day_outside: 'text-muted-foreground opacity-40',
                        day_disabled: 'text-muted-foreground opacity-30',
                    }}
                    modifiers={{
                        hasTask: taskDates,
                        hasJournal: journalDates,
                        hasShift: shiftDates,
                    }}
                    modifiersStyles={{
                        hasTask: {
                            textDecoration: 'underline',
                            textDecorationColor: '#9333ea',
                            textDecorationThickness: '2px',
                            fontWeight: 'bold',
                        },
                        hasJournal: { color: '#ea580c', fontWeight: '600', fontStyle: 'italic' },
                        hasShift: {
                            backgroundColor: '#d1fae5',
                            color: '#065f46',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                        },
                    }}
                />
            </CardContent>

            <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 flex justify-around text-[9px] text-muted-foreground shrink-0">
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-sm bg-purple-500"></div><span>Tarea</span></div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div><span>Turno</span></div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div><span>Diario</span></div>
            </div>
        </Card>
    );
}

