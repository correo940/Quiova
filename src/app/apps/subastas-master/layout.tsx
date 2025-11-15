'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GraduationCap,
  BookOpen,
  FileText,
  Scale,
  Calculator,
  AlertTriangle,
  Target,
  Building,
  BookMarked,
  Briefcase,
  CheckSquare,
  Download,
  Home,
  TrendingUp,
  Shield,
  Users,
} from 'lucide-react';

const navigation = [
  {
    name: 'Inicio',
    href: '/apps/subastas-master',
    icon: Home,
    description: 'Dashboard del curso',
  },
  {
    name: 'Introducción',
    href: '/apps/subastas-master/introduccion',
    icon: BookOpen,
    description: '¿Qué son las subastas?',
  },
  {
    name: 'Tipos de Subastas',
    href: '/apps/subastas-master/tipos',
    icon: Building,
    description: 'Judiciales, BOE, Hacienda...',
  },
  {
    name: 'Proceso Completo',
    href: '/apps/subastas-master/proceso',
    icon: TrendingUp,
    description: 'Paso a paso detallado',
  },
  {
    name: 'Documentación',
    href: '/apps/subastas-master/documentacion',
    icon: FileText,
    description: 'Documentos necesarios',
  },
  {
    name: 'Aspectos Legales',
    href: '/apps/subastas-master/legal',
    icon: Scale,
    description: 'Leyes y normativas',
  },
  {
    name: 'Calculadoras',
    href: '/apps/subastas-master/calculadoras',
    icon: Calculator,
    description: 'Herramientas de cálculo',
  },
  {
    name: 'Riesgos',
    href: '/apps/subastas-master/riesgos',
    icon: AlertTriangle,
    description: 'Qué evitar',
  },
  {
    name: 'Estrategias',
    href: '/apps/subastas-master/estrategias',
    icon: Target,
    description: 'Cómo pujar con éxito',
  },
  {
    name: 'Organismos',
    href: '/apps/subastas-master/organismos',
    icon: Shield,
    description: 'BOE, Hacienda, Juzgados',
  },
  {
    name: 'Glosario',
    href: '/apps/subastas-master/glosario',
    icon: BookMarked,
    description: 'Términos técnicos',
  },
  {
    name: 'Casos Prácticos',
    href: '/apps/subastas-master/casos-practicos',
    icon: Briefcase,
    description: 'Ejemplos reales',
  },
  {
    name: 'Checklist',
    href: '/apps/subastas-master/checklist',
    icon: CheckSquare,
    description: 'Lista de verificación',
  },
  {
    name: 'Recursos',
    href: '/apps/subastas-master/recursos',
    icon: Download,
    description: 'Descargas y enlaces',
  },
];

export default function SubastasMasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-lg bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/apps/subastas-master" className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-2 rounded-xl">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Master en Subastas
                </h1>
                <p className="text-xs text-slate-500">Guía completa para invertir</p>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 bg-gradient-to-r from-indigo-100 to-purple-100 px-4 py-2 rounded-full">
                <Users className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-indigo-900">
                  +15.000 estudiantes
                </span>
              </div>
              <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                Mi Progreso
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sticky top-24">
              <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Contenido del Curso
              </h2>
              <nav className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-start gap-3 p-3 rounded-xl transition-all group ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <item.icon
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {item.name}
                        </p>
                        <p
                          className={`text-xs mt-0.5 ${
                            isActive ? 'text-indigo-100' : 'text-slate-500'
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* Progress */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-slate-700">Tu Progreso</span>
                  <span className="text-sm font-bold text-indigo-600">35%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full" style={{ width: '35%' }}></div>
                </div>
                <p className="text-xs text-slate-500 mt-2">5 de 14 módulos completados</p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}