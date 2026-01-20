'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface FixedBlock {
    id: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    label: string;
    color: string;
}

interface TaskBlock {
    id: string;
    title: string;
    due_date: string; // ISO string
    start_time: string; // HH:mm (derived or fake)
    end_time: string; // HH:mm
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function FixedScheduleEditor({ onBack }: { onBack: () => void }) {
    const router = useRouter();
    const [blocks, setBlocks] = useState<FixedBlock[]>([]);
    const [tasks, setTasks] = useState<TaskBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBlock, setEditingBlock] = useState<FixedBlock | null>(null);

    // Current Week Context
    const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

    // Form state
    const [day, setDay] = useState('monday');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [label, setLabel] = useState('');
    const [color, setColor] = useState('#3b82f6');
    const [frequency, setFrequency] = useState<'single' | 'workweek' | 'everyday'>('single');

    // Conflict state
    const [status, setStatus] = useState<'idle' | 'confirming'>('idle');
    const [conflictingTasks, setConflictingTasks] = useState<TaskBlock[]>([]);

    useEffect(() => {
        fetchData();
    }, [weekStart]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Fixed Blocks
            const { data: fixedData } = await supabase
                .from('smart_scheduler_fixed_blocks')
                .select('*')
                .eq('user_id', user.id);

            if (fixedData) setBlocks(fixedData);

            // 2. Fetch Tasks for this week
            const startStr = weekStart.toISOString();
            const endStr = addDays(weekStart, 7).toISOString();

            const { data: taskData } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.id)
                .gte('due_date', startStr)
                .lte('due_date', endStr);

            if (taskData) {
                const mappedTasks: TaskBlock[] = taskData.map((t: any) => {
                    const d = new Date(t.due_date);
                    const hours = d.getHours();
                    const minutes = d.getMinutes();
                    const start = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

                    // Default to 1 hour duration for visualization
                    let endHours = hours + 1;
                    if (endHours > 23) endHours = 23;
                    const end = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

                    return {
                        id: t.id,
                        title: t.title,
                        due_date: t.due_date,
                        start_time: start,
                        end_time: end
                    };
                });
                setTasks(mappedTasks);
            }

        } catch (error) {
            console.error(error);
            toast.error('Error cargando datos');
        } finally {
            setLoading(false);
        }
    };

    const checkForConflicts = (targetDays: string[]) => {
        const conflicts: TaskBlock[] = [];
        const start = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
        const end = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);

        targetDays.forEach(day => {
            // Find the specific date for this day in the current week view
            // We have weekStart (Monday). 
            const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(day);
            if (dayIndex === -1) return;

            const targetDate = addDays(weekStart, dayIndex);

            // Find tasks on this date
            const daysTasks = tasks.filter(t => isSameDay(new Date(t.due_date), targetDate));

            daysTasks.forEach(task => {
                // Check time overlap
                const tStart = parseInt(task.start_time.split(':')[0]) * 60 + parseInt(task.start_time.split(':')[1]);
                const tEnd = parseInt(task.end_time.split(':')[0]) * 60 + parseInt(task.end_time.split(':')[1]);

                // Overlap condition: (StartA < EndB) and (EndA > StartB)
                if (start < tEnd && end > tStart) {
                    conflicts.push(task);
                }
            });
        });

        return conflicts;
    };

    const handleSave = async () => {
        // If we heavily rely on state for step 2, we just call executeSave directly from the confirm button
        if (status === 'confirming') {
            await executeSave();
            return;
        }

        // 1. Determine target days
        let targetDays: string[] = [];
        if (frequency === 'single') {
            targetDays = [day];
        } else if (frequency === 'workweek') {
            targetDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        } else if (frequency === 'everyday') {
            targetDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        }

        // 2. Check conflicts
        const conflicts = checkForConflicts(targetDays);
        if (conflicts.length > 0) {
            setConflictingTasks(conflicts);
            setStatus('confirming');
            return; // Stop here and wait for confirmation
        }

        // 3. No conflicts, proceed
        await executeSave();
    };

    const executeSave = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Re-calculate target days as they depend on state that hasn't changed
            let targetDays: string[] = [];
            if (frequency === 'single') {
                targetDays = [day];
            } else if (frequency === 'workweek') {
                targetDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            } else if (frequency === 'everyday') {
                targetDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            }

            const promises = targetDays.map(async (targetDay) => {
                const payload = {
                    user_id: user.id,
                    day_of_week: targetDay,
                    start_time: startTime,
                    end_time: endTime,
                    label,
                    color
                };

                if (editingBlock && editingBlock.day_of_week === targetDay) {
                    return supabase
                        .from('smart_scheduler_fixed_blocks')
                        .update(payload)
                        .eq('id', editingBlock.id);
                } else {
                    return supabase
                        .from('smart_scheduler_fixed_blocks')
                        .insert(payload);
                }
            });

            await Promise.all(promises);

            toast.success(editingBlock ? 'Bloque(s) actualizado(s)' : 'Bloque(s) creado(s)');
            setIsDialogOpen(false);
            setEditingBlock(null);
            setStatus('idle');
            setConflictingTasks([]);
            resetForm();
            fetchData();

        } catch (error) {
            console.error(error);
            toast.error('Error guardando bloque');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('smart_scheduler_fixed_blocks')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Bloque eliminado');
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Error eliminando bloque');
        }
    };

    const resetForm = () => {
        setDay('monday');
        setStartTime('09:00');
        setEndTime('17:00');
        setLabel('');
        setColor('#3b82f6');
        setFrequency('single');
        setStatus('idle');
        setConflictingTasks([]);
    };

    const openNewBlockDialog = (preselectDay?: string, preselectHour?: number) => {
        setEditingBlock(null);
        resetForm();
        if (preselectDay) setDay(preselectDay);
        if (preselectHour !== undefined) {
            const timeStr = `${preselectHour.toString().padStart(2, '0')}:00`;
            setStartTime(timeStr);
            setEndTime(`${(preselectHour + 1).toString().padStart(2, '0')}:00`);
        }
        setIsDialogOpen(true);
    };

    const openEditDialog = (block: FixedBlock) => {
        setEditingBlock(block);
        setDay(block.day_of_week);
        setStartTime(block.start_time.slice(0, 5)); // remove seconds if any
        setEndTime(block.end_time.slice(0, 5));
        setLabel(block.label);
        setColor(block.color || '#3b82f6');
        setFrequency('single'); // Default to single when editing existing
        setIsDialogOpen(true);
    };

    const handleTaskClick = (taskId: string) => {
        // Navigate to tasks page, ideally highlighting the task
        router.push(`/apps/mi-hogar/tasks?highlight=${taskId}`);
    };

    // Helper to position blocks
    const getBlockStyle = (start: string, end: string, color?: string, isTask?: boolean) => {
        const startHour = parseInt(start.split(':')[0]);
        const startMin = parseInt(start.split(':')[1]);
        const endHour = parseInt(end.split(':')[0]);
        const endMin = parseInt(end.split(':')[1]);

        const startDecimal = startHour + startMin / 60;
        const endDecimal = endHour + endMin / 60;

        const top = startDecimal * 60;
        const height = (endDecimal - startDecimal) * 60;

        return {
            top: `${top}px`,
            height: `${Math.max(height, 20)}px`,
            backgroundColor: isTask ? 'rgba(251, 191, 36, 0.2)' : (color + 'CC'),
            border: isTask ? '1px dashed rgb(245, 158, 11)' : 'none',
            color: isTask ? 'rgb(180, 83, 9)' : 'white',
            cursor: isTask ? 'pointer' : 'pointer'
        };
    };

    // Week structure
    const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        return {
            date,
            dayName: format(date, 'EEEE').toLowerCase(), // monday, tuesday...
            dayLabel: format(date, 'EEEE', { locale: es }), // Lunes, Martes... 
            dayNumber: format(date, 'd', { locale: es })
        };
    });

    const getEnglishDay = (dayName: string) => {
        const mapping: any = { 'lunes': 'monday', 'martes': 'tuesday', 'miércoles': 'wednesday', 'jueves': 'thursday', 'viernes': 'friday', 'sábado': 'saturday', 'domingo': 'sunday' };
        // Normalize input to handle potential capitalization issues
        const lower = dayName.toLowerCase();
        return mapping[lower] || lower;
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold">Horario Fijo Semanal</h2>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            Semana del {format(weekStart, 'd MMM', { locale: es })} - Mostrando tareas como referencia
                        </p>
                    </div>
                </div>
                <Button onClick={() => openNewBlockDialog()}>
                    <Plus className="w-4 h-4 mr-2" /> Agregar Bloque
                </Button>
            </div>

            <div className="flex-1 overflow-auto border rounded-md relative bg-white dark:bg-slate-950">
                <div className="grid grid-cols-[50px_repeat(7,1fr)] min-w-[800px]">
                    {/* Time labels column */}
                    <div className="border-r bg-slate-50 dark:bg-slate-900 z-10 sticky left-0">
                        <div className="h-[40px] border-b"></div>
                        {HOURS.map(hour => (
                            <div key={hour} className="h-[60px] border-b text-xs text-muted-foreground p-1 text-right pr-2">
                                {hour.toString().padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    {daysOfWeek.map((dayObj) => {
                        const englishDay = getEnglishDay(dayObj.dayLabel);
                        const dayTasks = tasks.filter(t => isSameDay(new Date(t.due_date), dayObj.date));
                        const dayBlocks = blocks.filter(b => b.day_of_week === englishDay);

                        return (
                            <div key={dayObj.date.toISOString()} className="relative border-r min-w-[100px]">
                                <div className="sticky top-0 h-[40px] border-b bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center z-10 p-1">
                                    <span className="font-medium capitalize text-sm">{dayObj.dayLabel}</span>
                                    <span className="text-xs text-muted-foreground">{dayObj.dayNumber}</span>
                                </div>

                                <div className="relative h-[1440px]">
                                    {HOURS.map(hour => (
                                        <div
                                            key={hour}
                                            className="h-[60px] border-b border-dashed border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer"
                                            onClick={() => openNewBlockDialog(englishDay, hour)}
                                        ></div>
                                    ))}

                                    {/* Tasks Overlay */}
                                    {dayTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className="absolute left-1 right-1 rounded p-1 text-xs overflow-hidden z-20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors group"
                                            style={getBlockStyle(task.start_time, task.end_time, undefined, true)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleTaskClick(task.id);
                                            }}
                                            title="Click para editar tarea"
                                        >
                                            <div className="font-bold flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3 group-hover:text-amber-600" />
                                                <span className="truncate group-hover:underline">{task.title}</span>
                                            </div>
                                            <div className="opacity-80">{task.start_time}</div>
                                        </div>
                                    ))}

                                    {/* Fixed Blocks */}
                                    {dayBlocks.map(block => (
                                        <div
                                            key={block.id}
                                            className="absolute left-2 right-2 rounded p-1 text-xs text-white overflow-hidden cursor-pointer hover:brightness-110 shadow-md z-30"
                                            style={getBlockStyle(block.start_time, block.end_time, block.color)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEditDialog(block);
                                            }}
                                        >
                                            <div className="font-semibold truncate">{block.label}</div>
                                            <div className="opacity-90">{block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Edit/Create Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                if (!open) resetForm();
                setIsDialogOpen(open);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {status === 'confirming' ? 'Advertencia de Solapamiento' : (editingBlock ? 'Editar Bloque Fijo' : 'Nuevo Bloque Fijo')}
                        </DialogTitle>
                    </DialogHeader>

                    {status === 'confirming' ? (
                        <div className="py-4 space-y-4">
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>¡Atención!</AlertTitle>
                                <AlertDescription>
                                    Este bloque coincide con {conflictingTasks.length} tarea(s) agendada(s) para esta semana.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2 max-h-[200px] overflow-auto border rounded p-2 bg-slate-50 dark:bg-slate-900">
                                {conflictingTasks.map(task => (
                                    <div key={task.id} className="text-sm p-2 border-b last:border-0 flex items-center justify-between">
                                        <span className="font-medium">{task.title}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(task.due_date), "EEEE d", { locale: es })} • {task.start_time}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                ¿Deseas crear el bloque fijo de todas formas? La tarea se mantendrá, pero visualmente se solapará.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Nombre (Ej: Trabajo, Gimnasio)</Label>
                                <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Agrega un título" />
                            </div>

                            <div className="grid gap-2">
                                <Label>Frecuencia</Label>
                                <Select value={frequency} onValueChange={(val: 'single' | 'workweek' | 'everyday') => setFrequency(val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="single">Día único</SelectItem>
                                        <SelectItem value="workweek">De Lunes a Viernes</SelectItem>
                                        <SelectItem value="everyday">Todos los días (Lun-Dom)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {frequency === 'single' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Día</Label>
                                        <Select value={day} onValueChange={setDay}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries({ 'monday': 'Lunes', 'tuesday': 'Martes', 'wednesday': 'Miércoles', 'thursday': 'Jueves', 'friday': 'Viernes', 'saturday': 'Sábado', 'sunday': 'Domingo' }).map(([key, value]) => (
                                                    <SelectItem key={key} value={key}>{value}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Color</Label>
                                        <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-full p-1" />
                                    </div>
                                </div>
                            )}

                            {frequency !== 'single' && (
                                <div className="grid gap-2">
                                    <Label>Color</Label>
                                    <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-full p-1" />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Inicio</Label>
                                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Fin</Label>
                                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:justify-between">
                        {status !== 'confirming' && editingBlock && (
                            <Button variant="destructive" size="icon" onClick={() => {
                                if (confirm('¿Eliminar este bloque?')) handleDelete(editingBlock.id);
                            }}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                        {status === 'confirming' ? (
                            <div className="flex gap-2 w-full justify-end">
                                <Button variant="outline" onClick={() => setStatus('idle')}>Volver</Button>
                                <Button onClick={executeSave} variant="destructive">Crear de todas formas</Button>
                            </div>
                        ) : (
                            <div className="flex gap-2 justify-end w-full">
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button onClick={handleSave}>Guardar</Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
