'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, BellOff, Calendar as CalendarIcon, Clock, Trash2, Plus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type Task = {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    hasAlarm: boolean;
    completed: boolean;
};

export default function TaskManager() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [hasAlarm, setHasAlarm] = useState(true);

    // Load tasks
    useEffect(() => {
        const saved = localStorage.getItem('mi-hogar-tasks');
        if (saved) {
            setTasks(JSON.parse(saved));
        }

        // Request notification permission
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    }, []);

    // Save tasks
    useEffect(() => {
        localStorage.setItem('mi-hogar-tasks', JSON.stringify(tasks));
    }, [tasks]);

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
        // Simple beep using AudioContext or just a console log if audio not allowed without interaction
        try {
            const audio = new Audio('/alarm-sound.mp3'); // Placeholder, won't play if file missing, but logic is here
            // Fallback to browser beep logic or just rely on visual toast
        } catch (e) {
            console.error('Audio play failed', e);
        }
    };

    const showNotification = (title: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Mi Hogar - Alarma', {
                body: title,
                icon: '/icons/icon-192x192.png' // Placeholder
            });
        }
    };

    const addTask = () => {
        if (!title || !date || !time) {
            toast.error('Completa todos los campos');
            return;
        }

        const newTask: Task = {
            id: crypto.randomUUID(),
            title,
            date,
            time,
            hasAlarm,
            completed: false,
        };

        setTasks([...tasks, newTask].sort((a, b) => {
            return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
        }));

        setTitle('');
        toast.success('Tarea programada');
    };

    const toggleComplete = (id: string) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const deleteTask = (id: string) => {
        setTasks(tasks.filter(t => t.id !== id));
    };

    const today = format(new Date(), 'yyyy-MM-dd');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <Card className="lg:col-span-1 h-fit">
                <CardHeader>
                    <CardTitle>Nueva Tarea</CardTitle>
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
                    <Button className="w-full" onClick={addTask}>
                        <Plus className="mr-2 h-4 w-4" /> Programar
                    </Button>
                </CardContent>
            </Card>

            {/* List Section */}
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                            Próximas Tareas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tasks.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No hay tareas pendientes.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tasks.map(task => (
                                    <div
                                        key={task.id}
                                        className={`flex items-center justify-between p-4 rounded-lg border transition-all ${task.completed ? 'bg-secondary/50 opacity-60' : 'bg-card hover:shadow-sm'
                                            }`}
                                    >
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
                                                <p className={`font-medium ${task.completed ? 'line-through' : ''}`}>{task.title}</p>
                                                <div className="flex items-center text-sm text-muted-foreground gap-3">
                                                    <span className="flex items-center">
                                                        <CalendarIcon className="h-3 w-3 mr-1" />
                                                        {format(parseISO(task.date), 'd MMM yyyy', { locale: es })}
                                                    </span>
                                                    <span className="flex items-center">
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
                                        <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="text-destructive hover:bg-destructive/10">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
