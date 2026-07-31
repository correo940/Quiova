'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { format, isSameDay, subHours } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { NotificationManager } from '@/lib/notifications';

const WEB_FALLBACK_WINDOW_MS = 12 * 60 * 60 * 1000; // solo viable en sesión web si falta <12h

export default function TripNotificationManager() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;

        const checkTrips = async () => {
            const granted = await NotificationManager.requestPermissions();
            if (!granted) return;

            const now = new Date();
            const todayStr = now.toISOString().slice(0, 10);
            const isNative = Capacitor.isNativePlatform();

            const { data: trips } = await supabase
                .from('trips')
                .select('id, destination, start_date, end_date')
                .eq('user_id', user.id)
                .gte('end_date', todayStr);

            if (!trips || trips.length === 0) return;

            const scheduleReminder = (id: number, title: string, body: string, notifyAt: Date, url: string) => {
                if (notifyAt <= now) return;
                if (isNative) {
                    NotificationManager.schedule({ id, title, body, schedule: { at: notifyAt }, extra: { url } });
                } else if (notifyAt.getTime() - now.getTime() < WEB_FALLBACK_WINDOW_MS) {
                    setTimeout(() => NotificationManager.showWebNotification(title, body, url), notifyAt.getTime() - now.getTime());
                }
            };

            trips.forEach((trip) => {
                if (isSameDay(new Date(`${trip.start_date}T00:00:00`), now)) {
                    const notifyAt = new Date();
                    notifyAt.setHours(8, 0, 0, 0);
                    if (notifyAt <= now) notifyAt.setTime(now.getTime() + 5000);
                    scheduleReminder(
                        NotificationManager.generateId(`trip_today_${trip.id}`),
                        '✈️ ¡Hoy es tu viaje!',
                        `Hoy empieza tu viaje a ${trip.destination}.`,
                        notifyAt,
                        `/apps/mi-viaje/${trip.id}`
                    );
                }
            });

            const tripIds = trips.map((t) => t.id);
            const { data: events } = await supabase
                .from('trip_events')
                .select('id, trip_id, title, event_type, starts_at')
                .in('trip_id', tripIds)
                .gte('starts_at', now.toISOString());

            (events || []).forEach((event) => {
                const start = new Date(event.starts_at);
                const leadHours = event.event_type === 'flight' ? 3 : 1;
                const notifyAt = subHours(start, leadHours);
                const trip = trips.find((t) => t.id === event.trip_id);
                const title = event.event_type === 'flight'
                    ? `✈️ Vuelo a las ${format(start, 'HH:mm')}`
                    : `📍 ${event.title}`;
                const body = event.event_type === 'flight'
                    ? `Prepara tu billete: ${event.title}${trip ? ` — ${trip.destination}` : ''}. Tienes el documento en la app.`
                    : `${event.title} a las ${format(start, 'HH:mm')}.`;

                scheduleReminder(
                    NotificationManager.generateId(`trip_event_${event.id}`),
                    title,
                    body,
                    notifyAt,
                    `/apps/mi-viaje/${event.trip_id}`
                );
            });
        };

        checkTrips();

        const channel = supabase
            .channel('trip_notifications_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, checkTrips)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_events' }, checkTrips)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return null;
}
