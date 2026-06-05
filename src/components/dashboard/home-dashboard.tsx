'use client';

import React, { useState, useEffect } from 'react';
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
    const [isCalendarMinimized, setIsCalendarMinimized] = useState(false);
    const platformInfo = usePlatform();
    const { isMobile } = platformInfo;
    // ✅ Leer el user UNA sola vez desde el AuthProvider global
    const { user } = useAuth();

    // Sincronizar estado de minimización del calendario con localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('quioba_calendar_minimized');
            if (saved === 'true') setIsCalendarMinimized(true);
        }
    }, []);

    const handleToggleCalendar = () => {
        const newVal = !isCalendarMinimized;
        setIsCalendarMinimized(newVal);
        localStorage.setItem('quioba_calendar_minimized', String(newVal));
    };

    // Si es móvil (iOS o Android), mostrar el dashboard móvil
    if (isMobile) {
        return <MobileDashboard />;
    }

    return (
        <div className="flex flex-col lg:overflow-hidden overflow-auto" style={{ height: 'calc(100dvh - 64px)' }}>
            {/* Fila Superior: Resumen de Apps con Calendario Integrado */}
            <div className="shrink-0 px-4 pt-3 w-full">
                <AppsSummaryWidget
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    user={user}
                />
            </div>

            {/* Layout Principal: Organizador a pantalla completa */}
            <div className="flex-1 min-h-0 flex flex-col px-4 pb-28 lg:pb-4 pt-3 w-full overflow-hidden">
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
