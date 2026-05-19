'use client';

import React, { useState } from 'react';
import CalendarWidget from './widgets/calendar-widget';
import OrganizerWidget from './widgets/organizer-widget';
import AppsSummaryWidget from './widgets/apps-summary-widget';
import QuickActionFab from './quick-action-fab';
import { usePlatform } from '@/hooks/use-platform';
import MobileDashboard from './mobile-dashboard';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';

export default function HomeDashboard() {
    // Hooks SIEMPRE deben estar al principio, antes de cualquier return condicional
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const platformInfo = usePlatform();
    const { isMobile } = platformInfo;
    // ✅ Leer el user UNA sola vez desde el AuthProvider global
    const { user } = useAuth();

    // Si es móvil (iOS o Android), mostrar el dashboard móvil
    if (isMobile) {
        return <MobileDashboard />;
    }

    // Si es web, mostrar el dashboard original de 3 columnas

    return (
        <div
            className="flex flex-col"
            style={{ height: 'calc(100dvh - 64px)' }}
        >
            {/* Fila Superior: Resumen General */}
            <div className="shrink-0 px-4 pt-3 max-w-7xl w-full mx-auto">
                <AppsSummaryWidget selectedDate={selectedDate} user={user} />
            </div>

            {/* Grid Principal - ocupa el espacio restante con scroll interno */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 px-4 pb-28 pt-4 max-w-7xl w-full mx-auto overflow-y-auto">

                {/* Columna 1: Calendario (Izquierda) */}
                <div className="lg:col-span-4">
                    <CalendarWidget date={selectedDate} onDateSelect={setSelectedDate} user={user} />
                </div>

                {/* Columna 2: Organizador (Derecha) */}
                <div className="lg:col-span-8">
                    <OrganizerWidget selectedDate={selectedDate} user={user} />
                </div>
            </div>
        </div>
    );
}
