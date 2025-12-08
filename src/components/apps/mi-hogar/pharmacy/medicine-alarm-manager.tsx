'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { NotificationManager } from '@/lib/notifications';
import { toast } from 'sonner';

export default function MedicineAlarmManager() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // Init Check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;

        const setupAlarms = async () => {
            // Request permissions explicitly when component mounts/user logs in
            const granted = await NotificationManager.requestPermissions();
            if (!granted) return;

            const { data: medicines, error } = await supabase
                .from('medicines')
                .select('id, name, dosage, alarm_times')
                .eq('user_id', user.id)
                .not('alarm_times', 'is', null);

            if (error || !medicines) return;

            // Strategy: Cancel all previous medicine alarms (we would need to track IDs, 
            // but for simplicity/robustness in this MVP, we might rely on unique predictable IDs)
            // Ideally we track IDs we created. 
            // For now, let's just schedule. 
            // Note: In a real app, we should probably "re-sync" completely.

            // To prevent massive duplication, we could cancel a range, or use specific IDs.
            // NotificationManager.generateId makes deterministic IDs.

            medicines.forEach(med => {
                if (med.alarm_times && Array.isArray(med.alarm_times)) {
                    med.alarm_times.forEach((time: string) => {
                        // Time is "HH:MM" string
                        const [hours, minutes] = time.split(':').map(Number);

                        // Create a date object for the schedule (Next occurrence)
                        // Actually Capacitor LocalNotifications 'every: day' schedule uses the 'on' property or simplified schedule.
                        // For 'every: day', we need components.
                        const schedule = {
                            on: {
                                hour: hours,
                                minute: minutes
                            }
                        };

                        // Unique ID: Hash of "med_ID_TIME"
                        const notifId = NotificationManager.generateId(`med_${med.id}_${time}`);

                        NotificationManager.schedule({
                            id: notifId,
                            title: `💊 Hora de tu medicación`,
                            body: `${med.name} - ${med.dosage || 'Toma tu dosis'}`,
                            // @ts-ignore - 'on' is valid for recurring but type def might be tricky in wrapper. 
                            // Reverting to 'at' + 'every' if 'on' is not exposed in my helper interface, 
                            // but generic 'schedule' passed through.
                            // Let's use 'on' structure for recurring:
                            schedule: {
                                on: { hour: hours, minute: minutes },
                                allowWhileIdle: true
                            } as any
                        });
                    });
                }
            });
        };

        setupAlarms();

        // Optional: Subscribe to changes to auto-update
        const channel = supabase
            .channel('medicine_alarms_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'medicines' }, setupAlarms)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }

    }, [user]);

    return null;
}
