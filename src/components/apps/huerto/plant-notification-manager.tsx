'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { differenceInDays, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Droplets } from 'lucide-react';

export default function PlantNotificationManager() {
    const { user } = useAuth();
    const [lastNotified, setLastNotified] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        const checkPlants = async () => {
            // Only check once per session/hour to avoid spamming
            const now = new Date().toISOString().split('T')[0];
            if (lastNotified === now) return;

            try {
                const { data: plants, error } = await supabase
                    .from('huerto_plants')
                    .select('name, next_watering_date')
                    .eq('user_id', user.id);

                if (error) {
                    // Table might not exist yet, fail silently to not break everything
                    return;
                }

                const plantsToWater = plants?.filter(plant => {
                    const nextDate = parseISO(plant.next_watering_date);
                    return differenceInDays(nextDate, new Date()) <= 0;
                });

                if (plantsToWater && plantsToWater.length > 0) {
                    const names = plantsToWater.map(p => p.name).join(', ');
                    toast('🔔 Recordatorio de Riego', {
                        description: `Tus plantas necesitan agua: ${names}`,
                        icon: <Droplets className="w-5 h-5 text-blue-500" />,
                        duration: 10000,
                        action: {
                            label: 'Ver Huerto',
                            onClick: () => window.location.href = '/apps/huerto'
                        }
                    });
                    setLastNotified(now);
                }
            } catch (err) {
                console.warn('PlantNotificationManager: Table probably not created yet or error', err);
            }
        };

        // Check 5 seconds after mount to wait for other things
        const timer = setTimeout(checkPlants, 5000);
        return () => clearTimeout(timer);
    }, [user, lastNotified]);

    return null;
}
