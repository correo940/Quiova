'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload, Calendar as CalendarIcon, FileText, Image as ImageIcon, X, ZoomIn, ZoomOut, RotateCw, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { DEFAULT_SHIFT_TYPES } from './shift-settings-dialog';

interface BulkImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface ShiftType {
    code: string;
    label: string;
    start_time: string;
    end_time: string;
    color: string;
}

export default function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
    const [activeTab, setActiveTab] = useState('text');
    const [textInput, setTextInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [previewShifts, setPreviewShifts] = useState<any[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [startDay, setStartDay] = useState(1); // Manual offset for day 1
    const [showWarning, setShowWarning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Configurable Shift Types
    const [shiftTypes, setShiftTypes] = useState<ShiftType[]>(DEFAULT_SHIFT_TYPES);

    // Fetch Shift Types
    useEffect(() => {
        if (open) {
            const fetchTypes = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data } = await supabase.from('shift_types').select('*').eq('user_id', user.id);
                    if (data && data.length > 0) {
                        setShiftTypes(data);
                    } else {
                        setShiftTypes(DEFAULT_SHIFT_TYPES);
                    }
                }
            };
            fetchTypes();
        }
    }, [open]);

    // Helper: Find shift by code
    const getShiftByCode = (code: string) => {
        return shiftTypes.find(s => s.code === code);
    };

    // Helper: Generate shifts form text
    const generateShiftsFromText = (text: string) => {
        const tokens = text.replace(/\n/g, ' ').split(/[\s,]+/).filter(t => t.trim().length > 0);
        const year = parseInt(selectedMonth.split('-')[0]);
        const monthIndex = parseInt(selectedMonth.split('-')[1]) - 1; // 0-indexed
        const daysInMonth = getDaysInMonth(new Date(year, monthIndex));

        const shifts: any[] = [];
        let dayCounter = startDay; // Use manual start day

        // If tokens contain numbers, we respect them. If not, we increment.
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i].toUpperCase();

            // Check if token is a day number (1-31)
            if (!isNaN(Number(token)) && Number(token) <= 31) {
                dayCounter = Number(token);
                continue; // It's a day marker, next token is the shift
            }

            if (dayCounter > daysInMonth) break;

            // Check if valid code
            const foundShift = getShiftByCode(token);
            if (foundShift || token === "SALIENTE") {
                const date = new Date(year, monthIndex, dayCounter);
                const dateStr = format(date, 'yyyy-MM-dd');
                const displayDate = format(date, 'EEE d', { locale: es });

                if (token === "SALIENTE") {
                    // No-op for Saliente or add as info?
                    // Currently ignored or just used for alignment
                } else if (foundShift) {
                    shifts.push({
                        title: foundShift.label, // Use configured label
                        start: foundShift.start_time,
                        end: foundShift.end_time,
                        color: foundShift.color,
                        dateStr,
                        displayDate,
                        originalToken: token
                    });
                }
                dayCounter++;
            }
        }
        return shifts;
    };

    // --- TEXT PARSER ---
    const parseTextSequence = () => {
        if (!textInput.trim()) return;
        setIsLoading(true);
        const shifts = generateShiftsFromText(textInput);
        setPreviewShifts(shifts);
        setIsLoading(false);
        if (shifts.length === 0) {
            toast.warning("No se detectaron turnos válidos en el texto.");
        }
    };

    // Auto-update preview when text changes (Debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeTab === 'text' && textInput) {
                const shifts = generateShiftsFromText(textInput);
                setPreviewShifts(shifts);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [textInput, selectedMonth]);


    // --- PHOTO PARSER (OCR.SPACE GEOMETRIC) ---
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setPreviewShifts([]);
        setImagePreview(URL.createObjectURL(file)); // Set preview
        setShowWarning(true);

        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const formData = new FormData();
            formData.append("base64Image", base64);
            formData.append("apikey", "K84515341388957");
            formData.append("language", "spa");
            formData.append("isTable", "true");
            formData.append("isOverlayRequired", "true"); // Required for Geometry
            formData.append("scale", "true");
            formData.append("OCREngine", "2");

            // Warn if file is large (> 3MB)
            if (file.size > 3 * 1024 * 1024) {
                toast.warning("Imagen grande detectada. Esto puede tardar 1-2 minutos.");
            }

            // Add timeout to prevent infinite spinner (Increased to 120s)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

            const response = await fetch("/api/ocr-space", {
                method: "POST",
                body: formData,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const data = await response.json();

            if (data.IsErroredOnProcessing || !data.ParsedResults?.[0]) {
                const msg = data.ErrorMessage?.[0] || 'Error desconocido del OCR';
                throw new Error(msg);
            }

            const result = data.ParsedResults[0];
            const overlay = result.TextOverlay;

            if (!overlay || !overlay.Lines) {
                // Fallback to raw text if no overlay
                const rawText = result.ParsedText || "";
                setTextInput(rawText);
                toast.warning("Lectura simple (sin geometría). Revisa el texto.");
            } else {
                // --- GEOMETRIC ANALYSIS ---
                // 1. Flatten words
                let allWords: any[] = [];
                overlay.Lines.forEach((line: any) => { if (line.Words) allWords.push(...line.Words); });

                // 2. Group by Row (Y-Tolerance)
                const rows: { [key: number]: any[] } = {};
                const Y_TOLERANCE = 20;

                allWords.forEach(word => {
                    const y = word.Top;
                    const rowKey = Object.keys(rows).find(key => Math.abs(parseInt(key) - y) < Y_TOLERANCE);
                    if (rowKey) rows[parseInt(rowKey)].push(word);
                    else rows[y] = [word];
                });

                // Helper to clean common OCR errors
                const cleanOCRToken = (t: string) => {
                    t = t.replace(/[^A-Z0-9]/g, '');
                    // Common typo fixes
                    if (['TL', 'TI', 'T1', '7', 'L', 'I'].includes(t)) return 'T';
                    if (['MI', 'M1'].includes(t)) return 'M';
                    if (['D5', '0S', 'D$', 'DS', 'OS'].includes(t)) return 'DS';
                    if (['DE', 'OF', '0F'].includes(t)) return 'DF';
                    if (['DA5', 'DA$'].includes(t)) return 'DAS';
                    return t;
                };

                // 3. Find Best Shift Row
                let bestRow: any[] = [];
                let maxScore = 0;

                Object.values(rows).forEach(rowWords => {
                    // Sort Left to Right
                    rowWords.sort((a, b) => a.Left - b.Left);

                    // Score: +1 for Abbr, -1 for Number (heuristic)
                    const validCount = rowWords.filter(w => {
                        const raw = w.WordText.toUpperCase();
                        const txt = cleanOCRToken(raw);
                        return getShiftByCode(txt) || txt === "SALIENTE";
                    }).length;
                    const numberCount = rowWords.filter(w => !isNaN(Number(w.WordText))).length;

                    if (validCount > maxScore && validCount > numberCount) {
                        maxScore = validCount;
                        bestRow = rowWords;
                    }
                });

                if (bestRow.length > 0) {
                    bestRow.sort((a, b) => a.Left - b.Left);

                    const finalTokens = bestRow
                        .map(w => cleanOCRToken(w.WordText.toUpperCase()))
                        .filter(t => {
                            // Keep days (1-31)
                            if (!isNaN(Number(t)) && Number(t) <= 31) return true;
                            // Keep known codes from `shiftTypes`
                            if (getShiftByCode(t) || t === "SALIENTE") return true;
                            return false;
                        });

                    // Validate if we caught day numbers
                    const caughtNumbers = finalTokens.filter(t => !isNaN(Number(t))).length;
                    const caughtShifts = finalTokens.filter(t => getShiftByCode(t)).length; // Generic check

                    let finalText = "";

                    // If we have very few numbers compared to shifts (e.g. < 20%), assume we missed the header row
                    // and inject artificial day numbers 1..N to help the user.
                    if (caughtNumbers < (caughtShifts * 0.5)) {
                        let dayCounter = 1;
                        finalText = finalTokens.map(t => {
                            // If it's a known shift (or SALIENTE), prepend day
                            if (getShiftByCode(t) || t === "SALIENTE") {
                                return `${dayCounter++} ${t}`;
                            }
                            return t;
                        }).join('  ');
                        toast.info("Se han añadido números de día para facilitar la lectura.");
                    } else {
                        finalText = finalTokens.join(' ');
                    }

                    setTextInput(finalText);
                    toast.success(`Fila detectada. Se han limpiado textos extraños.`);
                } else {
                    // Fallback
                    const fullText = result.ParsedText || "";
                    setTextInput(fullText);
                    toast.warning("No se detectó fila clara. Revisa el texto.");
                }
            }

            // Switch to Text Tab
            setActiveTab('text');

        } catch (err: any) {
            console.error(err);
            if (err.name === 'AbortError') {
                toast.error("Tiempo de espera agotado. Inténtalo de nuevo.");
            } else {
                toast.error("Fallo al leer la imagen: " + (err.message || "Error desconocido"));
            }
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input to allow re-upload
        }
    };

    // --- SAVE ---
    const handleSave = async () => {
        // UX Enhancement: If they have text but no preview (maybe didn't wait for debounce), parse now
        let shiftsToSave = previewShifts;
        if (shiftsToSave.length === 0 && textInput.trim()) {
            shiftsToSave = generateShiftsFromText(textInput);
        }

        if (shiftsToSave.length === 0) {
            toast.error("No hay turnos para importar. Revisa el texto.");
            return;
        }

        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            const inserts = shiftsToSave.map(s => {
                const start = new Date(`${s.dateStr}T${s.start}:00`);
                let end = new Date(`${s.dateStr}T${s.end}:00`);
                if (end < start) end.setDate(end.getDate() + 1);

                return {
                    user_id: user.id,
                    title: `Turno: ${s.title}`,
                    start_time: start.toISOString(),
                    end_time: end.toISOString(),
                    color: s.color
                };
            });

            const { error } = await supabase.from('work_shifts').insert(inserts);
            if (error) throw error;

            toast.success(`${inserts.length} turnos importados correctamente.`);
            onSuccess();
            onOpenChange(false);
        } catch (e: any) {
            toast.error("Error al guardar: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- IMAGE MANIPULATION STATE ---
    const [zoomLevel, setZoomLevel] = useState(1);
    const [rotation, setRotation] = useState(0);

    const zoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 3));
    const zoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 1));
    const rotate = () => setRotation(prev => (prev + 90) % 360);
    const resetImage = () => {
        setImagePreview(null);
        setZoomLevel(1);
        setRotation(0);
        setShowWarning(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[98vw] w-full h-[98vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-4 border-b shrink-0 bg-background z-10 w-full overflow-hidden flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle>Insertar Cuadrante</DialogTitle>
                        <DialogDescription className="hidden md:block">
                            Copia texto o usa el escáner OCR para importar múltiples turnos.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

                    {/* LEFT PANEL: IMAGE VIEWER (If Image exists) OR UPLOAD/TABS (If no image) */}
                    {imagePreview ? (
                        <div className="relative w-full md:w-[40%] h-1/3 md:h-full bg-slate-900 overflow-hidden flex flex-col border-b md:border-b-0 md:border-r">
                            {/* Image Controls */}
                            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                                <Button size="icon" variant="secondary" className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white border-none" onClick={zoomIn}><ZoomIn className="h-4 w-4" /></Button>
                                <Button size="icon" variant="secondary" className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white border-none" onClick={zoomOut}><ZoomOut className="h-4 w-4" /></Button>
                                <Button size="icon" variant="secondary" className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white border-none" onClick={rotate}><RotateCw className="h-4 w-4" /></Button>
                                <Button size="icon" variant="destructive" className="h-8 w-8 opacity-80 hover:opacity-100" onClick={resetImage} title="Cerrar Imagen">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Image Container */}
                            <div className="flex-1 w-full h-full overflow-auto relative bg-slate-950 flex items-center justify-center p-4">
                                <div className={`min-w-full min-h-full flex ${zoomLevel > 1 ? 'items-start justify-start' : 'items-center justify-center'}`}>
                                    <img
                                        src={imagePreview}
                                        alt="Roster Preview"
                                        className="transition-transform duration-200 ease-out origin-center"
                                        style={{
                                            transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                                            maxWidth: zoomLevel === 1 ? '100%' : 'none',
                                            maxHeight: zoomLevel === 1 ? '100%' : 'none',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Loading Overlay */}
                            {isLoading && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm z-30">
                                    <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
                                    <p className="font-semibold animate-pulse">Analizando imagen...</p>
                                </div>
                            )}

                            {/* WARNING OVERLAY */}
                            {showWarning && (
                                <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                                    <div className="bg-card border shadow-lg max-w-sm md:max-w-md w-full p-6 rounded-xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
                                        <div className="h-12 w-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4">
                                            <AlertTriangle className="h-6 w-6" />
                                        </div>
                                        <h3 className="text-lg font-bold mb-2">Verifica el Resultado</h3>
                                        <p className="text-muted-foreground mb-6 text-sm">
                                            Comprueba el resultado mostrado con la fotografía original y modifica los cambios necesarios. La lectura automática puede contener errores.
                                        </p>
                                        <Button className="w-full font-bold" onClick={() => setShowWarning(false)}>
                                            He entendido
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // NO IMAGE: Show Standard Selection (Tabs or just Split)
                        <div className="w-full h-full flex flex-col p-6 bg-muted/10">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-4">
                                    <TabsTrigger value="text"><FileText className="mr-2 h-4 w-4" /> Texto / Manual</TabsTrigger>
                                    <TabsTrigger value="photo"><ImageIcon className="mr-2 h-4 w-4" /> Subir Foto</TabsTrigger>
                                </TabsList>

                                <TabsContent value="text" className="flex-1 flex flex-col gap-4 border p-4 rounded-lg bg-background shadow-sm">
                                    <div className="space-y-4 flex-1 flex flex-col">
                                        <div className="flex items-center gap-4">
                                            <label className="text-sm font-medium whitespace-nowrap">Mes de Destino:</label>
                                            <input
                                                type="month"
                                                value={selectedMonth}
                                                onChange={e => setSelectedMonth(e.target.value)}
                                                className="p-2 border rounded bg-background w-full"
                                            />
                                        </div>
                                        <Textarea
                                            placeholder="Pegar secuencia aquí..."
                                            className="flex-1 resize-none font-mono"
                                            value={textInput}
                                            onChange={e => setTextInput(e.target.value)}
                                        />
                                        <Button onClick={parseTextSequence} disabled={!textInput}>
                                            Procesar Texto
                                        </Button>
                                    </div>
                                </TabsContent>

                                <TabsContent value="photo" className="flex-1 border p-8 rounded-lg bg-background shadow-sm flex flex-col items-center justify-center border-dashed">
                                    <div className="text-center cursor-pointer hover:bg-muted/50 p-8 rounded-xl transition-all" onClick={() => fileInputRef.current?.click()}>
                                        <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                                            <Upload className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-lg font-bold">Subir Cuadrante</h3>
                                        <p className="text-sm text-muted-foreground mt-2">Click para seleccionar imagen</p>
                                    </div>
                                    <InputFile ref={fileInputRef} onChange={handlePhotoUpload} />
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}

                    {/* RIGHT PANEL: RESULTS / EDITING */}
                    {imagePreview && (
                        <div className="w-full md:w-[60%] h-2/3 md:h-full flex flex-col bg-background border-l">
                            <div className="p-4 border-b flex justify-between items-center bg-muted/20 shrink-0">
                                <h3 className="font-bold flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Texto Detectado / Editar
                                </h3>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium">Mes:</label>
                                    <input
                                        type="month"
                                        value={selectedMonth}
                                        onChange={e => setSelectedMonth(e.target.value)}
                                        className="p-1 border rounded bg-background text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
                                {/* Top: Options Row */}
                                <div className="flex flex-wrap gap-4 shrink-0 bg-muted/20 p-2 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-medium">Día Inicio:</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={startDay}
                                            onChange={e => setStartDay(parseInt(e.target.value) || 1)}
                                            className="w-12 p-1 border rounded bg-background text-xs text-center"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground">Si el OCR no lee los números de día, ajusta aquí el primer día del cuadrante.</span>
                                    </div>
                                </div>

                                {/* Shared Container for Input and Preview */}
                                <div className="flex-1 min-h-0 flex flex-col gap-4">
                                    {/* Text Input */}
                                    <div className="h-40 shrink-0 flex flex-col min-h-0">
                                        <label className="text-xs font-bold mb-1 ml-1 text-muted-foreground">Texto Detectado</label>
                                        <Textarea
                                            placeholder="El texto detectado aparecerá aquí..."
                                            className="flex-1 resize-none font-mono text-xs p-3 leading-relaxed border-input"
                                            value={textInput}
                                            onChange={e => setTextInput(e.target.value)}
                                        />
                                        <div className="text-[10px] text-muted-foreground mt-1 text-right">
                                            {textInput.length} caracteres
                                        </div>
                                    </div>

                                    {/* Preview Grid */}
                                    <div className="flex-1 flex flex-col min-h-0 border rounded-lg bg-muted/10">
                                        <div className="bg-muted/50 p-2 text-xs font-bold border-b flex justify-between shrink-0 items-center">
                                            <span>Vista Previa ({previewShifts.length} turnos)</span>
                                            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={parseTextSequence}>
                                                <RefreshCw className="h-3 w-3 mr-1" /> Actualizar
                                            </Button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2">
                                            {previewShifts.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground text-xs p-4 opacity-70">
                                                    <p>No se reconocen turnos.</p>
                                                    <p className="mt-1">Verifica que el texto contenga códigos válidos (M, T, N...).</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-3 xl:grid-cols-4 gap-2">
                                                    {previewShifts.map((s, i) => (
                                                        <div key={i} className="text-xs border rounded p-2 flex flex-col gap-1 bg-background shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                                            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: s.color }} />
                                                            <div className="pl-2.5 flex justify-between items-start">
                                                                <span className="font-bold text-[10px] uppercase text-muted-foreground">{s.displayDate}</span>
                                                                <span className="text-[9px] opacity-50 font-mono">{format(new Date(s.dateStr), 'd')}</span>
                                                            </div>
                                                            <div className="pl-2.5 font-bold truncate">
                                                                {s.title.replace('Turno: ', '')}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="p-4 border-t bg-muted/10 shrink-0">
                                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                                <Button onClick={handleSave} disabled={isLoading || previewShifts.length === 0}>
                                    {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
                                    Confirmar e Importar
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

const InputFile = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
    <input type="file" accept="image/*" className="hidden" ref={ref} {...props} />
));
InputFile.displayName = "InputFile";
