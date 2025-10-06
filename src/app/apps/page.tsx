'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AppsPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight text-center">
        Portal de Aplicaciones
      </h1>
      <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-center text-muted-foreground">
        Accede a nuestras herramientas y aplicaciones exclusivas.
      </p>
      <div className="mt-8 flex justify-center">
        {/* Aquí irán los botones para acceder a las aplicaciones */}
        <p className="text-muted-foreground">Próximamente...</p>
      </div>
    </div>
  );
}
