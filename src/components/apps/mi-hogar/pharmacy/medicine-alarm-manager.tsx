'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';
import { NotificationManager } from '@/lib/notifications';
import { showNotificationToast } from '@/components/notifications/notification-toast';
import { hasBeenShownToday, markShownToday, cleanOldNotifEntries } from '@/lib/web-notification-tracker';

interface Medicine {
  id: string;
  name: string;
  dosage?: string;
  alarm_times: string[];
}

export default function MedicineAlarmManager() {
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

    cleanOldNotifEntries();

    if (Capacitor.isNativePlatform()) {
      setupNativeAlarms();
    } else {
      setupWebAlarms();
    }

    const channel = supabase
      .channel('medicine_alarms_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicines' }, () => {
        if (Capacitor.isNativePlatform()) {
          setupNativeAlarms();
        } else {
          clearWebTimers();
          setupWebAlarms();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearWebTimers();
    };

    // ── Native: schedule recurring OS alarms ────────────────────────────────
    async function setupNativeAlarms() {
      const granted = await NotificationManager.requestPermissions();
      if (!granted) return;

      const { data: medicines } = await supabase
        .from('medicines')
        .select('id, name, dosage, alarm_times')
        .eq('user_id', user.id)
        .not('alarm_times', 'is', null);

      if (!medicines) return;

      const pending = await NotificationManager.getPending();
      const stale = pending
        .filter((n: any) => n.extra?.type === 'medicine')
        .map((n: any) => n.id);
      if (stale.length > 0) await NotificationManager.cancel(stale);

      medicines.forEach((med: Medicine) => {
        if (!Array.isArray(med.alarm_times)) return;
        med.alarm_times.forEach((time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          const notifId = NotificationManager.generateId(`med_${med.id}_${time}`);
          NotificationManager.schedule({
            id: notifId,
            title: '💊 Hora de tu medicación',
            body: `${med.name}${med.dosage ? ` — ${med.dosage}` : ''}`,
            schedule: { on: { hour: hours, minute: minutes }, allowWhileIdle: true } as any,
            extra: { type: 'medicine', route: '/apps/mi-hogar/pharmacy' },
          });
        });
      });
    }

    // ── Web: show toast for missed, schedule setTimeout for upcoming ─────────
    async function setupWebAlarms() {
      const { data: medicines } = await supabase
        .from('medicines')
        .select('id, name, dosage, alarm_times')
        .eq('user_id', user.id)
        .not('alarm_times', 'is', null);

      if (!medicines) return;

      const now = new Date();

      medicines.forEach((med: Medicine) => {
        if (!Array.isArray(med.alarm_times)) return;

        med.alarm_times.forEach((time: string) => {
          const trackingId = `med_${med.id}_${time}`;
          if (hasBeenShownToday('med', `${med.id}_${time}`)) return;

          const [hours, minutes] = time.split(':').map(Number);
          const target = new Date(now);
          target.setHours(hours, minutes, 0, 0);

          const subtitle = `${med.name}${med.dosage ? ` — ${med.dosage}` : ''}`;
          const goToPharmacy = () => router.push('/apps/mi-hogar/pharmacy');

          if (target <= now) {
            // Alarm time already passed today — show "ya pasó" toast
            markShownToday('med', `${med.id}_${time}`);
            showNotificationToast({
              icon: '💊',
              title: 'Medicación pendiente',
              subtitle,
              missed: true,
              scheduledTime: time,
              onGo: goToPharmacy,
              duration: 16000,
            });
          } else {
            // Upcoming today — schedule a setTimeout
            const delay = target.getTime() - now.getTime();
            const timer = setTimeout(() => {
              if (hasBeenShownToday('med', `${med.id}_${time}`)) return;
              markShownToday('med', `${med.id}_${time}`);
              showNotificationToast({
                icon: '💊',
                title: 'Hora de tu medicación',
                subtitle,
                missed: false,
                onGo: goToPharmacy,
                duration: 14000,
              });
            }, delay);
            webTimersRef.current.push(timer);
          }
        });
      });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  function clearWebTimers() {
    webTimersRef.current.forEach(clearTimeout);
    webTimersRef.current = [];
  }

  return null;
}
