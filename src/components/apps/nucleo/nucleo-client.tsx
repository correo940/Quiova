'use client';

import React, { useState } from 'react';

interface TurnoDetectado {
    fecha: string;
    textoCompleto: string;
    lineas: string[];
}

const OCR_API_KEY = "K86077493988957";

const Card = ({ children, className = '' }: any) => <div className={`bg-white border border-gray-200 rounded-2xl shadow-lg ${className}`}>{children}</div>;
const CardHeader = ({ children, className = '' }: any) => <div className={`p-6 border-b border-gray-100 ${className}`}>{children}</div>;
const CardTitle = ({ children, className = '' }: any) => <h3 className={`text-2xl font-bold text-gray-900 ${className}`}>{children}</h3>;
const CardContent = ({ children, className = '' }: any) => <div className={`p-6 ${className}`}>{children}</div>;

const Button = ({ children, onClick, disabled = false, className = '', variant = 'primary' }: any) => {
    const variants = {
        primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md',
        secondary: 'bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700',
        success: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
    };
    return (
        <button onClick={onClick} disabled={disabled} className={`px-6 py-3 font-semibold rounded-xl transition-all disabled:opacity-50 ${variants[variant]} ${className}`}>
            {children}
        </button>
    );
};

const Alert = ({ children, variant = 'default' }: any) => (
    <div className={`p-4 rounded-xl border-l-4 ${variant === 'destructive' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-blue-50 border-blue-500 text-blue-800'}`}>
        {children}
    </div>
);

const UploadIcon = () => (
    <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const extractTextWithOCR = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('apikey', OCR_API_KEY);
    formData.append('language', 'spa');
    formData.append('OCREngine', '2');
    formData.append('detectOrientation', 'true');
    formData.append('isTable', 'true');
    
    const response = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Error en OCR');
    const result = await response.json();
    if (result.IsErroredOnProcessing) throw new Error(result.ErrorMessage || 'Error procesando imagen');
    return result.ParsedResults?.map((p: any) => p.ParsedText).join('\n') || '';
};

const parsearTurnos = (texto: string): TurnoDetectado[] => {
    const turnos: TurnoDetectado[] = [];
    const lines = texto.split('\n');
    
    let fechaActual: string | null = null;
    let lineasAcumuladas: string[] = [];

    lines.forEach((line) => {
        const lineaTrim = line.trim();
        if (!lineaTrim) return;

        // Detecta fechas en formato DD/MM/YYYY o DD-MM-YYYY
        const fechaMatch = lineaTrim.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        
        if (fechaMatch) {
            // Si ya había una fecha acumulada, guarda el turno anterior
            if (fechaActual && lineasAcumuladas.length > 0) {
                turnos.push({
                    fecha: fechaActual,
                    textoCompleto: lineasAcumuladas.join('\n'),
                    lineas: lineasAcumuladas
                });
                lineasAcumuladas = [];
            }

            let [_, dia, mes, año] = fechaMatch;
            if (año.length === 2) año = '20' + año;
            fechaActual = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
            
            // Añade la línea con la fecha
            lineasAcumuladas.push(lineaTrim);
        } else if (fechaActual) {
            // Acumula líneas que pertenecen al turno actual
            lineasAcumuladas.push(lineaTrim);
        }
    });

    // Guarda el último turno
    if (fechaActual && lineasAcumuladas.length > 0) {
        turnos.push({
            fecha: fechaActual,
            textoCompleto: lineasAcumuladas.join('\n'),
            lineas: lineasAcumuladas
        });
    }

    // Si no se detectaron fechas, crea un único turno con todo el texto
    if (turnos.length === 0 && texto.trim()) {
        turnos.push({
            fecha: new Date().toISOString().split('T')[0],
            textoCompleto: texto,
            lineas: lines.filter(l => l.trim())
        });
    }

    return turnos;
};

const generarCalendario = (turnos: TurnoDetectado[]) => {
    if (turnos.length === 0) return { dias: [], mesNombre: '', año: 0 };
    const fechas = turnos.map(t => new Date(t.fecha + 'T00:00:00'));
    const minFecha = new Date(Math.min(...fechas.map(f => f.getTime())));
    const primerDia = new Date(minFecha.getFullYear(), minFecha.getMonth(), 1);
    const ultimoDia = new Date(minFecha.getFullYear(), minFecha.getMonth() + 1, 0);
    const dias = [];
    const actual = new Date(primerDia);
    const primerDiaSemana = actual.getDay();
    
    for (let i = 0; i < primerDiaSemana; i++) dias.push(null);
    
    while (actual <= ultimoDia) {
        const fechaStr = actual.toISOString().split('T')[0];
        const turno = turnos.find(t => t.fecha === fechaStr);
        dias.push({ 
            fecha: fechaStr, 
            dia: actual.getDate(), 
            turno: turno || null, 
            esHoy: fechaStr === new Date().toISOString().split('T')[0] 
        });
        actual.setDate(actual.getDate() + 1);
    }
    
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return { dias, mesNombre: meses[minFecha.getMonth()], año: minFecha.getFullYear() };
};

export default function TurnosApp() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [textoExtraido, setTextoExtraido] = useState<string>('');
    const [turnos, setTurnos] = useState<TurnoDetectado[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [turnoSeleccionado, setTurnoSeleccionado] = useState<TurnoDetectado | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(selectedFile);
        }
    };

    const procesarImagen = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        
        try {
            const texto = await extractTextWithOCR(file);
            console.log('TEXTO EXTRAIDO:', texto);
            
            if (!texto.trim()) throw new Error('No se pudo extraer texto de la imagen');
            
            setTextoExtraido(texto);
            const turnosDetectados = parsearTurnos(texto);
            setTurnos(turnosDetectados);
        } catch (err: any) {
            setError(err.message || 'Error al procesar la imagen');
        } finally {
            setLoading(false);
        }
    };

    const { dias: diasCalendario, mesNombre, año } = generarCalendario(turnos);
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                        📅 Lector de Turnos
                    </h1>
                    <p className="text-xl text-gray-600">Digitaliza tus turnos conservando el formato original</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <Card>
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                            <CardTitle>1. Sube la Foto</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border-2 border-dashed border-blue-300 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-500 transition-all"
                                onClick={() => document.getElementById('file-input')?.click()}>
                                {preview ? (
                                    <img src={preview} alt="Preview" className="max-h-80 mx-auto rounded-xl shadow-2xl" />
                                ) : (
                                    <>
                                        <UploadIcon />
                                        <p className="text-lg font-semibold text-gray-700">Selecciona una imagen</p>
                                    </>
                                )}
                                <input id="file-input" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                            {file && (
                                <Button onClick={procesarImagen} disabled={loading} className="w-full mt-6">
                                    {loading ? 'Procesando...' : 'Extraer Turnos'}
                                </Button>
                            )}
                            {error && <Alert variant="destructive" className="mt-4">{error}</Alert>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                            <CardTitle>2. Documento Original</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {textoExtraido ? (
                                <div className="bg-white border-2 border-gray-300 rounded-xl p-6 max-h-96 overflow-y-auto shadow-inner">
                                    <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 leading-relaxed">{textoExtraido}</pre>
                                </div>
                            ) : (
                                <div className="text-center py-20">
                                    <p className="text-gray-400">El texto aparecerá aquí</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                                {turnos.length > 0 && (
                    <Card className="overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-b-4 border-indigo-500">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-indigo-900">📋 Calendario de Turnos - {mesNombre} {año}</CardTitle>
                                <div className="bg-white px-4 py-2 rounded-full shadow-md border border-indigo-200">
                                    <span className="text-sm font-semibold text-indigo-600">{turnos.length} día{turnos.length !== 1 ? 's' : ''}</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 bg-white">
                            <div className="grid grid-cols-7 gap-2 mb-3">
                                {diasSemana.map(dia => (
                                    <div key={dia} className="text-center font-bold text-gray-600 text-xs uppercase py-2 bg-gray-100 rounded-lg">
                                        {dia}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-2">
                                {diasCalendario.map((dia, idx) => (
                                    <div
                                        key={idx}
                                        className={`relative min-h-40 border-2 rounded-lg transition-all ${
                                            !dia ? 'bg-gray-50 border-gray-100 opacity-40' :
                                            dia.esHoy ? 'bg-blue-100 border-blue-500 shadow-lg' :
                                            dia.turno ? 'bg-white border-gray-300 shadow-md cursor-pointer hover:shadow-2xl hover:scale-105' :
                                            'bg-white border-gray-200'
                                        }`}
                                        onClick={() => dia?.turno && setTurnoSeleccionado(dia.turno)}
                                    >
                                        {dia && (
                                            <>
                                                <div className="absolute top-2 right-2">
                                                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                                        dia.esHoy ? 'bg-blue-600 text-white' : 
                                                        dia.turno ? 'bg-indigo-600 text-white' : 
                                                        'bg-gray-200 text-gray-600'
                                                    }`}>
                                                        {dia.dia}
                                                    </span>
                                                </div>
                                                
                                                {dia.turno && (
                                                    <div className="p-3 pt-10 h-full">
                                                        <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-2 shadow-sm h-full">
                                                            <div className="text-xs leading-tight space-y-1 font-mono text-gray-700">
                                                                {dia.turno.lineas.slice(0, 8).map((linea, i) => {
                                                                    const esFecha = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(linea);
                                                                    const esEncabezado = linea.length < 20 && linea === linea.toUpperCase();
                                                                    const tieneSeparador = linea.includes('---') || linea.includes('===') || linea.includes('___');
                                                                    
                                                                    return (
                                                                        <div key={i} className={`
                                                                            ${esFecha ? 'font-bold text-indigo-700 border-b border-indigo-200 pb-1' : ''}
                                                                            ${esEncabezado ? 'font-semibold text-gray-800' : ''}
                                                                            ${tieneSeparador ? 'text-gray-400' : ''}
                                                                            ${!esFecha && !esEncabezado && !tieneSeparador ? 'text-gray-600' : ''}
                                                                        `}>
                                                                            {linea}
                                                                        </div>
                                                                    );
                                                                })}
                                                                {dia.turno.lineas.length > 8 && (
                                                                    <div className="text-center pt-2 border-t border-gray-200">
                                                                        <span className="text-xs text-indigo-600 font-semibold">
                                                                            +{dia.turno.lineas.length - 8} líneas más
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {turnoSeleccionado && (
                    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setTurnoSeleccionado(null)}>
                        <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e: any) => e.stopPropagation()}>
                            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-white text-2xl">📄 Turno Completo</CardTitle>
                                        <p className="text-white text-opacity-90 text-sm mt-1">
                                            {new Date(turnoSeleccionado.fecha + 'T00:00:00').toLocaleDateString('es-ES', { 
                                                weekday: 'long', 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                            })}
                                        </p>
                                    </div>
                                    <button onClick={() => setTurnoSeleccionado(null)} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-10 h-10 flex items-center justify-center text-3xl font-bold transition-all">
                                        ×
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 overflow-y-auto max-h-[70vh]">
                                <div className="bg-white border-4 border-gray-300 rounded-xl p-8 shadow-2xl">
                                    <div className="font-mono text-sm leading-relaxed space-y-2">
                                        {turnoSeleccionado.lineas.map((linea, i) => {
                                            const esFecha = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(linea);
                                            const esEncabezado = linea.length < 30 && linea === linea.toUpperCase();
                                            const tieneSeparador = linea.includes('---') || linea.includes('===') || linea.includes('___');
                                            const esImportante = linea.toLowerCase().includes('importante') || linea.toLowerCase().includes('nota');
                                            
                                            return (
                                                <div key={i} className={`
                                                    ${esFecha ? 'text-xl font-bold text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg border-l-4 border-indigo-600 my-3' : ''}
                                                    ${esEncabezado && !esFecha ? 'font-bold text-lg text-gray-800 mt-4 mb-2 border-b-2 border-gray-300 pb-2' : ''}
                                                    ${tieneSeparador ? 'text-gray-400 text-center my-2' : ''}
                                                    ${esImportante ? 'bg-yellow-50 border-l-4 border-yellow-500 px-4 py-2 text-yellow-900 font-semibold' : ''}
                                                    ${!esFecha && !esEncabezado && !tieneSeparador && !esImportante ? 'text-gray-700 px-2' : ''}
                                                `}>
                                                    {linea || '\u00A0'}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <Button onClick={() => {
                                        navigator.clipboard.writeText(turnoSeleccionado.textoCompleto);
                                        alert('✓ Texto copiado al portapapeles');
                                    }} variant="success" className="flex-1">
                                        📋 Copiar Todo el Texto
                                    </Button>
                                    <Button onClick={() => {
                                        const blob = new Blob([turnoSeleccionado.textoCompleto], { type: 'text/plain' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `turno_${turnoSeleccionado.fecha}.txt`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }} variant="secondary" className="flex-1">
                                        💾 Descargar TXT
                                    </Button>
                                    <Button onClick={() => setTurnoSeleccionado(null)} variant="secondary">
                                        Cerrar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}