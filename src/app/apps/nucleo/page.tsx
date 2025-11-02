'use client';

import React, { useState } from 'react';

interface TurnoDetectado {
    fecha: string;
    texto: string;
    dia: string;
    personas: string[];
}

const OCR_API_KEY = "K86077493988957";

// ============= COMPONENTES UI =============
const Card = ({ children, className = '' }: any) => <div className={`bg-white border border-gray-200 rounded-2xl shadow-lg ${className}`}>{children}</div>;
const CardHeader = ({ children, className = '' }: any) => <div className={`p-6 border-b border-gray-100 ${className}`}>{children}</div>;
const CardTitle = ({ children, className = '' }: any) => <h3 className={`text-2xl font-bold text-gray-900 ${className}`}>{children}</h3>;
const CardContent = ({ children, className = '' }: any) => <div className={`p-6 ${className}`}>{children}</div>;

const Button = ({ children, onClick, disabled = false, className = '', variant = 'primary' }: any) => {
    const variants = {
        primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-xl',
        secondary: 'bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50',
        success: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md'
    };
    return (
        <button onClick={onClick} disabled={disabled} className={`px-6 py-3 font-semibold rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${variants[variant as keyof typeof variants]} ${className}`}>
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

// ============= FUNCIONES AUXILIARES =============
const normalizarTexto = (texto: string) => {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const obtenerFechaHoy = () => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
};

const descargarComoTXT = (texto: string, nombreArchivo: string) => {
    const blob = new Blob([texto], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// ============= COMPONENTE TEXTO CON FORMATO =============
const TextoConFormato = ({ texto, maxLineas = null }: { texto: string; maxLineas?: number | null }) => {
    const lineas = texto.split('\n');
    const lineasMostrar = maxLineas ? lineas.slice(0, maxLineas) : lineas;
    const hayMas = maxLineas && lineas.length > maxLineas;

    const formatearLinea = (linea: string, idx: number) => {
        const tieneFecha = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/.test(linea);
        const palabras = linea.trim().split(/\s+/);
        const mayusculas = palabras.filter(p => p === p.toUpperCase() && p.length > 1).length;
        const esEncabezado = mayusculas >= palabras.length * 0.7 && linea.trim().length > 0;
        const esSeparador = /^[\-=_]{3,}$/.test(linea.trim());
        const esImportante = /\b(importante|urgente|atención|nota)\b/i.test(linea);

        if (esSeparador) {
            return <div key={idx} className="border-t-2 border-dashed border-gray-300 my-2"></div>;
        }

        if (esEncabezado) {
            return <div key={idx} className="font-bold text-gray-900 border-b border-gray-300 pb-1 mb-1">{linea}</div>;
        }

        if (tieneFecha) {
            const lineaConFecha = linea.replace(
                /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g,
                '<span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">$&</span>'
            );
            return <div key={idx} className="text-gray-800" dangerouslySetInnerHTML={{ __html: lineaConFecha }}></div>;
        }

        if (esImportante) {
            return <div key={idx} className="bg-yellow-50 border-l-4 border-yellow-400 pl-2 py-1 text-gray-800 font-medium">{linea}</div>;
        }

        return <div key={idx} className="text-gray-700">{linea || '\u00A0'}</div>;
    };

    return (
        <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {lineasMostrar.map((linea, idx) => formatearLinea(linea, idx))}
            {hayMas && (
                <div className="text-center mt-2 pt-2 border-t border-gray-200">
                    <span className="text-xs text-blue-600 font-semibold">
                        +{lineas.length - maxLineas} líneas más · Click para ver todo
                    </span>
                </div>
            )}
        </div>
    );
};

// ============= FUNCIONES OCR Y PARSEO =============
const extractTextWithOCR = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('apikey', OCR_API_KEY);
    formData.append('language', 'spa');
    formData.append('OCREngine', '2');
    
    const response = await fetch('https://api.ocr.space/parse/image', { 
        method: 'POST', 
        body: formData 
    });
    
    if (!response.ok) throw new Error('Error en OCR');
    
    const result = await response.json();
    
    if (result.IsErroredOnProcessing) {
        throw new Error(result.ErrorMessage?.[0] || 'Error procesando imagen');
    }
    
    return result.ParsedResults?.map((p: any) => p.ParsedText).join('\n') || '';
};

const parsearTurno = (texto: string): TurnoDetectado[] => {
    const turnos: TurnoDetectado[] = [];
    const lines = texto.split('\n').filter(l => l.trim());
    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    
    let fechaActual: string | null = null;
    let diaActual: string | null = null;
    let textoAcumulado = '';

    lines.forEach((line) => {
        const lineNormalizada = normalizarTexto(line);
        const diaMatch = diasSemana.find(d => lineNormalizada.includes(normalizarTexto(d)));
        
        if (diaMatch) {
            diaActual = diaMatch.charAt(0).toUpperCase() + diaMatch.slice(1);
        }

        const fechaMatch = line.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
        
        if (fechaMatch) {
            if (fechaActual && textoAcumulado.trim()) {
                turnos.push({ 
                    fecha: fechaActual, 
                    texto: textoAcumulado.trim(), 
                    dia: diaActual || '', 
                    personas: extraerPersonas(textoAcumulado) 
                });
                textoAcumulado = '';
            }
            
            let [_, dia, mes, año] = fechaMatch;
            
            const diaNum = parseInt(dia);
            const mesNum = parseInt(mes);
            
            if (diaNum < 1 || diaNum > 31 || mesNum < 1 || mesNum > 12) {
                return;
            }
            
            if (año.length === 2) año = '20' + año;
            
            fechaActual = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
            diaActual = null;
        } else {
            textoAcumulado += line + '\n';
        }
    });

    if (fechaActual && textoAcumulado.trim()) {
        turnos.push({ 
            fecha: fechaActual, 
            texto: textoAcumulado.trim(), 
            dia: diaActual || '', 
            personas: extraerPersonas(textoAcumulado) 
        });
    }

    if (turnos.length === 0 && texto.trim()) {
        const hoy = new Date();
        turnos.push({ 
            fecha: obtenerFechaHoy(), 
            texto: texto.trim(), 
            dia: diasSemana[hoy.getDay()], 
            personas: extraerPersonas(texto) 
        });
    }

    return turnos;
};

const extraerPersonas = (texto: string): string[] => {
    const palabras = texto.split(/\s+/);
    const nombres = palabras.filter(p => 
        /^[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+$/.test(p.trim()) && p.length > 2
    );
    return [...new Set(nombres)];
};

const generarCalendario = (turnos: TurnoDetectado[]) => {
    if (turnos.length === 0) return { dias: [], mesNombre: '', año: 0 };
    
    const fechas = turnos.map(t => {
        const [año, mes, dia] = t.fecha.split('-');
        return new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
    });
    
    const minFecha = new Date(Math.min(...fechas.map(f => f.getTime())));
    const primerDia = new Date(minFecha.getFullYear(), minFecha.getMonth(), 1);
    const ultimoDia = new Date(minFecha.getFullYear(), minFecha.getMonth() + 1, 0);
    
    const dias = [];
    const actual = new Date(primerDia);
    const primerDiaSemana = actual.getDay();
    
    for (let i = 0; i < primerDiaSemana; i++) {
        dias.push(null);
    }
    
    const fechaHoy = obtenerFechaHoy();
    
    while (actual <= ultimoDia) {
        const fechaStr = `${actual.getFullYear()}-${String(actual.getMonth() + 1).padStart(2, '0')}-${String(actual.getDate()).padStart(2, '0')}`;
        const turno = turnos.find(t => t.fecha === fechaStr);
        
        dias.push({ 
            fecha: fechaStr, 
            dia: actual.getDate(), 
            turno: turno || null, 
            esHoy: fechaStr === fechaHoy 
        });
        
        actual.setDate(actual.getDate() + 1);
    }
    
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    return { 
        dias, 
        mesNombre: meses[minFecha.getMonth()], 
        año: minFecha.getFullYear() 
    };
};
// ============= COMPONENTE PRINCIPAL =============
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
            if (selectedFile.size > 10 * 1024 * 1024) {
                setError('El archivo es demasiado grande. Máximo 10MB.');
                return;
            }
            
            setFile(selectedFile);
            setError(null);
            setTurnos([]);
            setTextoExtraido('');
            
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.onerror = () => setError('Error al leer el archivo');
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
            
            if (!texto.trim()) {
                throw new Error('No se pudo extraer texto de la imagen');
            }
            
            setTextoExtraido(texto);
            const turnosDetectados = parsearTurno(texto);
            setTurnos(turnosDetectados);
        } catch (err: any) {
            setError(err.message || 'Error al procesar la imagen');
        } finally {
            setLoading(false);
        }
    };

    const { dias: diasCalendario, mesNombre, año } = generarCalendario(turnos);
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* ============= HEADER ============= */}
                <div className="text-center mb-10">
                    <div className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-full text-sm font-semibold mb-4 shadow-lg">
                        Powered by OCR Technology
                    </div>
                    <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                        Lector de Turnos Inteligente
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Digitaliza tus turnos al instante. Sube una foto y obtén un calendario profesional automáticamente.
                    </p>
                </div>

                {/* ============= SECCIÓN UPLOAD Y TEXTO EXTRAIDO ============= */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* UPLOAD */}
                    <Card>
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center space-x-3">
                                <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">1</div>
                                <CardTitle className="text-blue-900">Sube tu Foto</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="relative border-3 border-dashed border-blue-300 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                onClick={() => document.getElementById('file-input')?.click()}>
                                {preview ? (
                                    <div className="relative">
                                        <img src={preview} alt="Preview" className="max-h-80 mx-auto rounded-xl shadow-2xl" />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-xl flex items-center justify-center">
                                            <span className="text-white opacity-0 group-hover:opacity-100 font-semibold">Cambiar imagen</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <UploadIcon />
                                        <div>
                                            <p className="text-lg font-semibold text-gray-700 mb-2">Arrastra tu imagen aquí</p>
                                            <p className="text-sm text-gray-500">o haz clic para seleccionar</p>
                                        </div>
                                        <p className="text-xs text-gray-400">PNG, JPG hasta 10MB</p>
                                    </div>
                                )}
                                <input id="file-input" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                            {file && (
                                <Button onClick={procesarImagen} disabled={loading} className="w-full mt-6">
                                    {loading ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Procesando imagen...
                                        </span>
                                    ) : 'Extraer y Analizar Turnos'}
                                </Button>
                            )}
                            {error && <Alert variant="destructive" className="mt-4">{error}</Alert>}
                        </CardContent>
                    </Card>

                    {/* TEXTO EXTRAIDO */}
                    <Card>
                        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                            <div className="flex items-center space-x-3">
                                <div className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">2</div>
                                <CardTitle className="text-green-900">Texto Extraído</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {textoExtraido ? (
                                <div className="space-y-4">
                                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200 max-h-96 overflow-y-auto shadow-inner">
                                        <TextoConFormato texto={textoExtraido} />
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                            <span className="text-sm font-semibold text-green-800">Texto extraído correctamente</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="secondary" className="text-xs py-2" onClick={() => {
                                                navigator.clipboard.writeText(textoExtraido);
                                                alert('Copiado al portapapeles');
                                            }}>
                                                Copiar
                                            </Button>
                                            <Button variant="secondary" className="text-xs py-2" onClick={() => {
                                                descargarComoTXT(textoExtraido, 'turno-extraido.txt');
                                            }}>
                                                Descargar
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-20">
                                    <div className="text-6xl mb-4 opacity-20">📄</div>
                                    <p className="text-gray-400 font-medium">El texto extraído aparecerá aquí</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                                {/* ============= CALENDARIO ============= */}
                {turnos.length > 0 && (
                    <Card className="overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-b-4 border-indigo-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">3</div>
                                    <div>
                                        <CardTitle className="text-indigo-900">Calendario de Turnos</CardTitle>
                                        <p className="text-sm text-indigo-600 mt-1">{mesNombre} {año}</p>
                                    </div>
                                </div>
                                <div className="bg-white px-4 py-2 rounded-full shadow-md border border-indigo-200">
                                    <span className="text-sm font-semibold text-indigo-600">{turnos.length} turno{turnos.length !== 1 ? 's' : ''} detectado{turnos.length !== 1 ? 's' : ''}</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 bg-white">
                            {/* Días de la semana */}
                            <div className="grid grid-cols-7 gap-3 mb-4">
                                {diasSemana.map(dia => (
                                    <div key={dia} className="text-center">
                                        <div className="font-bold text-gray-700 text-sm uppercase tracking-wider py-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl shadow-sm">
                                            {dia.substring(0, 3)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Días del calendario */}
                            <div className="grid grid-cols-7 gap-3">
                                {diasCalendario.map((dia, idx) => (
                                    <div
                                        key={idx}
                                        className={`relative min-h-40 p-3 rounded-xl border-2 transition-all duration-300 ${
                                            !dia ? 'bg-gray-50 border-gray-100 opacity-50' :
                                            dia.esHoy ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-600 text-white shadow-2xl transform scale-105 z-10' :
                                            dia.turno ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 cursor-pointer hover:shadow-2xl hover:scale-105 hover:z-20' :
                                            'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                        }`}
                                        onClick={() => dia?.turno && setTurnoSeleccionado(dia.turno)}
                                    >
                                        {dia && (
                                            <>
                                                {/* Número del día */}
                                                <div className={`text-right mb-2 ${dia.esHoy ? 'text-white' : 'text-gray-600'}`}>
                                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                                        dia.esHoy ? 'bg-white text-blue-600 shadow-lg' : 
                                                        dia.turno ? 'bg-green-600 text-white' : 
                                                        'bg-gray-100'
                                                    }`}>
                                                        {dia.dia}
                                                    </span>
                                                </div>

                                                {/* Preview del turno con formato */}
                                                {dia.turno && (
                                                    <div className="space-y-2">
                                                        {/* Documento tipo preview */}
                                                        <div className="bg-white rounded-lg p-3 shadow-md border-2 border-green-200 hover:border-green-400 transition-all">
                                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-green-100">
                                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                                <div className="text-xs font-bold text-green-700">{dia.turno.dia}</div>
                                                            </div>
                                                            {/* Texto con formato limitado a 8 líneas */}
                                                            <div className="overflow-hidden">
                                                                <TextoConFormato texto={dia.turno.texto} maxLineas={8} />
                                                            </div>
                                                        </div>

                                                        {/* Personas asignadas */}
                                                        {dia.turno.personas.length > 0 && (
                                                            <div className="space-y-1">
                                                                {dia.turno.personas.slice(0, 2).map((p, i) => (
                                                                    <div key={i} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-2 py-1 rounded-md text-xs font-semibold shadow-sm flex items-center">
                                                                        <span className="mr-1">👤</span>
                                                                        <span className="truncate">{p}</span>
                                                                    </div>
                                                                ))}
                                                                {dia.turno.personas.length > 2 && (
                                                                    <div className="text-xs text-green-700 font-semibold bg-green-100 px-2 py-1 rounded-md text-center">
                                                                        +{dia.turno.personas.length - 2} más
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
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

                {/* ============= MODAL DETALLE TURNO ============= */}
                {turnoSeleccionado && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setTurnoSeleccionado(null)}>
                        <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden transform transition-all" onClick={(e: any) => e.stopPropagation()}>
                            <CardHeader className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white relative overflow-hidden">
                                <div className="absolute inset-0 bg-white opacity-10"></div>
                                <div className="relative">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="inline-block bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                                                📄 Detalle del Turno
                                            </div>
                                            <CardTitle className="text-white text-3xl mb-2">{turnoSeleccionado.dia}</CardTitle>
                                            <p className="text-white text-opacity-90 text-sm">
                                                {new Date(turnoSeleccionado.fecha + 'T00:00:00').toLocaleDateString('es-ES', { 
                                                    weekday: 'long', 
                                                    year: 'numeric', 
                                                    month: 'long', 
                                                    day: 'numeric' 
                                                })}
                                            </p>
                                        </div>
                                        <button onClick={() => setTurnoSeleccionado(null)} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-10 h-10 flex items-center justify-center text-2xl transition-all">
                                            ×
                                        </button>
                                    </div>
                                </div>
                            </CardHeader>
                            
                            <CardContent className="p-8 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
                                {/* Documento completo con formato */}
                                <div>
                                    <div className="flex items-center space-x-2 mb-3">
                                        <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                                        <h4 className="font-bold text-gray-800 text-lg">📋 Documento Completo</h4>
                                    </div>
                                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border-2 border-gray-200 shadow-lg">
                                        {/* Efecto de papel */}
                                        <div className="bg-white p-6 rounded-lg shadow-inner border-l-4 border-green-500">
                                            <TextoConFormato texto={turnoSeleccionado.texto} />
                                        </div>
                                    </div>
                                </div>

                                {/* Personal Asignado */}
                                {turnoSeleccionado.personas.length > 0 && (
                                    <div>
                                        <div className="flex items-center space-x-2 mb-3">
                                            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
                                            <h4 className="font-bold text-gray-800 text-lg">👥 Personal Asignado ({turnoSeleccionado.personas.length})</h4>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {turnoSeleccionado.personas.map((persona, idx) => (
                                                <div key={idx} className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-xl font-semibold text-sm shadow-lg flex items-center space-x-2 hover:scale-105 transition-transform">
                                                    <span className="text-xl">👤</span>
                                                    <span>{persona}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Botones de acción */}
                                <div className="flex gap-3 pt-6 border-t-2 border-gray-100">
                                    <Button onClick={() => {
                                        navigator.clipboard.writeText(turnoSeleccionado.texto);
                                        alert('✅ Texto copiado al portapapeles');
                                    }} variant="success" className="flex-1">
                                        📋 Copiar Texto
                                    </Button>
                                    <Button onClick={() => {
                                        const nombreArchivo = `turno-${turnoSeleccionado.fecha}-${turnoSeleccionado.dia}.txt`;
                                        descargarComoTXT(turnoSeleccionado.texto, nombreArchivo);
                                    }} variant="primary" className="flex-1">
                                        💾 Descargar TXT
                                    </Button>
                                    <Button onClick={() => setTurnoSeleccionado(null)} variant="secondary" className="flex-1">
                                        ❌ Cerrar
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