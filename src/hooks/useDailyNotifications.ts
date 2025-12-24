import { useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '@/lib/supabase';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

const NOTIFICATION_ID = 1001; // ID fijo para el resumen diario

export function useDailyNotifications() {

    useEffect(() => {
        // Request permissions on mount if enabled
        const checkPermissions = async () => {
            const settings = getSettings();
            if (settings.enabled) {
                const state = await LocalNotifications.checkPermissions();
                if (state.display !== 'granted') {
                    await LocalNotifications.requestPermissions();
                }
                scheduleDailyNotification();
            }
        };

        checkPermissions();

        // Listen for settings changes
        const handleSettingsChange = () => {
            scheduleDailyNotification();
        };

        window.addEventListener('notificationSettingsChanged', handleSettingsChange);
        return () => window.removeEventListener('notificationSettingsChanged', handleSettingsChange);
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

        // Fetch Data for TOMORROW (relative to schedule time, which is usually for "tomorrow's agenda" if set at night, or "today's agenda" if set in morning?)
        // User request: "mande una notificacion con todo lo que vas a tener al dias siguiente"
        // So always fetch for: scheduleDate + 1 day? Or if scheduled for 20:00, it's for the NEXT day (tomorrow).
        // Let's assume the summary is for the "Upcoming Day".
        // If scheduled for 20:00 today, it shows agenda for Tomorrow.
        // If scheduled for 08:00 tomorrow, it implies agenda for THAT day.

        // Let's standard logic: "Resumen para: [Fecha]"
        // If notification is > 18:00, show info for Tomorrow.
        // If notification is < 12:00, show info for Today.

        const isEveningNotification = hours >= 18;
        const targetDate = isEveningNotification ? addDays(scheduleDate, 1) : scheduleDate;

        const summary = await fetchSummaryForDate(targetDate, settings);

        // Schedule
        await LocalNotifications.schedule({
            notifications: [{
                title: `📅 Tu Resumen para el ${format(targetDate, 'EEEE d', { locale: es })}`,
                body: summary,
                id: NOTIFICATION_ID,
                schedule: {
                    at: scheduleDate,
                    repeats: true,
                    every: 'day',
                    allowWhileIdle: true
                },
                sound: 'beep.wav',
                smallIcon: 'ic_stat_icon_config_sample', // Default capacitor icon fallback
                actionTypeId: '',
                extra: null
            }]
        });
    };

    const fetchSummaryForDate = async (date: Date, settings: any): Promise<string> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return 'Inicia sesión para ver tus tareas.';

            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);

            const startStr = start.toISOString();
            const endStr = end.toISOString();
            const dateStr = start.toISOString().split('T')[0];

            const summaryParts: string[] = [];
            const categories = settings.categories || { tasks: true, shifts: true, vehicles: true };

            // 1. Tasks
            if (categories.tasks) {
                const { count: taskCount } = await supabase
                    .from('tasks')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .gte('due_date', startStr)
                    .lte('due_date', endStr)
                    .eq('is_completed', false);

                if (taskCount && taskCount > 0) summaryParts.push(`${taskCount} Tarea(s)`);
            }

            // 2. Shift (Work)
            if (categories.shifts) {
                const { data: shifts } = await supabase
                    .from('work_shifts')
                    .select('title')
                    .eq('user_id', user.id)
                    .gte('start_time', startStr)
                    .lte('start_time', endStr)
                    .limit(1);

                if (shifts && shifts.length > 0) summaryParts.push(`Turno: ${shifts[0].title}`);
            }

            // 3. Garage (ITV)
            if (categories.vehicles) {
                const { data: vehicles } = await supabase
                    .from('vehicles')
                    .select('brand, next_itv_date')
                    .eq('user_id', user.id)
                    .ilike('next_itv_date', `${dateStr}%`);

                if (vehicles && vehicles.length > 0) summaryParts.push(`ITV ${vehicles[0].brand}`);
            }

            if (summaryParts.length === 0) return "No hay eventos en las categorías seleccionadas.";
            return summaryParts.join(' • ');

        } catch (e) {
            console.error(e);
            return "No se pudo cargar el resumen.";
        }
    };

    return { scheduleDailyNotification };
}
