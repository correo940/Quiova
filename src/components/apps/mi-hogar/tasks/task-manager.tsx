'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
    addDays,
    addHours,
    addMonths,
    addWeeks,
    addYears,
    differenceInDays,
    differenceInHours,
    differenceInMinutes,
    endOfWeek,
    format,
    isBefore,
    isToday,
    isTomorrow,
    isWithinInterval,
    nextMonday,
    setHours,
    setMinutes,
    startOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Bell,
    BellOff,
    Calendar as CalendarIcon,
    Camera,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Circle,
    Clock,
    GripVertical,
    LayoutList,
    Lock,
    Pencil,
    Plus,
    Repeat,
    Search,
    Sparkles,
    Tag as TagIcon,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import ScreenshotToTaskDialog from './screenshot-to-task-dialog';
import { ShareTasksDialog } from './share-tasks-dialog';
import { TaskList, TaskListSelector } from './task-list-selector';
import { CategoryManager, useCategories } from './category-manager';
import { CategoryDef, findCategory } from '@/lib/categories';
import { getTodayIntakeSlots, MEDICINE_FORM_META } from '@/lib/pharmacy';

type TaskPriority = 'high' | 'medium' | 'low';
type TaskView = 'today' | 'upcoming' | 'week' | 'all';
type TaskFilter = 'all' | 'pending' | 'completed' | 'overdue' | 'alarm' | 'unassigned';
type Category = string | null;
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
type ViewMode = 'list' | 'calendar';

type TaskMeta = { cat?: Category; rec?: Recurrence; tags?: string[] };

type Task = {
    id: string;
    title: string;
    notes?: string;
    description?: string;
    date: string;
    time: string;
    hasAlarm: boolean;
    completed: boolean;
    assignedTo?: string | null;
    priority: TaskPriority;
    meta: TaskMeta;
    assignee?: { full_name: string; avatar_url: string } | null;
};

type ListMember = {
    user_id: string;
    role: string;
    profile: { full_name: string; avatar_url: string };
};

type TaskSection = {
    key: string;
    title: string;
    description: string;
    tasks: Task[];
    sectionDate?: Date; // para quick-add
};

const DEFAULT_PRIORITY: TaskPriority = 'medium';
const DOCUMENT_TASK_PREFIX = '[QUIOBA_DOCUMENT]';
const META_RE = /^\{meta:(\{[^\n]*?\})\}\n?/;

// ============ HELPERS ============

function CategoryBadge({ category, size = 'sm' }: { category: CategoryDef; size?: 'xs' | 'sm' | 'md' }) {
    const dim = size === 'xs' ? 'w-2.5 h-2.5 text-[8px]' : size === 'md' ? 'w-4 h-4 text-[11px]' : 'w-3 h-3 text-[9px]';
    if (category.logo) {
        return <img src={category.logo} alt="" className={cn(dim, 'object-contain shrink-0')} />;
    }
    return (
        <span
            className={cn(dim, 'rounded-full shrink-0 flex items-center justify-center leading-none')}
            style={{ backgroundColor: category.color }}
        >
            {category.emoji && <span>{category.emoji}</span>}
        </span>
    );
}

function parseMeta(description?: string): { meta: TaskMeta; rest: string } {
    if (!description) return { meta: {}, rest: '' };
    const m = description.match(META_RE);
    if (!m) return { meta: {}, rest: description };
    try {
        const meta = JSON.parse(m[1]);
        return { meta, rest: description.replace(META_RE, '') };
    } catch {
        return { meta: {}, rest: description };
    }
}

function buildDescription(notes: string, subtasks: string[], meta: TaskMeta): string {
    const subtasksString = subtasks.filter((s) => s.trim()).map((s) => `- [ ] ${s}`).join('\n');
    const body = [notes.trim(), subtasksString].filter(Boolean).join('\n\n');
    const hasMeta = Object.keys(meta).some(k => meta[k as keyof TaskMeta] !== undefined && meta[k as keyof TaskMeta] !== null && (Array.isArray(meta[k as keyof TaskMeta]) ? (meta[k as keyof TaskMeta] as any[]).length > 0 : meta[k as keyof TaskMeta] !== 'none'));
    if (!hasMeta) return body;
    const clean: TaskMeta = {};
    if (meta.cat) clean.cat = meta.cat;
    if (meta.rec && meta.rec !== 'none') clean.rec = meta.rec;
    if (meta.tags && meta.tags.length > 0) clean.tags = meta.tags;
    return `{meta:${JSON.stringify(clean)}}\n${body}`;
}

function parseTaskBody(description?: string) {
    const { meta, rest } = parseMeta(description);
    const lines = (rest || '').split('\n');
    const noteLines: string[] = [];
    const subtaskLines: string[] = [];
    lines.forEach((line) => {
        if (line.trim().startsWith('- [ ]') || line.trim().startsWith('- [x]')) {
            subtaskLines.push(line.replace(/^- \[[ x]\] /, ''));
        } else if (line.trim()) {
            noteLines.push(line);
        }
    });
    return { meta, notes: noteLines.join('\n').trim(), subtasks: subtaskLines };
}

function isDocumentTask(task: Task) {
    return String(task.description || task.notes || '').startsWith(DOCUMENT_TASK_PREFIX);
}

function getTaskDate(task: Task) { return new Date(`${task.date}T${task.time}`); }
function getTaskDay(task: Task) { return startOfDay(getTaskDate(task)); }

function getRelativeTime(date: Date): { text: string; isPast: boolean } {
    const now = new Date();
    const isPast = date < now;
    const absMin = Math.abs(differenceInMinutes(date, now));
    const absH = Math.abs(differenceInHours(date, now));
    const absD = Math.abs(differenceInDays(date, now));
    if (absMin < 60) return { text: isPast ? `hace ${absMin}m` : `en ${absMin}m`, isPast };
    if (absH < 24) return { text: isPast ? `hace ${absH}h` : `en ${absH}h`, isPast };
    if (absD < 7) return { text: isPast ? `hace ${absD}d` : `en ${absD}d`, isPast };
    return { text: format(date, "d MMM", { locale: es }), isPast };
}

function sortTasks(items: Task[]) {
    return [...items].sort((a, b) => {
        const dateCompare = getTaskDate(a).getTime() - getTaskDate(b).getTime();
        if (dateCompare !== 0) return dateCompare;
        const w: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
        return w[a.priority] - w[b.priority];
    });
}

// Smart-parse del input: extrae @persona, #tag, !alta/!media/!baja, "mañana", "hoy", "lunes", "18h" o "18:30"
function smartParse(input: string, members: ListMember[]): {
    title: string;
    priority?: TaskPriority;
    assignedTo?: string;
    tags: string[];
    date?: Date;
} {
    let title = input;
    let priority: TaskPriority | undefined;
    let assignedTo: string | undefined;
    const tags: string[] = [];
    let date: Date | undefined;

    // !prioridad
    const prioMatch = title.match(/!\s*(alta|media|baja|high|medium|low)\b/i);
    if (prioMatch) {
        const p = prioMatch[1].toLowerCase();
        priority = (p === 'alta' || p === 'high') ? 'high' : (p === 'baja' || p === 'low') ? 'low' : 'medium';
        title = title.replace(prioMatch[0], '').trim();
    }

    // #tag
    title = title.replace(/#([\w\-]+)/g, (_, t) => { tags.push(t); return ''; }).trim();

    // @persona
    const atMatch = title.match(/@([\w\-]+)/);
    if (atMatch) {
        const name = atMatch[1].toLowerCase();
        const member = members.find(m => m.profile?.full_name?.toLowerCase().includes(name));
        if (member) assignedTo = member.user_id;
        title = title.replace(atMatch[0], '').trim();
    }

    // Fechas naturales
    const now = new Date();
    const lower = title.toLowerCase();
    const dayMap: Record<string, number> = { 'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3, 'miercoles': 3, 'jueves': 4, 'viernes': 5, 'sábado': 6, 'sabado': 6 };
    let baseDay: Date | null = null;

    if (/\bhoy\b/i.test(lower)) { baseDay = now; title = title.replace(/\bhoy\b/i, '').trim(); }
    else if (/\bmañana\b/i.test(lower) || /\bmanana\b/i.test(lower)) { baseDay = addDays(now, 1); title = title.replace(/\b(mañana|manana)\b/i, '').trim(); }
    else {
        for (const [dayName, dayNum] of Object.entries(dayMap)) {
            const re = new RegExp(`\\b${dayName}\\b`, 'i');
            if (re.test(lower)) {
                let target = new Date(now);
                const currentDay = target.getDay();
                let diff = (dayNum - currentDay + 7) % 7;
                if (diff === 0) diff = 7;
                target = addDays(target, diff);
                baseDay = target;
                title = title.replace(re, '').trim();
                break;
            }
        }
    }

    // Hora: 18h, 18:30, 9:00
    const timeMatch = title.match(/\b(\d{1,2})(?::(\d{2})|h)\b/);
    if (timeMatch) {
        const h = parseInt(timeMatch[1], 10);
        const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        if (h >= 0 && h < 24 && m >= 0 && m < 60) {
            const dayBase = baseDay || now;
            date = setMinutes(setHours(dayBase, h), m);
            title = title.replace(timeMatch[0], '').trim();
        }
    } else if (baseDay) {
        // sin hora — default 9:00
        date = setMinutes(setHours(baseDay, 9), 0);
    }

    title = title.replace(/\s+/g, ' ').trim();
    return { title, priority, assignedTo, tags, date };
}

function nextRecurrenceDate(date: Date, rec: Recurrence): Date {
    switch (rec) {
        case 'daily': return addDays(date, 1);
        case 'weekly': return addWeeks(date, 1);
        case 'monthly': return addMonths(date, 1);
        case 'yearly': return addYears(date, 1);
        default: return date;
    }
}

function getPriorityClasses(priority: TaskPriority) {
    if (priority === 'high') return 'border-l-rose-500';
    if (priority === 'low') return 'border-l-slate-300 dark:border-l-slate-700';
    return 'border-l-amber-400';
}

const PREFS_KEY = 'quioba_tasks_prefs_v2';
function loadPrefs(): { view: TaskView; filter: TaskFilter; mode: ViewMode } {
    if (typeof window === 'undefined') return { view: 'today', filter: 'pending', mode: 'list' };
    try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (!raw) return { view: 'today', filter: 'pending', mode: 'list' };
        return { view: 'today', filter: 'pending', mode: 'list', ...JSON.parse(raw) };
    } catch { return { view: 'today', filter: 'pending', mode: 'list' }; }
}
function savePrefs(prefs: { view: TaskView; filter: TaskFilter; mode: ViewMode }) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { }
}

// ============ COMPONENT ============

export default function TaskManager() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [currentList, setCurrentList] = useState<TaskList | null>(null);
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [showScanDialog, setShowScanDialog] = useState(false);
    const [members, setMembers] = useState<ListMember[]>([]);
    const [filterByMe, setFilterByMe] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form state (Sheet)
    const [formOpen, setFormOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [subtasks, setSubtasks] = useState<string[]>([]);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [priority, setPriority] = useState<TaskPriority>(DEFAULT_PRIORITY);
    const [hasAlarm, setHasAlarm] = useState(true);
    const [assignedTo, setAssignedTo] = useState<string>('unassigned');
    const [category, setCategory] = useState<Category>(null);
    const [recurrence, setRecurrence] = useState<Recurrence>('none');
    const [formTags, setFormTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');

    // Prefs persistidas
    const initial = useRef(loadPrefs());
    const [taskView, setTaskView] = useState<TaskView>(initial.current.view);
    const [taskFilter, setTaskFilter] = useState<TaskFilter>(initial.current.filter);
    const [viewMode, setViewMode] = useState<ViewMode>(initial.current.mode);
    const [showCompletedSection, setShowCompletedSection] = useState(false);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<Category | 'all'>('all');
    const [calendarDate, setCalendarDate] = useState<Date>(new Date());
    const [medicines, setMedicines] = useState<any[]>([]);

    const { user, isPremium } = useAuth();
    const searchRef = useRef<HTMLInputElement>(null);
    const categories = useCategories();

    useEffect(() => { savePrefs({ view: taskView, filter: taskFilter, mode: viewMode }); }, [taskView, taskFilter, viewMode]);

    // ============ Data fetch ============
    useEffect(() => {
        const safetyTimer = window.setTimeout(() => setLoading(false), 10000);
        if (user && currentList) { fetchTasks().finally(() => clearTimeout(safetyTimer)); }
        else if (!user) { setTasks([]); setLoading(false); clearTimeout(safetyTimer); }
        else if (!currentList) { setLoading(false); clearTimeout(safetyTimer); }
        if ('Notification' in window && Notification.permission !== 'granted') { void Notification.requestPermission(); }
        return () => clearTimeout(safetyTimer);
    }, [user, currentList]);

    useEffect(() => {
        if (currentList) void fetchMembers();
        else setMembers([]);
    }, [currentList]);

    useEffect(() => {
        if (!user) return;
        supabase.from('medicines').select('id, name, dosage, alarm_times, description').eq('user_id', user.id)
            .then(({ data }) => { if (data) setMedicines(data); });
    }, [user]);

    const handleTakeMedicine = async (medicineId: string, slotTime: string) => {
        const med = medicines.find(m => m.id === medicineId);
        if (!med) return;
        // Inline pharmacy meta parse (formato {pharma:{...}}\nrest)
        const PHARMA_RE = /^\{pharma:(\{[\s\S]*?\})\}\n?/;
        const desc = med.description || '';
        const match = desc.match(PHARMA_RE);
        let meta: any = {};
        const rest = match ? desc.replace(PHARMA_RE, '') : desc;
        if (match) { try { meta = JSON.parse(match[1]); } catch { /* ignore */ } }
        // Registrar toma
        const [hh, mm] = slotTime.split(':').map(Number);
        const when = new Date(); when.setHours(hh, mm, 0, 0);
        const intakes = [...(meta.intakes || []), when.toISOString()];
        let newMeta: any = { ...meta, intakes };
        if (newMeta.stock && newMeta.stock.current > 0) {
            newMeta = { ...newMeta, stock: { ...newMeta.stock, current: Math.max(0, newMeta.stock.current - 1) } };
        }
        const newDescription = `{pharma:${JSON.stringify(newMeta)}}\n${rest}`;
        const { error } = await supabase.from('medicines').update({ description: newDescription }).eq('id', medicineId);
        if (error) { toast.error('Error al registrar toma'); return; }
        setMedicines(prev => prev.map(p => p.id === medicineId ? { ...p, description: newDescription } : p));
        toast.success(`✓ ${med.name} marcado como tomado`);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const currentTime = format(now, 'HH:mm');
            const currentDate = format(now, 'yyyy-MM-dd');
            tasks.forEach((task) => {
                if (!task.completed && task.hasAlarm && task.date === currentDate && task.time === currentTime) {
                    playAlarmSound();
                    showNotification(task.title);
                    toast.info(`ALARMA: ${task.title}`, {
                        duration: 10000,
                        action: { label: 'Completar', onClick: () => { void toggleComplete(task.id); } },
                    });
                }
            });
        }, 60000);
        return () => clearInterval(interval);
    }, [tasks]);

    // ============ Atajos teclado ============
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
            if (inInput && e.key !== 'Escape') return;
            if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openNewTaskForm(); }
            else if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
            else if (e.key === 'Escape') {
                if (formOpen) setFormOpen(false);
                else if (expandedTaskId) setExpandedTaskId(null);
            }
            else if (e.key === '1') { setTaskView('today'); }
            else if (e.key === '2') { setTaskView('upcoming'); }
            else if (e.key === '3') { setTaskView('week'); }
            else if (e.key === '4') { setTaskView('all'); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [formOpen, expandedTaskId]);

    const canEditCurrentList = isPremium && !!currentList && currentList.role !== 'viewer';
    const currentUserMember = members.find((m) => m.user_id === user?.id);
    const canShareCurrentList = !!currentList && (currentList.owner_id === user?.id || currentUserMember?.role === 'editor');

    const fetchMembers = async () => {
        if (!currentList) return;
        const { data, error } = await supabase
            .from('task_list_members')
            .select(`user_id, role, profile:profiles!user_id(full_name, avatar_url)`)
            .eq('list_id', currentList.id);
        if (!error) setMembers((data as any) || []);
    };

    const fetchTasks = async () => {
        if (!currentList) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('tasks')
            .select(`*, assignee:profiles!assigned_to(full_name, avatar_url)`)
            .eq('list_id', currentList.id)
            .order('due_date', { ascending: true });
        if (error) { setLoading(false); toast.error('Error al cargar las tareas'); return; }
        const mapped: Task[] = (data || []).map((item: any) => {
            const dueDate = new Date(item.due_date);
            const { meta } = parseMeta(item.description);
            return {
                id: item.id,
                title: item.title,
                notes: item.description,
                description: item.description,
                date: format(dueDate, 'yyyy-MM-dd'),
                time: format(dueDate, 'HH:mm'),
                hasAlarm: item.has_alarm,
                completed: item.is_completed,
                assignedTo: item.assigned_to,
                priority: (item.priority as TaskPriority) || DEFAULT_PRIORITY,
                meta,
                assignee: item.assignee,
            };
        });
        setTasks(sortTasks(mapped));
        setLoading(false);
    };

    const resetForm = () => {
        setEditingTask(null);
        setTitle(''); setNotes(''); setSubtasks([]); setDate(''); setTime(''); setHasAlarm(true);
        setAssignedTo('unassigned'); setPriority(DEFAULT_PRIORITY); setCategory(null); setRecurrence('none');
        setFormTags([]); setTagInput('');
    };

    const openNewTaskForm = (preset?: { date?: Date }) => {
        if (!canEditCurrentList) { toast.error(currentList ? 'No puedes editar esta lista' : 'Selecciona una lista'); return; }
        resetForm();
        if (preset?.date) {
            setDate(format(preset.date, 'yyyy-MM-dd'));
            setTime(format(preset.date, 'HH:mm'));
        }
        setFormOpen(true);
    };

    const playAlarmSound = () => {
        try { const audio = new Audio('/alarm-sound.mp3'); void audio.play().catch(() => { }); } catch { }
    };
    const showNotification = (taskTitle: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Mi Hogar - Alarma', { body: taskTitle, icon: '/icons/icon-192x192.png' });
        }
    };

    const handleSaveTask = async () => {
        if (!isPremium) { toast.error('Solo Premium puede crear y editar tareas.'); return; }
        if (!canEditCurrentList) { toast.error('No puedes editar esta lista.'); return; }
        if (!title || !date || !time || !user || !currentList) { toast.error('Completa título, fecha, hora y lista.'); return; }

        const dueDate = new Date(`${date}T${time}`);
        const description = buildDescription(notes, subtasks, { cat: category, rec: recurrence, tags: formTags });
        const payload = {
            title,
            description,
            due_date: dueDate.toISOString(),
            has_alarm: hasAlarm,
            assigned_to: assignedTo === 'unassigned' ? null : assignedTo,
            priority,
        };

        try {
            if (editingTask) {
                const { error } = await supabase.from('tasks').update(payload).eq('id', editingTask.id);
                if (error) throw error;
                toast.success('Tarea actualizada');
            } else {
                const { error } = await supabase.from('tasks').insert([{ user_id: user.id, list_id: currentList.id, is_completed: false, ...payload }]);
                if (error) throw error;
                toast.success('Tarea creada');
            }
            resetForm();
            setFormOpen(false);
            await fetchTasks();
        } catch (e) {
            toast.error(editingTask ? 'Error al actualizar' : 'Error al crear');
        }
    };

    const startEditing = (task: Task) => {
        if (!canEditCurrentList) { toast.error('No puedes editar esta lista.'); return; }
        const parsed = parseTaskBody(task.notes);
        setEditingTask(task);
        setTitle(task.title);
        setNotes(parsed.notes);
        setSubtasks(parsed.subtasks);
        setDate(task.date);
        setTime(task.time);
        setHasAlarm(task.hasAlarm);
        setAssignedTo(task.assignedTo || 'unassigned');
        setPriority(task.priority || DEFAULT_PRIORITY);
        setCategory(parsed.meta.cat || null);
        setRecurrence(parsed.meta.rec || 'none');
        setFormTags(parsed.meta.tags || []);
        setFormOpen(true);
    };

    const toggleComplete = async (id: string) => {
        const task = tasks.find((t) => t.id === id);
        if (!task) return;
        const wasCompleted = task.completed;
        // Optimistic
        setTasks((cur) => sortTasks(cur.map((t) => t.id === id ? { ...t, completed: !wasCompleted } : t)));
        const { error } = await supabase.from('tasks').update({ is_completed: !wasCompleted }).eq('id', id);
        if (error) {
            toast.error('Error al actualizar');
            setTasks((cur) => sortTasks(cur.map((t) => t.id === id ? { ...t, completed: wasCompleted } : t)));
            return;
        }

        // Recurrencia: crear siguiente ocurrencia al completar
        if (!wasCompleted && task.meta.rec && task.meta.rec !== 'none' && currentList && user) {
            const nextDue = nextRecurrenceDate(getTaskDate(task), task.meta.rec);
            const parsed = parseTaskBody(task.notes);
            const description = buildDescription(parsed.notes, parsed.subtasks, task.meta);
            await supabase.from('tasks').insert([{
                user_id: user.id,
                list_id: currentList.id,
                title: task.title,
                description,
                due_date: nextDue.toISOString(),
                has_alarm: task.hasAlarm,
                assigned_to: task.assignedTo,
                priority: task.priority,
                is_completed: false,
            }]);
            void fetchTasks();
        }

        // Toast Undo
        toast(wasCompleted ? 'Reabierta' : '✓ Completada', {
            action: {
                label: 'Deshacer',
                onClick: async () => {
                    await supabase.from('tasks').update({ is_completed: wasCompleted }).eq('id', id);
                    void fetchTasks();
                },
            },
        });
    };

    const deleteTask = async (id: string, silent = false) => {
        const task = tasks.find((t) => t.id === id);
        if (!task) return;
        setTasks((cur) => cur.filter((t) => t.id !== id));
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) { toast.error('Error al eliminar'); void fetchTasks(); return; }
        if (editingTask?.id === id) resetForm();
        if (!silent) {
            toast('Tarea eliminada', {
                action: {
                    label: 'Deshacer',
                    onClick: async () => {
                        if (!user || !currentList) return;
                        const { meta } = parseMeta(task.description);
                        const parsed = parseTaskBody(task.notes);
                        const description = buildDescription(parsed.notes, parsed.subtasks, meta);
                        await supabase.from('tasks').insert([{
                            user_id: user.id, list_id: currentList.id,
                            title: task.title, description,
                            due_date: getTaskDate(task).toISOString(),
                            has_alarm: task.hasAlarm, assigned_to: task.assignedTo,
                            priority: task.priority, is_completed: task.completed,
                        }]);
                        void fetchTasks();
                    },
                },
            });
        }
    };

    const snoozeTask = async (task: Task, newDate: Date) => {
        const { error } = await supabase.from('tasks').update({ due_date: newDate.toISOString() }).eq('id', task.id);
        if (error) { toast.error('No se pudo posponer'); return; }
        setTasks((cur) => sortTasks(cur.map((t) => t.id === task.id ? { ...t, date: format(newDate, 'yyyy-MM-dd'), time: format(newDate, 'HH:mm') } : t)));
        toast.success(`Pospuesta a ${format(newDate, "EEE d MMM HH:mm", { locale: es })}`);
    };

    const toggleNoteSubtask = async (taskId: string, lineIndex: number, currentChecked: boolean) => {
        const task = tasks.find((t) => t.id === taskId);
        if (!task || !task.notes) return;
        const { meta, rest } = parseMeta(task.notes);
        const lines = rest.split('\n');
        if (lineIndex >= lines.length) return;
        lines[lineIndex] = currentChecked ? lines[lineIndex].replace('- [x]', '- [ ]') : lines[lineIndex].replace('- [ ]', '- [x]');
        const newDesc = (Object.keys(meta).length > 0 ? `{meta:${JSON.stringify(meta)}}\n` : '') + lines.join('\n');
        setTasks((cur) => cur.map((t) => t.id === taskId ? { ...t, notes: newDesc, description: newDesc } : t));
        const { error } = await supabase.from('tasks').update({ description: newDesc }).eq('id', taskId);
        if (error) toast.error('Error al actualizar');
    };

    // Drag & drop nativo: cambiar fecha al soltar en otra sección
    const dragTaskId = useRef<string | null>(null);
    const onDragStart = (taskId: string) => { dragTaskId.current = taskId; };
    const onDragOverSection = (e: React.DragEvent) => e.preventDefault();
    const onDropOnSection = async (e: React.DragEvent, sectionKey: string) => {
        e.preventDefault();
        const id = dragTaskId.current;
        dragTaskId.current = null;
        if (!id) return;
        const task = tasks.find((t) => t.id === id);
        if (!task) return;
        const now = new Date();
        let target: Date | null = null;
        const [h, m] = task.time.split(':').map(Number);
        if (sectionKey === 'today') target = setMinutes(setHours(now, h), m);
        else if (sectionKey === 'tomorrow') target = setMinutes(setHours(addDays(now, 1), h), m);
        else if (sectionKey === 'week') target = setMinutes(setHours(nextMonday(now), h), m);
        else if (sectionKey === 'later') target = setMinutes(setHours(addWeeks(now, 2), h), m);
        if (!target) return;
        await snoozeTask(task, target);
    };

    // Quick-add inline
    const handleQuickAdd = async (input: string, sectionDate: Date) => {
        if (!input.trim() || !user || !currentList) return;
        const parsed = smartParse(input.trim(), members);
        const due = parsed.date || setMinutes(setHours(sectionDate, 9), 0);
        const meta: TaskMeta = {};
        if (parsed.tags.length > 0) meta.tags = parsed.tags;
        const description = buildDescription('', [], meta);
        const { error } = await supabase.from('tasks').insert([{
            user_id: user.id,
            list_id: currentList.id,
            title: parsed.title,
            description,
            due_date: due.toISOString(),
            has_alarm: false,
            assigned_to: parsed.assignedTo || null,
            priority: parsed.priority || DEFAULT_PRIORITY,
            is_completed: false,
        }]);
        if (error) { toast.error('Error al crear'); return; }
        toast.success('Tarea añadida');
        void fetchTasks();
    };

    // ============ Memoized filters ============
    const visibleTasks = useMemo(() => {
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
        const nextSevenDays = addDays(startOfDay(new Date()), 7);

        return tasks.filter((task) => {
            const taskDate = getTaskDate(task);
            const taskDay = getTaskDay(task);
            const search = searchQuery.trim().toLowerCase();
            const matchesSearch = !search
                || task.title.toLowerCase().includes(search)
                || (task.notes || '').toLowerCase().includes(search)
                || (task.assignee?.full_name || '').toLowerCase().includes(search)
                || (task.meta.tags || []).some(t => t.toLowerCase().includes(search.replace(/^#/, '')));
            const matchesMine = !filterByMe || task.assignedTo === user?.id;
            const matchesView = taskView === 'all'
                || (taskView === 'today' && (task.completed || isBefore(taskDay, startOfDay(new Date())) || isToday(taskDate)))
                || (taskView === 'upcoming' && (task.completed || isTomorrow(taskDate) || taskDate > startOfDay(new Date())))
                || (taskView === 'week' && (task.completed || isWithinInterval(taskDate, { start: startOfDay(new Date()), end: nextSevenDays })));
            const matchesFilter = taskFilter === 'all'
                || (taskFilter === 'pending' && !task.completed)
                || (taskFilter === 'completed' && task.completed)
                || (taskFilter === 'overdue' && !task.completed && isBefore(taskDay, startOfDay(new Date())))
                || (taskFilter === 'alarm' && task.hasAlarm)
                || (taskFilter === 'unassigned' && !task.assignedTo);
            const matchesCategory = activeCategoryFilter === 'all'
                || (activeCategoryFilter === null ? !task.meta.cat : task.meta.cat === activeCategoryFilter);
            const withinWeekFilter = taskView !== 'week' || task.completed || isWithinInterval(taskDate, { start: startOfDay(new Date()), end: weekEnd }) || taskDate > weekEnd;

            return matchesSearch && matchesMine && matchesView && matchesFilter && matchesCategory && withinWeekFilter;
        });
    }, [tasks, searchQuery, filterByMe, taskView, taskFilter, user?.id, activeCategoryFilter]);

    const sectionData = useMemo(() => {
        const completedTasks = visibleTasks.filter((t) => t.completed);
        const pendingTasks = visibleTasks.filter((t) => !t.completed);
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
        const todayStart = startOfDay(new Date());

        const overdue = pendingTasks.filter((t) => isBefore(getTaskDay(t), todayStart));
        const todayTasks = pendingTasks.filter((t) => isToday(getTaskDate(t)));
        const tomorrowTasks = pendingTasks.filter((t) => isTomorrow(getTaskDate(t)));
        const weekTasks = pendingTasks.filter((t) => {
            const d = getTaskDate(t);
            return !isToday(d) && !isTomorrow(d) && isWithinInterval(d, { start: todayStart, end: weekEnd });
        });
        const laterTasks = pendingTasks.filter((t) => getTaskDate(t) > weekEnd);

        const sections: TaskSection[] = [];
        if (overdue.length > 0) sections.push({ key: 'overdue', title: 'Vencidas', description: 'Fuera de fecha', tasks: sortTasks(overdue) });
        sections.push({ key: 'today', title: 'Hoy', description: format(new Date(), "EEEE d 'de' MMMM", { locale: es }), tasks: sortTasks(todayTasks), sectionDate: new Date() });
        sections.push({ key: 'tomorrow', title: 'Mañana', description: format(addDays(new Date(), 1), "EEEE d", { locale: es }), tasks: sortTasks(tomorrowTasks), sectionDate: addDays(new Date(), 1) });
        if (weekTasks.length > 0) sections.push({ key: 'week', title: 'Esta semana', description: 'Próximos días', tasks: sortTasks(weekTasks), sectionDate: nextMonday(new Date()) });
        if (laterTasks.length > 0) sections.push({ key: 'later', title: 'Más adelante', description: 'Sin urgencia', tasks: sortTasks(laterTasks), sectionDate: addWeeks(new Date(), 2) });
        if ((showCompletedSection || taskFilter === 'completed') && completedTasks.length > 0) {
            sections.push({ key: 'completed', title: 'Completadas', description: 'Historial', tasks: sortTasks(completedTasks) });
        }

        const counts = {
            total: tasks.length,
            pending: tasks.filter((t) => !t.completed).length,
            completed: tasks.filter((t) => t.completed).length,
            overdue: tasks.filter((t) => !t.completed && isBefore(getTaskDay(t), todayStart)).length,
            today: tasks.filter((t) => !t.completed && isToday(getTaskDate(t))).length,
            withAlarm: tasks.filter((t) => t.hasAlarm && !t.completed).length,
        };

        return { sections, counts };
    }, [tasks, visibleTasks, showCompletedSection, taskFilter]);

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
            </div>
        );
    }

    // ============ RENDER ============
    return (
        <div className="space-y-4">
            {/* HEADER LIMPIO */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1 min-w-0">
                    <TaskListSelector
                        currentListId={currentList?.id || null}
                        onListChange={(list) => { setCurrentList(list); resetForm(); }}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowScanDialog(true)} disabled={!currentList}>
                        <Camera className="mr-1.5 h-3.5 w-3.5" /> Escanear
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowShareDialog(true)} disabled={!currentList || !canShareCurrentList}>
                        <Users className="mr-1.5 h-3.5 w-3.5" /> Compartir
                    </Button>
                    <Button size="sm" variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')}>
                        <LayoutList className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant={viewMode === 'calendar' ? 'default' : 'outline'} onClick={() => setViewMode('calendar')}>
                        <CalendarIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" onClick={() => openNewTaskForm()} disabled={!canEditCurrentList}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Nueva
                        <kbd className="ml-2 hidden sm:inline-block text-[9px] bg-white/20 px-1 rounded">N</kbd>
                    </Button>
                </div>
            </div>

            {/* CHIP-BAR DE STATS */}
            <div className="flex flex-wrap items-center gap-1.5">
                <ChipStat label="Pendientes" value={sectionData.counts.pending} active={taskFilter === 'pending' && taskView === 'all'} onClick={() => { setTaskView('all'); setTaskFilter('pending'); }} />
                <ChipStat label="Hoy" value={sectionData.counts.today} active={taskView === 'today' && taskFilter === 'pending'} onClick={() => { setTaskView('today'); setTaskFilter('pending'); }} color="text-quioba-cuerpo" />
                <ChipStat label="Vencidas" value={sectionData.counts.overdue} active={taskFilter === 'overdue'} onClick={() => { setTaskView('all'); setTaskFilter('overdue'); }} color="text-rose-600" />
                <ChipStat label="Alarmas" value={sectionData.counts.withAlarm} active={taskFilter === 'alarm'} onClick={() => { setTaskView('all'); setTaskFilter('alarm'); }} color="text-amber-600" />
                <ChipStat label="Completadas" value={sectionData.counts.completed} active={taskFilter === 'completed'} onClick={() => { setTaskView('all'); setTaskFilter('completed'); }} color="text-slate-500" />
                <div className="h-4 w-px bg-border mx-1" />
                {categories.map(cat => {
                    const active = activeCategoryFilter === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategoryFilter(active ? 'all' : cat.id)}
                            className={cn(
                                'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all border',
                                active ? 'text-white border-transparent shadow-sm' : 'border-border hover:border-current'
                            )}
                            style={active ? { backgroundColor: cat.color } : { color: cat.color }}
                        >
                            <CategoryBadge category={cat} size="sm" />
                            {cat.label}
                        </button>
                    );
                })}
                <CategoryManager />
            </div>

            {/* SEARCH + FILTROS */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        ref={searchRef}
                        className="pl-8 h-9 text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar título, notas, @persona, #tag…"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />
                        </button>
                    )}
                    <kbd className="hidden md:inline-block absolute right-7 top-1/2 -translate-y-1/2 text-[9px] bg-muted px-1 rounded text-muted-foreground">/</kbd>
                </div>
                <Select value={taskView} onValueChange={(v: TaskView) => setTaskView(v)}>
                    <SelectTrigger className="h-9 w-[120px] text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Hoy</SelectItem>
                        <SelectItem value="upcoming">Próximas</SelectItem>
                        <SelectItem value="week">Semana</SelectItem>
                        <SelectItem value="all">Todas</SelectItem>
                    </SelectContent>
                </Select>
                <Button size="sm" variant={filterByMe ? 'default' : 'outline'} onClick={() => setFilterByMe((c) => !c)} className="h-9">
                    <Users className="mr-1.5 h-3.5 w-3.5" /> Solo mías
                </Button>
                <Button size="sm" variant={showCompletedSection ? 'default' : 'outline'} onClick={() => setShowCompletedSection((c) => !c)} className="h-9">
                    {showCompletedSection ? <ChevronDown className="mr-1.5 h-3.5 w-3.5" /> : <ChevronRight className="mr-1.5 h-3.5 w-3.5" />}
                    Completadas
                </Button>
            </div>

            {/* Tomas de medicamentos — siempre visible si hay tomas hoy */}
            {(() => {
                const slots = getTodayIntakeSlots(medicines);
                if (slots.length === 0) return null;
                const takenCount = slots.filter(s => s.taken).length;
                const nowHM = new Date().getHours() * 60 + new Date().getMinutes();
                const isPast = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m < nowHM; };
                return (
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 overflow-hidden mb-3">
                        <header className="flex items-center gap-2 px-3 py-2 border-b border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
                            <span className="text-base leading-none">💊</span>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex-1">Tomas de hoy</h2>
                            <span className="text-[11px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold tabular-nums">{takenCount}/{slots.length}</span>
                            <a href="/apps/mi-hogar/pharmacy" className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium hover:underline">Ver botiquín →</a>
                        </header>
                        <div className="divide-y divide-emerald-100 dark:divide-emerald-900/40">
                            {slots.map(slot => {
                                const past = isPast(slot.time) && !slot.taken;
                                const formMeta = slot.form ? MEDICINE_FORM_META[slot.form] : MEDICINE_FORM_META.other;
                                return (
                                    <div key={`${slot.medicineId}-${slot.time}`} className={cn(
                                        "flex items-center gap-3 px-3 py-2 transition-colors",
                                        slot.taken ? 'opacity-50' : past ? 'bg-rose-50/60 dark:bg-rose-900/10' : ''
                                    )}>
                                        {/* Botón tomar / tomado */}
                                        <button
                                            onClick={() => !slot.taken && void handleTakeMedicine(slot.medicineId, slot.time)}
                                            disabled={slot.taken}
                                            className={cn(
                                                "shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                slot.taken
                                                    ? 'border-emerald-400 bg-emerald-400 cursor-default'
                                                    : 'border-amber-400 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer'
                                            )}
                                            title={slot.taken ? 'Ya tomado' : 'Marcar como tomado'}
                                        >
                                            {slot.taken && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                        </button>

                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0" style={{ backgroundColor: `${formMeta.color}20` }}>
                                            {formMeta.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn("text-sm font-semibold truncate", slot.taken && 'line-through text-muted-foreground')}>{slot.medicineName}</p>
                                            {slot.dosage && <p className="text-[11px] text-muted-foreground truncate">{slot.dosage}</p>}
                                            {slot.notes && <p className="text-[11px] text-muted-foreground truncate italic">{slot.notes}</p>}
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className={cn(
                                                "block text-[12px] font-mono font-bold tabular-nums",
                                                slot.taken ? 'text-emerald-600 dark:text-emerald-400'
                                                    : past ? 'text-rose-600 dark:text-rose-400'
                                                        : 'text-amber-600 dark:text-amber-400'
                                            )}>{slot.time}</span>
                                            <span className={cn(
                                                "text-[9px] font-medium uppercase tracking-wide",
                                                slot.taken ? 'text-emerald-500' : past ? 'text-rose-500' : 'text-amber-500'
                                            )}>
                                                {slot.taken ? '✓ tomado' : past ? 'pendiente' : 'próximo'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* VISTA: LISTA o CALENDARIO */}
            {viewMode === 'calendar' ? (
                <CalendarView
                    tasks={tasks}
                    calendarDate={calendarDate}
                    setCalendarDate={setCalendarDate}
                    onTaskClick={(t) => setExpandedTaskId(t.id === expandedTaskId ? null : t.id)}
                    onNewTask={(d) => openNewTaskForm({ date: setMinutes(setHours(d, 9), 0) })}
                />
            ) : (
                <div className="space-y-3">
                    {sectionData.sections.length === 0 ? (
                        <Card>
                            <CardContent className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
                                <Sparkles className="mb-3 h-10 w-10 text-quioba-cuerpo/40" />
                                <h3 className="text-base font-semibold">Todo en orden</h3>
                                <p className="mt-1 text-sm text-muted-foreground">Sin tareas para estos filtros.</p>
                                <Button className="mt-4" size="sm" onClick={() => openNewTaskForm()} disabled={!canEditCurrentList}>
                                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Crear primera tarea
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        sectionData.sections.map((section) => (
                            <section
                                key={section.key}
                                onDragOver={onDragOverSection}
                                onDrop={(e) => onDropOnSection(e, section.key)}
                                className="rounded-xl border border-border bg-card"
                            >
                                {/* Sticky section header */}
                                <header className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-xl bg-card/95 backdrop-blur px-3 py-2 border-b border-border">
                                    <div className="flex items-baseline gap-2 min-w-0">
                                        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{section.title}</h2>
                                        <span className="text-[10px] text-muted-foreground tabular-nums">{section.tasks.length}</span>
                                        <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">· {section.description}</span>
                                    </div>
                                </header>

                                <div className="divide-y divide-border/60">
                                    {section.tasks.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic px-3 py-2">Sin tareas en esta sección.</p>
                                    ) : (
                                        section.tasks.map((task) => (
                                            <TaskItem
                                                key={task.id}
                                                task={task}
                                                expanded={expandedTaskId === task.id}
                                                onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                                onToggleComplete={() => void toggleComplete(task.id)}
                                                onEdit={() => startEditing(task)}
                                                onDelete={() => void deleteTask(task.id)}
                                                onSnooze={(d) => void snoozeTask(task, d)}
                                                onDragStart={onDragStart}
                                                onToggleNoteSubtask={(idx, ck) => void toggleNoteSubtask(task.id, idx, ck)}
                                                canEdit={canEditCurrentList}
                                            />
                                        ))
                                    )}

                                    {/* Quick-add inline */}
                                    {section.sectionDate && canEditCurrentList && (
                                        <QuickAdd
                                            sectionDate={section.sectionDate}
                                            onAdd={(input) => handleQuickAdd(input, section.sectionDate!)}
                                        />
                                    )}
                                </div>
                            </section>
                        ))
                    )}
                </div>
            )}

            {/* SHEET FORMULARIO */}
            <Sheet open={formOpen} onOpenChange={setFormOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            {editingTask ? <Pencil className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                            {editingTask ? 'Editar tarea' : 'Nueva tarea'}
                        </SheetTitle>
                    </SheetHeader>

                    <div className="space-y-4 mt-4 pb-4">
                        {!isPremium && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                Solo Premium puede crear y editar.
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-xs">Título</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Renovar seguro del coche" autoFocus />
                            <p className="text-[10px] text-muted-foreground">
                                Tip: usa <kbd className="bg-muted px-1 rounded">@nombre</kbd>, <kbd className="bg-muted px-1 rounded">#tag</kbd>, <kbd className="bg-muted px-1 rounded">!alta</kbd>, <kbd className="bg-muted px-1 rounded">mañana 18h</kbd>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Fecha</Label>
                                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Hora</Label>
                                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9 text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Prioridad</Label>
                                <Select value={priority} onValueChange={(v: TaskPriority) => setPriority(v)}>
                                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="high">🔴 Alta</SelectItem>
                                        <SelectItem value="medium">🟡 Media</SelectItem>
                                        <SelectItem value="low">⚪ Baja</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Asignada a</Label>
                                <Select value={assignedTo} onValueChange={setAssignedTo}>
                                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Sin asignar</SelectItem>
                                        {members.map((m) => (
                                            <SelectItem key={m.user_id} value={m.user_id}>{m.profile?.full_name || 'Usuario'}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs">Categoría</Label>
                                <CategoryManager />
                            </div>
                            <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-muted/40 border border-border">
                                <button
                                    onClick={() => setCategory(null)}
                                    className={cn(
                                        "text-[11px] px-2 py-1 rounded-md font-medium transition-all",
                                        !category ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    Ninguna
                                </button>
                                {categories.map(c => {
                                    const active = category === c.id;
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => setCategory(c.id)}
                                            className={cn(
                                                "inline-flex items-center justify-center gap-1 text-[11px] px-2 py-1 rounded-md font-medium transition-all",
                                                active ? 'text-white shadow-sm' : 'hover:bg-background/80'
                                            )}
                                            style={active ? { backgroundColor: c.color } : { color: c.color }}
                                        >
                                            <CategoryBadge category={c} size="sm" />
                                            {c.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs flex items-center gap-1.5"><Repeat className="h-3 w-3" /> Recurrencia</Label>
                            <Select value={recurrence} onValueChange={(v: Recurrence) => setRecurrence(v)}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No se repite</SelectItem>
                                    <SelectItem value="daily">Cada día</SelectItem>
                                    <SelectItem value="weekly">Cada semana</SelectItem>
                                    <SelectItem value="monthly">Cada mes</SelectItem>
                                    <SelectItem value="yearly">Cada año</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs flex items-center gap-1.5"><TagIcon className="h-3 w-3" /> Etiquetas</Label>
                            <div className="flex flex-wrap gap-1 mb-1">
                                {formTags.map(t => (
                                    <span key={t} className="inline-flex items-center gap-1 text-[10px] bg-secondary px-1.5 py-0.5 rounded-full">
                                        {t}
                                        <button onClick={() => setFormTags(formTags.filter(x => x !== t))}><X className="h-2.5 w-2.5" /></button>
                                    </span>
                                ))}
                            </div>
                            <Input
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ',') {
                                        e.preventDefault();
                                        const t = tagInput.trim().replace(/^#/, '');
                                        if (t && !formTags.includes(t)) setFormTags([...formTags, t]);
                                        setTagInput('');
                                    }
                                }}
                                placeholder="Añadir etiqueta y Enter…"
                                className="h-8 text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs">Notas</Label>
                            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contexto, pasos, enlaces…" className="min-h-[80px] text-sm" />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs">Checklist</Label>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setSubtasks([...subtasks, ''])} className="h-7 text-xs">
                                    <Plus className="h-3 w-3 mr-1" /> Paso
                                </Button>
                            </div>
                            {subtasks.map((s, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <Input
                                        value={s}
                                        onChange={(e) => setSubtasks(subtasks.map((x, ix) => ix === i ? e.target.value : x))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') { e.preventDefault(); setSubtasks([...subtasks.slice(0, i + 1), '', ...subtasks.slice(i + 1)]); }
                                            else if (e.key === 'Backspace' && s === '') { e.preventDefault(); setSubtasks(subtasks.filter((_, ix) => ix !== i)); }
                                        }}
                                        placeholder={`Paso ${i + 1}`}
                                        className="h-8 text-sm"
                                    />
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSubtasks(subtasks.filter((_, ix) => ix !== i))}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                            {subtasks.length === 0 && <p className="text-[11px] text-muted-foreground italic">Sin pasos.</p>}
                        </div>

                        <div className="flex items-center justify-between rounded-xl border p-2.5">
                            <div>
                                <p className="text-xs font-medium">Alarma</p>
                                <p className="text-[10px] text-muted-foreground">Aviso en fecha/hora</p>
                            </div>
                            <Button type="button" size="sm" variant={hasAlarm ? 'default' : 'outline'} onClick={() => setHasAlarm((c) => !c)}>
                                {hasAlarm ? <Bell className="mr-1.5 h-3 w-3" /> : <BellOff className="mr-1.5 h-3 w-3" />}
                                {hasAlarm ? 'On' : 'Off'}
                            </Button>
                        </div>

                        <div className="flex gap-2 pt-2 sticky bottom-0 bg-background pb-2">
                            <Button onClick={() => void handleSaveTask()} disabled={!canEditCurrentList || !title || !date || !time} className="flex-1">
                                <Lock className="mr-1.5 h-3.5 w-3.5" />
                                {editingTask ? 'Guardar' : 'Crear tarea'}
                            </Button>
                            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {currentList && (
                <ShareTasksDialog
                    open={showShareDialog}
                    onOpenChange={setShowShareDialog}
                    listId={currentList.id}
                    listName={currentList.name}
                    isOwner={currentList.owner_id === user?.id}
                    onListUpdated={() => { void fetchMembers(); void fetchTasks(); }}
                />
            )}
            <ScreenshotToTaskDialog
                open={showScanDialog}
                onOpenChange={setShowScanDialog}
                onSuccess={() => void fetchTasks()}
                listId={currentList?.id}
            />
        </div>
    );
}

// ============ SUBCOMPONENTES ============

function ChipStat({ label, value, active, onClick, color }: { label: string; value: number; active: boolean; onClick: () => void; color?: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium transition-all border',
                active ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card border-border hover:border-primary/40'
            )}
        >
            <span className={cn("text-xs font-bold tabular-nums", !active && color, active && 'text-primary-foreground')}>{value}</span>
            <span className={cn(!active && 'text-foreground')}>{label}</span>
        </button>
    );
}

function QuickAdd({ sectionDate, onAdd }: { sectionDate: Date; onAdd: (input: string) => void }) {
    const [input, setInput] = useState('');
    const [focused, setFocused] = useState(false);
    return (
        <form
            onSubmit={(e) => { e.preventDefault(); if (input.trim()) { onAdd(input); setInput(''); } }}
            className={cn("flex items-center gap-2 px-3 py-1.5 transition-colors", focused && "bg-accent/30")}
        >
            <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={`Añadir a ${format(sectionDate, "EEEE", { locale: es }).toLowerCase()}…`}
                className="flex-1 bg-transparent border-0 outline-none text-sm py-0.5 placeholder:text-muted-foreground/70"
            />
            {input && (
                <button type="submit" className="text-[10px] text-primary font-medium hover:underline">
                    Añadir ⏎
                </button>
            )}
        </form>
    );
}

function TaskItem({
    task, expanded, onToggleExpand, onToggleComplete, onEdit, onDelete, onSnooze, onDragStart, onToggleNoteSubtask, canEdit,
}: {
    task: Task; expanded: boolean;
    onToggleExpand: () => void; onToggleComplete: () => void; onEdit: () => void; onDelete: () => void;
    onSnooze: (d: Date) => void; onDragStart: (id: string) => void;
    onToggleNoteSubtask: (lineIndex: number, currentChecked: boolean) => void;
    canEdit: boolean;
}) {
    const isCompleted = task.completed;
    const isDocTask = isDocumentTask(task);
    const taskDate = getTaskDate(task);
    const rel = getRelativeTime(taskDate);
    const isOverdue = !isCompleted && isBefore(getTaskDay(task), startOfDay(new Date()));
    const catMeta = findCategory(task.meta.cat);
    const parsed = parseTaskBody(task.notes);

    return (
        <div
            draggable={canEdit}
            onDragStart={() => onDragStart(task.id)}
            className={cn(
                "group relative pl-3 pr-2 py-2 transition-colors hover:bg-accent/30 cursor-pointer border-l-4",
                getPriorityClasses(task.priority),
                isCompleted && "opacity-60",
                expanded && "bg-accent/40"
            )}
            onClick={onToggleExpand}
        >
            <div className="flex items-start gap-2.5">
                {/* Drag handle (solo desktop, en hover) */}
                {canEdit && (
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 cursor-grab mt-1 shrink-0 hidden sm:block" />
                )}

                {/* Checkbox */}
                <button
                    type="button"
                    className="mt-0.5 shrink-0 hover:scale-110 transition-transform"
                    onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
                >
                    {isCompleted ? <CheckCircle2 className="h-5 w-5 text-quioba-cuerpo" /> : <Circle className="h-5 w-5 text-muted-foreground hover:text-quioba-cuerpo" />}
                </button>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className={cn("text-sm font-medium leading-tight", isCompleted && "line-through text-muted-foreground")}>
                            {task.title}
                        </h3>
                        {catMeta && (
                            <span
                                className="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0 rounded-full font-medium"
                                style={{ color: catMeta.color, backgroundColor: `${catMeta.color}1a` }}
                            >
                                <CategoryBadge category={catMeta} size="xs" />
                                {catMeta.label}
                            </span>
                        )}
                        {task.meta.rec && task.meta.rec !== 'none' && (
                            <Repeat className="h-3 w-3 text-muted-foreground" />
                        )}
                        {isDocTask && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">DOC</Badge>}
                    </div>

                    {/* Meta line */}
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                        <span className={cn("inline-flex items-center gap-0.5", isOverdue && "text-rose-600 font-medium")}>
                            <Clock className="h-2.5 w-2.5" />
                            {rel.text}
                        </span>
                        {task.hasAlarm && <Bell className="h-2.5 w-2.5 text-amber-500" />}
                        {task.assignee && (
                            <span className="inline-flex items-center gap-1">
                                <Avatar className="h-4 w-4">
                                    <AvatarImage src={task.assignee.avatar_url} alt={task.assignee.full_name} />
                                    <AvatarFallback className="text-[9px]">{task.assignee.full_name?.slice(0, 1)?.toUpperCase() || 'U'}</AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-[100px]">{task.assignee.full_name}</span>
                            </span>
                        )}
                        {(task.meta.tags || []).slice(0, 3).map(t => (
                            <span key={t} className="text-[9.5px] px-1 rounded bg-secondary/60">#{t}</span>
                        ))}
                    </div>

                    {/* Expand: notas + checklist + acciones */}
                    {expanded && (
                        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                            {parsed.notes && (
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{parsed.notes}</p>
                            )}
                            {parsed.subtasks.length > 0 && (
                                <div className="space-y-0.5">
                                    {parsed.subtasks.map((line, i) => {
                                        const allLines = parseMeta(task.notes).rest.split('\n');
                                        const realLineIndex = allLines.findIndex((l, idx) => {
                                            const isChk = l.trim().startsWith('- [ ]') || l.trim().startsWith('- [x]');
                                            if (!isChk) return false;
                                            const prevChkCount = allLines.slice(0, idx).filter(ll => ll.trim().startsWith('- [ ]') || ll.trim().startsWith('- [x]')).length;
                                            return prevChkCount === i;
                                        });
                                        const isChecked = realLineIndex >= 0 && allLines[realLineIndex].trim().startsWith('- [x]');
                                        return (
                                            <div key={i} className="flex items-start gap-2 text-xs">
                                                <button type="button" onClick={() => onToggleNoteSubtask(realLineIndex, isChecked)} className={isChecked ? 'mt-0.5 text-quioba-cuerpo' : 'mt-0.5 text-muted-foreground hover:text-quioba-cuerpo'}>
                                                    {isChecked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                                                </button>
                                                <span className={isChecked ? 'line-through opacity-70' : ''}>{line.replace(/- \[[ x]\]/, '').trim()}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-1 pt-1">
                                <SnoozePopover onSnooze={onSnooze} taskDate={taskDate} />
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onEdit} disabled={!canEdit}>
                                    <Pencil className="h-3 w-3 mr-1" /> Editar
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onDelete} disabled={!canEdit}>
                                    <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SnoozePopover({ onSnooze, taskDate }: { onSnooze: (d: Date) => void; taskDate: Date }) {
    const [open, setOpen] = useState(false);
    const presets = [
        { label: '+1 hora', date: addHours(new Date(), 1) },
        { label: 'Esta tarde (18h)', date: setMinutes(setHours(new Date(), 18), 0) },
        { label: 'Mañana 9h', date: setMinutes(setHours(addDays(new Date(), 1), 9), 0) },
        { label: 'Próximo lunes 9h', date: setMinutes(setHours(nextMonday(new Date()), 9), 0) },
        { label: 'En 1 semana', date: addWeeks(taskDate, 1) },
    ];
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 text-xs">
                    <Clock className="h-3 w-3 mr-1" /> Posponer
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
                {presets.map(p => (
                    <button
                        key={p.label}
                        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded hover:bg-accent text-left"
                        onClick={() => { onSnooze(p.date); setOpen(false); }}
                    >
                        <span>{p.label}</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{format(p.date, 'd/M HH:mm')}</span>
                    </button>
                ))}
            </PopoverContent>
        </Popover>
    );
}

function CalendarView({
    tasks, calendarDate, setCalendarDate, onTaskClick, onNewTask,
}: {
    tasks: Task[]; calendarDate: Date; setCalendarDate: (d: Date) => void;
    onTaskClick: (t: Task) => void; onNewTask: (d: Date) => void;
}) {
    const tasksByDay = useMemo(() => {
        const map: Record<string, Task[]> = {};
        tasks.forEach(t => {
            if (!map[t.date]) map[t.date] = [];
            map[t.date].push(t);
        });
        return map;
    }, [tasks]);

    const dayKey = format(calendarDate, 'yyyy-MM-dd');
    const dayTasks = sortTasks(tasksByDay[dayKey] || []);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4">
            <Card className="lg:w-fit">
                <CardContent className="p-3">
                    <Calendar
                        mode="single"
                        selected={calendarDate}
                        onSelect={(d) => d && setCalendarDate(d)}
                        locale={es}
                        modifiers={{
                            hasTasks: (d) => !!tasksByDay[format(d, 'yyyy-MM-dd')]?.length,
                        }}
                        modifiersClassNames={{
                            hasTasks: 'font-bold relative after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-quioba-cuerpo',
                        }}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4 space-y-2">
                    <div className="flex items-baseline justify-between mb-2">
                        <h3 className="text-sm font-bold uppercase tracking-wider">
                            {format(calendarDate, "EEEE d 'de' MMMM", { locale: es })}
                        </h3>
                        <Button size="sm" onClick={() => onNewTask(calendarDate)}>
                            <Plus className="h-3 w-3 mr-1" /> Nueva
                        </Button>
                    </div>
                    {dayTasks.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">Sin tareas este día</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {dayTasks.map(t => {
                                const catMeta = findCategory(t.meta.cat);
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => onTaskClick(t)}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2 py-1.5 rounded border-l-4 hover:bg-accent/40 transition-colors text-left",
                                            getPriorityClasses(t.priority),
                                            t.completed && "opacity-50"
                                        )}
                                    >
                                        <span className="text-[10px] text-muted-foreground tabular-nums w-10">{t.time}</span>
                                        <span className={cn("text-sm flex-1 truncate", t.completed && "line-through")}>{t.title}</span>
                                        {catMeta && <CategoryBadge category={catMeta} size="sm" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
