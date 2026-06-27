'use client';

import React, { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Circle, Clock, Book, FileText, Calendar as CalendarIcon, ArrowRight, Tag, Pill, Check } from 'lucide-react';
import { getTodayIntakeSlots, MEDICINE_FORM_META } from '@/lib/pharmacy';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useJournal } from '@/context/JournalContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

type SmartBlock = {
    id: string;
    type: 'fixed' | 'generated';
    title: string;
    start_time: string;
    end_time: string;
    date?: string;
    description?: string;
};

interface OrganizerWidgetProps {
    selectedDate: Date | undefined;
    user: User | null;
    className?: string;
}

export default function OrganizerWidget({ selectedDate, user, className }: OrganizerWidgetProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);
    const [smartBlocks, setSmartBlocks] = useState<SmartBlock[]>([]);
    const [medicines, setMedicines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { setIsOpen, setSelectedDate } = useJournal();
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [selectedTag, setSelectedTag] = useState<string>('all');

    const fetchData = async () => {
        setLoading(true);
        if (!user) {
            setLoading(false);
            return;
        }

        const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
        const dayName = format(selectedDate || new Date(), 'EEEE', { locale: es }).toLowerCase();
        const daysMap: any = { 'lunes': 'monday', 'martes': 'tuesday', 'miércoles': 'wednesday', 'jueves': 'thursday', 'viernes': 'friday', 'sábado': 'saturday', 'domingo': 'sunday' };
        const englishDay = daysMap[dayName] || format(selectedDate || new Date(), 'EEEE').toLowerCase();

        const { data: fixedData } = await supabase
            .from('smart_scheduler_fixed_blocks')
            .select('*')
            .eq('user_id', user.id)
            .eq('day_of_week', englishDay);

        const { data: generatedData } = await supabase
            .from('smart_scheduler_generated_blocks')
            .select(`*, activity:smart_scheduler_activities(name, description)`)
            .eq('user_id', user.id)
            .eq('date', dateStr);

        let combined: SmartBlock[] = [];

        if (fixedData) {
            combined = combined.concat(fixedData.map((b: any) => ({
                id: b.id,
                type: 'fixed',
                title: b.label,
                start_time: b.start_time.slice(0, 5),
                end_time: b.end_time.slice(0, 5),
                description: 'Bloque Fijo'
            })));
        }

        if (generatedData) {
            combined = combined.concat(generatedData.map((b: any) => ({
                id: b.id,
                type: 'generated',
                title: b.activity?.name || 'Actividad',
                start_time: b.start_time.slice(0, 5),
                end_time: b.end_time.slice(0, 5),
                description: b.activity?.description
            })));
        }

        combined.sort((a, b) => a.start_time.localeCompare(b.start_time));
        setSmartBlocks(combined);

        let taskQuery = supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
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

        let journalQuery = supabase
            .from('journal_entries')
            .select('*, tags')
            .eq('user_id', user.id)
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
            const allTags = new Set<string>();
            journalData.forEach((entry: any) => {
                if (entry.tags && Array.isArray(entry.tags)) {
                    entry.tags.forEach((tag: string) => allTags.add(tag));
                }
            });
            setAvailableTags(Array.from(allTags));
        }

        let shiftQuery = supabase
            .from('work_shifts')
            .select('*')
            .eq('user_id', user.id)
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
            shiftQuery = shiftQuery.gte('start_time', new Date().toISOString()).limit(3);
        }

        const { data: shiftData } = await shiftQuery;
        if (shiftData) setShifts(shiftData);

        const { data: medData } = await supabase
            .from('medicines')
            .select('id, name, dosage, alarm_times, description')
            .eq('user_id', user.id);
        if (medData) setMedicines(medData);

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [selectedDate, user]);

    useEffect(() => {
        const channel = supabase
            .channel('organizer_widget')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'smart_scheduler_generated_blocks' }, fetchData)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [selectedDate, user]);

    const toggleTask = async (taskId: string, currentStatus: boolean) => {
        const { error } = await supabase.from('tasks').update({ is_completed: !currentStatus }).eq('id', taskId);
        if (!error) fetchData();
    };

    const openJournalEntry = (dateStr: string) => {
        setSelectedDate(new Date(dateStr));
        setIsOpen(true);
    };

    const getPreviewText = (content: any) => {
        if (!content) return "Sin contenido";
        if (typeof content === 'string') return content;
        if (content.type === 'doc' && content.content) {
            return content.content.map((node: any) => {
                if (node.content) return node.content.map((n: any) => n.text).join(' ');
                return '';
            }).join(' ').slice(0, 80) + '…';
        }
        return "Nota guardada";
    };

    // ============== RENDER PANELS (compartido entre tabs y grid) ==============

    const AgendaPanel = (
        <>
            {loading ? (
                <div className="space-y-2 py-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}
                </div>
            ) : smartBlocks.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-medium">Agenda vacía</p>
                    <Button variant="link" asChild className="text-quioba-cuerpo p-0 h-auto text-xs">
                        <Link href="/apps/organizador-vital">Generar →</Link>
                    </Button>
                </div>
            ) : (
                <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-2 space-y-1.5 py-1">
                    {smartBlocks.map((block) => {
                        const isFixed = block.type === 'fixed';
                        const now = new Date();
                        const [startH, startM] = block.start_time.split(':').map(Number);
                        const [endH, endM] = block.end_time.split(':').map(Number);
                        const nowMinutes = now.getHours() * 60 + now.getMinutes();
                        const startMinutes = startH * 60 + startM;
                        const endMinutes = endH * 60 + endM;
                        const isNow = selectedDate?.toDateString() === new Date().toDateString() && nowMinutes >= startMinutes && nowMinutes <= endMinutes;

                        return (
                            <div key={block.id} className="relative pl-4">
                                <div className={cn(
                                    "absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border-2 transition-all",
                                    isNow ? 'bg-quioba-cuerpo border-green-200 ring-2 ring-green-500/30 animate-pulse'
                                        : isFixed ? 'bg-quioba-mente border-blue-100'
                                            : 'bg-quioba-cuerpo border-green-100'
                                )} />
                                <div className={cn(
                                    "px-2 py-1.5 rounded-md border-l-[3px] transition-all",
                                    isNow ? 'bg-green-50 dark:bg-green-900/20 border-l-quioba-cuerpo shadow-sm'
                                        : isFixed ? 'bg-blue-50/40 dark:bg-blue-900/10 border-l-quioba-mente'
                                            : 'bg-slate-50/60 dark:bg-slate-800/30 border-l-quioba-cuerpo'
                                )}>
                                    <div className="flex items-center justify-between gap-1.5">
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 leading-tight">
                                                <span className="tabular-nums">{block.start_time}–{block.end_time}</span>
                                                {isFixed && <span className="px-1 py-0 rounded-full bg-blue-100 text-blue-700 text-[9px] font-medium dark:bg-blue-900/40 dark:text-blue-300">Fijo</span>}
                                                {isNow && <span className="px-1 py-0 rounded-full bg-green-100 text-green-700 text-[9px] font-bold dark:bg-green-900/40 dark:text-green-300">Ahora</span>}
                                            </div>
                                            <h4 className={cn(
                                                "font-semibold text-[12.5px] leading-tight truncate",
                                                isFixed ? 'text-blue-900 dark:text-blue-300' : 'text-green-900 dark:text-green-300'
                                            )}>
                                                {block.title}
                                            </h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );

    const TasksPanel = (() => {
        const isToday = !selectedDate || selectedDate.toDateString() === new Date().toDateString();
        const medSlots = isToday ? getTodayIntakeSlots(medicines) : [];
        const takenCount = medSlots.filter(s => s.taken).length;
        const nowHM = new Date().getHours() * 60 + new Date().getMinutes();
        const isSlotPast = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m < nowHM; };

        return (
            <>
                {/* Tomas de medicamentos */}
                {medSlots.length > 0 && (
                    <div className="mb-3 pb-3 border-b border-border">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Pill className="w-3 h-3 text-emerald-600" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tomas hoy</span>
                            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-1.5 rounded-full font-semibold">{takenCount}/{medSlots.length}</span>
                            <Link href="/apps/mi-hogar/pharmacy" className="ml-auto text-muted-foreground hover:text-primary transition-colors">
                                <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <div className="space-y-1">
                            {medSlots.map(slot => {
                                const past = isSlotPast(slot.time) && !slot.taken;
                                return (
                                    <Link
                                        key={`${slot.medicineId}-${slot.time}`}
                                        href="/apps/mi-hogar/pharmacy"
                                        className={cn(
                                            "flex items-center gap-2 px-2 py-1.5 rounded-md border-l-2 transition-colors",
                                            slot.taken ? 'border-l-emerald-400 bg-emerald-50/60 dark:bg-emerald-900/10 opacity-60'
                                                : past ? 'border-l-rose-400 bg-rose-50/60 dark:bg-rose-900/10'
                                                    : 'border-l-amber-400 bg-amber-50/40 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                        )}
                                    >
                                        <span className="text-base leading-none shrink-0">
                                            {slot.form ? MEDICINE_FORM_META[slot.form].icon : '💊'}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-semibold truncate leading-tight">{slot.medicineName}</p>
                                            {slot.dosage && <p className="text-[10px] text-muted-foreground truncate">{slot.dosage}</p>}
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className={cn(
                                                "text-[11px] font-mono font-bold tabular-nums block",
                                                slot.taken ? 'text-emerald-600 dark:text-emerald-400'
                                                    : past ? 'text-rose-600 dark:text-rose-400'
                                                        : 'text-amber-600 dark:text-amber-400'
                                            )}>{slot.time}</span>
                                            {slot.taken
                                                ? <Check className="w-3 h-3 text-emerald-500 ml-auto" />
                                                : past
                                                    ? <span className="text-[9px] text-rose-500">Pendiente</span>
                                                    : null
                                            }
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tareas */}
                {loading ? (
                    <div className="space-y-2 py-2">{[1, 2].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                        <div className="w-10 h-10 mx-auto bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle2 className="w-5 h-5 text-quioba-cuerpo" />
                        </div>
                        <p className="text-xs font-medium">¡Todo al día!</p>
                        <p className="text-[10px] opacity-70 mt-0.5">Sin pendientes</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {tasks.map((task) => (
                            <div key={task.id} className="flex items-start gap-2 px-1.5 py-1.5 rounded-md hover:bg-accent/50 transition-colors group">
                                <button
                                    onClick={() => toggleTask(task.id, task.is_completed)}
                                    className="mt-0.5 text-muted-foreground hover:text-quioba-cuerpo transition-colors shrink-0"
                                >
                                    <Circle className="w-4 h-4" />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-[12.5px] leading-snug truncate">{task.title}</p>
                                    <div className="flex items-center text-[10px] text-muted-foreground gap-1 mt-0.5">
                                        <Clock className="w-2.5 h-2.5" />
                                        <span className="tabular-nums">{format(new Date(task.due_date), "HH:mm", { locale: es })}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </>
        );
    })();

    const ShiftsPanel = (
        <>
            {loading ? (
                <div className="space-y-2 py-2">{[1, 2].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
            ) : shifts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                    <div className="w-10 h-10 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2">
                        <Clock className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-xs font-medium">Sin turnos</p>
                    <p className="text-[10px] opacity-70 mt-0.5">Día despejado</p>
                </div>
            ) : (
                <div className="space-y-1.5">
                    {shifts.map((shift, idx) => {
                        const borderColors = ['border-l-quioba-cuerpo', 'border-l-quioba-mente', 'border-l-quioba-finanzas', 'border-l-purple-500'];
                        const borderColor = borderColors[idx % borderColors.length];
                        return (
                            <Link href="/apps/mi-hogar/roster" key={shift.id} className="block group">
                                <div className={cn("px-2 py-1.5 rounded-md border border-l-[3px]", borderColor, "bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 transition-all hover:shadow-sm")}>
                                    <div className="flex justify-between items-center gap-1.5">
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-[12.5px] truncate">{shift.title}</span>
                                        <span className="text-[10px] bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono tabular-nums shrink-0">
                                            {format(new Date(shift.start_time), "HH:mm")}–{format(new Date(shift.end_time), "HH:mm")}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </>
    );

    const JournalPanel = (
        <>
            {availableTags.length > 1 && (
                <div className="mb-2">
                    <Select value={selectedTag} onValueChange={setSelectedTag}>
                        <SelectTrigger className="h-7 text-[11px] w-full">
                            <div className="flex items-center gap-1.5">
                                <Tag className="w-3 h-3" />
                                <SelectValue placeholder="Etiqueta" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las etiquetas</SelectItem>
                            {availableTags.map(tag => (<SelectItem key={tag} value={tag}>{tag}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            {loading ? (
                <div className="space-y-2 py-2">{[1, 2].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
            ) : journalEntries.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                    <Book className="w-6 h-6 mx-auto opacity-30 mb-1" />
                    <p className="text-[11px] font-medium">Sin apuntes hoy</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {journalEntries
                        .filter(entry => selectedTag === 'all' || entry.tags?.includes(selectedTag))
                        .map((entry: any) => {
                            const title = entry.metadata?.title || getPreviewText(entry.content).slice(0, 50) || 'Sin título';
                            const cat = entry.metadata?.category;
                            const catColor = cat === 'cuerpo' ? 'bg-quioba-cuerpo'
                                : cat === 'mente' ? 'bg-quioba-mente'
                                    : cat === 'finanzas' ? 'bg-quioba-finanzas'
                                        : 'bg-muted-foreground/30';
                            return (
                                <div
                                    key={entry.id}
                                    className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-accent/40 transition-colors cursor-pointer"
                                    onClick={() => openJournalEntry(entry.updated_at)}
                                >
                                    <span className={cn("w-1 self-stretch rounded-full shrink-0 mt-0.5", catColor)} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12.5px] font-medium leading-tight truncate">{title}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[9.5px] text-muted-foreground tabular-nums">{format(new Date(entry.updated_at), "HH:mm", { locale: es })}</span>
                                            {(entry.tags || []).slice(0, 1).map((t: string) => (
                                                <span key={t} className="text-[9px] text-muted-foreground px-1 py-0 rounded-full bg-muted">{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
        </>
    );

    // Bloque actual y siguiente para el hero "Ahora"
    const nowBlocks = (() => {
        if (!selectedDate || selectedDate.toDateString() !== new Date().toDateString()) return { current: null, next: null };
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const current = smartBlocks.find(b => {
            const [sh, sm] = b.start_time.split(':').map(Number);
            const [eh, em] = b.end_time.split(':').map(Number);
            return sh * 60 + sm <= nowMin && nowMin < eh * 60 + em;
        }) || null;
        const next = smartBlocks.find(b => {
            const [sh, sm] = b.start_time.split(':').map(Number);
            return sh * 60 + sm > nowMin;
        }) || null;
        return { current, next };
    })();

    // ============== HEADERS DE PANEL ==============
    const PanelHeader = ({ icon: Icon, label, count, href, color }: { icon: any; label: string; count?: number; href?: string; color: string }) => (
        <div className="flex items-center justify-between mb-1.5 px-0.5 shrink-0">
            <div className="flex items-center gap-1.5">
                <Icon className={cn("w-3.5 h-3.5", color)} />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">{label}</h3>
                {count !== undefined && count > 0 && (
                    <span className="text-[9.5px] font-semibold px-1.5 py-0 rounded-full bg-muted text-muted-foreground tabular-nums">{count}</span>
                )}
            </div>
            {href && (
                <Link href={href} className="text-[10px] text-muted-foreground hover:text-primary transition-colors">
                    <ArrowRight className="w-3 h-3" />
                </Link>
            )}
        </div>
    );

    return (
        <Card className={cn("border-none shadow-md overflow-hidden dark:bg-slate-950 flex flex-col", className)}>
            <CardContent className="p-2 sm:p-3 bg-white dark:bg-slate-950 flex-1 flex flex-col min-h-0">
                {/* Hero "AHORA" (Visible on all sizes if active) */}
                {nowBlocks.current && (
                    <div className="shrink-0 rounded-xl p-3 mb-3 bg-gradient-to-r from-quioba-cuerpo/10 via-quioba-cuerpo/5 to-transparent border border-quioba-cuerpo/20 flex items-center gap-3">
                        <div className="relative shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full bg-quioba-cuerpo animate-pulse" />
                            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-quioba-cuerpo animate-ping opacity-60" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[9.5px] font-bold uppercase tracking-widest text-quioba-cuerpo">Ahora</div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-sm font-bold text-foreground truncate">{nowBlocks.current.title}</h3>
                                <span className="text-[10.5px] text-muted-foreground tabular-nums shrink-0">
                                    {nowBlocks.current.start_time}–{nowBlocks.current.end_time}
                                </span>
                            </div>
                        </div>
                        {nowBlocks.next && (
                            <div className="border-l border-quioba-cuerpo/20 pl-3 hidden sm:block min-w-0 max-w-[40%]">
                                <div className="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground">Después</div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-semibold text-foreground truncate">{nowBlocks.next.title}</span>
                                    <span className="text-[10.5px] text-muted-foreground tabular-nums shrink-0">{nowBlocks.next.start_time}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* === UNIFIED TABS LAYOUT === */}
                <div className="flex-1 min-h-0 flex flex-col">
                    <Tabs defaultValue="agenda" className="flex-1 flex flex-col min-h-0">
                        <TabsList className="grid w-full grid-cols-4 mb-3 h-9 sm:h-10 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-lg shrink-0">
                            <TabsTrigger value="agenda" className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs py-1.5 data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-600 data-[state=active]:to-green-800 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-green-900/30 rounded-md transition-all font-medium h-full">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Agenda</span>
                                <span className="sm:hidden">Ag</span>
                                {smartBlocks.length > 0 && <span className="text-[10px] sm:text-xs">({smartBlocks.length})</span>}
                            </TabsTrigger>
                            <TabsTrigger value="tasks" className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs py-1.5 data-[state=active]:bg-quioba-mente data-[state=active]:text-white data-[state=active]:shadow rounded-md transition-all font-medium h-full">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Tareas</span>
                                <span className="sm:hidden">Tar</span>
                                {tasks.length > 0 && <span className="text-[10px] sm:text-xs">({tasks.length})</span>}
                            </TabsTrigger>
                            <TabsTrigger value="shifts" className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs py-1.5 data-[state=active]:bg-quioba-finanzas data-[state=active]:text-white data-[state=active]:shadow rounded-md transition-all font-medium h-full">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Turnos</span>
                                <span className="sm:hidden">Tur</span>
                                {shifts.length > 0 && <span className="text-[10px] sm:text-xs">({shifts.length})</span>}
                            </TabsTrigger>
                            <TabsTrigger value="journal" className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs py-1.5 data-[state=active]:bg-slate-600 data-[state=active]:text-white data-[state=active]:shadow rounded-md transition-all font-medium h-full">
                                <Book className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Apuntes</span>
                                <span className="sm:hidden">Ap</span>
                                {journalEntries.length > 0 && <span className="text-[10px] sm:text-xs">({journalEntries.length})</span>}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="agenda" className="flex-1 min-h-0 data-[state=active]:flex flex-col bg-card rounded-xl border border-border/60 shadow-sm p-3">
                            <div className="flex-1 overflow-y-auto pr-2 min-h-0">{AgendaPanel}</div>
                            <div className="mt-2 text-center pt-3 border-t text-xs">
                                <Link href="/apps/organizador-vital" className="text-muted-foreground hover:text-quioba-cuerpo hover:underline flex items-center justify-center gap-1 transition-colors font-medium">
                                    Ver Agenda Completa <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </TabsContent>
                        <TabsContent value="tasks" className="flex-1 min-h-0 data-[state=active]:flex flex-col bg-card rounded-xl border border-border/60 shadow-sm p-3">
                            <div className="flex-1 overflow-y-auto pr-2 min-h-0">{TasksPanel}</div>
                        </TabsContent>
                        <TabsContent value="shifts" className="flex-1 min-h-0 data-[state=active]:flex flex-col bg-card rounded-xl border border-border/60 shadow-sm p-3">
                            <div className="flex-1 overflow-y-auto pr-2 min-h-0">{ShiftsPanel}</div>
                        </TabsContent>
                        <TabsContent value="journal" className="flex-1 min-h-0 data-[state=active]:flex flex-col bg-card rounded-xl border border-border/60 shadow-sm p-3">
                            <div className="flex-1 overflow-y-auto pr-2 min-h-0">{JournalPanel}</div>
                        </TabsContent>
                    </Tabs>
                </div>
            </CardContent>
        </Card>
    );
}
