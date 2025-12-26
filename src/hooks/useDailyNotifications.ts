import { useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '@/lib/supabase';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

const NOTIFICATION_ID = 1001; // ID fijo para el resumen diario

export function useDailyNotifications() {
    const router = useRouter();

    useEffect(() => {
        // Request permissions on mount if enabled
        const checkPermissions = async () => {
            const settings = getSettings();
            if (settings.enabled) {
                const state = await LocalNotifications.checkPermissions();
                if (state.display !== 'granted') {
                    await LocalNotifications.requestPermissions();
                }

                // Create high priority channel for daily summary
                try {
                    await LocalNotifications.createChannel({
                        id: 'daily-summary',
                        name: 'Resumen Diario',
                        description: 'Notificaciones del resumen diario',
                        importance: 5, // High
                        visibility: 1, // Public
                        sound: 'beep.wav',
                        vibration: true
                    });
                } catch (e) {
                    console.error("Error creating notification channel", e);
                }

                scheduleDailyNotification();
            }
        };

        checkPermissions();

        // Listen for notification tap
        const handleNotificationAction = (notification: any) => {
            if (notification.notification.id === NOTIFICATION_ID) {
                // Navigate to the Daily Summary page
                router.push('/apps/resumen-diario');
            }
        };

        LocalNotifications.addListener('localNotificationActionPerformed', handleNotificationAction);

        // Listen for settings changes
        const handleSettingsChange = () => {
            scheduleDailyNotification();
        };

        window.addEventListener('notificationSettingsChanged', handleSettingsChange);

        return () => {
            window.removeEventListener('notificationSettingsChanged', handleSettingsChange);
            LocalNotifications.removeAllListeners(); // Cleanup listener
        };
    }, []);

    const getSettings = () => {
        try {
            const saved = localStorage.getItem('dailyNotificationSettings');
            return saved ? JSON.parse(saved) : { enabled: false, time: '08:00' };
        } catch {
            return { enabled: false, time: '08:00' };
        }
    };

    const scheduleDailyNotification = async () => {
        const settings = getSettings();

        // Cancel existing notification first
        await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });

        if (!settings.enabled) return;

        console.log("Scheduling daily summary for:", settings.time);

        // Calculate schedule time
        const [hours, minutes] = settings.time.split(':').map(Number);
        const now = new Date();
        const scheduleDate = new Date();
        scheduleDate.setHours(hours, minutes, 0, 0);

        // If time has passed today, schedule for tomorrow
        if (scheduleDate <= now) {
            scheduleDate.setDate(scheduleDate.getDate() + 1);
        }

        const isEveningNotification = hours >= 18;
        //        const targetDate = isEveningNotification ? addDays(scheduleDate, 1) : scheduleDate;
        // User update: Generic message, tap to view. 
        // We can check if there ARE items, but for simplicity and performance we can just send the "Ready" notification.
        // Or if we want to be smart: "Tienes 3 tareas y tu turno de mañana listo para revisar."

        // Let's settle on the request: "Ya tienes listo tu resumen diario"
        const titleStr = isEveningNotification ? "Resumen para mañana" : "Resumen de hoy";

        // Schedule
        await LocalNotifications.schedule({
            notifications: [{
                title: `${titleStr} está listo 📅`,
                body: "Toca aquí para ver tus tareas, turnos y recordatorios.",
                id: NOTIFICATION_ID,
                schedule: {
                    at: scheduleDate,
                    repeats: true,
                    every: 'day',
                    allowWhileIdle: true
                },
                channelId: 'daily-summary',
                sound: 'beep.wav',
                smallIcon: 'ic_stat_icon_config_sample',
                actionTypeId: '',
                extra: {
                    url: '/apps/resumen-diario' // Metadata in case we handle it globally elsewhere
                }
            }]
        });
    };

    // Helper not strictly needed anymore if body is generic, but keeping if we want to conditionally schedule
    // based on if there is data. But user wants the summary page always.

    return { scheduleDailyNotification };
}

