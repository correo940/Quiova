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

// Bump to force a one-time reschedule when the native notification format changes.
const MED_NOTIF_VERSION_KEY = 'med_notif_v';
const MED_NOTIF_VERSION = '2';

// localStorage key prefix for alarms scheduled via TimestampTrigger.
// Used to avoid sending a duplicate browser notification when the app opens
// after the alarm has already fired in the background.
const TRIGGER_PREFIX = 'med_trig_';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function nextOccurrence(hours: number, minutes: number): Date {
  const now = new Date();
  const t = new Date(now);
  t.setHours(hours, minutes, 0, 0);
  if (t <= now) t.setDate(t.getDate() + 1);
  return t;
}

function cleanOldTriggerKeys(): void {
  const cutoff = Date.now() - 2 * 86_400_000; // 2 days ago
  Object.keys(localStorage)
    .filter((k) => k.startsWith(TRIGGER_PREFIX))
    .forEach((k) => {
      const datePart = k.split('_').pop() ?? '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        if (new Date(datePart).getTime() < cutoff) localStorage.removeItem(k);
      }
    });
}

export default function MedicineAlarmManager() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const webTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  // Register Service Worker once (enables TimestampTrigger + background notifications)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => { swRegRef.current = reg; })
      .catch(() => { /* non-fatal */ });
  }, []);

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
    cleanOldTriggerKeys();

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

    // ── Native: exact recurring OS alarms via Capacitor ──────────────────────
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
      const pendingMedMap = new Map<number, any>(
        pending
          .filter((n: any) => n.extra?.type === 'medicine')
          .map((n: any) => [n.id, n])
      );

      // One-time migration: cancel old-format notifications so they are
      // rescheduled using the exact alarm format below.
      const needsMigration = localStorage.getItem(MED_NOTIF_VERSION_KEY) !== MED_NOTIF_VERSION;
      if (needsMigration) {
        const oldIds = [...pendingMedMap.keys()];
        if (oldIds.length > 0) await NotificationManager.cancel(oldIds);
        pendingMedMap.clear();
        localStorage.setItem(MED_NOTIF_VERSION_KEY, MED_NOTIF_VERSION);
      }

      const desiredIds = new Set<number>();
      medicines.forEach((med: Medicine) => {
        if (!Array.isArray(med.alarm_times)) return;
        med.alarm_times.forEach((time: string) => {
          desiredIds.add(NotificationManager.generateId(`med_${med.id}_${time}`));
        });
      });

      const staleIds = [...pendingMedMap.keys()].filter((id) => !desiredIds.has(id));
      if (staleIds.length > 0) await NotificationManager.cancel(staleIds);

      // Only schedule alarms that are not already pending — never cancel a
      // notification that is about to fire (would push it to the next day).
      // { at, repeats, every: 'day', allowWhileIdle } → setExactAndAllowWhileIdle()
      // on Android instead of the inexact setRepeating().
      medicines.forEach((med: Medicine) => {
        if (!Array.isArray(med.alarm_times)) return;
        med.alarm_times.forEach((time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          const notifId = NotificationManager.generateId(`med_${med.id}_${time}`);
          if (pendingMedMap.has(notifId)) return;
          NotificationManager.schedule({
            id: notifId,
            title: '💊 Hora de tu medicación',
            body: `${med.name}${med.dosage ? ` — ${med.dosage}` : ''}`,
            schedule: { at: nextOccurrence(hours, minutes), repeats: true, every: 'day', allowWhileIdle: true } as any,
            extra: { type: 'medicine', route: '/apps/mi-hogar/pharmacy' },
          });
        });
      });
    }

    // ── Web / PWA: schedule via TimestampTrigger (Chrome) or setTimeout ──────
    async function setupWebAlarms() {
      const { data: medicines } = await supabase
        .from('medicines')
        .select('id, name, dosage, alarm_times')
        .eq('user_id', user.id)
        .not('alarm_times', 'is', null);

      if (!medicines) return;

      const now = new Date();
      const today = todayStr();

      // Resolve the SW registration — needed for scheduled & background notifications
      const swReg = swRegRef.current
        ?? (('serviceWorker' in navigator)
          ? await navigator.serviceWorker.ready.catch(() => null)
          : null);
      if (swReg) swRegRef.current = swReg;

      // Chrome's Notification Triggers API fires notifications even when the
      // browser is closed (no server push needed).
      const hasTimestampTrigger =
        typeof window !== 'undefined' && 'TimestampTrigger' in window;

      for (const med of medicines) {
        if (!Array.isArray(med.alarm_times)) continue;

        for (const time of med.alarm_times) {
          if (hasBeenShownToday('med', `${med.id}_${time}`)) continue;

          const [hours, minutes] = time.split(':').map(Number);
          const target = new Date(now);
          target.setHours(hours, minutes, 0, 0);

          const subtitle = `${med.name}${med.dosage ? ` — ${med.dosage}` : ''}`;
          const goToPharmacy = () => router.push('/apps/mi-hogar/pharmacy');
          const notifTag = `med-${med.id}-${time}-${today}`;
          const trigKey = `${TRIGGER_PREFIX}${med.id}_${time}_${today}`;

          if (target <= now) {
            // ── Alarm time already passed today ──────────────────────────────
            markShownToday('med', `${med.id}_${time}`);

            // If we scheduled a TimestampTrigger earlier, the OS already showed
            // the notification at the correct time — skip the browser notification
            // to avoid a duplicate. Still show the in-app toast as a reminder.
            const wasTriggered = !!localStorage.getItem(trigKey);
            if (!wasTriggered && Notification.permission === 'granted') {
              if (swReg) {
                swReg.showNotification('💊 Medicación pendiente', {
                  body: subtitle,
                  icon: '/images/logo.png',
                  tag: notifTag,
                  data: { url: '/apps/mi-hogar/pharmacy' },
                });
              } else {
                new Notification('💊 Medicación pendiente', {
                  body: subtitle,
                  icon: '/images/logo.png',
                  tag: notifTag,
                });
              }
            }

            showNotificationToast({
              icon: '💊',
              title: 'Medicación pendiente',
              subtitle,
              missed: true,
              scheduledTime: time,
              onGo: goToPharmacy,
              duration: 16000,
            });

          } else if (swReg && hasTimestampTrigger) {
            // ── Schedule via TimestampTrigger (fires even when Chrome is closed) ──
            const alreadyScheduled = !!localStorage.getItem(trigKey);
            if (!alreadyScheduled) {
              try {
                const existing = await swReg.getNotifications(
                  { includeTriggered: true, tag: notifTag } as any
                );
                if (!existing.length) {
                  await swReg.showNotification('💊 Hora de tu medicación', {
                    body: subtitle,
                    icon: '/images/logo.png',
                    tag: notifTag,
                    data: { url: '/apps/mi-hogar/pharmacy' },
                    showTrigger: new (window as any).TimestampTrigger(target.getTime()),
                  } as any);
                  localStorage.setItem(trigKey, '1');
                }
              } catch {
                // TimestampTrigger failed — fall back to setTimeout
                scheduleViaTimeout(target, subtitle, med.id, time, goToPharmacy);
              }
            }

            // Also queue an in-app toast for the moment the user has the tab open
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

          } else {
            // ── Fallback: setTimeout (only works while tab is open) ───────────
            scheduleViaTimeout(target, subtitle, med.id, time, goToPharmacy, swReg ?? undefined);
          }
        }
      }

      function scheduleViaTimeout(
        target: Date,
        subtitle: string,
        medId: string,
        time: string,
        onGo: () => void,
        reg?: ServiceWorkerRegistration,
      ) {
        const delay = target.getTime() - Date.now();
        const timer = setTimeout(async () => {
          if (hasBeenShownToday('med', `${medId}_${time}`)) return;
          markShownToday('med', `${medId}_${time}`);
          if (Notification.permission === 'granted') {
            if (reg) {
              reg.showNotification('💊 Hora de tu medicación', {
                body: subtitle,
                icon: '/images/logo.png',
                data: { url: '/apps/mi-hogar/pharmacy' },
              });
            } else {
              new Notification('💊 Hora de tu medicación', { body: subtitle, icon: '/images/logo.png' });
            }
          }
          showNotificationToast({
            icon: '💊',
            title: 'Hora de tu medicación',
            subtitle,
            missed: false,
            onGo,
            duration: 14000,
          });
        }, delay);
        webTimersRef.current.push(timer);
      }
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  function clearWebTimers() {
    webTimersRef.current.forEach(clearTimeout);
    webTimersRef.current = [];
  }

  return null;
}
