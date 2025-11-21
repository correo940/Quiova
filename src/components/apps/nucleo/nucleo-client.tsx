'use client';

import React, { useState } from 'react';
import { useTasks } from '@/context/TasksContext';
import { Calendar as CalendarIcon, Check, Save, FileText, Upload } from 'lucide-react';

interface TurnoDetectado {
    fecha: string;
    textoCompleto: string;
    lineas: string[];
}

const OCR_API_KEY = "K86077493988957";

const Card = ({ children, className = '', onClick }: any) => (
    <div onClick={onClick} className={`bg-white border border-gray-200 rounded-2xl shadow-lg transition-all duration-300 ${className}`}>{children}</div>
);
const CardHeader = ({ children, className = '' }: any) => <div className={`p-6 border-b border-gray-100 ${className}`}>{children}</div>;
const CardTitle = ({ children, className = '' }: any) => <h3 className={`text-2xl font-bold text-gray-900 ${className}`}>{children}</h3>;
const CardContent = ({ children, className = '' }: any) => <div className={`p-6 ${className}`}>{children}</div>;

const Button = ({ children, onClick, disabled = false, className = '', variant = 'primary', icon: Icon }: any) => {
    const variants: any = {
        primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5',
        secondary: 'bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50',
        success: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5',
        outline: 'border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50'
    };
    return (
        <button onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}>
            {Icon && <Icon className="w-5 h-5" />}
            {children}
        </button>
    );
};

const Alert = ({ children, variant = 'default' }: any) => (
    <div className={`p-4 rounded-xl border-l-4 ${variant === 'destructive' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-blue-50 border-blue-500 text-blue-800'}`}>
        {children}
    </div>
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
    const { addTask } = useTasks();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [textoExtraido, setTextoExtraido] = useState<string>('');
    const [turnos, setTurnos] = useState<TurnoDetectado[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [turnoSeleccionado, setTurnoSeleccionado] = useState<TurnoDetectado | null>(null);
    const [guardado, setGuardado] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            setGuardado(false);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(selectedFile);
        }
    };

    const procesarImagen = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setGuardado(false);

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

    const guardarEnCalendario = () => {
        if (turnos.length === 0) return;

        turnos.forEach(turno => {
            // Crear una tarea por cada turno
            addTask({
                text: `Turno: ${turno.lineas.slice(1, 3).join(' ')}`, // Usar las primeras líneas como resumen
                category: 'work',
                priority: 'medium',
                dueDate: new Date(turno.fecha + 'T09:00:00').toISOString()
            });
        });

        setGuardado(true);
        alert(`¡Se han guardado ${turnos.length} turnos en tu calendario principal!`);
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
                    <p className="text-xl text-gray-600">Digitaliza tus turnos y sincronízalos con tu calendario</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <Card>
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                            <CardTitle>1. Sube la Foto</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border-2 border-dashed border-blue-300 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-500 transition-all bg-blue-50/30"
                                onClick={() => document.getElementById('file-input')?.click()}>
                                {preview ? (
                                    <img src={preview} alt="Preview" className="max-h-80 mx-auto rounded-xl shadow-lg" />
                                ) : (
                                    <div className="py-8">
                                        <Upload className="w-16 h-16 mx-auto text-blue-400 mb-4" />
                                        <p className="text-lg font-semibold text-gray-700">Selecciona una imagen</p>
                                        <p className="text-sm text-gray-500 mt-2">Soporta JPG, PNG</p>
                                    </div>
                                )}
                                <input id="file-input" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                            {file && (
                                <Button onClick={procesarImagen} disabled={loading} className="w-full mt-6" icon={FileText}>
                                    {loading ? 'Procesando...' : 'Extraer Turnos'}
                                </Button>
                            )}
                            {error && <Alert variant="destructive" className="mt-4">{error}</Alert>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                            <CardTitle>2. Turnos Detectados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {turnos.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-green-800">¡Éxito!</p>
                                            <p className="text-green-700 text-sm">Se encontraron {turnos.length} turnos.</p>
                                        </div>
                                        <Button
                                            onClick={guardarEnCalendario}
                                            variant="success"
                                            disabled={guardado}
                                            icon={guardado ? Check : Save}
                                        >
                                            {guardado ? 'Guardado' : 'Guardar en Calendario'}
                                        </Button>
                                    </div>

                                    <div className="bg-white border border-gray-200 rounded-xl p-4 max-h-80 overflow-y-auto shadow-inner custom-scrollbar">
                                        <div className="grid gap-3">
                                            {turnos.map((turno, idx) => (
                                                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => setTurnoSeleccionado(turno)}>
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-sm">
                                                            {new Date(turno.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                        <span className="text-xs text-gray-400">#{idx + 1}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 mt-2 line-clamp-2 font-mono">
                                                        {turno.lineas.slice(1).join(' ')}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-20 flex flex-col items-center justify-center h-full">
                                    <CalendarIcon className="w-16 h-16 text-gray-200 mb-4" />
                                    <p className="text-gray-400">Sube una imagen para ver los turnos aquí</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {turnos.length > 0 && (
                    <Card className="overflow-hidden border-t-4 border-indigo-500">
                        <CardHeader className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-indigo-900 flex items-center gap-2">
                                    <CalendarIcon className="w-6 h-6" />
                                    Vista Mensual - {mesNombre} {año}
                                </CardTitle>
                                <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-indigo-100">
                                    <span className="text-sm font-semibold text-indigo-600">{turnos.length} turnos</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 bg-white">
                            <div className="grid grid-cols-7 gap-2 mb-3">
                                {diasSemana.map(dia => (
                                    <div key={dia} className="text-center font-bold text-gray-500 text-xs uppercase py-2">
                                        {dia}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-2">
                                {diasCalendario.map((dia, idx) => (
                                    <div
                                        key={idx}
                                        className={`relative min-h-40 border rounded-xl transition-all duration-200 ${!dia ? 'bg-gray-50/50 border-transparent' :
                                                dia.esHoy ? 'bg-blue-50/50 border-blue-200 ring-2 ring-blue-100' :
                                                    dia.turno ? 'bg-white border-indigo-200 shadow-sm hover:shadow-md cursor-pointer hover:-translate-y-1' :
                                                        'bg-white border-gray-100'
                                            }`}
                                        onClick={() => dia?.turno && setTurnoSeleccionado(dia.turno)}
                                    >
                                        {dia && (
                                            <>
                                                <div className="absolute top-3 left-3">
                                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${dia.esHoy ? 'bg-blue-600 text-white shadow-blue-200 shadow-lg' :
                                                            dia.turno ? 'bg-indigo-100 text-indigo-700' :
                                                                'text-gray-400'
                                                        }`}>
                                                        {dia.dia}
                                                    </span>
                                                </div>

                                                {dia.turno && (
                                                    <div className="p-3 pt-12 h-full">
                                                        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-lg p-3 h-full text-xs space-y-1.5">
                                                            {dia.turno.lineas.slice(0, 5).map((linea, i) => {
                                                                const esFecha = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(linea);
                                                                if (esFecha) return null; // Ocultar fecha redundante
                                                                return (
                                                                    <div key={i} className="text-gray-600 truncate font-medium">
                                                                        {linea}
                                                                    </div>
                                                                );
                                                            })}
                                                            {dia.turno.lineas.length > 6 && (
                                                                <div className="text-indigo-400 text-[10px] font-bold mt-1">
                                                                    +{dia.turno.lineas.length - 6} más...
                                                                </div>
                                                            )}
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
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
                        onClick={() => setTurnoSeleccionado(null)}>
                        <Card className="max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e: any) => e.stopPropagation()}>
                            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-white text-2xl">Detalle del Turno</CardTitle>
                                        <p className="text-indigo-100 text-sm mt-1">
                                            {new Date(turnoSeleccionado.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                    <button onClick={() => setTurnoSeleccionado(null)} className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-colors">
                                        <span className="text-2xl leading-none">&times;</span>
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 overflow-y-auto max-h-[60vh]">
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-inner">
                                    <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 leading-relaxed">
                                        {turnoSeleccionado.textoCompleto}
                                    </pre>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <Button onClick={() => {
                                        navigator.clipboard.writeText(turnoSeleccionado.textoCompleto);
                                        alert('✓ Texto copiado');
                                    }} variant="outline" className="flex-1">
                                        Copiar Texto
                                    </Button>
                                    <Button onClick={() => setTurnoSeleccionado(null)} variant="primary" className="flex-1">
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