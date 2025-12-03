'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, BellOff, Calendar as CalendarIcon, Clock, Trash2, Plus, CheckCircle2, Loader2, Pencil, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import PostItConfig from './post-it-config';
import { usePostItSettings } from '@/context/PostItSettingsContext';

type Task = {
    id: string;
    title: string;
    notes?: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    hasAlarm: boolean;
    completed: boolean;
};

export default function TaskManager() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [hasAlarm, setHasAlarm] = useState(true);
    const [loading, setLoading] = useState(true);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const { user } = useAuth();
    const { colors } = usePostItSettings();

    useEffect(() => {
        if (user) {
            fetchTasks();
        } else {
            setTasks([]);
            setLoading(false);
        }

        // Request notification permission
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    }, [user]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .order('due_date', { ascending: true });

            if (error) throw error;

            const mappedTasks: Task[] = data.map((item: any) => {
                const dueDate = new Date(item.due_date);
                return {
                    id: item.id,
                    title: item.title,
                    notes: item.description,
                    date: format(dueDate, 'yyyy-MM-dd'),
                    time: format(dueDate, 'HH:mm'),
                    hasAlarm: item.has_alarm,
                    completed: item.is_completed,
                };
            });

            setTasks(mappedTasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            toast.error('Error al cargar las tareas');
        } finally {
            setLoading(false);
        }
    };

    // Alarm Checker
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const currentTime = format(now, 'HH:mm');
            const currentDate = format(now, 'yyyy-MM-dd');

            tasks.forEach(task => {
                if (!task.completed && task.hasAlarm && task.date === currentDate && task.time === currentTime) {
                    // Trigger alarm
                    playAlarmSound();
                    showNotification(task.title);
                    toast.info(`⏰ ALARMA: ${task.title}`, {
                        duration: 10000,
                        action: {
                            label: 'Completar',
                            onClick: () => toggleComplete(task.id)
                        }
                    });
                }
            });
        }, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [tasks]);

    const playAlarmSound = () => {
        try {
            const audio = new Audio('/alarm-sound.mp3');
            audio.play().catch(e => console.log('Audio play failed', e));
        } catch (e) {
            console.error('Audio play failed', e);
        }
    };

    const showNotification = (title: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Mi Hogar - Alarma', {
                body: title,
                icon: '/icons/icon-192x192.png'
            });
        }
    };

    const handleSaveTask = async () => {
        if (!title || !date || !time || !user) {
            toast.error('Completa todos los campos');
            return;
        }

        const dueDate = new Date(`${date}T${time}`);

        try {
            if (editingTask) {
                // Update existing task
                const { error } = await supabase
                    .from('tasks')
                    .update({
                        title,
                        description: notes,
                        due_date: dueDate.toISOString(),
                        has_alarm: hasAlarm,
                    })
                    .eq('id', editingTask.id);

                if (error) throw error;

                setTasks(tasks.map(t => t.id === editingTask.id ? {
                    ...t,
                    title,
                    notes,
                    date,
                    time,
                    hasAlarm
                } : t).sort((a, b) => {
                    return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
                }));

                toast.success('Tarea actualizada');
                cancelEditing();
            } else {
                // Create new task
                const { data, error } = await supabase
                    .from('tasks')
                    .insert([
                        {
                            user_id: user.id,
                            title,
                            description: notes,
                            due_date: dueDate.toISOString(),
                            has_alarm: hasAlarm,
                            is_completed: false,
                        },
                    ])
                    .select()
                    .single();

                if (error) throw error;

                const newTask: Task = {
                    id: data.id,
                    title: data.title,
                    notes: data.description,
                    date: format(new Date(data.due_date), 'yyyy-MM-dd'),
                    time: format(new Date(data.due_date), 'HH:mm'),
                    hasAlarm: data.has_alarm,
                    completed: data.is_completed,
                };

                setTasks([...tasks, newTask].sort((a, b) => {
                    return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
                }));

                setTitle('');
                setNotes('');
                toast.success('Tarea programada');
            }
        } catch (error) {
            console.error('Error saving task:', error);
            toast.error(editingTask ? 'Error al actualizar la tarea' : 'Error al programar la tarea');
        }
    };

    const startEditing = (task: Task) => {
        setEditingTask(task);
        setTitle(task.title);
        setNotes(task.notes || '');
        setDate(task.date);
        setTime(task.time);
        setHasAlarm(task.hasAlarm);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEditing = () => {
        setEditingTask(null);
        setTitle('');
        setNotes('');
        setDate('');
        setTime('');
        setHasAlarm(true);
    };

    const toggleComplete = async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        try {
            const { error } = await supabase
                .from('tasks')
                .update({ is_completed: !task.completed })
                .eq('id', id);

            if (error) throw error;

            setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
        } catch (error) {
            console.error('Error updating task:', error);
            toast.error('Error al actualizar la tarea');
        }
    };

    const deleteTask = async (id: string) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setTasks(tasks.filter(t => t.id !== id));
            toast.success('Tarea eliminada');
            if (editingTask?.id === id) cancelEditing();
        } catch (error) {
            console.error('Error deleting task:', error);
            toast.error('Error al eliminar la tarea');
        }
    };

    const today = format(new Date(), 'yyyy-MM-dd');

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-1 space-y-6">
                <Card className={`h-fit transition-colors ${editingTask ? 'border-primary/50 bg-primary/5' : ''}`}>
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
                            {editingTask && (
                                <Button variant="ghost" size="sm" onClick={cancelEditing} className="h-8 w-8 p-0">
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tarea</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ej. Poner lavadora..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Notas (Opcional)</Label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Detalles adicionales..."
                                className="resize-none h-20"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Fecha</Label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    min={today}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Hora</Label>
                                <Input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="alarm"
                                checked={hasAlarm}
                                onCheckedChange={(c) => setHasAlarm(c as boolean)}
                            />
                            <Label htmlFor="alarm" className="cursor-pointer flex items-center">
                                {hasAlarm ? <Bell className="w-4 h-4 mr-2 text-primary" /> : <BellOff className="w-4 h-4 mr-2 text-muted-foreground" />}
                                Activar Alarma
                            </Label>
                        </div>
                        <div className="flex gap-2">
                            <Button className="w-full" onClick={handleSaveTask}>
                                {editingTask ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                                {editingTask ? 'Actualizar' : 'Programar'}
                            </Button>
                            {editingTask && (
                                <Button variant="outline" onClick={cancelEditing}>
                                    Cancelar
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Post-it Configuration */}
                <PostItConfig />
            </div>

            {/* List Section */}
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <CardTitle className="flex items-center">
                                <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                                Próximas Tareas
                            </CardTitle>

                            {/* Legend */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground bg-secondary/30 p-2 rounded-lg">
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-3 h-3 rounded-full border ${colors.overdue}`} />
                                    <span>Caducada</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-3 h-3 rounded-full border ${colors.tomorrow}`} />
                                    <span>Mañana</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-3 h-3 rounded-full border ${colors.upcoming}`} />
                                    <span>&lt; 1 sem</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-3 h-3 rounded-full border ${colors.future}`} />
                                    <span>&gt; 1 sem</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {tasks.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No hay tareas pendientes.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tasks.map(task => {
                                    const taskDateTime = new Date(`${task.date}T${task.time}`);
                                    const isOverdue = !task.completed && taskDateTime < new Date();

                                    return (
                                        <div
                                            key={task.id}
                                            className={`flex flex-col p-4 rounded-lg border transition-all ${task.completed
                                                ? 'bg-secondary/50 opacity-60'
                                                : isOverdue
                                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                                    : 'bg-card hover:shadow-sm'
                                                } ${editingTask?.id === task.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`rounded-full ${task.completed ? 'text-green-500' : 'text-muted-foreground'}`}
                                                        onClick={() => toggleComplete(task.id)}
                                                    >
                                                        <CheckCircle2 className={`h-6 w-6 ${task.completed ? 'fill-current' : ''}`} />
                                                    </Button>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className={`font-medium ${task.completed ? 'line-through' : ''}`}>{task.title}</p>
                                                            {isOverdue && (
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                                                                    Caducada
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center text-sm text-muted-foreground gap-3">
                                                            <span className={`flex items-center ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}`}>
                                                                <CalendarIcon className="h-3 w-3 mr-1" />
                                                                {format(parseISO(task.date), 'd MMM yyyy', { locale: es })}
                                                            </span>
                                                            <span className={`flex items-center ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}`}>
                                                                <Clock className="h-3 w-3 mr-1" />
                                                                {task.time}
                                                            </span>
                                                            {task.hasAlarm && !task.completed && (
                                                                <span className="flex items-center text-primary text-xs bg-primary/10 px-2 py-0.5 rounded-full">
                                                                    <Bell className="h-3 w-3 mr-1" /> Alarma
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => startEditing(task)}
                                                        className="text-muted-foreground hover:text-primary"
                                                        disabled={task.completed}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            {task.notes && (
                                                <div className="mt-3 ml-12 p-2 bg-secondary/50 rounded-md text-sm text-muted-foreground flex items-start gap-2">
                                                    <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                                                    <p className="whitespace-pre-wrap">{task.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
