'use client';

import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

interface CalendarWidgetProps {
    date: Date | undefined;
    onDateSelect: (date: Date | undefined) => void;
}

export default function CalendarWidget({ date, onDateSelect }: CalendarWidgetProps) {
    const [taskDates, setTaskDates] = useState<Date[]>([]);

    useEffect(() => {
        const fetchTaskDates = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data } = await supabase
                .from('tasks')
                .select('due_date')
                .eq('user_id', session.user.id)
                .eq('is_completed', false);

            if (data) {
                const dates = data.map((task: any) => new Date(task.due_date));
                setTaskDates(dates);
            }
        };

        fetchTaskDates();
    }, []);

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Calendario</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={onDateSelect}
                    locale={es}
                    className="rounded-md border"
                    modifiers={{
                        hasTask: taskDates
                    }}
                    modifiersStyles={{
                        hasTask: { fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' }
                    }}
                />
            </CardContent>
        </Card>
    );
}
