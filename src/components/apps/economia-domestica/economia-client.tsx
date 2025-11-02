'use client';

import React, { useState } from 'react';

interface FreedomResult {
    yearsToFreedom: number;
    savingsNeeded: number;
    monthlyInvestment: number;
    freedomAge: number;
    currentSavingsRate: number;
    investmentReturns: number;
    milestones: { year: number; savings: number; age: number }[];
    recommendations: string[];
    scenarios: {
        current: { years: number; age: number };
        optimistic: { years: number; age: number; change: string };
        aggressive: { years: number; age: number; change: string };
    };
}

const Card = ({ children, className = '' }: any) => <div className={`bg-white border rounded-xl shadow-sm ${className}`}>{children}</div>;
const CardHeader = ({ children }: any) => <div className="p-6 border-b">{children}</div>;
const CardTitle = ({ children }: any) => <h3 className="text-2xl font-bold text-gray-800">{children}</h3>;
const CardDescription = ({ children }: any) => <p className="text-sm text-gray-500 mt-1">{children}</p>;
const CardContent = ({ children }: any) => <div className="p-6">{children}</div>;
const Input = ({ label, ...props }: any) => (
    <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" {...props} />
    </div>
);
const Button = ({ children, onClick, disabled = false }: any) => (
    <button onClick={onClick} disabled={disabled} className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all">
        {children}
    </button>
);

const calculateFreedom = (monthlyIncome: number, monthlyExpenses: number, currentSavings: number, currentAge: number, investmentReturn: number = 7): FreedomResult => {
    const monthlySavings = monthlyIncome - monthlyExpenses;
    const savingsRate = (monthlySavings / monthlyIncome) * 100;
    const annualExpenses = monthlyExpenses * 12;
    const savingsNeeded = annualExpenses * 25;
    const monthlyReturnRate = investmentReturn / 100 / 12;
    let totalSavings = currentSavings;
    let months = 0;
    const maxMonths = 50 * 12;
    const milestones: { year: number; savings: number; age: number }[] = [];
    while (totalSavings < savingsNeeded && months < maxMonths) {
        totalSavings = totalSavings * (1 + monthlyReturnRate) + monthlySavings;
        months++;
        if (months % 12 === 0) {
            const year = months / 12;
            if (year % 5 === 0 || year === 1) milestones.push({ year, savings: Math.round(totalSavings), age: currentAge + year });
        }
    }
    const yearsToFreedom = months / 12;
    const freedomAge = currentAge + yearsToFreedom;
    const recommendations: string[] = [];
    if (savingsRate < 10) recommendations.push('Tu tasa de ahorro es muy baja. Intenta reducir gastos.');
    else if (savingsRate < 20) recommendations.push('Tasa aceptable. Aumentar al 30% aceleraria tu libertad.');
    else if (savingsRate >= 50) recommendations.push('Excelente! Alcanzaras la libertad financiera rapidamente.');
    if (yearsToFreedom > 30) recommendations.push('Considera aumentar ingresos con side hustles.');
    if (currentSavings < annualExpenses * 3) recommendations.push('Prioriza crear un fondo de emergencia.');
    const calculateScenario = (savings: number) => {
        let total = currentSavings;
        let m = 0;
        while (total < savingsNeeded && m < maxMonths) {
            total = total * (1 + monthlyReturnRate) + savings;
            m++;
        }
        return { years: m / 12, age: currentAge + m / 12 };
    };
    return {
        yearsToFreedom: Math.round(yearsToFreedom * 10) / 10,
        savingsNeeded: Math.round(savingsNeeded),
        monthlyInvestment: monthlySavings,
        freedomAge: Math.round(freedomAge),
        currentSavingsRate: Math.round(savingsRate * 10) / 10,
        investmentReturns: Math.round((totalSavings - currentSavings - (monthlySavings * months))),
        milestones,
        recommendations,
        scenarios: {
            current: { years: Math.round(yearsToFreedom * 10) / 10, age: Math.round(freedomAge) },
            optimistic: { ...calculateScenario(monthlySavings * 1.2), change: 'Ahorrando 20% mas' },
            aggressive: { ...calculateScenario(monthlySavings * 1.5), change: 'Ahorrando 50% mas' }
        }
    };
};

export default function LibertadFinanciera() {
    const [monthlyIncome, setMonthlyIncome] = useState<string>('');
    const [monthlyExpenses, setMonthlyExpenses] = useState<string>('');
    const [currentSavings, setCurrentSavings] = useState<string>('');
    const [currentAge, setCurrentAge] = useState<string>('');
    const [result, setResult] = useState<FreedomResult | null>(null);

    const handleCalculate = () => {
        const income = parseFloat(monthlyIncome);
        const expenses = parseFloat(monthlyExpenses);
        const savings = parseFloat(currentSavings) || 0;
        const age = parseInt(currentAge);
        if (!income || !expenses || !age || income <= 0 || expenses <= 0 || age <= 0) {
            alert('Completa todos los campos con valores validos');
            return;
        }
        if (expenses >= income) {
            alert('Tus gastos deben ser menores que tus ingresos');
            return;
        }
        setResult(calculateFreedom(income, expenses, savings, age));
    };

    const resetForm = () => {
        setMonthlyIncome('');
        setMonthlyExpenses('');
        setCurrentSavings('');
        setCurrentAge('');
        setResult(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                        Calculadora de Libertad Financiera
                    </h1>
                    <p className="text-xl text-gray-600">Descubre cuantos años te faltan para no trabajar</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tus Datos Financieros</CardTitle>
                            <CardDescription>Completa la informacion para calcular</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Input label="Ingresos Mensuales Netos" type="number" placeholder="Ej: 2000" value={monthlyIncome} onChange={(e: any) => setMonthlyIncome(e.target.value)} />
                            <Input label="Gastos Mensuales Totales" type="number" placeholder="Ej: 1500" value={monthlyExpenses} onChange={(e: any) => setMonthlyExpenses(e.target.value)} />
                            <Input label="Ahorros Actuales" type="number" placeholder="Ej: 10000 (opcional)" value={currentSavings} onChange={(e: any) => setCurrentSavings(e.target.value)} />
                            <Input label="Edad Actual" type="number" placeholder="Ej: 30" value={currentAge} onChange={(e: any) => setCurrentAge(e.target.value)} />
                            <Button onClick={handleCalculate}>Calcular Mi Libertad Financiera</Button>
                            {result && <button onClick={resetForm} className="w-full mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline">Calcular de nuevo</button>}
                        </CardContent>
                    </Card>
                                        {result ? (
                        <div className="space-y-6">
                            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                                <CardContent className="text-center py-8">
                                    <div className="text-6xl mb-4">🎯</div>
                                    <h3 className="text-3xl font-bold text-gray-800 mb-2">{result.yearsToFreedom} años</h3>
                                    <p className="text-gray-600 text-lg">Te faltan para alcanzar la libertad financiera</p>
                                    <div className="mt-6 p-4 bg-white rounded-lg">
                                        <p className="text-sm text-gray-500">Seras libre a los</p>
                                        <p className="text-4xl font-bold text-green-600">{result.freedomAge} años</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Detalles</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                            <span className="text-gray-700">Dinero necesario:</span>
                                            <span className="font-bold text-blue-600">{result.savingsNeeded.toLocaleString()} EUR</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                                            <span className="text-gray-700">Ahorro mensual:</span>
                                            <span className="font-bold text-purple-600">{result.monthlyInvestment.toLocaleString()} EUR</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                            <span className="text-gray-700">Tasa de ahorro:</span>
                                            <span className="font-bold text-green-600">{result.currentSavingsRate}%</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                                            <span className="text-gray-700">Ganancias por inversion:</span>
                                            <span className="font-bold text-yellow-600">{result.investmentReturns.toLocaleString()} EUR</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Escenarios Alternativos</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="p-4 border-l-4 border-blue-500 bg-blue-50 rounded">
                                            <p className="text-sm text-gray-600">Escenario actual</p>
                                            <p className="text-2xl font-bold text-blue-600">{result.scenarios.current.years} años ({result.scenarios.current.age} años de edad)</p>
                                        </div>
                                        <div className="p-4 border-l-4 border-green-500 bg-green-50 rounded">
                                            <p className="text-sm text-gray-600">{result.scenarios.optimistic.change}</p>
                                            <p className="text-2xl font-bold text-green-600">{result.scenarios.optimistic.years.toFixed(1)} años ({Math.round(result.scenarios.optimistic.age)} años)</p>
                                            <p className="text-xs text-green-700 mt-1">{(result.scenarios.current.years - result.scenarios.optimistic.years).toFixed(1)} años antes</p>
                                        </div>
                                        <div className="p-4 border-l-4 border-purple-500 bg-purple-50 rounded">
                                            <p className="text-sm text-gray-600">{result.scenarios.aggressive.change}</p>
                                            <p className="text-2xl font-bold text-purple-600">{result.scenarios.aggressive.years.toFixed(1)} años ({Math.round(result.scenarios.aggressive.age)} años)</p>
                                            <p className="text-xs text-purple-700 mt-1">{(result.scenarios.current.years - result.scenarios.aggressive.years).toFixed(1)} años antes</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Hitos del Camino</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {result.milestones.map((milestone, idx) => (
                                            <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg">
                                                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                                    {milestone.year}
                                                </div>
                                                <div className="ml-4 flex-1">
                                                    <p className="text-sm text-gray-500">A los {milestone.age} años</p>
                                                    <p className="text-lg font-semibold text-gray-800">{milestone.savings.toLocaleString()} EUR</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(milestone.savings / result.savingsNeeded) * 100}%` }}></div>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">{Math.round((milestone.savings / result.savingsNeeded) * 100)}%</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
                                <CardHeader><CardTitle>Recomendaciones</CardTitle></CardHeader>
                                <CardContent>
                                    <ul className="space-y-3">
                                        {result.recommendations.map((rec, idx) => (
                                            <li key={idx} className="flex items-start p-3 bg-white rounded-lg">
                                                <span className="text-2xl mr-3">💡</span>
                                                <p className="text-gray-700">{rec}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center p-12 bg-white rounded-2xl shadow-lg">
                                <div className="text-6xl mb-4">📊</div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Completa tus datos</h3>
                                <p className="text-gray-600">Rellena el formulario para descubrir tu camino hacia la libertad financiera</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}