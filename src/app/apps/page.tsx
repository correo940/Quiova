'use client';

import { Home, Brain, Bot, GraduationCap, Sparkles, Building2, Brush } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

const apps = [
  {
    name: 'Mi Hogar',
    href: '/apps/mi-hogar',
    icon: Home,
    description: 'Gestión integral del hogar: contraseñas, compras, manuales y más.',
  },
  {
    name: 'Pausa',
    href: '/apps/mi-hogar/meditation',
    icon: Brain,
    description: 'Meditacion breve, respiracion guiada y pensamiento personal con estilo Quioba.',
  },
  {
    name: 'Quioba Organizador',
    href: '/apps/organizador',
    icon: Bot,
    description: 'Tu asistente de vida diaria: planifica mañana, recibe tu briefing matinal y registra victorias.',
  },
  {
    name: 'El Campus',
    href: '/apps/el-campus',
    icon: GraduationCap,
    description: 'Centro académico para alumnos, familias y universidad.',
  },
  {
    name: 'Pausas Activas',
    href: '/apps/pausas-activas',
    icon: Sparkles,
    description: 'Micro-descansos guiados para ojos, cuello, espalda e hidratación mientras trabajas frente al PC.',
  },
  {
    name: 'Clone Stamp',
    href: '/apps/watermark-remover',
    icon: Brush,
    description: 'Elimina marcas de agua de imágenes y videos con la herramienta de tampón de clonar.',
  },
];


export default function AppsPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map((app) => (
          <Link href={app.href} key={app.name} className="block p-6 bg-card text-card-foreground rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-4">
              <app.icon className="h-8 w-8 text-primary" />
              <h3 className="text-xl font-semibold">{app.name}</h3>
            </div>
            <p className="mt-2 text-muted-foreground">{app.description}</p>
          </Link>
        ))}
      </div>

      {isAdmin && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Oficina</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/apps/oficina" className="block p-6 bg-card text-card-foreground rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-4">
                <Building2 className="h-8 w-8 text-slate-700 dark:text-slate-300" />
                <h3 className="text-xl font-semibold">Dirección</h3>
              </div>
              <p className="mt-2 text-muted-foreground">Centro de dirección de Quioba.</p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
