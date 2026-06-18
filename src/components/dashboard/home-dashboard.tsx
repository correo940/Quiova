'use client';

import React, { useState } from 'react';
import OrganizerWidget from './widgets/organizer-widget';
import AppsSummaryWidget from './widgets/apps-summary-widget';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';

export default function HomeDashboard() {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const { user } = useAuth();

    return (
        <div className="flex flex-col lg:overflow-hidden lg:h-[calc(100dvh-64px)]">
            {/* Fila Superior: Resumen de Apps con Calendario Integrado */}
            <div className="shrink-0 px-4 pt-3 w-full">
                <AppsSummaryWidget
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    user={user}
                />
            </div>

            {/* Layout Principal: Organizador a pantalla completa */}
            <div className="flex-1 min-h-0 flex flex-col px-4 pb-28 pt-3 w-full lg:overflow-hidden lg:pb-4">
                <div className="flex-1 min-h-0 min-w-0 w-full">
                    <OrganizerWidget
                        selectedDate={selectedDate}
                        user={user}
                        className="h-full"
                    />
                </div>
            </div>
        </div>
    );
}
