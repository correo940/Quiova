'use client';

import React, { useState } from 'react';
import CalendarWidget from './widgets/calendar-widget';
import OrganizerWidget from './widgets/organizer-widget';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';

export default function HomeDashboard() {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    const scheduleNotification = async () => {
        try {
            // Request permissions first
            const perm = await LocalNotifications.requestPermissions();
            if (perm.display === 'granted') {
                await LocalNotifications.schedule({
                    notifications: [
                        {
                            title: "¡Quiova te saluda!",
                            body: "Esta es una notificación de prueba local 🔔",
                            id: 1,
                            schedule: { at: new Date(Date.now() + 5000) }, // 5 seconds from now
                            sound: undefined,
                            attachments: undefined,
                            actionTypeId: "",
                            extra: null
                        }
                    ]
                });
                toast.success("Notificación programada en 5 segundos (cierra la app para verla mejor)");
            } else {
                toast.error("Permiso de notificaciones denegado");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error al programar notificación (¿estás en móvil?)");
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Tu Quiova</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* Calendario */}
                <div className="col-span-1">
                    <CalendarWidget date={selectedDate} onDateSelect={setSelectedDate} />
                </div>

                {/* Organizador */}
                <div className="col-span-1">
                    <OrganizerWidget selectedDate={selectedDate} />
                </div>
            </div>

            <div className="mt-8 flex justify-center">
                <Button variant="outline" onClick={scheduleNotification} className="gap-2">
                    <Bell className="w-4 h-4" />
                    Probar Notificación (5s)
                </Button>
            </div>
        </div>
    );
}
