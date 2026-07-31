'use client';

import MeditationStudio from '@/components/apps/mi-hogar/meditation/meditation-studio';
import { useAppPermission } from '@/hooks/useAppPermission';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function MeditationPage() {
    const { level: permLevel, loading: permLoading } = useAppPermission('mi-hogar.meditation');

    if (!permLoading && permLevel === 'none') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-center">
                <Card className="p-8 max-w-sm">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h2 className="text-lg font-bold mb-1">No tienes acceso a esta app</h2>
                    <p className="text-sm text-muted-foreground">Pide al propietario de la familia que te conceda acceso a Meditación.</p>
                </Card>
            </div>
        );
    }

    return <MeditationStudio />;
}
