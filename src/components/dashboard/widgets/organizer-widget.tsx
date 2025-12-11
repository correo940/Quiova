'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Circle, Clock, Book, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useJournal } from '@/context/JournalContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tag } from 'lucide-react';

type Task = {
    id: string;
    title: string;
    description?: string;
    due_date: string;
    is_completed: boolean;
};

type JournalEntry = {
    id: string;
    content: any;
    updated_at: string;
    context_id: string;
    tags?: string[];
};

interface OrganizerWidgetProps {
    selectedDate: Date | undefined;
}

export default function OrganizerWidget({ selectedDate }: OrganizerWidgetProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { setIsOpen, setSelectedDate } = useJournal();
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [selectedTag, setSelectedTag] = useState<string>('all');

    const fetchData = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // --- Fetch Tasks ---
        let taskQuery = supabase
            .from('tasks')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('is_completed', false)
            .order('due_date', { ascending: true });

        if (selectedDate) {
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            taskQuery = taskQuery
                .gte('due_date', startOfDay.toISOString())
                .lte('due_date', endOfDay.toISOString());
        } else {
            taskQuery = taskQuery.limit(10);
        }

        const { data: taskData } = await taskQuery;
        if (taskData) setTasks(taskData);

        // --- Fetch Journal Entries ---
        let journalQuery = supabase
            .from('journal_entries')
            .select('*, tags')
            .eq('user_id', session.user.id)
            .order('updated_at', { ascending: false });

        if (selectedDate) {
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            journalQuery = journalQuery
                .gte('updated_at', startOfDay.toISOString())
                .lte('updated_at', endOfDay.toISOString());
        } else {
            journalQuery = journalQuery.limit(5);
        }

        const { data: journalData } = await journalQuery;
        if (journalData) {
            setJournalEntries(journalData);

            // Extract unique tags
            const allTags = new Set<string>();
            journalData.forEach((entry: any) => {
                if (entry.tags && Array.isArray(entry.tags)) {
                    entry.tags.forEach((tag: string) => allTags.add(tag));
                }
            });
            setAvailableTags(Array.from(allTags));
        }

        // --- Fetch Work Shifts ---
        let shiftQuery = supabase
            .from('work_shifts')
            .select('*')
            .eq('user_id', session.user.id)
            .order('start_time', { ascending: true });

        if (selectedDate) {
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            shiftQuery = shiftQuery
                .gte('start_time', startOfDay.toISOString())
                .lte('start_time', endOfDay.toISOString());
        } else {
            // If no date selected, maybe show upcoming 3?
            shiftQuery = shiftQuery.gte('start_time', new Date().toISOString()).limit(3);
        }

        const { data: shiftData } = await shiftQuery;
        if (shiftData) setShifts(shiftData);

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    // Subscribe to changes (simplified for now, re-fetch on mount/date change is main logic)
    useEffect(() => {
        const channel = supabase
            .channel('organizer_widget')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries' }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedDate]); // Re-subscribe if date changes to keep query fresh? Actually fetch is enough.

    const toggleTask = async (taskId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('tasks')
            .update({ is_completed: !currentStatus })
            .eq('id', taskId);

        if (!error) fetchData();
    };

    const openJournalEntry = (dateStr: string) => {
        const date = new Date(dateStr);
        setSelectedDate(date);
        setIsOpen(true);
    };

    // Helper to extract text from Tiptap JSON content
    const getPreviewText = (content: any) => {
        if (!content) return "Sin contenido";
        if (typeof content === 'string') return content;
        if (content.type === 'doc' && content.content) {
            return content.content.map((node: any) => {
                if (node.content) {
                    return node.content.map((n: any) => n.text).join(' ');
                }
                return '';
            }).join(' ').slice(0, 100) + '...';
        }
        return "Nota guardada";
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                    <span>
                        {selectedDate
                            ? `Organizador: ${format(selectedDate, "d 'de' MMMM", { locale: es })}`
                            : "Organizador Personal"
                        }
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                <Tabs defaultValue="tasks" className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="tasks" className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Tareas ({tasks.length})
                        </TabsTrigger>
                        <TabsTrigger value="shifts" className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Turnos ({shifts.length})
                        </TabsTrigger>
                        <TabsTrigger value="journal" className="flex items-center gap-2">
                            <Book className="w-4 h-4" />
                            Apuntes ({journalEntries.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="shifts" className="flex-1 min-h-0">
                        <ScrollArea className="h-[300px] pr-4">
                            {loading ? (
                                <p className="text-center text-muted-foreground py-4">Cargando...</p>
                            ) : shifts.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>Sin turnos</p>
                                    <p className="text-sm">Todo despejado hoy.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {shifts.map((shift) => (
                                        <Link href="/apps/mi-hogar/roster" key={shift.id} className="block group">
                                            <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 transition-all hover:shadow-md hover:border-green-300">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold text-green-800 dark:text-green-300">{shift.title}</span>
                                                    <span className="text-xs bg-white dark:bg-black/20 px-2 py-0.5 rounded border border-green-200 dark:border-green-800">
                                                        {format(new Date(shift.start_time), "HH:mm")} - {format(new Date(shift.end_time), "HH:mm")}
                                                    </span>
                                                </div>
                                                {shift.description && (
                                                    <div className="text-sm font-medium text-green-700 dark:text-green-400 mt-1 mb-1 line-clamp-2">
                                                        {shift.description}
                                                    </div>
                                                )}
                                                <div className="text-xs text-green-600 dark:text-green-500 opacity-80 group-hover:underline">
                                                    Ver en Cuadrante
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="tasks" className="flex-1 min-h-0">
                        <ScrollArea className="h-[300px] pr-4">
                            {loading ? (
                                <p className="text-center text-muted-foreground py-4">Cargando...</p>
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
                                                <Circle className="w-5 h-5" />
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{task.title}</p>
                                                <div className="flex items-center text-xs text-muted-foreground gap-1 mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{format(new Date(task.due_date), "HH:mm", { locale: es })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                        <div className="mt-4 text-center">
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/apps/mi-hogar/tasks">Gestionar Tareas</Link>
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="journal" className="flex-1 min-h-0">
                        <div className="mb-2 px-1">
                            <Select value={selectedTag} onValueChange={setSelectedTag}>
                                <SelectTrigger className="h-8 text-xs w-full">
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-3 h-3" />
                                        <SelectValue placeholder="Filtrar por etiqueta" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las etiquetas</SelectItem>
                                    {availableTags.map(tag => (
                                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <ScrollArea className="h-[260px] pr-4">
                            {loading ? (
                                <p className="text-center text-muted-foreground py-4">Cargando...</p>
                            ) : journalEntries.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>Sin apuntes</p>
                                    <p className="text-sm">No escribiste nada este día.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {journalEntries
                                        .filter(entry => selectedTag === 'all' || entry.tags?.includes(selectedTag))
                                        .map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                                                onClick={() => openJournalEntry(entry.updated_at)}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(entry.updated_at), "HH:mm", { locale: es })}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground ml-auto truncate max-w-[100px]">
                                                        {entry.context_id}
                                                    </span>
                                                </div>
                                                <p className="text-sm line-clamp-2 text-muted-foreground">
                                                    {getPreviewText(entry.content)}
                                                </p>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
