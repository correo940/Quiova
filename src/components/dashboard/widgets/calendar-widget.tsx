'use client';

import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

import { useJournal } from '@/context/JournalContext';

interface CalendarWidgetProps {
    date: Date | undefined;
    onDateSelect: (date: Date | undefined) => void;
}

export default function CalendarWidget({ date, onDateSelect }: CalendarWidgetProps) {
    const [taskDates, setTaskDates] = useState<Date[]>([]);
    const [journalDates, setJournalDates] = useState<Date[]>([]);
    const { setIsOpen, setSelectedDate } = useJournal();

    useEffect(() => {
        const fetchData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            // Fetch Tasks
            const { data: tasks } = await supabase
                .from('tasks')
                .select('due_date')
                .eq('user_id', session.user.id)
                .eq('is_completed', false);

            if (tasks) {
                const dates = tasks.map((task: any) => new Date(task.due_date));
                setTaskDates(dates);
            }

            // Fetch Journal Entries
            const { data: entries } = await supabase
                .from('journal_entries')
                .select('updated_at')
                .eq('user_id', session.user.id);

            if (entries) {
                const dates = entries.map((entry: any) => new Date(entry.updated_at));
                setJournalDates(dates);
            }
        };

        fetchData();
    }, []);

    const handleDateSelect = (date: Date | undefined) => {
        onDateSelect(date);
        setSelectedDate(date);
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Calendario</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    locale={es}
                    className="rounded-md border"
                    modifiers={{
                        hasTask: taskDates,
                        hasJournal: journalDates
                    }}
                    modifiersStyles={{
                        hasTask: { fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' },
                        hasJournal: { border: '2px solid var(--primary)', borderRadius: '50%' }
                    }}
                />
            </CardContent>
        </Card>
    );
}
