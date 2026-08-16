'use client';

import { useRouter } from 'next/navigation';
import InsuranceManager from '@/components/apps/mi-hogar/insurance/insurance-manager';
import { useAppPermission } from '@/hooks/useAppPermission';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function MiHogarInsurancePage() {
    const router = useRouter();
    const { level: permLevel, loading: permLoading } = useAppPermission('mi-hogar.insurance');
    const readOnly = permLevel === 'view';

    if (!permLoading && permLevel === 'none') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-center">
                <Card className="p-8 max-w-sm">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h2 className="text-lg font-bold mb-1">No tienes acceso a esta app</h2>
                    <p className="text-sm text-muted-foreground">Pide al propietario de la familia que te conceda acceso a Seguros.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 pb-nav">
            <div className="max-w-6xl mx-auto mb-6">
                <Button variant="ghost" className="pl-0 hover:pl-2 transition-all" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
                <h1 className="text-3xl font-bold mt-4">Gestor de Seguros</h1>
                <p className="text-muted-foreground">Controla tus pólizas y evita renovaciones automáticas no deseadas.</p>
            </div>
            <InsuranceManager readOnly={readOnly} />
        </div>
    );
}
