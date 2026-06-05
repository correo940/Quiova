'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';
import { NotificationManager } from '@/lib/notifications';
import { showNotificationToast } from '@/components/notifications/notification-toast';
import { hasBeenShownToday, markShownToday } from '@/lib/web-notification-tracker';

interface Task {
  id: string;
  title: string;
  due_date: string;
  has_alarm?: boolean;
}

export default function TaskNotificationManager() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const webTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: any, session: any) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    if (Capacitor.isNativePlatform()) {
      setupNativeNotifications();
    } else {
      setupWebNotifications();
    }

    const channel = supabase
      .channel('task_notifications_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        if (Capacitor.isNativePlatform()) {
          setupNativeNotifications();
        } else {
          clearWebTimers();
          setupWebNotifications();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearWebTimers();
    };

    // ── Native: schedule one-shot OS notification at due_date ───────────────
    async function setupNativeNotifications() {
      const granted = await NotificationManager.requestPermissions();
      if (!granted) return;

      const now = new Date();
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, due_date, has_alarm')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gt('due_date', now.toISOString());

      if (!tasks) return;

      tasks.forEach((task: Task) => {
        if (!task.due_date || task.has_alarm === false) return;
        const notifId = NotificationManager.generateId(`task_${task.id}`);
        NotificationManager.schedule({
          id: notifId,
          title: '📅 Tarea pendiente',
          body: task.title,
          schedule: { at: new Date(task.due_date) },
          extra: { type: 'task', route: '/apps/mi-hogar/tasks' },
        });
      });
    }

    // ── Web: missed → toast "ya pasó", upcoming → setTimeout ────────────────
    async function setupWebNotifications() {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      // Fetch tasks due today (completed ones excluded)
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, due_date, has_alarm')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gte('due_date', todayStart.toISOString())
        .lte('due_date', todayEnd.toISOString());

      if (!tasks) return;

      const goToTasks = () => router.push('/apps/mi-hogar/tasks');

      tasks.forEach((task: Task) => {
        if (!task.due_date || task.has_alarm === false) return;
        if (hasBeenShownToday('task', task.id)) return;

        const dueDate = new Date(task.due_date);
        const timeLabel = dueDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        if (dueDate <= now) {
          // Task due time passed today
          markShownToday('task', task.id);
          showNotificationToast({
            icon: '📅',
            title: 'Tarea sin completar',
            subtitle: task.title,
            missed: true,
            scheduledTime: timeLabel,
            onGo: goToTasks,
            duration: 16000,
          });
        } else {
          // Task due later today
          const delay = dueDate.getTime() - now.getTime();
          const timer = setTimeout(() => {
            if (hasBeenShownToday('task', task.id)) return;
            markShownToday('task', task.id);
            showNotificationToast({
              icon: '📅',
              title: 'Tarea pendiente',
              subtitle: task.title,
              missed: false,
              onGo: goToTasks,
              duration: 14000,
            });
          }, delay);
          webTimersRef.current.push(timer);
        }
      });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  function clearWebTimers() {
    webTimersRef.current.forEach(clearTimeout);
    webTimersRef.current = [];
  }

  return null;
}
