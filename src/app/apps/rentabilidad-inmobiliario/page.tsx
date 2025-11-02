'use client';

import React, { useState, useMemo } from 'react';
import { Calculator, Home, TrendingUp, Euro } from 'lucide-react';

export default function CalculadoraRentabilidad() {
  // Datos Iniciales
  const [capital, setCapital] = useState(0);
  const [plazo, setPlazo] = useState(0);
  const [tipoHipoteca, setTipoHipoteca] = useState('fijo');
  const [diferencial, setDiferencial] = useState(0);
  const [euribor, setEuribor] = useState(0);
  const [tipoVariable, setTipoVariable] = useState(0);
  const [tipoFijo, setTipoFijo] = useState(0);

  // Inputs - Compra
  const [precioTotal, setPrecioTotal] = useState(0);
  const [vivienda, setVivienda] = useState(0);
  const [compraventa, setCompraventa] = useState(0);
  const [itpValenciana, setItpValenciana] = useState(10);
  const [itpPagar, setItpPagar] = useState(0);
  const [notariaCompra, setNotariaCompra] = useState(0);
  const [notariaVenta, setNotariaVenta] = useState(0);
  const [reforma, setReforma] = useState(0);
  const [comisionAgencia, setComisionAgencia] = useState(0);

  // Gastos Hipoteca
  const [gestoria, setGestoria] = useState(0);
  const [tasacion, setTasacion] = useState(0);
  const [comisionApertura, setComisionApertura] = useState(0);

  // Alquiler
  const [rentaMensual, setRentaMensual] = useState(0);
  const [rentaAnual, setRentaAnual] = useState(0);

  // Estimación Gastos Anuales
  const [comunidadAnual, setComunidadAnual] = useState(0);
  const [mantenimiento, setMantenimiento] = useState(0);
  const [seguroHogar, setSeguroHogar] = useState(0);
  const [seguroVida, setSeguroVida] = useState(0);
  const [seguroImpago, setSeguroImpago] = useState(0);
  const [ibi, setIbi] = useState(0);
  const [interesesHipoteca, setInteresesHipoteca] = useState(0);
  const [periodosVacantes, setPeriodosVacantes] = useState(0);

  // Financiación
  const [porcFinanciado, setPorcFinanciado] = useState(0);
  const [prestamoHipotecario, setPrestamoHipotecario] = useState(0);
  const [capitalPropio, setCapitalPropio] = useState(0);
  const [cuotaAnual, setCuotaAnual] = useState(0);
  const [parteIntereses, setParteIntereses] = useState(0);
  const [parteDevolucion, setParteDevolucion] = useState(0);

  // Beneficio
  const [salarioBruto, setSalarioBruto] = useState(12450);
  const [tramoIRPF, setTramoIRPF] = useState(24);
  const [amortizacionAnual, setAmortizacionAnual] = useState(0);
  const [impuestosAprox, setImpuestosAprox] = useState(0);

  // Cálculos automáticos
  const totalGastosHipoteca = useMemo(() => {
    return gestoria + tasacion + comisionApertura;
  }, [gestoria, tasacion, comisionApertura]);

  const totalGastosAnuales = useMemo(() => {
    return comunidadAnual + mantenimiento + seguroHogar + seguroVida + 
           seguroImpago + ibi + interesesHipoteca + periodosVacantes;
  }, [comunidadAnual, mantenimiento, seguroHogar, seguroVida, seguroImpago, 
      ibi, interesesHipoteca, periodosVacantes]);

  const beneficioAntesImpuestos = useMemo(() => {
    return rentaAnual - totalGastosAnuales;
  }, [rentaAnual, totalGastosAnuales]);

  const beneficioDespuesImpuestos = useMemo(() => {
    return beneficioAntesImpuestos - impuestosAprox;
  }, [beneficioAntesImpuestos, impuestosAprox]);

  const rentabilidadBruta = useMemo(() => {
    if (precioTotal === 0) return 0;
    return (rentaAnual / precioTotal) * 100;
  }, [rentaAnual, precioTotal]);

  const rentabilidadNeta = useMemo(() => {
    if (precioTotal === 0) return 0;
    return ((rentaAnual - totalGastosAnuales) / precioTotal) * 100;
  }, [rentaAnual, totalGastosAnuales, precioTotal]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-l-4 border-blue-600">
          <div className="flex items-center gap-3">
            <Calculator className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Calculadora de Rentabilidad Inmobiliaria</h1>
              <p className="text-gray-600 text-sm">Libertad Inmobiliaria v3</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel Izquierdo - Datos Iniciales */}
          <div className="space-y-6">
            {/* Datos de la Hipoteca */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5" />
                Datos de la Hipoteca
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capital</label>
                  <input
                    type="number"
                    value={capital}
                    onChange={(e) => setCapital(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plazo (años) - máximo 40</label>
                  <input
                    type="number"
                    value={plazo}
                    onChange={(e) => setPlazo(Math.min(40, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    max="40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo hipoteca</label>
                  <select
                    value={tipoHipoteca}
                    onChange={(e) => setTipoHipoteca(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fijo">Fijo</option>
                    <option value="variable">Variable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diferencial (para variable) %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={diferencial}
                    onChange={(e) => setDiferencial(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Euribor (para variable) %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={euribor}
                    onChange={(e) => setEuribor(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo variable %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tipoVariable}
                    onChange={(e) => setTipoVariable(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo fijo %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tipoFijo}
                    onChange={(e) => setTipoFijo(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Gastos de Compra */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-blue-700 mb-4">Gastos de Compra</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio entrada total</label>
                  <input
                    type="number"
                    value={precioTotal}
                    onChange={(e) => setPrecioTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vivienda</label>
                  <input
                    type="number"
                    value={vivienda}
                    onChange={(e) => setVivienda(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compraventa</label>
                  <input
                    type="number"
                    value={compraventa}
                    onChange={(e) => setCompraventa(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ITP Valenciana %</label>
                  <input
                    type="number"
                    value={itpValenciana}
                    onChange={(e) => setItpValenciana(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ITP a pagar</label>
                  <input
                    type="number"
                    value={itpPagar}
                    onChange={(e) => setItpPagar(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notaría (compraventa)</label>
                  <input
                    type="number"
                    value={notariaCompra}
                    onChange={(e) => setNotariaCompra(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notaría (hipoteca)</label>
                  <input
                    type="number"
                    value={notariaVenta}
                    onChange={(e) => setNotariaVenta(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reforma</label>
                  <input
                    type="number"
                    value={reforma}
                    onChange={(e) => setReforma(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comisión Agencia</label>
                  <input
                    type="number"
                    value={comisionAgencia}
                    onChange={(e) => setComisionAgencia(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0 €"
                  />
                </div>
              </div>
            </div>

            {/* Gastos Hipoteca */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-blue-700 mb-4">Gastos Hipoteca</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gestoría</label>
                  <input
                    type="number"
                    value={gestoria}
                    onChange={(e) => setGestoria(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tasación</label>
                  <input
                    type="number"
                    value={tasacion}
                    onChange={(e) => setTasacion(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comisión de apertura</label>
                  <input
                    type="number"
                    value={comisionApertura}
                    onChange={(e) => setComisionApertura(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0 €"
                  />
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total:</span>
                    <span className="text-lg font-bold text-blue-600">{totalGastosHipoteca.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Derecho - Análisis */}
          <div className="space-y-6">
            {/* Alquiler */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
                <Euro className="w-5 h-5" />
                Alquiler
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Renta mensual</label>
                  <input
                    type="number"
                    value={rentaMensual}
                    onChange={(e) => {
                      const valor = Number(e.target.value);
                      setRentaMensual(valor);
                      setRentaAnual(valor * 12);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="0 €/mes"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Renta Anual</label>
                  <input
                    type="number"
                    value={rentaAnual}
                    onChange={(e) => setRentaAnual(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-green-50"
                    placeholder="0 €"
                  />
                </div>
              </div>
            </div>

            {/* Estimación Gastos Anuales */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-orange-700 mb-4">Estimación Gastos Anuales</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comunidad año</label>
                  <input
                    type="number"
                    value={comunidadAnual}
                    onChange={(e) => setComunidadAnual(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mantenimiento</label>
                  <input
                    type="number"
                    value={mantenimiento}
                    onChange={(e) => setMantenimiento(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seguro Hogar</label>
                  <input
                    type="number"
                    value={seguroHogar}
                    onChange={(e) => setSeguroHogar(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seguro Vida Hipoteca</label>
                  <input
                    type="number"
                    value={seguroVida}
                    onChange={(e) => setSeguroVida(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seguro Impago</label>
                  <input
                    type="number"
                    value={seguroImpago}
                    onChange={(e) => setSeguroImpago(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IBI</label>
                  <input
                    type="number"
                    value={ibi}
                    onChange={(e) => setIbi(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Intereses hipoteca (deducibles)</label>
                  <input
                    type="number"
                    value={interesesHipoteca}
                    onChange={(e) => setInteresesHipoteca(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Periodos Vacantes</label>
                  <input
                    type="number"
                    value={periodosVacantes}
                    onChange={(e) => setPeriodosVacantes(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="0 €"
                  />
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total:</span>
                    <span className="text-lg font-bold text-orange-600">{totalGastosAnuales.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financiación */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-purple-700 mb-4">Financiación</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">% financiado s/compra</label>
                  <input
                    type="number"
                    value={porcFinanciado}
                    onChange={(e) => setPorcFinanciado(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="0%"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Préstamo hipotecario</label>
                  <input
                    type="number"
                    value={prestamoHipotecario}
                    onChange={(e) => setPrestamoHipotecario(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capital propio</label>
                  <input
                    type="number"
                    value={capitalPropio}
                    onChange={(e) => setCapitalPropio(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cuota anual</label>
                  <input
                    type="number"
                    value={cuotaAnual}
                    onChange={(e) => setCuotaAnual(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-purple-50"
                    placeholder="Indicar si no se rellena hipoteca"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parte Intereses</label>
                  <input
                    type="number"
                    value={parteIntereses}
                    onChange={(e) => setParteIntereses(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parte Devolución</label>
                  <input
                    type="number"
                    value={parteDevolucion}
                    onChange={(e) => setParteDevolucion(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="0 €"
                  />
                </div>
              </div>
            </div>

            {/* Beneficio e Impuestos */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-indigo-700 mb-4">Beneficio (antes de impuestos)</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salario Bruto Anual</label>
                  <input
                    type="number"
                    value={salarioBruto}
                    onChange={(e) => setSalarioBruto(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-indigo-50"
                    placeholder="12450 - 20200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tramo IRPF %</label>
                  <input
                    type="number"
                    value={tramoIRPF}
                    onChange={(e) => setTramoIRPF(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="24"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amortización anual</label>
                  <input
                    type="number"
                    value={amortizacionAnual}
                    onChange={(e) => setAmortizacionAnual(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0 €"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Impuestos (Aprox)</label>
                  <input
                    type="number"
                    value={impuestosAprox}
                    onChange={(e) => setImpuestosAprox(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0 €"
                  />
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-700">Beneficio antes impuestos:</span>
                    <span className="text-lg font-bold text-indigo-600">{beneficioAntesImpuestos.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Beneficio después impuestos:</span>
                    <span className="text-lg font-bold text-green-600">{beneficioDespuesImpuestos.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rentabilidades y Ratios */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Rentabilidades y Ratios
              </h2>
              <div className="space-y-4">
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-sm opacity-90 mb-1">Rentabilidad Bruta</div>
                  <div className="text-3xl font-bold">{rentabilidadBruta.toFixed(2)}%</div>
                </div>
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-sm opacity-90 mb-1">Rentabilidad Neta</div>
                  <div className="text-3xl font-bold">{rentabilidadNeta.toFixed(2)}%</div>
                </div>
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-sm opacity-90 mb-1">Ingresos Anuales</div>
                  <div className="text-2xl font-bold">{rentaAnual.toFixed(2)} €</div>
                </div>
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-sm opacity-90 mb-1">Gastos Anuales</div>
                  <div className="text-2xl font-bold">{totalGastosAnuales.toFixed(2)} €</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-4 text-center text-gray-600 text-sm">
          <p>© Juan Francisco Arevalo Tabasco - Todos los derechos reservados</p>
          <p className="text-xs mt-1">Calculadora de Rentabilidad Inmobiliaria - Libertad Inmobiliaria v3</p>
        </div>
      </div>
    </div>
  );
}