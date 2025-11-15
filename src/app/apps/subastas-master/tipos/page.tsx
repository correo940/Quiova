'use client';

import { useState } from 'react';
import {
  Scale,
  Building2,
  Landmark,
  FileText,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink,
  Search,
  Calendar,
  Euro,
  ChevronRight,
} from 'lucide-react';

const tiposSubastas = [
  {
    id: 'judicial',
    nombre: 'Subastas Judiciales',
    icon: Scale,
    color: 'from-blue-600 to-cyan-600',
    porcentaje: 65,
    descripcion: 'Las más comunes, resultado de procedimientos de ejecución hipotecaria o embargo',
    ventajas: [
      'Mayor volumen de inmuebles disponibles',
      'Descuentos significativos (30-50%)',
      'Cancelación de la hipoteca que motivó la ejecución',
      'Proceso muy regulado y transparente',
    ],
    desventajas: [
      'Proceso más lento (puede durar años)',
      'Mayor riesgo de ocupación',
      'Documentación más compleja',
      'Pueden existir cargas posteriores',
    ],
    proceso: {
      duracion: '6-24 meses',
      deposito: '5-20% del valor',
      plazosPago: '20-40 días',
    },
  },
  {
    id: 'boe',
    nombre: 'Subastas BOE (Agencia Estatal)',
    icon: Landmark,
    color: 'from-purple-600 to-pink-600',
    porcentaje: 15,
    descripcion: 'Bienes del Estado, organismos públicos y administraciones',
    ventajas: [
      'Gran transparencia y publicidad',
      'Inmuebles en buen estado generalmente',
      'Proceso 100% online',
      'Menos competencia en algunos casos',
    ],
    desventajas: [
      'Menor cantidad de inmuebles',
      'Precios a veces cercanos al mercado',
      'Requisitos estrictos de documentación',
      'Plazos de pago más cortos',
    ],
    proceso: {
      duracion: '1-3 meses',
      deposito: '5% del valor',
      plazosPago: '15 días',
    },
  },
  {
    id: 'hacienda',
    nombre: 'Subastas de Hacienda',
    icon: Building2,
    color: 'from-orange-600 to-red-600',
    porcentaje: 20,
    descripcion: 'Inmuebles embargados por la Agencia Tributaria por deudas fiscales',
    ventajas: [
      'Descuentos muy atractivos (hasta 75%)',
      'Cancelación de deudas tributarias',
      'Portal online oficial y moderno',
      'Información detallada disponible',
    ],
    desventajas: [
      'Pueden existir otras cargas',
      'Situación posesoria incierta',
      'Visitas limitadas',
      'Alta competencia en propiedades premium',
    ],
    proceso: {
      duracion: '2-4 meses',
      deposito: '20% del valor',
      plazosPago: '30 días',
    },
  },
  {
    id: 'notarial',
    nombre: 'Subastas Notariales',
    icon: FileText,
    color: 'from-green-600 to-emerald-600',
    porcentaje: 10,
    descripcion: 'Ejecución extrajudicial de hipotecas ante notario',
    ventajas: [
      'Proceso más rápido que judicial',
      'Menor coste administrativo',
      'Seguridad jurídica total',
      'Menos burocracia',
    ],
    desventajas: [
      'Menor cantidad disponible',
      'Descuentos menores',
      'Requisitos de acceso más estrictos',
      'No siempre son públicas',
    ],
    proceso: {
      duracion: '3-6 meses',
      deposito: '10% del valor',
      plazosPago: '30 días',
    },
  },
];

export default function TiposSubastasPage() {
  const [tipoSeleccionado, setTipoSeleccionado] = useState('judicial');
  const [mostrarComparativa, setMostrarComparativa] = useState(false);

  const tipoActual = tiposSubastas.find(t => t.id === tipoSeleccionado)!;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
          <Building2 className="w-4 h-4" />
          <span>Módulo 2</span>
          <ChevronRight className="w-4 h-4" />
          <span>Tipos de Subastas</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Tipos de Subastas de Inmuebles en España
        </h1>
        <p className="text-lg text-slate-600">
          Conoce en profundidad cada tipo de subasta, sus características, ventajas y cómo funcionan
        </p>
      </div>

      {/* Distribución visual */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          Distribución de Subastas en España (2024)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {tiposSubastas.map((tipo) => (
            <div
              key={tipo.id}
              className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setTipoSeleccionado(tipo.id)}
            >
              <div className={`bg-gradient-to-br ${tipo.color} p-3 rounded-xl inline-flex mb-4`}>
                <tipo.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2 text-sm">{tipo.nombre}</h3>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-slate-900">{tipo.porcentaje}%</span>
                <span className="text-sm text-slate-500 pb-1">del total</span>
              </div>
            </div>
          ))}
        </div>

        {/* Barra visual */}
        <div className="flex h-8 rounded-xl overflow-hidden">
          {tiposSubastas.map((tipo, index) => (
            <div
              key={tipo.id}
              className={`bg-gradient-to-r ${tipo.color} flex items-center justify-center text-white font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity`}
              style={{ width: `${tipo.porcentaje}%` }}
              onClick={() => setTipoSeleccionado(tipo.id)}
            >
              {tipo.porcentaje}%
            </div>
          ))}
        </div>
      </div>

      {/* Selector de tipo */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {tiposSubastas.map((tipo) => (
          <button
            key={tipo.id}
            onClick={() => setTipoSeleccionado(tipo.id)}
            className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
              tipoSeleccionado === tipo.id
                ? `bg-gradient-to-r ${tipo.color} text-white shadow-lg`
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <tipo.icon className="w-5 h-5" />
            {tipo.nombre}
          </button>
        ))}
      </div>

      {/* Detalle del tipo seleccionado */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
        <div className={`bg-gradient-to-r ${tipoActual.color} p-8 text-white`}>
          <div className="flex items-start gap-4">
            <div className="bg-white/20 p-4 rounded-2xl">
              <tipoActual.icon className="w-10 h-10" />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-3">{tipoActual.nombre}</h2>
              <p className="text-xl text-white/90">{tipoActual.descripcion}</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Datos clave */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <InfoBox
              icon={<Clock className="w-6 h-6 text-blue-600" />}
              titulo="Duración Proceso"
              valor={tipoActual.proceso.duracion}
              color="blue"
            />
            <InfoBox
              icon={<Euro className="w-6 h-6 text-green-600" />}
              titulo="Depósito Requerido"
              valor={tipoActual.proceso.deposito}
              color="green"
            />
            <InfoBox
              icon={<Calendar className="w-6 h-6 text-purple-600" />}
              titulo="Plazo de Pago"
              valor={tipoActual.proceso.plazosPago}
              color="purple"
            />
          </div>

          {/* Ventajas y Desventajas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                Ventajas
              </h3>
              <ul className="space-y-3">
                {tipoActual.ventajas.map((ventaja, index) => (
                  <li key={index} className="flex items-start gap-3 text-slate-700">
                    <span className="text-green-600 font-bold text-xl">✓</span>
                    <span>{ventaja}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                Desventajas
              </h3>
              <ul className="space-y-3">
                {tipoActual.desventajas.map((desventaja, index) => (
                  <li key={index} className="flex items-start gap-3 text-slate-700">
                    <span className="text-red-600 font-bold text-xl">✕</span>
                    <span>{desventaja}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Detalles específicos por tipo */}
          {tipoSeleccionado === 'judicial' && <DetalleJudicial />}
          {tipoSeleccionado === 'boe' && <DetalleBOE />}
          {tipoSeleccionado === 'hacienda' && <DetalleHacienda />}
          {tipoSeleccionado === 'notarial' && <DetalleNotarial />}
        </div>
      </div>

      {/* Tabla comparativa */}
      <div>
        <button
          onClick={() => setMostrarComparativa(!mostrarComparativa)}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          {mostrarComparativa ? '▼' : '▶'} Ver Tabla Comparativa Completa
        </button>

        {mostrarComparativa && (
          <div className="mt-6 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-slate-900">Característica</th>
                    <th className="px-6 py-4 text-left font-bold text-blue-900">Judicial</th>
                    <th className="px-6 py-4 text-left font-bold text-purple-900">BOE</th>
                    <th className="px-6 py-4 text-left font-bold text-orange-900">Hacienda</th>
                    <th className="px-6 py-4 text-left font-bold text-green-900">Notarial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-700">Volumen disponible</td>
                    <td className="px-6 py-4">⭐⭐⭐⭐⭐</td>
                    <td className="px-6 py-4">⭐⭐</td>
                    <td className="px-6 py-4">⭐⭐⭐</td>
                    <td className="px-6 py-4">⭐⭐</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-700">Descuentos</td>
                    <td className="px-6 py-4">30-50%</td>
                    <td className="px-6 py-4">10-30%</td>
                    <td className="px-6 py-4">40-75%</td>
                    <td className="px-6 py-4">20-40%</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-700">Facilidad proceso</td>
                    <td className="px-6 py-4">⭐⭐</td>
                    <td className="px-6 py-4">⭐⭐⭐⭐</td>
                    <td className="px-6 py-4">⭐⭐⭐⭐</td>
                    <td className="px-6 py-4">⭐⭐⭐</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-700">Riesgo ocupación</td>
                    <td className="px-6 py-4">⚠️ Alto</td>
                    <td className="px-6 py-4">✓ Bajo</td>
                    <td className="px-6 py-4">⚠️ Medio</td>
                    <td className="px-6 py-4">✓ Bajo</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-700">Modalidad</td>
                    <td className="px-6 py-4">Presencial/Online</td>
                    <td className="px-6 py-4">100% Online</td>
                    <td className="px-6 py-4">100% Online</td>
                    <td className="px-6 py-4">Presencial</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-700">Mejor para</td>
                    <td className="px-6 py-4">Inversores experimentados</td>
                    <td className="px-6 py-4">Principiantes</td>
                    <td className="px-6 py-4">Buscan descuentos altos</td>
                    <td className="px-6 py-4">Procesos rápidos</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Navegación */}
      <div className="flex justify-between items-center pt-8 border-t border-slate-200">
        <button className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all flex items-center gap-2">
          ← Introducción
        </button>
        <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2">
          Siguiente: Proceso Completo
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// Componentes auxiliares
function InfoBox({ icon, titulo, valor, color }: any) {
  const colorClasses: any = {
    blue: 'from-blue-50 to-blue-100',
    green: 'from-green-50 to-green-100',
    purple: 'from-purple-50 to-purple-100',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6 border border-slate-200`}>
      <div className="mb-3">{icon}</div>
      <p className="text-sm font-semibold text-slate-600 mb-1">{titulo}</p>
      <p className="text-2xl font-bold text-slate-900">{valor}</p>
    </div>
  );
}

function DetalleJudicial() {
  return (
    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
      <h3 className="text-xl font-bold text-blue-900 mb-4">📋 Detalles de Subastas Judiciales</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-bold text-blue-800 mb-2">¿Dónde se publican?</h4>
          <ul className="space-y-2 text-blue-700">
            <li>• Portal de Subastas del BOE (subastas.boe.es)</li>
            <li>• Tablón de anuncios del Juzgado</li>
            <li>• Boletines oficiales provinciales</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-blue-800 mb-2">Tipos de procedimientos</h4>
          <ul className="space-y-2 text-blue-700">
            <li>• <strong>Ejecución hipotecaria:</strong> El banco ejecuta la hipoteca por impago</li>
            <li>• <strong>Procedimiento ordinario:</strong> Embargo por otras deudas</li>
            <li>• <strong>Monitorio:</strong> Reclamación de deudas dinerarias</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-blue-800 mb-2">Fases de la subasta</h4>
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4">
              <p className="font-bold text-blue-900">1ª Subasta</p>
              <p className="text-sm text-blue-700">Precio: 100% del valor de tasación (o 70% en subastas antiguas)</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="font-bold text-blue-900">2ª Subasta (si desierta)</p>
              <p className="text-sm text-blue-700">Precio: 50% del valor de tasación</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="font-bold text-blue-900">3ª Subasta / Adjudicación directa</p>
              <p className="text-sm text-blue-700">Sin precio mínimo - Mejor oferta</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
          <p className="text-sm text-yellow-900">
            <strong>⚠️ Importante:</strong> En las subastas judiciales, solo se cancela la deuda que motivó
            el procedimiento. Otras cargas posteriores pueden subsistir.
          </p>
        </div>
      </div>
    </div>
  );
}

function DetalleBOE() {
  return (
    <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
      <h3 className="text-xl font-bold text-purple-900 mb-4">🏛️ Detalles de Subastas BOE</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-bold text-purple-800 mb-2">Portal oficial</h4>
          <a 
            href="https://subastas.boe.es" 
            target="_blank"
            className="flex items-center gap-2 text-purple-700 hover:text-purple-900 font-semibold"
          >
            subastas.boe.es
            <ExternalLink className="w-4 h-4" />
          </a>
          <p className="text-sm text-purple-600 mt-2">
            Plataforma única para todas las subastas públicas del Estado español
          </p>
        </div>

        <div>
          <h4 className="font-bold text-purple-800 mb-2">Tipos de organismos que subastan</h4>
          <ul className="space-y-2 text-purple-700">
            <li>• Administración General del Estado</li>
            <li>• Comunidades Autónomas</li>
            <li>• Ayuntamientos y Diputaciones</li>
            <li>• Empresas públicas</li>
            <li>• Universidades públicas</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-purple-800 mb-2">Proceso 100% telemático</h4>
          <div className="space-y-2 text-sm text-purple-700">
            <p>1. Registro en el portal con certificado digital</p>
            <p>2. Búsqueda y consulta de lotes</p>
            <p>3. Constitución del depósito (transferencia)</p>
            <p>4. Presentación de oferta online</p>
            <p>5. Adjudicación electrónica</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4">
          <p className="font-bold text-purple-900 mb-2">🎯 Ventaja Principal</p>
          <p className="text-sm text-purple-700">
            Menor competencia en subastas de inmuebles rurales, fincas rústicas y propiedades
            en localidades pequeñas. Gran oportunidad para inversores.
          </p>
        </div>
      </div>
    </div>
  );
}

function DetalleHacienda() {
  return (
    <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
      <h3 className="text-xl font-bold text-orange-900 mb-4">💰 Detalles de Subastas de Hacienda</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-bold text-orange-800 mb-2">Portal oficial</h4>
          <a 
            href="https://subastas.agenciatributaria.gob.es" 
            target="_blank"
            className="flex items-center gap-2 text-orange-700 hover:text-orange-900 font-semibold"
          >
            subastas.agenciatributaria.gob.es
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div>
          <h4 className="font-bold text-orange-800 mb-2">Origen de los inmuebles</h4>
          <ul className="space-y-2 text-orange-700">
            <li>• Embargo por deudas con la Seguridad Social</li>
            <li>• Deudas tributarias con Hacienda</li>
            <li>• IVA, IRPF, Impuesto de Sociedades no pagados</li>
            <li>• Multas administrativas importantes</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-orange-800 mb-2">Características especiales</h4>
          <div className="bg-white rounded-lg p-4 space-y-2">
            <p className="text-sm text-orange-700">
              <strong>Depósito alto:</strong> 20% del valor de tasación (más que en otras subastas)
            </p>
            <p className="text-sm text-orange-700">
              <strong>Descuentos agresivos:</strong> Si no se vende en la primera, puede bajar hasta 75%
            </p>
            <p className="text-sm text-orange-700">
              <strong>Pago rápido:</strong> Solo 30 días para completar el pago total
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-orange-800 mb-2">Tipo de lotes habituales</h4>
          <ul className="space-y-1 text-sm text-orange-700">
            <li>• Viviendas de particulares</li>
            <li>• Locales comerciales de empresas quebradas</li>
            <li>• Naves industriales</li>
            <li>• Terrenos rústicos y urbanos</li>
            <li>• Edificios completos</li>
          </ul>
        </div>

        <div className="bg-red-100 border border-red-300 rounded-lg p-4">
          <p className="text-sm text-red-900">
            <strong>⚠️ Atención:</strong> Las deudas con Hacienda se cancelan, pero pueden existir
            hipotecas anteriores u otras cargas. Revisa siempre la nota simple registral.
          </p>
        </div>
      </div>
    </div>
  );
}

function DetalleNotarial() {
  return (
    <div className="bg-green-50 rounded-xl p-6 border border-green-200">
      <h3 className="text-xl font-bold text-green-900 mb-4">📜 Detalles de Subastas Notariales</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-bold text-green-800 mb-2">¿Qué son?</h4>
          <p className="text-green-700">
            Son procedimientos de ejecución extrajudicial de hipotecas regulados por la Ley Hipotecaria.
            Se realizan ante notario sin necesidad de acudir a los tribunales.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-green-800 mb-2">Requisitos para que existan</h4>
          <ul className="space-y-2 text-green-700">
            <li>• La hipoteca debe tener cláusula de venta extrajudicial</li>
            <li>• El deudor debe estar en situación de impago</li>
            <li>• El banco opta por la vía notarial en lugar de judicial</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-green-800 mb-2">Ventajas vs. Judicial</h4>
          <div className="bg-white rounded-lg p-4 space-y-2">
            <p className="text-sm text-green-700">✓ Proceso mucho más rápido (3-6 meses vs 1-3 años)</p>
            <p className="text-sm text-green-700">✓ Menos costes de procedimiento</p>
            <p className="text-sm text-green-700">✓ Mayor seguridad jurídica</p>
            <p className="text-sm text-green-700">✓ Documentación muy clara y verificada</p>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-green-800 mb-2">¿Dónde se anuncian?</h4>
          <ul className="space-y-2 text-green-700">
            <li>• Tablón de anuncios de la notaría</li>
            <li>• Portal de subastas notariales (algunos colegios notariales)</li>
            <li>• A veces también en subastas.boe.es</li>
            <li>• Periódicos locales</li>
          </ul>
        </div>

        <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Consejo:</strong> Las subastas notariales son menos conocidas por el público general,
            lo que significa menos competencia. Ponte en contacto con notarías de tu zona para recibir avisos.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-green-800 mb-2">Limitaciones</h4>
          <ul className="space-y-2 text-sm text-green-700">
            <li>• No todas las hipotecas permiten esta vía</li>
            <li>• Menor volumen que las judiciales</li>
            <li>• Requiere seguimiento activo (menos publicidad)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}