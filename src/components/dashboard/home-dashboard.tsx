'use client';

import React, { useState } from 'react';
import CalendarWidget from './widgets/calendar-widget';
import OrganizerWidget from './widgets/organizer-widget';

export default function HomeDashboard() {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Tu Espacio Personal</h1>

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
        </div>
    );
}
