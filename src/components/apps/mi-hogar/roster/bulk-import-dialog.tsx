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
import { Loader2, Upload, Calendar as CalendarIcon, FileText, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface BulkImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const ABBREVIATIONS: { [key: string]: { title: string, start: string, end: string, color: string } } = {
    'M': { title: 'MAÑANA', start: '06:00', end: '14:00', color: '#eab308' },
    'T': { title: 'TARDE', start: '14:00', end: '22:00', color: '#f97316' },
    'N': { title: 'NOCHE', start: '22:00', end: '06:00', color: '#1e293b' },
    'DS': { title: 'DESCANSO SEMANAL', start: '00:00', end: '00:00', color: '#22c55e' },
    'DAS': { title: 'LIBRE DAS', start: '00:00', end: '00:00', color: '#22c55e' },
    'DND': { title: 'LIBRE DND', start: '00:00', end: '00:00', color: '#22c55e' },
    'DF': { title: 'DESCANSO FESTIVO', start: '00:00', end: '00:00', color: '#22c55e' },
    'PAP': { title: 'ASUNTOS PROPIOS', start: '00:00', end: '00:00', color: '#3b82f6' },
    'PNAV': { title: 'PERMISO NAVIDAD', start: '00:00', end: '00:00', color: '#ef4444' },
    'SALIENTE': { title: 'SALIENTE', start: '00:00', end: '00:00', color: '#64748b' } // Generic
};

export default function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
    const [activeTab, setActiveTab] = useState('text');
    const [textInput, setTextInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [previewShifts, setPreviewShifts] = useState<any[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper: Generate shifts form text
    const generateShiftsFromText = (text: string): any[] => {
        const tokens = text.toUpperCase()
            .replace(/[,;\n]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 0);

        const year = parseInt(selectedMonth.split('-')[0]);
        const month = parseInt(selectedMonth.split('-')[1]) - 1; // 0-indexed

        const generated: any[] = [];
        let dayCounter = 1;
        const maxDays = getDaysInMonth(new Date(year, month));

        for (const token of tokens) {
            // Check if token is a day number (skip/jump)
            // If user explicitly provides "1 M 2 T", we sync dayCounter.
            if (!isNaN(Number(token)) && Number(token) <= 31) {
                dayCounter = Number(token);
                continue;
            }

            // Check if token is a known abbreviation
            const abbr = Object.keys(ABBREVIATIONS).find(k => k === token || (token.startsWith('SALIENTE') && k === 'SALIENTE'));

            if (abbr) {
                if (dayCounter > maxDays) break;

                const date = new Date(year, month, dayCounter);
                const config = abbr === 'SALIENTE' ? { ...ABBREVIATIONS['SALIENTE'], title: token } : ABBREVIATIONS[abbr];

                generated.push({
                    dateStr: format(date, 'yyyy-MM-dd'),
                    displayDate: format(date, 'd MMM', { locale: es }),
                    ...config
                });

                dayCounter++;
            }
        }
        return generated;
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

        try {
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
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

            const response = await fetch("/api/ocr-space", { method: "POST", body: formData });
            const data = await response.json();

            if (data.IsErroredOnProcessing || !data.ParsedResults?.[0]) {
                throw new Error("Error en OCR");
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

                // 3. Find Best Shift Row
                let bestRow: any[] = [];
                let maxScore = 0;

                Object.values(rows).forEach(rowWords => {
                    // Sort Left to Right
                    rowWords.sort((a, b) => a.Left - b.Left);

                    // Score: +1 for Abbr, -1 for Number (heuristic)
                    const validCount = rowWords.filter(w => {
                        const txt = w.WordText.toUpperCase().replace(/[^A-Z]/g, '');
                        return Object.keys(ABBREVIATIONS).includes(txt) || txt === "SALIENTE";
                    }).length;
                    const numberCount = rowWords.filter(w => !isNaN(Number(w.WordText))).length;

                    if (validCount > maxScore && validCount > numberCount) {
                        maxScore = validCount;
                        bestRow = rowWords;
                    }
                });

                if (bestRow.length > 0) {
                    bestRow.sort((a, b) => a.Left - b.Left);
                    const finalTokens = bestRow.map(w => w.WordText.toUpperCase().replace(/[^A-Z]/g, ''));
                    setTextInput(finalTokens.join(' '));
                    toast.success(`Fila detectada con ${finalTokens.length} turnos.`);
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
            toast.error("Fallo al leer la imagen");
            console.error(err);
        } finally {
            setIsLoading(false);
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Importación Masiva de Turnos</DialogTitle>
                    <DialogDescription>
                        Copia una secuencia o sube una foto (Escáner OCR).
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-4 py-2">
                    <label className="text-sm font-medium">Mes de Destino:</label>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="p-2 border rounded bg-background"
                    />
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="text"><FileText className="mr-2 h-4 w-4" /> Texto / Abreviaturas</TabsTrigger>
                        <TabsTrigger value="photo"><ImageIcon className="mr-2 h-4 w-4" /> Desde Foto (OCR)</TabsTrigger>
                    </TabsList>

                    <TabsContent value="text" className="flex-1 flex flex-col gap-4 mt-4 min-h-0">
                        <Textarea
                            placeholder="Pega aquí tu secuencia. Ej: M M T N DS DS..."
                            className="flex-1 resize-none font-mono text-lg p-4 leading-relaxed min-h-[300px]"
                            value={textInput}
                            onChange={e => setTextInput(e.target.value)}
                        />
                        <div className="flex justify-end">
                            <Button variant="ghost" size="sm" onClick={parseTextSequence} disabled={isLoading || !textInput}>
                                <Loader2 className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : 'hidden'}`} />
                                Refrescar Vista Previa
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="photo" className="flex-1 flex flex-col items-center justify-center gap-4 mt-4 min-h-0 border-2 border-dashed rounded-lg bg-muted/20">
                        <div className="text-center p-12 cursor-pointer hover:bg-muted/30 transition-colors w-full h-full flex flex-col items-center justify-center" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
                            <p className="text-lg font-medium text-foreground mb-2">Subir foto del cuadrante</p>
                            <p className="text-sm text-muted-foreground">Usando Escáner Geométrico (OCR.space)</p>
                            <InputFile ref={fileInputRef} onChange={handlePhotoUpload} />
                        </div>
                    </TabsContent>
                </Tabs>

                {/* PREVIEW AREA (Scrollable) */}
                {previewShifts.length > 0 && (
                    <div className="mt-4 border rounded-md p-3 bg-muted/10 flex-1 overflow-y-auto max-h-[250px]">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 sticky top-0 bg-background/95 backdrop-blur py-2 border-b z-10">
                            Vista Previa ({previewShifts.length} días)
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {previewShifts.map((s, i) => (
                                <div key={i} className="text-xs border rounded p-2 flex flex-col items-center justify-center gap-1 bg-background shadow-sm" style={{ borderTopColor: s.color, borderTopWidth: 3 }}>
                                    <span className="font-bold text-muted-foreground">{s.displayDate}</span>
                                    <span className="font-bold truncate w-full text-center" style={{ color: s.color }}>{s.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button
                        onClick={handleSave}
                        disabled={isLoading || (!textInput && previewShifts.length === 0)}
                    >
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                        Confirmar e Importar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Simple Helper for Input File hidden
const InputFile = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
    <input type="file" accept="image/*" className="hidden" ref={ref} {...props} />
));
InputFile.displayName = "InputFile";
