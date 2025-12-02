'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Task = {
    id: string;
    title: string;
    due_date: string;
    is_completed: boolean;
};

interface TasksWidgetProps {
    selectedDate: Date | undefined;
}

export default function TasksWidget({ selectedDate }: TasksWidgetProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        let query = supabase
            .from('tasks')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('is_completed', false)
            .order('due_date', { ascending: true });

        if (selectedDate) {
            // Filter by selected date
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            query = query
                .gte('due_date', startOfDay.toISOString())
                .lte('due_date', endOfDay.toISOString());
        } else {
            // If no date selected, show next 10 tasks
            query = query.limit(10);
        }

        const { data, error } = await query;

        if (!error && data) {
            setTasks(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTasks();
    }, [selectedDate]); // Refetch when date changes

    useEffect(() => {
        fetchTasks();

        // Subscribe to changes
        const channel = supabase
            .channel('tasks_widget')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
                fetchTasks();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const toggleTask = async (taskId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('tasks')
            .update({ is_completed: !currentStatus })
            .eq('id', taskId);

        if (!error) fetchTasks();
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>
                    {selectedDate
                        ? `Tareas del ${format(selectedDate, "d 'de' MMMM", { locale: es })}`
                        : "Tareas Pendientes"
                    }
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/apps/mi-hogar/tasks">Ver todas</Link>
                </Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                <ScrollArea className="h-[300px] pr-4">
                    {loading ? (
                        <p className="text-center text-muted-foreground py-4">Cargando tareas...</p>
                    ) : tasks.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>¡Todo al día!</p>
                            <p className="text-sm">No tienes tareas pendientes.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tasks.map((task) => (
                                <div key={task.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group">
                                    <button
                                        onClick={() => toggleTask(task.id, task.is_completed)}
                                        className="mt-1 text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        {task.is_completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-medium truncate ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                            {task.title}
                                        </p>
                                        <div className="flex items-center text-xs text-muted-foreground gap-1 mt-1">
                                            <Clock className="w-3 h-3" />
                                            <span>
                                                {format(new Date(task.due_date), "d 'de' MMMM, HH:mm", { locale: es })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
