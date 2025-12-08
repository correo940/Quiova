'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Pill } from 'lucide-react';

export default function MedicineAlarmManager() {
    const [user, setUser] = useState<any>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
        if (!user) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        // Check immediately
        checkAlarms(user);

        // Then every minute
        intervalRef.current = setInterval(() => {
            checkAlarms(user);
        }, 60000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [user]);

    const checkAlarms = async (currentUser: any) => {
        if (!currentUser) return;

        const now = new Date();
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMinute}`;

        try {
            const { data: medicines, error } = await supabase
                .from('medicines')
                .select('id, name, dosage, alarm_times')
                .eq('user_id', currentUser.id)
                .not('alarm_times', 'is', null);

            if (error) throw error;

            if (medicines) {
                medicines.forEach(med => {
                    if (med.alarm_times && Array.isArray(med.alarm_times)) {
                        if (med.alarm_times.includes(currentTime)) {
                            triggerAlarm(med);
                        }
                    }
                });
            }

        } catch (error) {
            console.error('Error checking medicine alarms:', error);
        }
    };

    const triggerAlarm = (medicine: any) => {
        // Play sound
        playAlarmSound();

        // Show Toast
        toast.info(
            <div className="flex flex-col gap-1">
                <span className="font-bold flex items-center gap-2">
                    <Pill className="w-4 h-4" /> Hora de tu medicación
                </span>
                <span>{medicine.name}</span>
                <span className="text-xs opacity-80">{medicine.dosage}</span>
            </div>,
            {
                duration: 10000,
                action: {
                    label: "Tomada",
                    onClick: () => console.log('Medication taken')
                }
            }
        );

        // Show Browser Notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Hora de tomar: ${medicine.name}`, {
                body: `${medicine.dosage || 'Revisa tu botiquín'}`,
                icon: '/icons/pill.png'
            });
        }
    };

    const playAlarmSound = () => {
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(context.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, context.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.1, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);

            oscillator.start();
            oscillator.stop(context.currentTime + 0.5);
        } catch (e) {
            console.error('Audio play failed', e);
        }
    };

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    return null;
}
