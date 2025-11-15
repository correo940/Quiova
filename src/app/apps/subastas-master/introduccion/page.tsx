'use client';

import { useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Play,
  FileText,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react';

export default function IntroduccionPage() {
  const [seccionActiva, setSeccionActiva] = useState('que-son');

  const secciones = [
    { id: 'que-son', titulo: '¿Qué son las subastas de inmuebles?' },
    { id: 'por-que', titulo: '¿Por qué invertir en subastas?' },
    { id: 'como-funcionan', titulo: '¿Cómo funcionan?' },
    { id: 'ventajas', titulo: 'Ventajas y Desventajas' },
    { id: 'mitos', titulo: 'Mitos y Realidades' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
          <BookOpen className="w-4 h-4" />
          <span>Módulo 1</span>
          <ChevronRight className="w-4 h-4" />
          <span>Introducción a las Subastas</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Introducción a las Subastas de Inmuebles
        </h1>
        <p className="text-lg text-slate-600">
          Aprende los conceptos fundamentales sobre las subastas inmobiliarias en España
          y por qué son una excelente oportunidad de inversión.
        </p>
      </div>

      {/* Video destacado */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl">
              <Play className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Video Introductorio</h3>
              <p className="text-sm text-slate-300">Duración: 15 minutos</p>
            </div>
          </div>
          <div className="aspect-video bg-slate-800 rounded-xl flex items-center justify-center border-2 border-slate-700 hover:border-indigo-500 transition-all cursor-pointer group">
            <div className="text-center">
              <div className="bg-indigo-600 group-hover:bg-indigo-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-all">
                <Play className="w-10 h-10 ml-1" />
              </div>
              <p className="text-slate-300">Clic para reproducir</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación de secciones */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {secciones.map((seccion) => (
          <button
            key={seccion.id}
            onClick={() => setSeccionActiva(seccion.id)}
            className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
              seccionActiva === seccion.id
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {seccion.titulo}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {seccionActiva === 'que-son' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-xl">
            <div className="flex gap-4">
              <Info className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-blue-900 mb-2">Definición</h3>
                <p className="text-blue-800">
                  Una subasta de inmuebles es un procedimiento público mediante el cual se vende
                  una propiedad (vivienda, local, terreno, etc.) al mejor postor, generalmente
                  como consecuencia de un proceso judicial, administrativo o notarial.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Origen de las Subastas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <OriginCard
                titulo="Subastas Judiciales"
                descripcion="Procedimientos de ejecución hipotecaria o embargo por impago de deudas"
                porcentaje="65%"
                icon="⚖️"
              />
              <OriginCard
                titulo="Subastas de Hacienda"
                descripcion="Bienes embargados por la Agencia Tributaria por deudas fiscales"
                porcentaje="25%"
                icon="🏛️"
              />
              <OriginCard
                titulo="Subastas Notariales"
                descripcion="Ejecuciones extrajudiciales de hipotecas ante notario"
                porcentaje="10%"
                icon="📜"
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">¿Cómo se publica una subasta?</h2>
            <div className="space-y-4">
              <TimelineStep
                numero={1}
                titulo="Anuncio oficial"
                descripcion="Se publica en el BOE, portal de subastas o tablón de anuncios del juzgado"
              />
              <TimelineStep
                numero={2}
                titulo="Periodo de consulta"
                descripcion="Los interesados pueden consultar documentación y visitar el inmueble (si está permitido)"
              />
              <TimelineStep
                numero={3}
                titulo="Presentación de ofertas"
                descripcion="Los postores presentan sus pujas junto con el depósito obligatorio"
              />
              <TimelineStep
                numero={4}
                titulo="Adjudicación"
                descripcion="Se adjudica al mejor postor que cumpla los requisitos establecidos"
              />
            </div>
          </div>
        </div>
      )}

      {seccionActiva === 'por-que' && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-slate-900">¿Por qué invertir en subastas?</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BeneficioCard
              icon={<TrendingDown className="w-8 h-8 text-green-600" />}
              titulo="Descuentos significativos"
              descripcion="Los inmuebles se subasta por debajo del valor de mercado"
              datos={[
                'Media de descuento: 30-50%',
                'En segundas subastas: hasta 75%',
                'ROI potencial muy alto',
              ]}
              color="green"
            />
            <BeneficioCard
              icon={<FileText className="w-8 h-8 text-blue-600" />}
              titulo="Transparencia total"
              descripcion="Proceso público regulado por ley"
              datos={[
                'Toda la documentación accesible',
                'Tasación oficial del inmueble',
                'Garantías legales del proceso',
              ]}
              color="blue"
            />
            <BeneficioCard
              icon={<TrendingUp className="w-8 h-8 text-purple-600" />}
              titulo="Oportunidades únicas"
              descripcion="Acceso a propiedades exclusivas"
              datos={[
                'Inmuebles en zonas prime',
                'Propiedades difíciles de encontrar',
                'Menos competencia que mercado libre',
              ]}
              color="purple"
            />
            <BeneficioCard
              icon={<CheckCircle2 className="w-8 h-8 text-orange-600" />}
              titulo="Seguridad jurídica"
              descripcion="Respaldado por organismos oficiales"
              datos={[
                'Proceso supervisado por juez/notario',
                'Título de propiedad garantizado',
                'Cancelación de cargas (en algunos casos)',
              ]}
              color="orange"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-amber-900 mb-2">Dato importante</h3>
                <p className="text-amber-800">
                  En España se subastan más de <strong>50,000 inmuebles al año</strong>, con un valor
                  total superior a los <strong>5,000 millones de euros</strong>. El 60% de estas
                  subastas tienen éxito en la primera convocatoria.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {seccionActiva === 'como-funcionan' && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">¿Cómo funcionan las subastas?</h2>

          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Proceso General</h3>
            <div className="space-y-6">
              <ProcesoStep
                numero="1"
                titulo="Búsqueda y Selección"
                items={[
                  'Consulta portales oficiales (BOE, subastas.boe.es, Agencia Tributaria)',
                  'Identifica inmuebles de interés por ubicación, precio, tipo',
                  'Analiza la documentación disponible',
                ]}
              />
              <ProcesoStep
                numero="2"
                titulo="Análisis Previo"
                items={[
                  'Revisa el informe de tasación',
                  'Comprueba cargas y gravámenes en el Registro de la Propiedad',
                  'Visita el inmueble si es posible',
                  'Calcula gastos totales (notaría, registro, impuestos)',
                ]}
              />
              <ProcesoStep
                numero="3"
                titulo="Preparación de la Puja"
                items={[
                  'Determina tu precio máximo',
                  'Prepara el depósito (normalmente 5-20% del valor)',
                  'Reúne la documentación necesaria',
                ]}
              />
              <ProcesoStep
                numero="4"
                titulo="Presentación de Ofertas"
                items={[
                  'Presenta tu puja antes del plazo límite',
                  'Adjunta el justificante del depósito',
                  'Espera el resultado de la subasta',
                ]}
              />
              <ProcesoStep
                numero="5"
                titulo="Adjudicación y Pago"
                items={[
                  'Si ganas, paga el resto del precio en el plazo establecido',
                  'Firma la escritura de compraventa',
                  'Inscribe la propiedad a tu nombre',
                ]}
              />
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl p-6">
            <h4 className="font-bold text-blue-900 mb-3">💡 Consejo Importante</h4>
            <p className="text-blue-800">
              El tiempo promedio desde que encuentras un inmueble hasta la adjudicación suele ser
              de <strong>1 a 3 meses</strong>. Es fundamental estar preparado financieramente y
              tener toda la documentación lista para actuar con rapidez.
            </p>
          </div>
        </div>
      )}

      {seccionActiva === 'ventajas' && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Ventajas y Desventajas</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-200">
              <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" />
                Ventajas
              </h3>
              <ul className="space-y-3">
                {[
                  'Precios muy por debajo del mercado (30-75% descuento)',
                  'Proceso transparente y regulado por ley',
                  'Acceso a propiedades premium difíciles de conseguir',
                  'Menos competencia que en el mercado tradicional',
                  'Posibilidad de negociar condiciones en algunas subastas',
                  'Documentación completa disponible antes de pujar',
                  'Alto potencial de revalorización inmediata',
                ].map((ventaja, index) => (
                  <li key={index} className="flex items-start gap-3 text-green-800">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>{ventaja}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-red-50 rounded-2xl p-6 border-2 border-red-200">
              <h3 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Desventajas y Riesgos
              </h3>
              <ul className="space-y-3">
                {[
                  'El inmueble puede estar ocupado (difícil desalojo)',
                  'Posibles cargas que no se cancelan con la subasta',
                  'No siempre se puede visitar el interior',
                  'Puede haber vicios ocultos en la construcción',
                  'Necesitas liquidez inmediata (pago al contado)',
                  'Proceso puede ser complejo para principiantes',
                  'Riesgo de perder el depósito si no completas el pago',
                ].map((desventaja, index) => (
                  <li key={index} className="flex items-start gap-3 text-red-800">
                    <span className="text-red-600 font-bold">✕</span>
                    <span>{desventaja}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">⚖️ Conclusión</h3>
            <p className="text-lg text-indigo-100 mb-4">
              Las subastas de inmuebles son una excelente oportunidad de inversión <strong>SI</strong>:
            </p>
            <ul className="space-y-2 text-indigo-100">
              <li>✓ Haces un análisis exhaustivo previo</li>
              <li>✓ Entiendes los riesgos y sabes cómo mitigarlos</li>
              <li>✓ Tienes la liquidez necesaria</li>
              <li>✓ Cuentas con asesoramiento legal si es necesario</li>
              <li>✓ Tienes paciencia y visión a largo plazo</li>
            </ul>
          </div>
        </div>
      )}

      {seccionActiva === 'mitos' && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Mitos y Realidades</h2>

          <div className="space-y-4">
            <MitoCard
              mito="Solo los ricos pueden participar en subastas"
              realidad="FALSO. Hay subastas desde 5,000€ hasta millones. Puedes encontrar garajes, trasteros o pequeñas propiedades muy accesibles."
            />
            <MitoCard
              mito="Todos los inmuebles están en mal estado"
              realidad="FALSO. Muchos inmuebles están en perfecto estado. Solo necesitas hacer la debida diligencia."
            />
            <MitoCard
              mito="Siempre está okupado"
              realidad="PARCIALMENTE FALSO. Aproximadamente el 40% están libres de ocupantes. La documentación indica la situación posesoria."
            />
            <MitoCard
              mito="Es imposible conseguir financiación bancaria"
              realidad="FALSO. Varios bancos ofrecen hipotecas para inmuebles subastados, aunque con condiciones específicas."
            />
            <MitoCard
              mito="El proceso es muy complicado"
              realidad="PARCIALMENTE CIERTO. Requiere conocimiento, pero con la información adecuada es totalmente accesible."
            />
            <MitoCard
              mito="Siempre hay gastos ocultos enormes"
              realidad="FALSO. Los gastos son previsibles y calculables. Este curso te enseña exactamente cómo calcularlos."
            />
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200">
            <h3 className="text-2xl font-bold text-green-900 mb-4">🎯 La Realidad</h3>
            <p className="text-lg text-green-800 mb-4">
              Miles de personas ordinarias compran inmuebles en subastas cada año y obtienen
              excelentes rentabilidades. No necesitas ser un experto en finanzas ni tener
              millones de euros.
            </p>
            <p className="text-green-700">
              <strong>Lo que SÍ necesitas:</strong> Formación adecuada, paciencia, análisis
              riguroso y un plan claro. Exactamente lo que aprenderás en este Master.
            </p>
          </div>
        </div>
      )}

      {/* Quiz interactivo */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-200">
        <h3 className="text-2xl font-bold text-purple-900 mb-4 flex items-center gap-2">
          <HelpCircle className="w-7 h-7" />
          Test de Conocimientos
        </h3>
        <p className="text-purple-700 mb-6">
          Completa este breve test para verificar que has comprendido los conceptos básicos.
        </p>
        <button className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all">
          Iniciar Test (5 preguntas)
        </button>
      </div>

      {/* Navegación */}
      <div className="flex justify-between items-center pt-8 border-t border-slate-200">
        <button className="px-6 py-3 bg-slate-100 text-slate-400 rounded-xl font-semibold cursor-not-allowed">
          ← Módulo Anterior
        </button>
        <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2">
          Siguiente: Tipos de Subastas
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// Componentes auxiliares
function OriginCard({ titulo, descripcion, porcentaje, icon }: any) {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-all">
      <div className="text-4xl mb-3">{icon}</div>
      <h4 className="font-bold text-slate-900 mb-2">{titulo}</h4>
      <p className="text-sm text-slate-600 mb-3">{descripcion}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-slate-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full"
            style={{ width: porcentaje }}
          ></div>
        </div>
        <span className="text-sm font-bold text-indigo-600">{porcentaje}</span>
      </div>
    </div>
  );
}

function TimelineStep({ numero, titulo, descripcion }: any) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
        {numero}
      </div>
      <div>
        <h4 className="font-bold text-slate-900 mb-1">{titulo}</h4>
        <p className="text-slate-600 text-sm">{descripcion}</p>
      </div>
    </div>
  );
}

function BeneficioCard({ icon, titulo, descripcion, datos, color }: any) {
  const colorClasses: any = {
    green: 'from-green-50 to-emerald-50 border-green-200',
    blue: 'from-blue-50 to-cyan-50 border-blue-200',
    purple: 'from-purple-50 to-pink-50 border-purple-200',
    orange: 'from-orange-50 to-amber-50 border-orange-200',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6 border`}>
      <div className="mb-4">{icon}</div>
      <h4 className="font-bold text-slate-900 mb-2">{titulo}</h4>
      <p className="text-sm text-slate-600 mb-4">{descripcion}</p>
      <ul className="space-y-2">
        {datos.map((dato: string, index: number) => (
          <li key={index} className="text-sm text-slate-700 flex items-center gap-2">
            <span className="text-green-600">✓</span>
            {dato}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProcesoStep({ numero, titulo, items }: any) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
          {numero}
        </div>
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-slate-900 mb-3">{titulo}</h4>
        <ul className="space-y-2">
          {items.map((item: string, index: number) => (
            <li key={index} className="flex items-start gap-2 text-slate-700">
              <ChevronRight className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-1" />
              <span className="text-sm">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MitoCard({ mito, realidad }: { mito: string; realidad: string }) {
  return (
    <div className="bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-indigo-300 transition-all">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 bg-red-100 p-3 rounded-xl">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 mb-2">❌ MITO: "{mito}"</h4>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-slate-700">
              <strong className="text-green-700">REALIDAD:</strong> {realidad}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}