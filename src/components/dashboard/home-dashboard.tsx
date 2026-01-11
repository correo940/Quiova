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
import { usePlatform } from '@/hooks/use-platform';
import MobileDashboard from './mobile-dashboard';

export default function HomeDashboard() {
    const platformInfo = usePlatform();
    const { isMobile, platform } = platformInfo;

    // Debug: Log platform detection
    console.log('🔍 Platform Detection:', {
        platform,
        isMobile,
        isIOS: platformInfo.isIOS,
        isAndroid: platformInfo.isAndroid,
        isWeb: platformInfo.isWeb,
        fullInfo: platformInfo
    });

    // Si es móvil (iOS o Android), mostrar el dashboard móvil
    if (isMobile) {
        console.log('📱 Rendering MOBILE Dashboard');
        return <MobileDashboard />;
    }

    console.log('💻 Rendering WEB Dashboard');
    // Si es web, mostrar el dashboard original de 3 columnas
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
