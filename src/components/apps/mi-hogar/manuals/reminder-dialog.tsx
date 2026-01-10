'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Bell, Plus, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Reminder {
    id: string;
    title: string;
    description?: string;
    interval_months: number;
    next_date: string;
    is_active: boolean;
}

interface ReminderDialogProps {
    manualId: string;
    manualTitle: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ReminderDialog({ manualId, manualTitle, open, onOpenChange }: ReminderDialogProps) {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [intervalMonths, setIntervalMonths] = useState('6');
    const [nextDate, setNextDate] = useState('');

    React.useEffect(() => {
        if (open) {
            fetchReminders();
        }
    }, [open]);

    const fetchReminders = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('manual_reminders')
                .select('*')
                .eq('manual_id', manualId)
                .order('next_date');

            if (error) {
                console.log('Reminders table not available yet');
                return;
            }

            setReminders(data || []);
        } catch (error) {
            console.error('Error fetching reminders:', error);
        } finally {
            setLoading(false);
        }
    };

    const addReminder = async () => {
        if (!title || !nextDate) {
            toast.error('Título y fecha son obligatorios');
            return;
        }

        try {
            const { error } = await supabase
                .from('manual_reminders')
                .insert([{
                    manual_id: manualId,
                    title,
                    description,
                    interval_months: parseInt(intervalMonths),
                    next_date: nextDate,
                    is_active: true
                }]);

            if (error) throw error;

            toast.success('Recordatorio añadido');
            setShowForm(false);
            resetForm();
            fetchReminders();
        } catch (error) {
            console.error('Error adding reminder:', error);
            toast.error('Error al añadir recordatorio');
        }
    };

    const deleteReminder = async (id: string) => {
        if (!confirm('¿Eliminar este recordatorio?')) return;

        try {
            const { error } = await supabase
                .from('manual_reminders')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Recordatorio eliminado');
            fetchReminders();
        } catch (error) {
            console.error('Error deleting reminder:', error);
            toast.error('Error al eliminar recordatorio');
        }
    };

    const toggleActive = async (id: string, isActive: boolean) => {
        try {
            const { error } = await supabase
                .from('manual_reminders')
                .update({ is_active: !isActive })
                .eq('id', id);

            if (error) throw error;

            toast.success(isActive ? 'Recordatorio desactivado' : 'Recordatorio activado');
            fetchReminders();
        } catch (error) {
            console.error('Error toggling reminder:', error);
            toast.error('Error al actualizar recordatorio');
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setIntervalMonths('6');
        setNextDate('');
    };

    const getNextDateAfterInterval = () => {
        const today = new Date();
        const months = parseInt(intervalMonths) || 6;
        today.setMonth(today.getMonth() + months);
        return today.toISOString().split('T')[0];
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Recordatorios de Mantenimiento
                    </DialogTitle>
                    <DialogDescription>
                        Configura recordatorios para mantener "{manualTitle}"
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {/* Existing Reminders */}
                    {reminders.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Recordatorios activos</Label>
                            {reminders.map(reminder => (
                                <div
                                    key={reminder.id}
                                    className={`p-3 border rounded-lg flex items-start justify-between ${!reminder.is_active ? 'opacity-50 bg-muted' : ''
                                        }`}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium">{reminder.title}</h4>
                                            {!reminder.is_active && (
                                                <span className="text-xs text-muted-foreground">(Pausado)</span>
                                            )}
                                        </div>
                                        {reminder.description && (
                                            <p className="text-sm text-muted-foreground">{reminder.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Próximo: {format(new Date(reminder.next_date), 'PPP', { locale: es })}
                                            </span>
                                            <span>Cada {reminder.interval_months} meses</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => toggleActive(reminder.id, reminder.is_active)}
                                        >
                                            {reminder.is_active ? 'Pausar' : 'Activar'}
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={() => deleteReminder(reminder.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add New Reminder Form */}
                    {!showForm ? (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowForm(true)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Añadir Recordatorio
                        </Button>
                    ) : (
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                            <div className="space-y-2">
                                <Label>Título *</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ej: Limpiar filtros"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Descripción</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Instrucciones adicionales..."
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Frecuencia</Label>
                                    <Select value={intervalMonths} onValueChange={setIntervalMonths}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">Cada mes</SelectItem>
                                            <SelectItem value="3">Cada 3 meses</SelectItem>
                                            <SelectItem value="6">Cada 6 meses</SelectItem>
                                            <SelectItem value="12">Cada año</SelectItem>
                                            <SelectItem value="24">Cada 2 años</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Próxima fecha *</Label>
                                    <Input
                                        type="date"
                                        value={nextDate}
                                        onChange={(e) => setNextDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                                    Cancelar
                                </Button>
                                <Button onClick={addReminder}>
                                    Guardar
                                </Button>
                            </div>
                        </div>
                    )}

                    {reminders.length === 0 && !showForm && (
                        <div className="text-center py-8 text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>No hay recordatorios configurados</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
