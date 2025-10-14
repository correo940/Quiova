'use client';

import EconomiaClient from '@/components/apps/economia-domestica/economia-client';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function EconomiaPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Economía Doméstica</h1>
            <p className="text-muted-foreground">
                Sube los extractos de tu banco para analizar tus finanzas personales.
            </p>
        </div>
        <EconomiaClient />
    </div>
  );
}
