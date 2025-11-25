'use client';

import TaskManager from '@/components/apps/mi-hogar/tasks/task-manager';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MiHogarTasksPage() {
    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-6xl mx-auto mb-6">
                <Link href="/apps/mi-hogar">
                    <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a Mi Hogar
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold mt-4">Tareas y Alarmas</h1>
                <p className="text-muted-foreground">Organiza las tareas del hogar y no olvides nada.</p>
            </div>
            <TaskManager />
        </div>
    );
}
