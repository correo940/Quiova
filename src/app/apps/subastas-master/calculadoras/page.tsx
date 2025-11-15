'use client';

import { useState } from 'react';
import {
  Calculator,
  TrendingUp,
  Euro,
  Home,
  FileText,
  PiggyBank,
  AlertCircle,
  ChevronRight,
  Download,
  BarChart3,
  Percent,
  Calendar,
} from 'lucide-react';

type CalculadoraActiva = 'gastos' | 'rentabilidad' | 'financiacion' | 'roi';

export default function CalculadorasPage() {
  const [calculadoraActiva, setCalculadoraActiva] = useState<CalculadoraActiva>('gastos');

  const calculadoras = [
    {
      id: 'gastos' as const,
      nombre: 'Calculadora de Gastos',
      descripcion: 'Calcula todos los gastos asociados a la compra',
      icon: Euro,
      color: 'from-blue-600 to-cyan-600',
    },
    {
      id: 'rentabilidad' as const,
      nombre: 'Calculadora de Rentabilidad',
      descripcion: 'Proyecta la rentabilidad de tu inversión',
      icon: TrendingUp,
      color: 'from-green-600 to-emerald-600',
    },
    {
      id: 'financiacion' as const,
      nombre: 'Calculadora de Financiación',
      descripcion: 'Simula hipotecas y préstamos',
      icon: PiggyBank,
      color: 'from-purple-600 to-pink-600',
    },
    {
      id: 'roi' as const,
      nombre: 'Calculadora ROI',
      descripcion: 'Retorno de inversión total',
      icon: BarChart3,
      color: 'from-orange-600 to-red-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
          <Calculator className="w-4 h-4" />
          <span>Módulo 4</span>
          <ChevronRight className="w-4 h-4" />
          <span>Calculadoras y Herramientas</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Calculadoras Financieras para Subastas
        </h1>
        <p className="text-lg text-slate-600">
          Herramientas interactivas para calcular gastos, rentabilidad y tomar decisiones informadas
        </p>
      </div>

      {/* Selector de calculadora */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {calculadoras.map((calc) => (
          <button
            key={calc.id}
            onClick={() => setCalculadoraActiva(calc.id)}
            className={`p-6 rounded-2xl border-2 transition-all ${
              calculadoraActiva === calc.id
                ? 'border-indigo-600 shadow-xl scale-105'
                : 'border-slate-200 hover:border-slate-300 hover:shadow-lg'
            }`}
          >
            <div className={`bg-gradient-to-br ${calc.color} p-4 rounded-xl inline-flex mb-4`}>
              <calc.icon className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">{calc.nombre}</h3>
            <p className="text-sm text-slate-600">{calc.descripcion}</p>
          </button>
        ))}
      </div>

      {/* Calculadora activa */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
        {calculadoraActiva === 'gastos' && <CalculadoraGastos />}
        {calculadoraActiva === 'rentabilidad' && <CalculadoraRentabilidad />}
        {calculadoraActiva === 'financiacion' && <CalculadoraFinanciacion />}
        {calculadoraActiva === 'roi' && <CalculadoraROI />}
      </div>

      {/* Consejos generales */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-200">
        <h2 className="text-2xl font-bold text-amber-900 mb-6 flex items-center gap-2">
          <AlertCircle className="w-7 h-7" />
          Consejos para usar las calculadoras
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-amber-900 mb-2">✓ Siempre sé conservador</h3>
            <p className="text-amber-800">
              Es mejor sobreestimar gastos y subestimar ingresos. Añade un colchón del 15-20%
              para imprevistos.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-amber-900 mb-2">✓ Incluye TODOS los costes</h3>
            <p className="text-amber-800">
              No olvides gastos menores: comunidad, IBI, seguros, mantenimiento, vacíos de alquiler.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-amber-900 mb-2">✓ Considera varios escenarios</h3>
            <p className="text-amber-800">
              Calcula el mejor caso, caso normal y peor caso. Invierte solo si el peor caso
              es aceptable.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-amber-900 mb-2">✓ Guarda tus cálculos</h3>
            <p className="text-amber-800">
              Descarga las hojas de cálculo y guárdalas. Te servirán para comparar con otras
              oportunidades.
            </p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <div className="flex justify-between items-center pt-8 border-t border-slate-200">
        <button className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all">
          ← Proceso Completo
        </button>
        <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2">
          Siguiente: Aspectos Legales
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// Calculadora de Gastos
function CalculadoraGastos() {
  const [precioSubasta, setPrecioSubasta] = useState<number>(200000);
  const [tipoInmueble, setTipoInmueble] = useState<'vivienda' | 'local' | 'garaje' | 'terreno'>('vivienda');
  const [comunidadAutonoma, setComunidadAutonoma] = useState('Madrid');
  const [esViviendaHabitual, setEsViviendaHabitual] = useState(false);
  const [necesitaReforma, setNecesitaReforma] = useState(false);
  const [costoReforma, setCostoReforma] = useState<number>(0);

  // Cálculos
  const calcularITP = () => {
    const tiposITP: Record<string, number> = {
      'Madrid': 6,
      'Cataluña': 10,
      'Andalucía': 8,
      'Valencia': 10,
      'País Vasco': 4,
      'Galicia': 10,
      'Castilla y León': 8,
      'Castilla-La Mancha': 9,
    };
    const tipo = tiposITP[comunidadAutonoma] || 7;
    const reduccion = esViviendaHabitual && precioSubasta < 250000 ? 0.5 : 1;
    return precioSubasta * (tipo / 100) * reduccion;
  };

  const calcularNotaria = () => {
    if (precioSubasta < 100000) return 600;
    if (precioSubasta < 300000) return 900;
    if (precioSubasta < 600000) return 1200;
    return 1500;
  };

  const calcularRegistro = () => {
    if (precioSubasta < 100000) return 400;
    if (precioSubasta < 300000) return 600;
    if (precioSubasta < 600000) return 800;
    return 1000;
  };

  const gastosGestoria = 400;
  const notaSimple = 9;
  const certificadoEnergetico = tipoInmueble === 'vivienda' ? 150 : 0;
  const plusvaliaMunicipal = precioSubasta * 0.01; // Estimación

  const itp = calcularITP();
  const notaria = calcularNotaria();
  const registro = calcularRegistro();
  
  const totalGastosCompra = itp + notaria + registro + gastosGestoria + notaSimple + certificadoEnergetico;
  const totalConReforma = totalGastosCompra + (necesitaReforma ? costoReforma : 0);
  const inversionTotal = precioSubasta + totalConReforma;
  const porcentajeGastos = (totalGastosCompra / precioSubasta) * 100;

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-white/20 p-4 rounded-2xl">
            <Euro className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Calculadora de Gastos</h2>
            <p className="text-blue-100">Calcula todos los costes asociados a la compra en subasta</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Datos del inmueble</h3>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Precio de subasta (€)
              </label>
              <input
                type="number"
                value={precioSubasta}
                onChange={(e) => setPrecioSubasta(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-bold"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Tipo de inmueble
              </label>
              <select
                value={tipoInmueble}
                onChange={(e) => setTipoInmueble(e.target.value as any)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="vivienda">Vivienda</option>
                <option value="local">Local comercial</option>
                <option value="garaje">Garaje</option>
                <option value="terreno">Terreno</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Comunidad Autónoma
              </label>
              <select
                value={comunidadAutonoma}
                onChange={(e) => setComunidadAutonoma(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Madrid">Madrid</option>
                <option value="Cataluña">Cataluña</option>
                <option value="Andalucía">Andalucía</option>
                <option value="Valencia">Valencia</option>
                <option value="País Vasco">País Vasco</option>
                <option value="Galicia">Galicia</option>
                <option value="Castilla y León">Castilla y León</option>
                <option value="Castilla-La Mancha">Castilla-La Mancha</option>
              </select>
            </div>

            {tipoInmueble === 'vivienda' && (
              <label className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-all">
                <input
                  type="checkbox"
                  checked={esViviendaHabitual}
                  onChange={(e) => setEsViviendaHabitual(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <div>
                  <p className="font-semibold text-slate-900">Es vivienda habitual</p>
                  <p className="text-sm text-slate-600">Puede aplicar bonificaciones en ITP</p>
                </div>
              </label>
            )}

            <label className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl cursor-pointer hover:bg-orange-100 transition-all">
              <input
                type="checkbox"
                checked={necesitaReforma}
                onChange={(e) => setNecesitaReforma(e.target.checked)}
                className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
              />
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Necesita reforma</p>
              </div>
            </label>

            {necesitaReforma && (
              <div className="pl-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Coste estimado de reforma (€)
                </label>
                <input
                  type="number"
                  value={costoReforma}
                  onChange={(e) => setCostoReforma(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ej: 20000"
                />
              </div>
            )}
          </div>

          {/* Resultados */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
              <h3 className="text-xl font-bold text-blue-900 mb-4">Resumen de gastos</h3>
              
              <div className="space-y-3">
                <GastoLinea
                  concepto="Precio de subasta"
                  valor={precioSubasta}
                  destacado
                />
                
                <div className="border-t border-blue-300 my-4"></div>
                
                <GastoLinea
                  concepto={`ITP - Impuesto Transmisiones (${calcularITP() / precioSubasta * 100}%)`}
                  valor={itp}
                  tooltip="Varía según comunidad autónoma"
                />
                <GastoLinea
                  concepto="Notaría"
                  valor={notaria}
                  tooltip="Según arancel notarial"
                />
                <GastoLinea
                  concepto="Registro de la Propiedad"
                  valor={registro}
                />
                <GastoLinea
                  concepto="Gestoría"
                  valor={gastosGestoria}
                />
                <GastoLinea
                  concepto="Nota simple registral"
                  valor={notaSimple}
                />
                {certificadoEnergetico > 0 && (
                  <GastoLinea
                    concepto="Certificado energético"
                    valor={certificadoEnergetico}
                  />
                )}
                
                <div className="border-t border-blue-300 my-4"></div>
                
                <GastoLinea
                  concepto="Total gastos de compra"
                  valor={totalGastosCompra}
                  destacado
                  color="blue"
                />

                {necesitaReforma && costoReforma > 0 && (
                  <>
                    <GastoLinea
                      concepto="Coste de reforma"
                      valor={costoReforma}
                      color="orange"
                    />
                    <div className="border-t border-blue-300 my-4"></div>
                  </>
                )}

                <GastoLinea
                  concepto="INVERSIÓN TOTAL"
                  valor={inversionTotal}
                  destacado
                  color="green"
                  grande
                />

                <div className="bg-white rounded-xl p-4 mt-4">
                  <p className="text-sm text-slate-600 mb-1">Gastos sobre precio subasta</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {porcentajeGastos.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-bold mb-1">💡 Recuerda:</p>
                  <ul className="space-y-1">
                    <li>• Añade 10-15% adicional para imprevistos</li>
                    <li>• Considera gastos mensuales: IBI, comunidad, seguros</li>
                    <li>• Si hay cargas, pueden ser gastos adicionales</li>
                  </ul>
                </div>
              </div>
            </div>

            <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
              <Download className="w-5 h-5" />
              Descargar Cálculo en PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Calculadora de Rentabilidad
function CalculadoraRentabilidad() {
  const [inversionTotal, setInversionTotal] = useState<number>(220000);
  const [valorMercado, setValorMercado] = useState<number>(280000);
  const [alquilerMensual, setAlquilerMensual] = useState<number>(900);
  const [gastosAnuales, setGastosAnuales] = useState<number>(2400);
  const [vacacional, setVacacional] = useState<number>(5); // % del año vacío

  // Cálculos
  const ingresoAnualBruto = alquilerMensual * 12;
  const tasaVacancia = (vacacional / 100) * ingresoAnualBruto;
  const ingresoAnualNeto = ingresoAnualBruto - tasaVacancia - gastosAnuales;
  const rentabilidadBruta = (ingresoAnualBruto / inversionTotal) * 100;
  const rentabilidadNeta = (ingresoAnualNeto / inversionTotal) * 100;
  const plusvaliaInmediata = valorMercado - inversionTotal;
  const porcentajePlusvalia = ((valorMercado - inversionTotal) / inversionTotal) * 100;
  const cashOnCash = rentabilidadNeta;

  return (
    <div>
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-white/20 p-4 rounded-2xl">
            <TrendingUp className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Calculadora de Rentabilidad</h2>
            <p className="text-green-100">Analiza el retorno de tu inversión inmobiliaria</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Datos de la inversión</h3>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Inversión total (€)
              </label>
              <input
                type="number"
                value={inversionTotal}
                onChange={(e) => setInversionTotal(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-lg font-bold"
                placeholder="Precio subasta + gastos"
              />
              <p className="text-xs text-slate-500 mt-1">Incluye precio de subasta + todos los gastos</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Valor de mercado estimado (€)
              </label>
              <input
                type="number"
                value={valorMercado}
                onChange={(e) => setValorMercado(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Precio de venta actual"
              />
              <p className="text-xs text-slate-500 mt-1">Precio al que podrías vender hoy</p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-bold text-slate-900 mb-4">Datos de alquiler</h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Alquiler mensual (€)
                  </label>
                  <input
                    type="number"
                    value={alquilerMensual}
                    onChange={(e) => setAlquilerMensual(Number(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Gastos anuales (€)
                  </label>
                  <input
                    type="number"
                    value={gastosAnuales}
                    onChange={(e) => setGastosAnuales(Number(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">IBI, comunidad, seguros, mantenimiento</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tasa de vacancia (% año vacío)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={vacacional}
                      onChange={(e) => setVacacional(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="font-bold text-slate-900 w-16">{vacacional}%</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Tiempo estimado sin inquilino al año</p>
                </div>
              </div>
            </div>
          </div>

          {/* Resultados */}
          <div className="space-y-6">
            {/* Plusvalía inmediata */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
              <h3 className="text-lg font-bold text-purple-900 mb-4">💎 Plusvalía Inmediata</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-purple-700 mb-1">Ganancia al comprar</p>
                  <p className="text-4xl font-bold text-purple-900">
                    {formatCurrency(plusvaliaInmediata)}
                  </p>
                  <p className="text-lg font-semibold text-purple-600 mt-1">
                    +{porcentajePlusvalia.toFixed(1)}% sobre inversión
                  </p>
                </div>
              </div>
            </div>

            {/* Rentabilidad por alquiler */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
              <h3 className="text-lg font-bold text-green-900 mb-4">📈 Rentabilidad por Alquiler</h3>
              
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4">
                  <p className="text-sm text-slate-600 mb-1">Ingreso anual bruto</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCurrency(ingresoAnualBruto)}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4">
                  <p className="text-sm text-slate-600 mb-1">Rentabilidad bruta</p>
                  <p className="text-3xl font-bold text-green-600">
                    {rentabilidadBruta.toFixed(2)}%
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Ingreso anual / Inversión</p>
                </div>

                <div className="bg-white rounded-xl p-4 border-2 border-green-300">
                  <p className="text-sm text-slate-600 mb-1">Rentabilidad neta (Cash-on-Cash)</p>
                  <p className="text-3xl font-bold text-green-700">
                    {rentabilidadNeta.toFixed(2)}%
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Después de gastos y vacancia</p>
                </div>

                <div className="bg-white rounded-xl p-4">
                  <p className="text-sm text-slate-600 mb-1">Ingreso neto mensual</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCurrency(ingresoAnualNeto / 12)}
                  </p>
                </div>
              </div>
            </div>

            {/* Evaluación */}
            <div className={`rounded-xl p-6 border-2 ${
              rentabilidadNeta >= 6 
                ? 'bg-green-50 border-green-300' 
                : rentabilidadNeta >= 4 
                ? 'bg-yellow-50 border-yellow-300' 
                : 'bg-red-50 border-red-300'
            }`}>
              <h4 className="font-bold text-lg mb-2">📊 Evaluación de la inversión</h4>
              {rentabilidadNeta >= 6 ? (
                <p className="text-green-800">
                  ✅ <strong>Excelente inversión.</strong> Rentabilidad neta superior al 6%, muy por encima
                  de la media del mercado inmobiliario español (3-4%).
                </p>
              ) : rentabilidadNeta >= 4 ? (
                <p className="text-yellow-800">
                  ⚠️ <strong>Inversión aceptable.</strong> Rentabilidad en la media del mercado.
                  Evalúa si compensa el riesgo y esfuerzo.
                </p>
              ) : (
                <p className="text-red-800">
                  ❌ <strong>Rentabilidad baja.</strong> Inferior a la media del mercado.
                  Considera si merece la pena o busca mejores oportunidades.
                </p>
              )}
            </div>

            <button className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2">
              <Download className="w-5 h-5" />
              Descargar Análisis Completo
            </button>
          </div>
        </div>

        {/* Proyección a 10 años */}
        <div className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-200">
          <h3 className="text-2xl font-bold text-indigo-900 mb-6">📅 Proyección a 10 años</h3>
          <ProyeccionAnual
            inversionInicial={inversionTotal}
            ingresoAnualNeto={ingresoAnualNeto}
            apreciacionAnual={2.5}
            valorInicial={valorMercado}
          />
        </div>
      </div>
    </div>
  );
}

// Calculadora de Financiación
function CalculadoraFinanciacion() {
  const [precioInmueble, setPrecioInmueble] = useState<number>(200000);
  const [aportacion, setAportacion] = useState<number>(60000);
  const [tipoInteres, setTipoInteres] = useState<number>(3.5);
  const [plazoAnos, setPlazoAnos] = useState<number>(25);

  const capitalPrestamo = precioInmueble - aportacion;
  const ltv = (capitalPrestamo / precioInmueble) * 100;
  const tipoMensual = tipoInteres / 100 / 12;
  const numeroPagos = plazoAnos * 12;
  
  const cuotaMensual = capitalPrestamo * (tipoMensual * Math.pow(1 + tipoMensual, numeroPagos)) / 
    (Math.pow(1 + tipoMensual, numeroPagos) - 1);
  
  const totalPagado = cuotaMensual * numeroPagos;
  const totalIntereses = totalPagado - capitalPrestamo;

  return (
    <div>
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-white/20 p-4 rounded-2xl">
            <PiggyBank className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Calculadora de Financiación</h2>
            <p className="text-purple-100">Simula tu hipoteca y calcula cuotas</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Datos del préstamo</h3>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Precio del inmueble (€)
              </label>
              <input
                type="number"
                value={precioInmueble}
                onChange={(e) => setPrecioInmueble(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg font-bold"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Tu aportación (€) - {((aportacion / precioInmueble) * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max={precioInmueble}
                step="5000"
                value={aportacion}
                onChange={(e) => setAportacion(Number(e.target.value))}
                className="w-full mb-2"
              />
              <input
                type="number"
                value={aportacion}
                onChange={(e) => setAportacion(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Mínimo recomendado: 30% ({formatCurrency(precioInmueble * 0.3)})
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Tipo de interés anual (%) - {tipoInteres}%
              </label>
              <input
                type="range"
                min="1"
                max="7"
                step="0.1"
                value={tipoInteres}
                onChange={(e) => setTipoInteres(Number(e.target.value))}
                className="w-full mb-2"
              />
              <input
                type="number"
                value={tipoInteres}
                onChange={(e) => setTipoInteres(Number(e.target.value))}
                step="0.1"
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Rango habitual actual: 3-5%
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Plazo (años) - {plazoAnos} años
              </label>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={plazoAnos}
                onChange={(e) => setPlazoAnos(Number(e.target.value))}
                className="w-full mb-2"
              />
              <select
                value={plazoAnos}
                onChange={(e) => setPlazoAnos(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {[10, 15, 20, 25, 30].map(anos => (
                  <option key={anos} value={anos}>{anos} años</option>
                ))}
              </select>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="text-sm text-amber-900">
                  <p className="font-bold mb-1">💡 Nota importante:</p>
                  <p>
                    No todos los bancos financian inmuebles de subasta. Los que sí lo hacen
                    suelen exigir mínimo 30-40% de entrada y el inmueble debe estar libre de cargas
                    y ocupantes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Resultados */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
              <h3 className="text-lg font-bold text-purple-900 mb-4">Resumen del préstamo</h3>
              
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4">
                  <p className="text-sm text-slate-600 mb-1">Capital a financiar</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {formatCurrency(capitalPrestamo)}
                  </p>
                  <p className="text-sm text-purple-600 mt-1">
                    LTV: {ltv.toFixed(1)}%
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 border-2 border-purple-300">
                  <p className="text-sm text-slate-600 mb-1">Cuota mensual</p>
                  <p className="text-4xl font-bold text-purple-900">
                    {formatCurrency(cuotaMensual)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Durante {plazoAnos} años ({numeroPagos} cuotas)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-xs text-slate-600 mb-1">Total a pagar</p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatCurrency(totalPagado)}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-xs text-slate-600 mb-1">Total intereses</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(totalIntereses)}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4">
                  <p className="text-sm text-slate-600 mb-2">Desglose del pago</p>
                  <div className="flex h-8 rounded-lg overflow-hidden">
                    <div 
                      className="bg-purple-600 flex items-center justify-center text-white text-xs font-bold"
                      style={{ width: `${(capitalPrestamo / totalPagado) * 100}%` }}
                    >
                      Capital
                    </div>
                    <div 
                      className="bg-red-500 flex items-center justify-center text-white text-xs font-bold"
                      style={{ width: `${(totalIntereses / totalPagado) * 100}%` }}
                    >
                      Intereses
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparativa de plazos */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-bold text-blue-900 mb-4">⚖️ Comparativa de plazos</h4>
              <div className="space-y-3">
                {[10, 15, 20, 25, 30].map(anos => {
                  const pagos = anos * 12;
                  const cuota = capitalPrestamo * (tipoMensual * Math.pow(1 + tipoMensual, pagos)) / 
                    (Math.pow(1 + tipoMensual, pagos) - 1);
                  const total = cuota * pagos;
                  const intereses = total - capitalPrestamo;
                  
                  return (
                    <div key={anos} className="bg-white rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-900">{anos} años</span>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{formatCurrency(cuota)}/mes</p>
                          <p className="text-xs text-slate-500">
                            Int: {formatCurrency(intereses)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition-all flex items-center justify-center gap-2">
              <Download className="w-5 h-5" />
              Descargar Simulación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Calculadora ROI
function CalculadoraROI() {
  const [inversionInicial, setInversionInicial] = useState<number>(220000);
  const [valorVenta, setValorVenta] = useState<number>(280000);
  const [gastosVenta, setGastosVenta] = useState<number>(5); // %
  const [anosMantenido, setAnosMantenido] = useState<number>(5);
  const [ingresoAnualRenta, setIngresoAnualRenta] = useState<number>(10800);

  const totalIngresoRentas = ingresoAnualRenta * anosMantenido;
  const gastosDeVenta = valorVenta * (gastosVenta / 100);
  const netoVenta = valorVenta - gastosDeVenta;
  const gananciaPorVenta = netoVenta - inversionInicial;
  const gananciaTotal = gananciaPorVenta + totalIngresoRentas;
  const roi = (gananciaTotal / inversionInicial) * 100;
  const roiAnualizado = roi / anosMantenido;
  const tir = Math.pow(1 + (gananciaTotal / inversionInicial), 1 / anosMantenido) - 1;

  return (
    <div>
      <div className="bg-gradient-to-r from-orange-600 to-red-600 p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-white/20 p-4 rounded-2xl">
            <BarChart3 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Calculadora ROI Total</h2>
            <p className="text-orange-100">Retorno total de la inversión a largo plazo</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Escenario de inversión</h3>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Inversión inicial total (€)
              </label>
              <input
                type="number"
                value={inversionInicial}
                onChange={(e) => setInversionInicial(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg font-bold"
              />
              <p className="text-xs text-slate-500 mt-1">Precio + gastos + reformas</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Años que mantendrás el inmueble
              </label>
              <select
                value={anosMantenido}
                onChange={(e) => setAnosMantenido(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {[1, 2, 3, 5, 7, 10, 15, 20].map(anos => (
                  <option key={anos} value={anos}>{anos} años</option>
                ))}
              </select>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-bold text-slate-900 mb-4">Ingresos por alquiler</h4>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Ingreso neto anual (€)
                </label>
                <input
                  type="number"
                  value={ingresoAnualRenta}
                  onChange={(e) => setIngresoAnualRenta(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-slate-500 mt-1">Después de gastos y vacancia</p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-bold text-slate-900 mb-4">Venta futura</h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Precio de venta estimado (€)
                  </label>
                  <input
                    type="number"
                    value={valorVenta}
                    onChange={(e) => setValorVenta(Number(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Gastos de venta (%) - {gastosVenta}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={gastosVenta}
                    onChange={(e) => setGastosVenta(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Agencia inmobiliaria, plusvalía municipal, etc.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Resultados */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-200">
              <h3 className="text-lg font-bold text-orange-900 mb-4">🎯 Retorno Total de Inversión</h3>
              
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-6 border-2 border-orange-300">
                  <p className="text-sm text-slate-600 mb-2">ROI Total</p>
                  <p className="text-5xl font-bold text-orange-900">
                    {roi.toFixed(1)}%
                  </p>
                  <p className="text-lg font-semibold text-orange-600 mt-2">
                    ROI Anualizado: {roiAnualizado.toFixed(2)}%
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4">
                  <p className="text-sm text-slate-600 mb-1">TIR (Tasa Interna de Retorno)</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {(tir * 100).toFixed(2)}%
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4">
                  <p className="text-sm text-slate-600 mb-1">Ganancia total</p>
                  <p className="text-3xl font-bold text-green-600">
                    +{formatCurrency(gananciaTotal)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3">
                    <p className="text-xs text-slate-600 mb-1">Por alquiler</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(totalIngresoRentas)}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-3">
                    <p className="text-xs text-slate-600 mb-1">Por venta</p>
                    <p className="text-lg font-bold text-purple-600">
                      {formatCurrency(gananciaPorVenta)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Desglose */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-4">📊 Desglose financiero</h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Inversión inicial</span>
                  <span className="font-bold text-red-600">-{formatCurrency(inversionInicial)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Rentas {anosMantenido} años</span>
                  <span className="font-bold text-green-600">+{formatCurrency(totalIngresoRentas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Venta futura</span>
                  <span className="font-bold text-blue-600">+{formatCurrency(valorVenta)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Gastos de venta</span>
                  <span className="font-bold text-red-600">-{formatCurrency(gastosDeVenta)}</span>
                </div>
                <div className="border-t border-slate-300 pt-3 flex justify-between">
                  <span className="font-bold text-slate-900">Beneficio neto</span>
                  <span className="font-bold text-green-600 text-lg">
                    +{formatCurrency(gananciaTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Evaluación */}
            <div className={`rounded-xl p-6 border-2 ${
              roi >= 100 
                ? 'bg-green-50 border-green-300' 
                : roi >= 50 
                ? 'bg-blue-50 border-blue-300' 
                : 'bg-yellow-50 border-yellow-300'
            }`}>
              <h4 className="font-bold text-lg mb-2">🏆 Evaluación</h4>
              {roi >= 100 ? (
                <p className="text-green-800">
                  <strong>¡Inversión excepcional!</strong> Más que duplicas tu inversión. 
                  ROI superior al 100% es extraordinario en inmuebles.
                </p>
              ) : roi >= 50 ? (
                <p className="text-blue-800">
                  <strong>Muy buena inversión.</strong> ROI muy por encima de la media.
                  Rentabilidad anualizada excelente.
                </p>
              ) : (
                <p className="text-yellow-800">
                  <strong>Inversión moderada.</strong> ROI aceptable pero evalúa si hay mejores
                  oportunidades o activos menos complejos.
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-900 font-semibold mb-2">💡 Comparativa con otras inversiones:</p>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="flex justify-between">
                  <span>Depósito bancario (1%)</span>
                  <span className="font-bold">{(anosMantenido * 1).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Bonos del Estado (3%)</span>
                  <span className="font-bold">{(anosMantenido * 3).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Bolsa (media 7%)</span>
                  <span className="font-bold">{(anosMantenido * 7).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between border-t border-blue-300 pt-1">
                  <span className="font-bold">Tu inversión</span>
                  <span className="font-bold text-blue-900">{roi.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <button className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-2">
              <Download className="w-5 h-5" />
              Generar Informe Completo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componentes auxiliares
function GastoLinea({ 
  concepto, 
  valor, 
  destacado = false, 
  color = 'slate',
  grande = false,
  tooltip 
}: { 
  concepto: string; 
  valor: number; 
  destacado?: boolean; 
  color?: string;
  grande?: boolean;
  tooltip?: string;
}) {
  return (
    <div className={`flex justify-between items-center ${destacado ? 'py-2' : ''}`}>
      <span className={`${
        destacado ? 'font-bold' : ''
      } ${
        grande ? 'text-lg' : 'text-sm'
      } text-slate-700`}>
        {concepto}
        {tooltip && (
          <span className="ml-2 text-xs text-slate-400">ℹ️</span>
        )}
      </span>
      <span className={`${
        destacado ? 'font-bold' : 'font-semibold'
      } ${
        grande ? 'text-2xl' : 'text-base'
      } ${
        color === 'blue' ? 'text-blue-600' :
        color === 'green' ? 'text-green-600' :
        color === 'orange' ? 'text-orange-600' :
        'text-slate-900'
      }`}>
        {formatCurrency(valor)}
      </span>
    </div>
  );
}

function ProyeccionAnual({ 
  inversionInicial, 
  ingresoAnualNeto, 
  apreciacionAnual, 
  valorInicial 
}: {
  inversionInicial: number;
  ingresoAnualNeto: number;
  apreciacionAnual: number;
  valorInicial: number;
}) {
  const anos = [1, 3, 5, 7, 10];
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-indigo-300">
            <th className="text-left py-3 px-4 text-indigo-900 font-bold">Año</th>
            <th className="text-right py-3 px-4 text-indigo-900 font-bold">Rentas Acum.</th>
            <th className="text-right py-3 px-4 text-indigo-900 font-bold">Valor Inmueble</th>
            <th className="text-right py-3 px-4 text-indigo-900 font-bold">Patrimonio Total</th>
            <th className="text-right py-3 px-4 text-indigo-900 font-bold">ROI</th>
          </tr>
        </thead>
        <tbody>
          {anos.map(ano => {
            const rentasAcumuladas = ingresoAnualNeto * ano;
            const valorInmueble = valorInicial * Math.pow(1 + apreciacionAnual / 100, ano);
            const patrimonioTotal = valorInmueble + rentasAcumuladas;
            const roi = ((patrimonioTotal - inversionInicial) / inversionInicial) * 100;
            
            return (
              <tr key={ano} className="border-b border-indigo-100 hover:bg-indigo-50">
                <td className="py-3 px-4 font-bold text-slate-900">{ano}</td>
                <td className="py-3 px-4 text-right font-semibold text-blue-600">
                  {formatCurrency(rentasAcumuladas)}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-green-600">
                  {formatCurrency(valorInmueble)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-indigo-900">
                  {formatCurrency(patrimonioTotal)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-purple-600">
                  {roi.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}