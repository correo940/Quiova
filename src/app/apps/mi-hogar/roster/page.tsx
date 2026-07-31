'use client';

import { useState } from 'react';
import { useAppPermission } from '@/hooks/useAppPermission';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import RosterCalendar from '@/components/apps/mi-hogar/roster/roster-calendar';
import AddShiftDialog from '@/components/apps/mi-hogar/roster/add-shift-dialog';
import ScanRosterDialog from '@/components/apps/mi-hogar/roster/scan-roster-dialog';

export default function RosterPage() {
    const { level: permLevel, loading: permLoading } = useAppPermission('mi-hogar.roster');
    const readOnly = permLevel === 'view';
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isScanOpen, setIsScanOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleShiftAdded = () => {
        setRefreshKey(prev => prev + 1);
        setIsAddOpen(false);
        setIsScanOpen(false);
    };

    if (!permLoading && permLevel === 'none') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-center">
                <Card className="p-8 max-w-sm">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h2 className="text-lg font-bold mb-1">No tienes acceso a esta app</h2>
                    <p className="text-sm text-muted-foreground">Pide al propietario de la familia que te conceda acceso al Cuadrante.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 pb-nav">
            <div className="max-w-6xl mx-auto space-y-6">
                <header className="flex items-center space-x-4 mb-6 print:hidden">
                    <Link href="/apps/mi-hogar">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Cuadrante</h1>
                        <p className="text-muted-foreground">Gestiona tus turnos de trabajo</p>
                    </div>
                </header>

                <RosterCalendar
                    onAddClick={() => setIsAddOpen(true)}
                    onScanClick={() => setIsScanOpen(true)}
                    refreshTrigger={refreshKey}
                    readOnly={readOnly}
                />

                {!readOnly && (
                    <AddShiftDialog
                        open={isAddOpen}
                        onOpenChange={setIsAddOpen}
                        onSuccess={handleShiftAdded}
                    />
                )}

                {!readOnly && (
                    <ScanRosterDialog
                        open={isScanOpen}
                        onOpenChange={setIsScanOpen}
                        onSuccess={handleShiftAdded}
                    />
                )}
            </div>
        </div>
    );
}
