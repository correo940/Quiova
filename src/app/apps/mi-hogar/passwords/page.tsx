'use client';

import PasswordsClient from '@/components/apps/passwords/passwords-client';
import { PasswordsProvider } from '@/context/PasswordsContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MiHogarPasswordsPage() {
    return (
        <PasswordsProvider>
            <div className="min-h-screen bg-background p-4 md:p-8">
                <div className="max-w-4xl mx-auto mb-6">
                    <Link href="/apps/mi-hogar">
                        <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver a Mi Hogar
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold mt-4">Gestor de Contraseñas</h1>
                    <p className="text-muted-foreground">Guarda claves de WiFi, streaming y servicios del hogar.</p>
                </div>
                <PasswordsClient />
            </div>
        </PasswordsProvider>
    );
}
