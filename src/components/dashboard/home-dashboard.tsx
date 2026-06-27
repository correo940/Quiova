'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CalendarWidget from './widgets/calendar-widget';
import OrganizerWidget from './widgets/organizer-widget';
import AppsSummaryWidget from './widgets/apps-summary-widget';
import QuickActionFab from './quick-action-fab';
import { usePlatform } from '@/hooks/use-platform';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';

export default function HomeDashboard() {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [isCalendarMinimized, setIsCalendarMinimized] = useState(false);
    const { isMobile } = usePlatform();
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('quioba_calendar_minimized');
            if (saved === 'true') setIsCalendarMinimized(true);
        }
    }, []);

    useEffect(() => {
        if (isMobile) {
            router.replace('/');
        }
    }, [isMobile, router]);

    const handleToggleCalendar = () => {
        const newVal = !isCalendarMinimized;
        setIsCalendarMinimized(newVal);
        localStorage.setItem('quioba_calendar_minimized', String(newVal));
    };

    if (isMobile) return null;

    return (
        <div className="flex flex-col overflow-hidden h-[calc(100dvh-64px)]">
            {/* Fila Superior: Resumen de Apps con Calendario Integrado */}
            <div className="shrink-0 px-4 pt-2 w-full">
                <AppsSummaryWidget
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    user={user}
                />
            </div>

            {/* Layout Principal: Organizador a pantalla completa */}
            <div className="flex-1 min-h-0 flex flex-col px-4 pb-4 pt-2 w-full overflow-hidden pb-28 lg:pb-4">
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
