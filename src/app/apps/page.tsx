'use client';

import { BarChart, Calendar, Lock, Users, Home } from 'lucide-react';
import Link from 'next/link';

const apps = [
  {
    name: 'Mi Hogar',
    href: '/apps/mi-hogar',
    icon: Home,
    description: 'Gestión integral del hogar: contraseñas, compras, manuales y más.',
  },
];

export default function AppsPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 md:p-6">
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
  );
}
