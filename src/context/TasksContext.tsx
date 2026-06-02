'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { Level, getLevelForPoints, getNextLevel } from '@/lib/levels';
import { streakBonuses } from '@/lib/streaks';
import { supabase } from '@/lib/supabase';

// ── #09 Supabase sync helpers ─────────────────────────────────────────
async function getUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch { return null; }
}

async function syncTasksToSupabase(tasks: Task[], userId: string) {
  if (!tasks.length) return;
  const rows = tasks.map(t => ({
    id: String(t.id),
    user_id: userId,
    text: t.text,
    completed: t.completed,
    created_at: t.createdAt,
    completed_at: t.completedAt ?? null,
    category: t.category,
    priority: t.priority,
    due_date: t.dueDate ?? null,
    subtasks: t.subtasks ?? [],
    updated_at: new Date().toISOString(),
  }));
  await supabase.from('personal_tasks').upsert(rows, { onConflict: 'id' });
}

async function syncGamificationToSupabase(magicPoints: number, currentStreak: number, userId: string) {
  await supabase.from('user_gamification').upsert(
    { user_id: userId, magic_points: magicPoints, current_streak: currentStreak, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
}

async function loadTasksFromSupabase(userId: string): Promise<Task[] | null> {
  try {
    const { data, error } = await supabase
      .from('personal_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return null;
    return data.map(r => ({
      id: Number(r.id),
      text: r.text,
      completed: r.completed,
      createdAt: r.created_at,
      completedAt: r.completed_at,
      category: r.category as keyof typeof categories,
      priority: r.priority as keyof typeof priorities,
      dueDate: r.due_date,
      subtasks: r.subtasks ?? [],
    }));
  } catch { return null; }
}

async function loadGamificationFromSupabase(userId: string): Promise<{ magicPoints: number; currentStreak: number } | null> {
  try {
    const { data } = await supabase.from('user_gamification').select('*').eq('user_id', userId).single();
    if (!data) return null;
    return { magicPoints: data.magic_points, currentStreak: data.current_streak };
  } catch { return null; }
}

// --- Types ---
export interface Subtask { id: number; text: string; completed: boolean; }
export interface Task {
  id: number; text: string; completed: boolean; createdAt: string;
  completedAt?: string | null; category: keyof typeof categories;
  priority: keyof typeof priorities; subtasks?: Subtask[]; dueDate?: string;
}
export const categories = {
  personal: { name: 'Personal' }, work: { name: 'Trabajo' }, health: { name: 'Salud' },
  home: { name: 'Hogar' }, learning: { name: 'Aprender' }, fun: { name: 'Diversión' },
};
export const priorities = {
  low: { name: 'Baja' }, medium: { name: 'Media' }, high: { name: 'Alta' },
};

interface TasksContextType {
  tasks: Task[]; magicPoints: number; currentStreak: number;
  currentLevel: Level; nextLevel: Level | null; progressToNextLevel: number;
  addTask: (t: Omit<Task, 'id' | 'completed' | 'createdAt'>) => void;
  updateTask: (id: number, t: Partial<Omit<Task, 'id'>>) => void;
  toggleTaskCompletion: (id: number) => void; deleteTask: (id: number) => void;
  addSubtask: (taskId: number, text: string) => void;
  toggleSubtaskCompletion: (taskId: number, subtaskId: number) => void;
  deleteSubtask: (taskId: number, subtaskId: number) => void;
  updateSubtask: (taskId: number, subtaskId: number, newText: string) => void;
  categories: typeof categories; priorities: typeof priorities;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [magicPoints, setMagicPoints] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const isInitialMount = useRef(true);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Carga inicial: Supabase primero, localStorage como fallback ────
  useEffect(() => {
    (async () => {
      const uid = await getUserId();
      if (uid) {
        const [remoteTasks, remoteGami] = await Promise.all([
          loadTasksFromSupabase(uid),
          loadGamificationFromSupabase(uid),
        ]);
        if (remoteTasks !== null) { setTasks(remoteTasks); }
        else {
          try { const s = localStorage.getItem('tasks'); if (s) setTasks(JSON.parse(s)); } catch {}
        }
        if (remoteGami !== null) {
          setMagicPoints(remoteGami.magicPoints);
          setCurrentStreak(remoteGami.currentStreak);
        } else {
          try {
            const p = localStorage.getItem('magicPoints'); if (p) setMagicPoints(parseInt(p, 10));
            const st = localStorage.getItem('currentStreak'); if (st) setCurrentStreak(parseInt(st, 10));
          } catch {}
        }
      } else {
        // Sin sesión: solo localStorage
        try {
          const s = localStorage.getItem('tasks'); if (s) setTasks(JSON.parse(s));
          const p = localStorage.getItem('magicPoints'); if (p) setMagicPoints(parseInt(p, 10));
          const st = localStorage.getItem('currentStreak'); if (st) setCurrentStreak(parseInt(st, 10));
        } catch {}
      }
    })();
  }, []);

  // ── Sync a Supabase con debounce (500ms) + localStorage como cache ─
  useEffect(() => {
    try { localStorage.setItem('tasks', JSON.stringify(tasks)); } catch {}
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      const uid = await getUserId();
      if (uid) syncTasksToSupabase(tasks, uid);
    }, 500);
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem('magicPoints', magicPoints.toString());
      localStorage.setItem('currentStreak', currentStreak.toString());
    } catch {}
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      const uid = await getUserId();
      if (uid) syncGamificationToSupabase(magicPoints, currentStreak, uid);
    }, 500);
  }, [magicPoints, currentStreak]);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    const bonus = streakBonuses.find(b => b.streak === currentStreak);
    if (bonus) {
      setMagicPoints(prev => prev + bonus.points);
      alert(`¡Racha de ${bonus.streak} días! +${bonus.points} puntos extra`);
    }
  }, [currentStreak]);

  const addTask = (taskData: Omit<Task, 'id' | 'completed' | 'createdAt'>) => {
    const newTask: Task = { ...taskData, id: Date.now(), completed: false, createdAt: new Date().toISOString(), subtasks: [] };
    setTasks(prev => [newTask, ...prev]);
    setMagicPoints(prev => prev + 5);
  };

  const updateTask = (taskId: number, taskData: Partial<Omit<Task, 'id'>>) =>
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...taskData } : t));

  const toggleTaskCompletion = (taskId: number) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      const completing = !task.completed;
      if (completing && task.subtasks?.some(st => !st.completed)) return task;
      if (completing) { setMagicPoints(p => p + 10); setCurrentStreak(p => p + 1); }
      return { ...task, completed: completing, completedAt: completing ? new Date().toISOString() : null,
        subtasks: task.subtasks?.map(st => ({ ...st, completed: completing })) };
    }));
  };

  const deleteTask = (taskId: number) => {
    if (currentStreak > 0) setCurrentStreak(0);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    // Borrar en Supabase
    getUserId().then(uid => { if (uid) supabase.from('personal_tasks').delete().eq('id', String(taskId)).eq('user_id', uid); });
  };

  const addSubtask = (taskId: number, subtaskText: string) =>
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, subtasks: [...(t.subtasks ?? []), { id: Date.now(), text: subtaskText, completed: false }], completed: false }
      : t));

  const toggleSubtaskCompletion = (taskId: number, subtaskId: number) =>
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      const newSubs = task.subtasks?.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
      const allDone = newSubs?.every(st => st.completed);
      if (allDone && !task.completed) { setMagicPoints(p => p + 10); setCurrentStreak(p => p + 1); }
      return { ...task, subtasks: newSubs, completed: allDone ?? false, completedAt: allDone ? new Date().toISOString() : null };
    }));

  const deleteSubtask = (taskId: number, subtaskId: number) =>
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: t.subtasks?.filter(st => st.id !== subtaskId) } : t));

  const updateSubtask = (taskId: number, subtaskId: number, newText: string) =>
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, subtasks: t.subtasks?.map(st => st.id === subtaskId ? { ...st, text: newText } : st) }
      : t));

  const currentLevel = getLevelForPoints(magicPoints);
  const nextLevel = getNextLevel(magicPoints);
  let progressToNextLevel = 100;
  if (nextLevel) {
    const range = nextLevel.minPoints - currentLevel.minPoints;
    progressToNextLevel = ((magicPoints - currentLevel.minPoints) / range) * 100;
  }

  return (
    <TasksContext.Provider value={{
      tasks, magicPoints, currentStreak, currentLevel, nextLevel, progressToNextLevel,
      addTask, updateTask, toggleTaskCompletion, deleteTask,
      addSubtask, toggleSubtaskCompletion, deleteSubtask, updateSubtask,
      categories, priorities,
    }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within a TasksProvider');
  return ctx;
}
