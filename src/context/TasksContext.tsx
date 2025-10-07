'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// --- Types Definition ---
export interface Task {
  id: number;
  text: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string | null;
  category: keyof typeof categories;
  priority: keyof typeof priorities;
}

export const categories = {
  personal: { name: 'Personal' },
  work: { name: 'Trabajo' },
  health: { name: 'Salud' },
  home: { name: 'Hogar' },
  learning: { name: 'Aprender' },
  fun: { name: 'Diversión' },
};

export const priorities = {
  low: { name: 'Baja' },
  medium: { name: 'Media' },
  high: { name: 'Alta' },
};

interface TasksContextType {
  tasks: Task[];
  magicPoints: number;
  currentStreak: number;
  addTask: (taskData: Omit<Task, 'id' | 'completed' | 'createdAt'>) => void;
  toggleTaskCompletion: (taskId: number) => void;
  deleteTask: (taskId: number) => void;
  categories: typeof categories;
  priorities: typeof priorities;
}

// --- Context Creation ---
const TasksContext = createContext<TasksContextType | undefined>(undefined);

// --- Provider Component ---
export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [magicPoints, setMagicPoints] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem('tasks');
      if (storedTasks) setTasks(JSON.parse(storedTasks));

      const storedPoints = localStorage.getItem('magicPoints');
      if (storedPoints) setMagicPoints(parseInt(storedPoints, 10));

      const storedStreak = localStorage.getItem('currentStreak');
      if (storedStreak) setCurrentStreak(parseInt(storedStreak, 10));
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('tasks', JSON.stringify(tasks));
    } catch (error) {
      console.error("Failed to save tasks to localStorage", error);
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem('magicPoints', magicPoints.toString());
      localStorage.setItem('currentStreak', currentStreak.toString());
    } catch (error) {
      console.error("Failed to save gamification data to localStorage", error);
    }
  }, [magicPoints, currentStreak]);

  const addTask = (taskData: Omit<Task, 'id' | 'completed' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks(prevTasks => [newTask, ...prevTasks]);
    setMagicPoints(prev => prev + 5);
  };

  const toggleTaskCompletion = (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
      setMagicPoints(prev => prev + 10);
      setCurrentStreak(prev => prev + 1);
    }
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null } : t
    ));
  };

  const deleteTask = (taskId: number) => {
    if (currentStreak > 0) {
        setCurrentStreak(0);
    }
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const value = {
    tasks,
    magicPoints,
    currentStreak,
    addTask,
    toggleTaskCompletion,
    deleteTask,
    categories,
    priorities,
  };

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

// --- Custom Hook ---
export function useTasks() {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
}
