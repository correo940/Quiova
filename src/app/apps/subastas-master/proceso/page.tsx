'use client';

import { useState } from 'react';
import {
  ChevronRight,
  Search,
  FileSearch,
  Calculator,
  Euro,
  FileCheck,
  Gavel,
  Key,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  PlayCircle,
} from 'lucide-react';

const pasos = [
  {
    numero: 1,
    titulo: 'Búsqueda y Selección',
    icon: Search,
    duracion: '1-2 semanas',
    descripcion: 'Encuentra el inmueble ideal en los portales de subastas',
    color: 'from-blue-600 to-cyan-600',
    tareas: [
      'Definir criterios de búsqueda (ubicación, tipo, presupuesto)',
      'Revisar portales oficiales diariamente',
      'Crear alertas automáticas',
      'Hacer una lista corta de candidatos',
    ],
    recursos: [
      { nombre: 'Lista de portales oficiales', tipo: 'PDF' },
      { nombre: 'Plantilla de criterios', tipo: 'Excel' },
      { nombre: 'Guía de búsqueda efectiva', tipo: 'Video' },
    ],
    consejos: [
      'Revisa las subastas al menos 3 veces por semana',
      'Las mejores oportunidades se publican entre lunes y miércoles',
      'Configura alertas con criterios amplios al principio',
    ],
  },
  {
    numero: 2,
    titulo: 'Análisis Documental',
    icon: FileSearch,
    duracion: '3-5 días',
    descripcion: 'Revisa toda la documentación legal y técnica',
    color: 'from-purple-600 to-pink-600',
    tareas: [
      'Descargar y leer el edicto completo',
      'Solicitar nota simple registral',
      'Revisar informe de tasación',
      'Comprobar cargas y gravámenes',
      'Verificar situación urbanística',
    ],
    recursos: [
      { nombre: 'Checklist documental', tipo: 'PDF' },
      { nombre: 'Cómo leer una nota simple', tipo: 'Video' },
      { nombre: 'Glosario de términos legales', tipo: 'PDF' },
    ],
    consejos: [
      'La nota simple cuesta solo 9€ - siempre pídela',
      'Presta atención a las cargas posteriores a la que motiva la subasta',
      'Si hay dudas legales, consulta con un abogado especializado',
    ],
  },
  {
    numero: 3,
    titulo: 'Visita e Inspección',
    icon: FileCheck,
    duracion: '1-3 días',
    descripcion: 'Visita el inmueble y evalúa su estado real',
    color: 'from-orange-600 to-red-600',
    tareas: [
      'Comprobar si se permite visita oficial',
      'Hacer visita exterior siempre',
      'Hablar con vecinos sobre el estado',
      'Evaluar el barrio y servicios',
      'Fotografiar todo lo visible',
      'Buscar señales de ocupación',
    ],
    recursos: [
      { nombre: 'Checklist de inspección', tipo: 'PDF' },
      { nombre: 'Qué buscar en una visita', tipo: 'Video' },
      { nombre: 'Red flags a evitar', tipo: 'PDF' },
    ],
    consejos: [
      'Aunque no puedas entrar, puedes aprender mucho del exterior',
      'Habla con los vecinos - te darán información valiosa',
      'Visita a diferentes horas del día',
    ],
  },
  {
    numero: 4,
    titulo: 'Cálculo Financiero',
    icon: Calculator,
    duracion: '2-4 horas',
    descripcion: 'Calcula todos los gastos y la rentabilidad esperada',
    color: 'from-green-600 to-emerald-600',
    tareas: [
      'Calcular gastos de la operación',
      'Estimar costes de reforma (si necesario)',
      'Calcular impuestos (ITP, plusvalía futura)',
      'Proyectar rentabilidad',
      'Definir precio máximo a pujar',
    ],
    recursos: [
      { nombre: 'Calculadora de gastos', tipo: 'Excel' },
      { nombre: 'Calculadora de rentabilidad', tipo: 'Excel' },
      { nombre: 'Guía de gastos ocultos', tipo: 'PDF' },
    ],
    consejos: [
      'Añade siempre un 15-20% de colchón para imprevistos',
      'No olvides el coste de oportunidad del dinero',
      'Calcula el retorno con y sin financiación',
    ],
  },
  {
    numero: 5,
    titulo: 'Preparación del Depósito',
    icon: Euro,
    duracion: '1-2 días',
    descripcion: 'Constituye el depósito obligatorio',
    color: 'from-indigo-600 to-purple-600',
    tareas: [
      'Verificar el importe exacto del depósito',
      'Comprobar forma de pago aceptada',
      'Realizar transferencia o aval',
      'Guardar justificante',
      'Verificar que se ha recibido correctamente',
    ],
    recursos: [
      { nombre: 'Formas de constitución', tipo: 'PDF' },
      { nombre: 'Modelo de aval bancario', tipo: 'Word' },
    ],
    consejos: [
      'El depósito suele ser 5-20% del valor de tasación',
      'Si no ganas, te lo devuelven en 5-10 días',
      'Algunos juzgados aceptan aval bancario',
    ],
  },
  {
    numero: 6,
    titulo: 'Presentación de la Puja',
    icon: Gavel,
    duracion: '30-60 minutos',
    descripcion: 'Presenta tu oferta antes del plazo',
    color: 'from-pink-600 to-rose-600',
    tareas: [
      'Preparar documentación requerida',
      'Rellenar formulario de puja',
      'Adjuntar justificante de depósito',
      'Enviar antes de la fecha límite',
      'Guardar acuse de recibo',
    ],
    recursos: [
      { nombre: 'Modelo de puja judicial', tipo: 'Word' },
      { nombre: 'Modelo de puja BOE', tipo: 'PDF' },
      { nombre: 'Documentos necesarios', tipo: 'Checklist' },
    ],
    consejos: [
      'No esperes al último día para enviar',
      'En subastas online, puedes modificar tu puja hasta el cierre',
      'Lee bien si hay pujas mínimas de incremento (tramos)',
    ],
  },
  {
    numero: 7,
    titulo: 'Adjudicación',
    icon: CheckCircle2,
    duracion: '5-15 días',
    descripcion: 'Espera el resultado y resolución',
    color: 'from-yellow-600 to-orange-600',
    tareas: [
      'Esperar el plazo de adjudicación',
      'Consultar resolución en portal/juzgado',
      'Si ganas: preparar el pago del resto',
      'Si pierdes: solicitar devolución del depósito',
    ],
    recursos: [
      { nombre: 'Qué hacer si ganas', tipo: 'PDF' },
      { nombre: 'Qué hacer si pierdes', tipo: 'PDF' },
    ],
    consejos: [
      'En caso de empate, puede haber sorteo o puja presencial',
      'Tienes derecho a saber quién ganó y por cuánto',
      'Si no ganas, analiza el precio de remate para futuras pujas',
    ],
  },
  {
    numero: 8,
    titulo: 'Pago y Escrituración',
    icon: Key,
    duracion: '20-40 días',
    descripcion: 'Completa el pago y firma la escritura',
    color: 'from-teal-600 to-cyan-600',
    tareas: [
      'Pagar el resto en el plazo establecido',
      'Firmar la escritura ante notario/juzgado',
      'Pagar impuestos (ITP)',
      'Inscribir en el Registro de la Propiedad',
      '¡Recibir las llaves!',
    ],
    recursos: [
      { nombre: 'Gastos de escrituración', tipo: 'PDF' },
      { nombre: 'Trámites post-adjudicación', tipo: 'Checklist' },
    ],
    consejos: [
      'El plazo de pago NO se puede ampliar - ten el dinero listo',
      'Si no pagas a tiempo, pierdes el depósito y el inmueble',
      'Presupuesta 8-12% adicional para gastos de escritura e impuestos',
    ],
  },
  {
    numero: 9,
    titulo: 'Toma de Posesión',
    icon: TrendingUp,
    duracion: 'Variable',
    descripcion: 'Accede al inmueble y comienza tu proyecto',
    color: 'from-emerald-600 to-green-600',
    tareas: [
      'Si está libre: acceder y cambiar cerraduras',
      'Si está ocupado: iniciar procedimiento de desahucio',
      'Dar de alta suministros a tu nombre',
      'Evaluar reformas necesarias',
      'Comenzar tu proyecto (alquiler, venta, uso propio)',
    ],
    recursos: [
      { nombre: 'Guía de desocupación', tipo: 'PDF' },
      { nombre: 'Proceso de desahucio', tipo: 'PDF' },
      { nombre: 'Checklist de reformas', tipo: 'Excel' },
    ],
    consejos: [
      'Si hay ocupantes, consulta con abogado especializado',
      'El desahucio puede tardar 6-12 meses',
      'Presupuesta este tiempo en tu análisis financiero',
    ],
  },
];

export default function ProcesoPage() {
  const [pasoSeleccionado, setPasoSeleccionado] = useState(1);
  const [mostrarTimeline, setMostrarTimeline] = useState(true);

  const pasoActual = pasos.find(p => p.numero === pasoSeleccionado)!;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
          <TrendingUp className="w-4 h-4" />
          <span>Módulo 3</span>
          <ChevronRight className="w-4 h-4" />
          <span>Proceso Paso a Paso</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Proceso Completo de Participación en Subastas
        </h1>
        <p className="text-lg text-slate-600">
          Guía detallada desde la búsqueda hasta la toma de posesión del inmueble
        </p>
      </div>

      {/* Timeline visual */}
      {mostrarTimeline && (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Timeline del Proceso</h2>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              <span>Duración total: 2-6 meses</span>
            </div>
          </div>

          <div className="relative">
            {/* Línea de conexión */}
            <div className="absolute top-8 left-0 right-0 h-1 bg-slate-300 hidden md:block"></div>
            
            {/* Pasos */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {pasos.slice(0, 9).map((paso) => (
                <button
                  key={paso.numero}
                  onClick={() => setPasoSeleccionado(paso.numero)}
                  className={`relative bg-white rounded-xl p-4 border-2 transition-all hover:shadow-lg ${
                    pasoSeleccionado === paso.numero
                      ? 'border-indigo-600 shadow-lg scale-105'
                      : 'border-slate-200'
                  }`}
                >
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${paso.color} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {paso.numero}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mb-1 line-clamp-2">
                    {paso.titulo}
                  </h3>
                  <p className="text-xs text-slate-500">{paso.duracion}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detalle del paso */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
        {/* Header del paso */}
        <div className={`bg-gradient-to-r ${pasoActual.color} p-8 text-white`}>
          <div className="flex items-start gap-6">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <pasoActual.icon className="w-12 h-12" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold">
                  Paso {pasoActual.numero} de 9
                </span>
                <span className="bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {pasoActual.duracion}
                </span>
              </div>
              <h2 className="text-3xl font-bold mb-3">{pasoActual.titulo}</h2>
              <p className="text-xl text-white/90">{pasoActual.descripcion}</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Tareas */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              Tareas a Realizar
            </h3>
            <div className="space-y-3">
              {pasoActual.tareas.map((tarea, index) => (
                <label key={index} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-indigo-600 rounded mt-0.5"
                  />
                  <span className="text-slate-700">{tarea}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Consejos */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-blue-600" />
              Consejos y Tips
            </h3>
            <div className="space-y-3">
              {pasoActual.consejos.map((consejo, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-2xl">💡</span>
                  <p className="text-blue-900">{consejo}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recursos descargables */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Download className="w-6 h-6 text-purple-600" />
              Recursos y Plantillas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pasoActual.recursos.map((recurso, index) => (
                <button
                  key={index}
                  className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-all group"
                >
                  <div className="bg-purple-600 p-3 rounded-lg text-white group-hover:scale-110 transition-transform">
                    {recurso.tipo === 'PDF' && <FileCheck className="w-5 h-5" />}
                    {recurso.tipo === 'Excel' && <Calculator className="w-5 h-5" />}
                    {recurso.tipo === 'Video' && <PlayCircle className="w-5 h-5" />}
                    {recurso.tipo === 'Word' && <FileSearch className="w-5 h-5" />}
                    {recurso.tipo === 'Checklist' && <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-slate-900 text-sm">{recurso.nombre}</p>
                    <p className="text-xs text-purple-600">{recurso.tipo}</p>
                  </div>
                  <Download className="w-5 h-5 text-purple-600 group-hover:translate-y-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>

          {/* Detalles específicos por paso */}
          {pasoSeleccionado === 1 && <DetallesBusqueda />}
          {pasoSeleccionado === 2 && <DetallesAnalisis />}
          {pasoSeleccionado === 4 && <DetallesCalculo />}
          {pasoSeleccionado === 8 && <DetallesPago />}

          {/* Navegación entre pasos */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-200">
            <button
              onClick={() => setPasoSeleccionado(Math.max(1, pasoSeleccionado - 1))}
              disabled={pasoSeleccionado === 1}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                pasoSeleccionado === 1
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ← Paso Anterior
            </button>

            <div className="text-sm text-slate-600">
              Paso {pasoSeleccionado} de {pasos.length}
            </div>

            <button
              onClick={() => setPasoSeleccionado(Math.min(pasos.length, pasoSeleccionado + 1))}
              disabled={pasoSeleccionado === pasos.length}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                pasoSeleccionado === pasos.length
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl'
              }`}
            >
              Siguiente Paso →
            </button>
          </div>
        </div>
      </div>

      {/* Resumen visual */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white">
        <h2 className="text-2xl font-bold mb-4">🎯 Puntos Clave del Proceso</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-bold text-lg mb-2">⏱️ Timing</h3>
            <p className="text-indigo-100">
              El proceso completo puede tardar entre 2-6 meses desde que encuentras el inmueble
              hasta que tienes las llaves.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2">💰 Capital Necesario</h3>
            <p className="text-indigo-100">
              Además del precio de puja, necesitas 15-20% adicional para gastos (impuestos,
              notaría, registro).
            </p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2">📋 Documentación</h3>
            <p className="text-indigo-100">
              La clave está en el análisis documental previo. El 80% del éxito se decide antes
              de pujar.
            </p>
          </div>
        </div>
      </div>

      {/* Navegación del módulo */}
      <div className="flex justify-between items-center pt-8 border-t border-slate-200">
        <button className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all flex items-center gap-2">
          ← Tipos de Subastas
        </button>
        <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2">
          Siguiente: Documentación
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// Componentes de detalles específicos
function DetallesBusqueda() {
  return (
    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
      <h3 className="text-xl font-bold text-blue-900 mb-4">🔍 Portales Oficiales de Búsqueda</h3>
      
      <div className="space-y-4">
        <PortalCard
          nombre="Subastas BOE"
          url="https://subastas.boe.es"
          descripcion="Portal oficial del Estado. Todas las subastas judiciales, administrativas y de organismos públicos."
          tipo="Judicial, BOE, Otros"
        />
        <PortalCard
          nombre="Agencia Tributaria"
          url="https://subastas.agenciatributaria.gob.es"
          descripcion="Subastas de Hacienda y Seguridad Social. Muy buenos descuentos."
          tipo="Hacienda"
        />
        <PortalCard
          nombre="Portales Autonómicos"
          url="Variable por comunidad"
          descripcion="Cada comunidad autónoma puede tener su portal de subastas."
          tipo="Administración local"
        />
      </div>

      <div className="mt-6 bg-white rounded-lg p-4">
        <h4 className="font-bold text-blue-900 mb-2">📱 Configura Alertas</h4>
        <p className="text-sm text-blue-700 mb-3">
          Usa herramientas como Google Alerts o servicios especializados para recibir notificaciones
          automáticas cuando se publiquen nuevas subastas que cumplan tus criterios.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ej: vivienda madrid 100000"
            className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
            Crear Alerta
          </button>
        </div>
      </div>
    </div>
  );
}

function DetallesAnalisis() {
  return (
    <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
      <h3 className="text-xl font-bold text-purple-900 mb-4">📄 Documentos Clave a Revisar</h3>
      
      <div className="space-y-4">
        <DocumentoImportante
          nombre="Edicto de Subasta"
          importancia="CRÍTICO"
          queContiene={[
            'Descripción del inmueble',
            'Valor de tasación y puja mínima',
            'Cargas conocidas',
            'Situación posesoria',
            'Fechas y plazos',
          ]}
        />
        <DocumentoImportante
          nombre="Nota Simple Registral"
          importancia="CRÍTICO"
          queContiene={[
            'Titular registral',
            'Todas las cargas e hipotecas',
            'Descripción exacta del inmueble',
            'Situación jurídica actual',
          ]}
        />
        <DocumentoImportante
          nombre="Informe de Tasación"
          importancia="IMPORTANTE"
          queContiene={[
            'Valor de mercado estimado',
            'Estado del inmueble',
            'Superficies y distribución',
            'Fotografías (a veces)',
          ]}
        />
      </div>

      <div className="mt-6 bg-white rounded-lg p-4">
        <h4 className="font-bold text-purple-900 mb-2">⚠️ Red Flags a Identificar</h4>
        <ul className="space-y-2 text-sm text-purple-700">
          <li>❌ Múltiples cargas posteriores no cancelables</li>
          <li>❌ "Ocupado sin derecho" sin más información</li>
          <li>❌ Falta de información catastral</li>
          <li>❌ Descripción muy vaga del inmueble</li>
          <li>❌ Sin informe de tasación disponible</li>
        </ul>
      </div>
    </div>
  );
}

function DetallesCalculo() {
  return (
    <div className="bg-green-50 rounded-xl p-6 border border-green-200">
      <h3 className="text-xl font-bold text-green-900 mb-4">💰 Calculadora de Gastos Totales</h3>
      
      <div className="bg-white rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Precio de puja (€)
            </label>
            <input
              type="number"
              placeholder="200,000"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Tipo de inmueble
            </label>
            <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
              <option>Vivienda</option>
              <option>Local comercial</option>
              <option>Garaje</option>
              <option>Terreno</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h4 className="font-bold text-slate-900 mb-3">Gastos estimados:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">ITP (Impuesto de Transmisiones):</span>
              <span className="font-semibold">6-10% ≈ 12.000€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Notaría:</span>
              <span className="font-semibold">600-1.200€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Registro de la Propiedad:</span>
              <span className="font-semibold">400-800€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Gestoría:</span>
              <span className="font-semibold">300-600€</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
              <span className="font-bold text-slate-900">Total estimado:</span>
              <span className="font-bold text-green-600">≈ 13.300-14.600€</span>
            </div>
          </div>
        </div>

        <button className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-all">
          Calcular con mis datos
        </button>
      </div>
    </div>
  );
}

function DetallesPago() {
  return (
    <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
      <h3 className="text-xl font-bold text-amber-900 mb-4">⚡ Plazos de Pago - MUY IMPORTANTE</h3>
      
      <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6">
        <p className="text-red-900 font-bold mb-2">⚠️ ATENCIÓN:</p>
        <p className="text-red-800">
          Los plazos de pago NO son negociables ni ampliables. Si no pagas a tiempo,
          PIERDES el depósito y el inmueble. Ten el dinero 100% disponible antes de pujar.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg p-4">
          <h4 className="font-bold text-slate-900 mb-2">Subastas Judiciales</h4>
          <p className="text-sm text-slate-700">Plazo: 20-40 días desde la adjudicación</p>
        </div>
        <div className="bg-white rounded-lg p-4">
          <h4 className="font-bold text-slate-900 mb-2">Subastas BOE</h4>
          <p className="text-sm text-slate-700">Plazo: 15 días desde la adjudicación</p>
        </div>
        <div className="bg-white rounded-lg p-4">
          <h4 className="font-bold text-slate-900 mb-2">Subastas Hacienda</h4>
          <p className="text-sm text-slate-700">Plazo: 30 días desde la adjudicación</p>
        </div>
      </div>

      <div className="mt-6 bg-blue-100 border border-blue-300 rounded-lg p-4">
        <p className="text-blue-900 font-semibold mb-2">💡 Opciones de financiación:</p>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Hipoteca pre-aprobada (gestiona ANTES de pujar)</li>
          <li>• Préstamo personal o línea de crédito</li>
          <li>• Venta de otros activos</li>
          <li>• Socio inversor</li>
        </ul>
      </div>
    </div>
  );
}

function PortalCard({ nombre, url, descripcion, tipo }: any) {
  return (
    <div className="bg-white rounded-lg p-4 border border-blue-200">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-bold text-blue-900">{nombre}</h4>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{tipo}</span>
      </div>
      <p className="text-sm text-blue-700 mb-3">{descripcion}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
      >
        {url}
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

function DocumentoImportante({ nombre, importancia, queContiene }: any) {
  const colorImportancia = importancia === 'CRÍTICO' ? 'red' : 'orange';
  
  return (
    <div className="bg-white rounded-lg p-4 border border-purple-200">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-bold text-purple-900">{nombre}</h4>
        <span className={`text-xs bg-${colorImportancia}-100 text-${colorImportancia}-700 px-2 py-1 rounded-full font-bold`}>
          {importancia}
        </span>
      </div>
      <p className="text-sm font-semibold text-purple-700 mb-2">Qué contiene:</p>
      <ul className="text-sm text-purple-600 space-y-1">
        {queContiene.map((item: string, index: number) => (
          <li key={index}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}