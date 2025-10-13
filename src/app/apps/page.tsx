'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowRight, Calendar } from 'lucide-react';

export default function AppsPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight text-center">
        Portal de Aplicaciones 🚀
      </h1>
      <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-center text-muted-foreground">
        Accede a nuestras herramientas y aplicaciones exclusivas para mejorar tu día a día.
      </p>
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Link href="/apps/tasks" className="w-full">
          <Card className="group transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2 hover:border-primary">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-2xl font-bold">
                <span>📝 Gestor de Tareas</span>
                <ArrowRight className="h-6 w-6 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                ¡Organiza tu vida y aumenta tu productividad! Crea, gestiona y completa tus tareas diarias con nuestro sistema de gamificación que te recompensa con puntos y rachas.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/apps/calendar" className="w-full">
          <Card className="group transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2 hover:border-primary">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-2xl font-bold">
                <span className="flex items-center gap-2">
                  <Calendar className="h-6 w-6" />
                  Calendario de Tareas
                </span>
                <ArrowRight className="h-6 w-6 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Visualiza tus tareas en un calendario interactivo. Planifica tu semana, organiza tus actividades y nunca pierdas de vista tus compromisos importantes.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
