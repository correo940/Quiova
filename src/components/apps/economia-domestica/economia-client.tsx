import React, { useState, useMemo } from 'react';
import { Upload, TrendingUp, TrendingDown, Wallet, Circle } from 'lucide-react';
import * as XLSX from 'xlsx';

const CATEGORIES = {
    'Supermercado': ['mercadona', 'carrefour', 'lidl', 'alcampo', 'dia', 'supermercado', 'aldi'],
    'Transporte': ['metro', 'bus', 'taxi', 'uber', 'cabify', 'gasolina', 'renfe', 'gasolinera', 'parking'],
    'Restaurantes': ['restaurante', 'bar', 'cafe', 'mcdonald', 'burger', 'pizza', 'glovo', 'just eat', 'uber eats'],
    'Suscripciones': ['netflix', 'spotify', 'hbo', 'disney', 'amazon prime', 'icloud', 'youtube'],
    'Compras': ['amazon', 'corte ingles', 'zara', 'h&m', 'fnac', 'media markt', 'decathlon'],
    'Vivienda': ['alquiler', 'hipoteca', 'ikea', 'leroy'],
    'Servicios': ['luz', 'agua', 'gas', 'internet', 'movil', 'telefono', 'seguro'],
    'Salud': ['farmacia', 'medico', 'hospital', 'dentista'],
    'Ocio': ['cine', 'teatro', 'concierto', 'gimnasio', 'deporte']
};

const getCategory = (description) => {
    const desc = String(description || '').toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORIES)) {
        if (keywords.some(keyword => desc.includes(keyword))) return category;
    }
    return 'Otros';
};

const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const stringDate = String(dateStr);
    if (/^\d{5}$/.test(stringDate)) return new Date(1900, 0, parseInt(stringDate) - 1);
    const parts = stringDate.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (parts) {
        const day = parseInt(parts[1]), month = parseInt(parts[2]) - 1;
        let year = parseInt(parts[3]);
        if (year < 100) year += 2000;
        return new Date(year, month, day);
    }
    const date = new Date(stringDate);
    return isNaN(date.getTime()) ? null : date;
};

const parseAmount = (amountStr) => {
    if (amountStr === null || amountStr === undefined || amountStr === '') return null;
    if (typeof amountStr === 'number') return amountStr;
    const cleaned = String(amountStr).replace(/\s*EUR/i, '').replace(/[.](?=.*\.)/g, '').replace(',', '.').trim();
    const value = parseFloat(cleaned);
    return isNaN(value) ? null : value;
};

const detectColumnsIntelligently = (headers, data) => {
    const sample = data.slice(0, 10);
    let scores = headers.map(h => ({ name: h, date: 0, amount: 0, description: 0, isDebit: false, isCredit: false }));

    const looksLikeDate = s => parseDate(s) instanceof Date;
    const looksLikeAmount = s => parseAmount(s) !== null;

    for (const h of scores) {
        const headerName = h.name.toLowerCase();
        if (['fecha', 'date'].some(p => headerName.includes(p))) h.date += 30;
        if (['descripción', 'concepto', 'detalle'].some(p => headerName.includes(p))) h.description += 30;
        if (['importe', 'monto', 'cantidad', 'saldo', 'eur'].some(p => headerName.includes(p))) h.amount += 15;
        if (['debe', 'cargo', 'gasto'].some(p => headerName.includes(p))) h.isDebit = true;
        if (['haber', 'abono', 'ingreso'].some(p => headerName.includes(p))) h.isCredit = true;

        for (const row of sample) {
            const value = row[h.name];
            if (value) {
                if (looksLikeDate(value)) h.date += 10;
                if (looksLikeAmount(value)) h.amount += 10;
                if (typeof value === 'string' && value.length > 20) h.description += 5;
            }
        }
    }

    const sortedBy = (prop) => [...scores].sort((a, b) => b[prop] - a[prop]);
    const dateCol = sortedBy('date')[0].name;
    const descCol = sortedBy('description')[0].name;

    const amountCols = sortedBy('amount').filter(c => c.amount > 10 && c.name !== dateCol && c.name !== descCol);

    if (amountCols.length >= 2) {
        let debitCol = amountCols.find(c => c.isDebit);
        let creditCol = amountCols.find(c => c.isCredit);
        if (debitCol && creditCol) return { dateCol, descCol, debitCol: debitCol.name, creditCol: creditCol.name };

        const [col1, col2] = amountCols;
        const sum1 = data.reduce((acc, row) => acc + (parseAmount(row[col1.name]) || 0), 0);
        const sum2 = data.reduce((acc, row) => acc + (parseAmount(row[col2.name]) || 0), 0);
        return sum1 < sum2 ? { dateCol, descCol, debitCol: col1.name, creditCol: col2.name } : { dateCol, descCol, debitCol: col2.name, creditCol: col1.name };
    }

    const amountCol = amountCols.length > 0 ? amountCols[0].name : null;
    return { dateCol, descCol, amountCol };
};

export default function EconomiaDomestica() {
    const [transactions, setTransactions] = useState([]);
    const [error, setError] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState('all');

    const processData = (headers, data) => {
        const { dateCol, descCol, amountCol, debitCol, creditCol } = detectColumnsIntelligently(headers, data);
        
        if (!dateCol || !descCol || (!amountCol && (!debitCol || !creditCol))) {
            setError('No se pudieron detectar las columnas de Fecha, Descripción e Importe. Revisa tu archivo.');
            setTransactions([]);
            return;
        }

        const processed = data.map(row => {
            const date = parseDate(row[dateCol]);
            const description = row[descCol] || 'Sin descripción';
            let amount;

            if (amountCol) {
                amount = parseAmount(row[amountCol]);
            } else {
                const credit = parseAmount(row[creditCol]);
                const debit = parseAmount(row[debitCol]);
                if (credit !== null && credit !== 0) amount = credit;
                else if (debit !== null && debit !== 0) amount = -Math.abs(debit);
                else amount = 0;
            }
            
            if (date === null || amount === null || amount === 0) return null;

            return {
                date,
                description,
                amount,
                category: amount < 0 ? getCategory(description) : 'Ingreso',
                month: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : null
            };
        }).filter(Boolean);

        if(processed.length === 0) {
            setError('No se encontraron transacciones válidas en el archivo. Revisa el contenido.');
        } else {
            setError(null);
        }
        setTransactions(processed);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(null);
        setTransactions([]);

        const reader = new FileReader();
        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        const processContent = (content) => {
            try {
                let headers, data;
                if (['csv', 'txt'].includes(fileExtension)) {
                    const lines = content.trim().split(/\r\n|\n/);
                    const separator = lines[0].includes(';') ? ';' : ',';
                    headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
                    data = lines.slice(1).map(line => {
                        const values = line.split(separator);
                        return headers.reduce((obj, h, i) => (obj[h] = values[i]?.trim().replace(/^"|"$/g, '') || '', obj), {});
                    });
                } else if (['xls', 'xlsx'].includes(fileExtension)) {
                    const workbook = XLSX.read(content, { type: 'array', cellDates: true, dateNF: 'dd/mm/yyyy' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    data = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
                    headers = data.length > 0 ? Object.keys(data[0]) : [];
                }

                if (headers && data.length > 0) processData(headers, data);
                else setError('El archivo está vacío o no tiene un formato válido.');

            } catch (err) {
                console.error(err);
                setError('Error fatal al procesar el archivo.');
            }
        };

        if (['csv', 'txt'].includes(fileExtension)) {
            reader.onload = (event) => processContent(event.target.result);
            reader.readAsText(file, 'ISO-8859-1');
        } else if (['xls', 'xlsx'].includes(fileExtension)) {
            reader.onload = (event) => processContent(event.target.result);
            reader.readAsArrayBuffer(file);
        } else {
            setError('Formato no soportado. Sube un CSV, TXT, XLS o XLSX.');
        }
    };

    const filteredTransactions = useMemo(() => {
        if (selectedMonth === 'all') return transactions;
        return transactions.filter(t => t.month === selectedMonth);
    }, [transactions, selectedMonth]);

    const summary = useMemo(() => {
        const income = filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const expenses = Math.abs(filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
        const balance = income - expenses;
        return { income, expenses, balance };
    }, [filteredTransactions]);

    const categoryData = useMemo(() => {
        const byCategory = {};
        filteredTransactions.filter(t => t.amount < 0).forEach(t => {
            byCategory[t.category] = (byCategory[t.category] || 0) + Math.abs(t.amount);
        });
        return Object.entries(byCategory)
            .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
            .sort((a, b) => b.value - a.value);
    }, [filteredTransactions]);

    const months = useMemo(() => {
        const uniqueMonths = [...new Set(transactions.map(t => t.month).filter(Boolean))];
        return uniqueMonths.sort().reverse();
    }, [transactions]);

    const formatCurrency = (amount) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">💰 Economía Doméstica</h1>
                    <p className="text-gray-600">Analiza tus finanzas de forma visual e interactiva</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Sube tu extracto bancario</h2>
                        <p className="text-gray-600 mb-6">Detección automática de columnas</p>
                        <label className="block cursor-pointer">
                            <div className="border-3 border-dashed border-blue-300 rounded-xl p-12 hover:border-blue-500 hover:bg-blue-50 transition-all">
                                <Upload className="mx-auto h-16 w-16 text-blue-500 mb-4" />
                                <p className="text-lg font-medium text-gray-700">Arrastra tu archivo o haz clic aquí</p>
                                <p className="text-sm text-gray-500 mt-2">Sube un archivo CSV, XLS o XLSX</p>
                            </div>
                            <input type="file" className="hidden" accept=".csv,.txt,.xls,.xlsx" onChange={handleFileUpload} />
                        </label>
                        {error && <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-600">{error}</p></div>}
                    </div>
                </div>

                {transactions.length > 0 && (
                    <>
                        {months.length > 1 && (
                            <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por mes:</label>
                                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="all">Todos los meses</option>
                                    {months.map(month => <option key={month} value={month}>{new Date(month + '-01T12:00:00Z').toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white"><div className="flex items-center justify-between mb-2"><h3 className="text-lg font-medium opacity-90">Ingresos</h3><TrendingUp className="h-8 w-8 opacity-80" /></div><p className="text-3xl font-bold">{formatCurrency(summary.income)}</p></div>
                            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-xl p-6 text-white"><div className="flex items-center justify-between mb-2"><h3 className="text-lg font-medium opacity-90">Gastos</h3><TrendingDown className="h-8 w-8 opacity-80" /></div><p className="text-3xl font-bold">{formatCurrency(summary.expenses)}</p></div>
                            <div className={`bg-gradient-to-br ${summary.balance >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} rounded-2xl shadow-xl p-6 text-white`}><div className="flex items-center justify-between mb-2"><h3 className="text-lg font-medium opacity-90">Balance</h3><Wallet className="h-8 w-8 opacity-80" /></div><p className="text-3xl font-bold">{formatCurrency(summary.balance)}</p></div>
                        </div>

                        {categoryData.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                                <div className="flex items-center mb-6"><Circle className="h-6 w-6 text-blue-600 mr-2" /><h2 className="text-2xl font-semibold">Gastos por Categoría</h2></div>
                                <div className="space-y-4">
                                    {categoryData.map((cat, idx) => {
                                        const percentage = summary.expenses > 0 ? (cat.value / summary.expenses * 100).toFixed(1) : 0;
                                        return (
                                            <div key={cat.name} className="group hover:scale-[1.02] transition-transform">
                                                <div className="flex justify-between items-center mb-2"><span className="font-medium text-gray-700">{cat.name}</span><span className="text-gray-600">{formatCurrency(cat.value)} ({percentage}%)</span></div>
                                                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl shadow-xl p-8">
                            <h2 className="text-2xl font-semibold mb-6">Movimientos ({filteredTransactions.length})</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2 border-gray-200"><th className="text-left p-3 font-semibold text-gray-700">Fecha</th><th className="text-left p-3 font-semibold text-gray-700">Descripción</th><th className="text-left p-3 font-semibold text-gray-700">Categoría</th><th className="text-right p-3 font-semibold text-gray-700">Importe</th></tr>
                                    </thead>
                                    <tbody>
                                        {filteredTransactions.sort((a, b) => b.date - a.date).map((t, idx) => (
                                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="p-3 text-gray-600">{t.date.toLocaleDateString('es-ES', {timeZone: 'UTC'})}</td>
                                                <td className="p-3 text-gray-800">{t.description}</td>
                                                <td className="p-3"><span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">{t.category}</span></td>
                                                <td className={`p-3 text-right font-semibold ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}