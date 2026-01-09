'use client';

import React, { useState } from 'react';
import CalendarWidget from './widgets/calendar-widget';
import OrganizerWidget from './widgets/organizer-widget';
import AppsSummaryWidget from './widgets/apps-summary-widget';
import PostItQuotes from '@/components/post-it-quotes';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';

export default function HomeDashboard() {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    return (
        <div className="container mx-auto px-4 py-1 max-w-7xl lg:h-[calc(100vh-100px)] flex flex-col">

            <div className="flex flex-col gap-4 flex-1 min-h-0">
                {/* Fila Superior: Resumen General */}
                <div className="w-full shrink-0">
                    <AppsSummaryWidget selectedDate={selectedDate} />
                </div>

                {/* Grid Principal: 3 Columnas en pantallas grandes */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 flex-1 min-h-0">

                    {/* Columna 1: Calendario (Izquierda) */}
                    <div className="lg:col-span-4 flex flex-col gap-4 h-full">
                        <CalendarWidget date={selectedDate} onDateSelect={setSelectedDate} />
                    </div>

                    {/* Columna 2: Organizador (Centro) */}
                    <div className="lg:col-span-4 flex flex-col h-full min-h-0">
                        <OrganizerWidget selectedDate={selectedDate} />
                    </div>

                    {/* Columna 3: Nevera (Derecha) */}
                    <div className="lg:col-span-4 flex flex-col h-full min-h-0">
                        <PostItQuotes compact={true} />
                    </div>
                </div>
            </div>
        </div>
    );
}
