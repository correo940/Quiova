'use client';

import { useState, useEffect, useRef } from 'react';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Circle, Clock, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';

type Task = {
  id: string;
  title: string;
  date: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  hasAlarm: boolean;
};

const PRIORITY_STYLES = {
  high: {
    pill: 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
    glow: 'shadow-rose-500/20',
  },
  medium: {
    pill: 'bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    glow: 'shadow-amber-500/20',
  },
  low: {
    pill: 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    glow: 'shadow-emerald-500/20',
  },
};

const OVERDUE_STYLE = {
  pill: 'bg-red-600/10 border border-red-500/40 text-red-700 dark:text-red-300',
  dot: 'bg-red-600',
  glow: 'shadow-red-500/20',
};

const COMPLETED_STYLE = {
  pill: 'bg-muted/60 border border-border text-muted-foreground line-through',
  dot: 'bg-muted-foreground/40',
  glow: '',
};

function getTaskStyle(task: Task) {
  if (task.completed) return COMPLETED_STYLE;
  const now = startOfDay(new Date());
  const taskDay = startOfDay(new Date(`${task.date}T${task.time}`));
  if (isBefore(taskDay, now)) return OVERDUE_STYLE;
  return PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.medium;
}

export default function AgendaDia() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es });
  const todayDate = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchTodayTasks();
  }, [user]);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [tasks]);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'right' ? 280 : -280, behavior: 'smooth' });
  };

  const fetchTodayTasks = async () => {
    try {
      setLoading(true);
      const startOfTodayISO = new Date(`${todayDate}T00:00:00`).toISOString();
      const endOfTodayISO = new Date(`${todayDate}T23:59:59`).toISOString();

      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, due_date, has_alarm, is_completed, priority')
        .eq('user_id', user!.id)
        .gte('due_date', startOfTodayISO)
        .lte('due_date', endOfTodayISO)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const mapped: Task[] = (data || []).map((item: any) => {
        const d = new Date(item.due_date);
        return {
          id: item.id,
          title: item.title,
          date: format(d, 'yyyy-MM-dd'),
          time: format(d, 'HH:mm'),
          priority: (item.priority as 'high' | 'medium' | 'low') || 'medium',
          completed: item.is_completed,
          hasAlarm: item.has_alarm,
        };
      });

      setTasks(mapped);
    } catch (e) {
      console.error('AgendaDia fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const next = !task.completed;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: next } : t));
    await supabase.from('tasks').update({ is_completed: next }).eq('id', id);
  };

  // Filter: include today's tasks + overdue (not completed, before today)
  const pendingCount = tasks.filter(t => !t.completed).length;
  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-semibold text-foreground tracking-tight">
            Agenda del día
          </span>
          <span className="text-xs text-muted-foreground capitalize ml-1">{today}</span>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
            </span>
          )}
          {completedCount > 0 && (
            <span className="text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {completedCount} ✓
            </span>
          )}
          <Link
            href="/apps/mi-hogar/tasks"
            className="text-xs text-muted-foreground hover:text-primary transition-colors ml-1"
          >
            Ver todo →
          </Link>
        </div>
      </div>

      {/* Scrollable pills row */}
      <div className="relative px-2 pb-4">
        {/* Left fade + arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-background/90 border shadow-sm flex items-center justify-center hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-none px-3 py-2 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading ? (
            // Skeleton pills
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 h-9 w-36 rounded-full bg-muted animate-pulse"
              />
            ))
          ) : tasks.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground italic w-full">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Sin tareas para hoy. ¡Buen día!
            </div>
          ) : (
            tasks.map(task => {
              const style = getTaskStyle(task);
              return (
                <button
                  key={task.id}
                  onClick={() => toggleComplete(task.id)}
                  title={`${task.title} · ${task.time}`}
                  className={`
                    group flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full
                    text-xs font-medium transition-all duration-200 cursor-pointer
                    hover:scale-105 hover:shadow-md select-none
                    ${style.pill} ${style.glow}
                    ${task.completed ? 'opacity-60' : ''}
                  `}
                >
                  {/* Status icon */}
                  <span className="flex-shrink-0">
                    {task.completed
                      ? <CheckCircle2 className="w-3.5 h-3.5" />
                      : <Circle className="w-3.5 h-3.5 group-hover:hidden" />
                    }
                    {!task.completed && (
                      <CheckCircle2 className="w-3.5 h-3.5 hidden group-hover:block opacity-50" />
                    )}
                  </span>

                  {/* Color dot */}
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />

                  {/* Title - max 22 chars */}
                  <span className="max-w-[140px] truncate">
                    {task.title}
                  </span>

                  {/* Time */}
                  <span className="flex-shrink-0 flex items-center gap-0.5 opacity-70">
                    <Clock className="w-2.5 h-2.5" />
                    {task.time}
                  </span>

                  {/* Alarm indicator */}
                  {task.hasAlarm && !task.completed && (
                    <Bell className="w-2.5 h-2.5 flex-shrink-0 opacity-60" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-background/90 border shadow-sm flex items-center justify-center hover:bg-accent transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
