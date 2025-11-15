'use client';

import Link from 'next/link';
import {
  Play,
  Clock,
  Award,
  TrendingUp,
  CheckCircle2,
  Star,
  BookOpen,
  Download,
  Users,
  Target,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';

const modulosDestacados = [
  {
    id: 1,
    titulo: 'Introducción a las Subastas',
    descripcion: 'Aprende los conceptos básicos y cómo funcionan las subastas inmobiliarias',
    duracion: '45 min',
    lecciones: 8,
    completado: 100,
    href: '/apps/subastas-master/introduccion',
    icon: BookOpen,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 2,
    titulo: 'Proceso Paso a Paso',
    descripcion: 'Guía completa desde la búsqueda hasta la adjudicación',
    duracion: '90 min',
    lecciones: 12,
    completado: 45,
    href: '/apps/subastas-master/proceso',
    icon: TrendingUp,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 3,
    titulo: 'Calculadoras y Herramientas',
    descripcion: 'Calcula gastos, rentabilidad y toma decisiones informadas',
    duracion: '60 min',
    lecciones: 10,
    completado: 0,
    href: '/apps/subastas-master/calculadoras',
    icon: Target,
    color: 'from-orange-500 to-red-500',
  },
];

const estadisticas = [
  { label: 'Módulos Totales', value: '14', icon: BookOpen, color: 'blue' },
  { label: 'Horas de Contenido', value: '12h', icon: Clock, color: 'purple' },
  { label: 'Casos Prácticos', value: '25+', icon: Lightbulb, color: 'orange' },
  { label: 'Recursos Descargables', value: '30+', icon: Download, color: 'green' },
];

const testimonios = [
  {
    nombre: 'María González',
    rol: 'Inversora Inmobiliaria',
    texto: 'Compré mi primer inmueble en subasta gracias a este curso. Ahorré un 40% del valor de mercado.',
    avatar: '👩‍💼',
    rating: 5,
  },
  {
    nombre: 'Carlos Ruiz',
    rol: 'Emprendedor',
    texto: 'Información clara y práctica. Las calculadoras son increíblemente útiles para evaluar oportunidades.',
    avatar: '👨‍💻',
    rating: 5,
  },
  {
    nombre: 'Ana Martínez',
    rol: 'Abogada',
    texto: 'Excelente cobertura de los aspectos legales. Imprescindible antes de participar en una subasta.',
    avatar: '👩‍⚖️',
    rating: 5,
  },
];

export default function SubastasMasterDashboard() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl opacity-10"></div>
        <div className="relative p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-3">
                Bienvenido al Master en Subastas de Inmuebles
              </h1>
              <p className="text-lg text-slate-600 max-w-3xl">
                Domina el arte de invertir en inmuebles a través de subastas. Aprende desde cero
                hasta convertirte en un experto con nuestra guía completa e interactiva.
              </p>
            </div>
            <div className="hidden lg:block text-6xl">🏆</div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/apps/subastas-master/introduccion"
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              Comenzar Curso
            </Link>
            <button className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-indigo-300 transition-all flex items-center gap-2">
              <Download className="w-5 h-5" />
              Descargar Programa
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {estadisticas.map((stat) => (
          <div
            key={stat.label}
            className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-all"
          >
            <div className={`inline-flex p-3 rounded-xl bg-${stat.color}-100 mb-4`}>
              <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
            <p className="text-sm text-slate-600">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Módulos Destacados */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Módulos Destacados</h2>
          <Link
            href="/apps/subastas-master/introduccion"
            className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-2"
          >
            Ver todos los módulos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modulosDestacados.map((modulo) => (
            <Link
              key={modulo.id}
              href={modulo.href}
              className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all"
            >
              <div className={`h-2 bg-gradient-to-r ${modulo.color}`}></div>
              <div className="p-6">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${modulo.color} mb-4`}>
                  <modulo.icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="font-bold text-lg text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {modulo.titulo}
                </h3>
                <p className="text-sm text-slate-600 mb-4">{modulo.descripcion}</p>

                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {modulo.duracion}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {modulo.lecciones} lecciones
                  </span>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-700">Progreso</span>
                    <span className="text-xs font-bold text-indigo-600">{modulo.completado}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`bg-gradient-to-r ${modulo.color} h-2 rounded-full transition-all`}
                      style={{ width: `${modulo.completado}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Lo que aprenderás */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
          <Award className="w-8 h-8 text-indigo-600" />
          Lo que aprenderás en este Master
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            'Cómo funcionan las subastas judiciales, del BOE y de Hacienda',
            'Proceso completo paso a paso para participar',
            'Documentación necesaria y trámites legales',
            'Cómo calcular gastos ocultos y rentabilidad real',
            'Estrategias de puja para maximizar tus posibilidades',
            'Identificar y evitar riesgos comunes',
            'Aspectos legales: cargas, ocupación, vicios ocultos',
            'Qué hacer después de la adjudicación',
            'Casos prácticos y ejemplos reales',
            'Acceso a todas las fuentes oficiales y recursos',
          ].map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-slate-700">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonios */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
          <Users className="w-8 h-8 text-indigo-600" />
          Lo que dicen nuestros estudiantes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonios.map((testimonio, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonio.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-slate-700 mb-4 italic">"{testimonio.texto}"</p>
              <div className="flex items-center gap-3">
                <div className="text-3xl">{testimonio.avatar}</div>
                <div>
                  <p className="font-semibold text-slate-900">{testimonio.nombre}</p>
                  <p className="text-sm text-slate-500">{testimonio.rol}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Final */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">¿Listo para comenzar tu inversión?</h2>
        <p className="text-xl text-indigo-100 mb-6 max-w-2xl mx-auto">
          Miles de personas ya están invirtiendo con éxito en subastas. Es tu turno de aprender cómo hacerlo.
        </p>
        <Link
          href="/apps/subastas-master/introduccion"
          className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold text-lg hover:shadow-2xl transition-all"
        >
          Empezar Ahora Gratis
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}