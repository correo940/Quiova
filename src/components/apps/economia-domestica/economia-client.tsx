'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Configuración de la categorización
const CATEGORIES: { [key: string]: string[] } = {
  'Supermercado': ['mercadona', 'carrefour', 'lidl', 'alcampo', 'dia', 'supermercado'],
  'Transporte': ['metro', 'bus', 'taxi', 'uber', 'cabify', 'gasolina', 'renfe'],
  'Restaurantes y Ocio': ['restaurante', 'bar', 'cafe', 'cine', 'teatro', 'concierto', 'glovo', 'just eat'],
  'Suscripciones': ['netflix', 'spotify', 'hbo', 'disney+', 'amazon prime', 'icloud'],
  'Compras': ['amazon', 'corte ingles', 'zara', 'h&m', 'fnac'],
  'Vivienda': ['alquiler', 'hipoteca', 'ikea'],
  'Facturas': ['luz', 'agua', 'gas', 'internet', 'movil', 'telefono'],
  'Salud': ['farmacia', 'medico', 'hospital'],
};

const getCategory = (description: string): string => {
    const desc = description.toLowerCase();
    for (const category in CATEGORIES) {
        if (CATEGORIES[category].some(keyword => desc.includes(keyword))) {
            return category;
        }
    }
    return 'Otros';
};

interface ProcessedTransaction {
  date: Date;
  description: string;
  amount: number;
  category: string;
}

interface RawTransaction { [key: string]: any; }


export default function EconomiaClient() {
  const [rawTransactions, setRawTransactions] = useState<RawTransaction[]>([]);
  const [processedTransactions, setProcessedTransactions] = useState<ProcessedTransaction[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({ date: '', description: '', amount: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setRawTransactions([]);
    setProcessedTransactions([]);
    setHeaders([]);
    setIsLoading(true);

    try {
        let json: RawTransaction[] = [];

        if (file.type.includes('pdf')) {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/parse-pdf', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Error en el servidor al procesar el PDF');
            }
            json = await response.json();

        } else {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            json = XLSX.utils.sheet_to_json(worksheet);
        }

        if (json.length === 0) {
            setError('El archivo está vacío o no se pudieron extraer datos.');
            return;
        }

        setHeaders(Object.keys(json[0]));
        setRawTransactions(json);
        // Auto-seleccionar columnas si los nombres coinciden con los detectados
        const firstRow = json[0];
        const autoColumnMapping: any = {};
        if (firstRow['Fecha (detectada)']) autoColumnMapping.date = 'Fecha (detectada)';
        if (firstRow['Descripción (detectada)']) autoColumnMapping.description = 'Descripción (detectada)';
        if (firstRow['Importe (detectado)']) autoColumnMapping.amount = 'Importe (detectado)';
        if(Object.keys(autoColumnMapping).length === 3) setColumnMapping(autoColumnMapping)

    } catch (err: any) {
        console.error(err);
        setError(err.message || 'No se pudo procesar el archivo.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleProcessClick = () => {
    if (!columnMapping.date || !columnMapping.description || !columnMapping.amount) {
        setError('Debes asignar una columna para Fecha, Descripción e Importe.');
        return;
    }
    setError(null);

    const processed = rawTransactions.map(raw => {
        const dateValue = raw[columnMapping.date];
        // Intentar parsear fechas en formato dd/mm/yyyy o similar
        let date;
        if (typeof dateValue === 'string' && dateValue.includes('/')) {
            const parts = dateValue.split('/');
            date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
            date = new Date(dateValue); // Comportamiento anterior para fechas de Excel
        }

        const amountStr = String(raw[columnMapping.amount]).replace(/,/g, '.').replace(/[^0-9.-]/g, '');
        const amount = parseFloat(amountStr);
        const description = raw[columnMapping.description];
        
        return {
            date: date,
            description: description,
            amount: amount,
            category: amount < 0 ? getCategory(description) : 'Ingreso',
        };
    }).filter(t => t.description && !isNaN(t.amount) && t.date instanceof Date && !isNaN(t.date.getTime()));
    
    setProcessedTransactions(processed);
  };

  const financialSummary = useMemo(() => {
    if (processedTransactions.length === 0) return null;
    const totalIncome = processedTransactions.reduce((acc, t) => t.amount > 0 ? acc + t.amount : acc, 0);
    const totalExpenses = processedTransactions.reduce((acc, t) => t.amount < 0 ? acc + t.amount : acc, 0);
    return {
        chartData: [{
            name: 'Resumen Financiero',
            ingresos: totalIncome,
            gastos: Math.abs(totalExpenses),
        }]
    }
  }, [processedTransactions]);

  const categorySummary = useMemo(() => {
    if (processedTransactions.length === 0) return null;
    const expensesByCategory = processedTransactions.filter(t => t.amount < 0).reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
        return acc;
    }, {} as { [key: string]: number });

    return Object.entries(expensesByCategory).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
  }, [processedTransactions]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4d', '#4ddbff', '#ffcce0'];

  return (
    <>
      <Card>
        <CardHeader>
            <CardTitle>Sube tu Extracto</CardTitle>
            <CardDescription>Sube un archivo (XLSX, CSV, PDF) para analizar tus finanzas.</CardDescription>
        </CardHeader>
        <CardContent>
            <div
                className="border-2 border-dashed border-muted-foreground rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => document.getElementById('file-upload')?.click()}
            >
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                 {isLoading ? <p className="mt-4 text-primary">Procesando PDF...</p> : <p className="mt-4 text-muted-foreground">Arrastra y suelta o haz clic para seleccionar.</p>}
                <input id="file-upload" type="file" className="hidden" onChange={(e) => e.target.files && handleFile(e.target.files[0])} accept=".xlsx,.csv,.pdf" />
            </div>
             {error && <p className="mt-4 text-center text-red-500">Error: {error}</p>}
        </CardContent>
      </Card>

      {rawTransactions.length > 0 && processedTransactions.length === 0 && (
         <Card className="mt-6">
            <CardHeader>
                <CardTitle>Asigna tus Columnas</CardTitle>
                <CardDescription>Revisa y asigna qué columna corresponde a cada campo para procesar los datos.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                    <Label>Columna de Fecha</Label>
                    <Select onValueChange={(value) => setColumnMapping(prev => ({...prev, date: value}))} value={columnMapping.date}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>Columna de Descripción</Label>
                     <Select onValueChange={(value) => setColumnMapping(prev => ({...prev, description: value}))} value={columnMapping.description}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>Columna de Importe</Label>
                     <Select onValueChange={(value) => setColumnMapping(prev => ({...prev, amount: value}))} value={columnMapping.amount}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="md:col-span-3 text-center">
                    <Button onClick={handleProcessClick}>Procesar Movimientos</Button>
                </div>
            </CardContent>
        </Card>
      )}

      {processedTransactions.length > 0 && financialSummary && (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Resumen Financiero</CardTitle>
                    </CardHeader>
                    <CardContent style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={financialSummary.chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value as number)} />
                                <Tooltip formatter={(value) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value as number)} />
                                <Legend />
                                <Bar dataKey="ingresos" fill="#16a34a" />
                                <Bar dataKey="gastos" fill="#dc2626" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {categorySummary && categorySummary.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Desglose de Gastos</CardTitle>
                        </Header>
                        <CardContent style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categorySummary} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8">
                                        {categorySummary.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value as number)} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Movimientos Procesados</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead className="text-right">Importe</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processedTransactions.map((t, i) => (
                                <TableRow key={i}>
                                    <TableCell>{t.date.toLocaleDateString('es-ES')}</TableCell>
                                    <TableCell>{t.description}</TableCell>
                                    <TableCell>{t.category}</TableCell>
                                    <TableCell className={`text-right font-medium ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {t.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
      )}
    </>
  );
}
