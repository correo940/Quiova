'use client';

import { useState, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, FileImage, Check, AlertCircle } from 'lucide-react';
import { scanRosterImage, findUserShift } from '@/lib/gemini';
import { findUserShiftOCRSpace } from '@/lib/ocr-space';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';

interface ScanRosterDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function ScanRosterDialog({ open, onOpenChange, onSuccess }: ScanRosterDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [digitalRoster, setDigitalRoster] = useState<{ date: string, columns: any[] } | null>(null);
    const [debugText, setDebugText] = useState<string>('');
    const [mySearchName, setMySearchName] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const resultRef = useRef<HTMLDivElement>(null);

    // Editing states
    const [editedColleagues, setEditedColleagues] = useState<string>('');
    const [editedService, setEditedService] = useState<string>('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const [searchResult, setSearchResult] = useState<any>(null);

    const handleAnalyze = async () => {
        if (!previewUrl) return;

        setIsLoading(true);
        setDigitalRoster(null);
        setSearchResult(null);
        setDigitalRoster(null);
        setSearchResult(null);
        setDebugText('');
        setEditedColleagues('');
        setEditedService('');

        try {
            // STRATEGY A: Detective Mode (Name Provided)
            if (mySearchName.length > 2) {
                // 1. Try OCR.space (User Key)
                let result = await findUserShiftOCRSpace(previewUrl, mySearchName);

                // 2. Fallback to Local/Gemini if OCR.space misses
                if (!result || !result.found) {
                    console.log("OCR.space missed, trying Engine #2...");
                    result = await findUserShift(previewUrl, mySearchName);
                }

                if (result && result.found) {
                    setSearchResult(result);
                    toast.success(`¡Te encontré!`);
                    // Ensure valid shift text
                    if (!result.shift || result.shift === "DETECTADO POR OCR.SPACE") {
                        setSearchResult((prev: any) => ({ ...prev, shift: "Revisa el contexto" }));
                    }

                    // Init editing
                    const cols = result.colleagues && result.colleagues.length > 0 && result.colleagues[0] !== "Ver contexto abajo"
                        ? result.colleagues.join(", ")
                        : "";
                    setEditedColleagues(cols);

                    // Try to extract service from column title or context if present in result, else empty
                    // Assuming result might have 'columnTitle' one day, for now empty or guess from keywords
                    let foundService = '';
                    const rawUpper = (result.rawContext || '').toUpperCase();
                    if (rawUpper.includes('PUERTAS')) foundService = 'PUERTAS';
                    else if (rawUpper.includes('PRESOS')) foundService = 'PRESOS';
                    setEditedService(foundService);

                    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                } else {
                    toast.warning(`No encontré a "${mySearchName}" en el cuadrante.`);
                    // Fallback to full scan so they can see why
                    const fullResult = await scanRosterImage(previewUrl);
                    if (fullResult) {
                        setDigitalRoster(fullResult);
                    } else {
                        // Even if full structure fails, show raw text if we have it
                        setDebugText("No se encontró estructura, pero aquí está el texto detectado para que lo revises manualment.");
                    }
                }
            }
            // STRATEGY B: Full Scan (No Name)
            else {
                const result = await scanRosterImage(previewUrl);
                if (result) {
                    setDebugText(result.rawText);
                    if (result.columns && result.columns.length > 0) {
                        setDigitalRoster(result);
                        toast.success(`Digitalización completada: ${result.date}`);
                    } else {
                        toast.error('No se pudo estructurar el cuadrante');
                    }
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al analizar la imagen');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setPreviewUrl(null);
        setDigitalRoster(null);
        onOpenChange(false);
    };

    const handleSaveToCalendar = async () => {
        if (!searchResult) return;

        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No usuario");

            // Parse startTime/endTime or default
            let start = "09:00";
            let end = "17:00";

            if (searchResult.startTime !== "--:--") start = searchResult.startTime;
            else if (searchResult.shift.includes("MAÑANA")) { start = "06:00"; end = "14:00"; }
            else if (searchResult.shift.includes("TARDE")) { start = "14:00"; end = "22:00"; }
            else if (searchResult.shift.includes("NOCHE")) { start = "22:00"; end = "06:00"; }

            // Construct Timestamps
            // searchResult.date is "YYYY-MM-DD"
            const startTimestamp = new Date(`${searchResult.date}T${start}:00`).toISOString();
            let endTimestampCheck = new Date(`${searchResult.date}T${end}:00`);

            // Handle Night Shift crossing midnight?
            const sDate = new Date(`${searchResult.date}T${start}:00`);
            if (endTimestampCheck < sDate) {
                endTimestampCheck.setDate(endTimestampCheck.getDate() + 1);
            }
            const endTimestamp = endTimestampCheck.toISOString();

            // Prepare description with colleagues
            const description = editedColleagues.trim().length > 0
                ? `Con: ${editedColleagues}`
                : undefined;

            // Combine Service into title if present
            let finalTitle = `Turno: ${searchResult.shift}`;
            if (editedService.trim().length > 0) {
                finalTitle += ` (${editedService.toUpperCase()})`;
            }

            const { error } = await supabase.from('work_shifts').insert({
                user_id: user.id,
                title: finalTitle,
                description: description,
                start_time: startTimestamp,
                end_time: endTimestamp,
                color: searchResult.shift.includes("NOCHE") ? "#1e293b" : searchResult.shift.includes("TARDE") ? "#f97316" : "#eab308"
            });

            if (error) throw error;

            toast.success("Turno guardado en el calendario");
            onSuccess();
            handleClose();

        } catch (e: any) {
            console.error(e);
            toast.error("Error al guardar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Escanear Cuadrante (Réplica Digital)</DialogTitle>
                    <DialogDescription>
                        Sube la imagen. El sistema reconstruirá la tabla y podrás buscar tu nombre.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {!previewUrl ? (
                        <div
                            className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="h-12 w-12 mb-4" />
                            <p>Haz clic para subir imagen del cuadrante</p>
                            <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-4 h-full">
                            {/* Left: Image / Controls */}
                            <div className="w-full md:w-1/3 space-y-4">
                                <div className="relative h-48 w-full rounded-lg overflow-hidden border">
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <Button size="sm" variant="secondary" className="absolute bottom-2 right-2" onClick={() => { setPreviewUrl(null); setDigitalRoster(null); }}>
                                        Cambiar
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <Label>Tu Nombre (para resaltar)</Label>
                                    <Input
                                        placeholder="Ej. GARCIA"
                                        value={mySearchName}
                                        onChange={(e) => setMySearchName(e.target.value)}
                                    />
                                </div>

                                {!digitalRoster && !isLoading && (
                                    <Button className="w-full" onClick={handleAnalyze}>
                                        <ScanLineIcon className="mr-2 h-4 w-4" />
                                        Digitalizar Cuadrante
                                    </Button>
                                )}

                                {isLoading && (
                                    <div className="flex items-center justify-center py-4 text-primary">
                                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                        <span>Reconstruyendo...</span>
                                    </div>
                                )}
                            </div>

                            {/* Detective Result Card */}
                            {searchResult && (
                                <div ref={resultRef} className="w-full md:w-2/3 border rounded-lg bg-green-50 dark:bg-green-900/20 p-6 flex flex-col justify-center text-center space-y-4 shadow-lg border-green-200">
                                    <h3 className="text-2xl font-bold text-green-800 dark:text-green-300">
                                        ¡ENCONTRADO!
                                    </h3>
                                    <div className="text-lg">
                                        Hola <span className="font-bold">{searchResult.targetName}</span>, tu turno es:
                                    </div>
                                    <div className="text-4xl font-black text-green-700 dark:text-green-400 p-4 bg-white dark:bg-black/20 rounded-xl border border-green-100 dark:border-green-800 break-words">
                                        {searchResult.shift}
                                    </div>
                                    <div className="text-sm text-green-700 dark:text-green-300">
                                        {searchResult.startTime} - {searchResult.endTime}
                                    </div>

                                    {/* Raw Context Toggle */}
                                    <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded text-sm text-left border border-green-100 dark:border-green-800">
                                        <p className="font-bold text-xs mb-1 text-green-800 dark:text-green-300">Contexto Detectado:</p>
                                        <div className="font-mono text-xs whitespace-pre-wrap text-green-900 dark:text-green-200">
                                            {searchResult.rawContext}
                                        </div>
                                    </div>

                                    {/* Manual Overrides */}
                                    <div className="w-full text-left space-y-3 pt-4 border-t border-green-200 dark:border-green-800">
                                        <div>
                                            <Label className="text-xs font-semibold text-green-800 dark:text-green-300">
                                                Compañeros (Editar si hay errores)
                                            </Label>
                                            <Input
                                                value={editedColleagues}
                                                onChange={(e) => setEditedColleagues(e.target.value)}
                                                className="bg-white/80 dark:bg-black/20 border-green-200 dark:border-green-800 h-8 text-sm"
                                                placeholder="Ej. GARCIA, LOPEZ (separar por comas)"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs font-semibold text-green-800 dark:text-green-300">
                                                Servicio / Puesto (Para estadísticas)
                                            </Label>
                                            <Input
                                                value={editedService}
                                                onChange={(e) => setEditedService(e.target.value)}
                                                className="bg-white/80 dark:bg-black/20 border-green-200 dark:border-green-800 h-8 text-sm"
                                                placeholder="Ej. PUERTAS, PRESOS, V. INT"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleSaveToCalendar}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white mt-4"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                        Confirmar y Guardar en Calendario
                                    </Button>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        Fecha: {searchResult.date}
                                    </div>
                                </div>
                            )}

                            {/* Right: Digital Replica (Fallback or Full View) */}
                            {!searchResult && (
                                <div className="w-full md:w-2/3 border rounded-lg bg-card p-4 overflow-y-auto min-h-[300px]">
                                    {digitalRoster ? (
                                        <div>
                                            <h3 className="text-lg font-bold text-center mb-4 uppercase border-b pb-2">
                                                {digitalRoster.date}
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {digitalRoster.columns.map((col: any, idx: number) => (
                                                    <div key={idx} className="border rounded bg-background shadow-sm">
                                                        <div className="bg-muted p-2 text-center font-bold text-xs uppercase border-b truncate" title={col.title}>
                                                            {col.title}
                                                        </div>
                                                        <div className="p-2 space-y-1">
                                                            {col.names.length === 0 && <p className="text-xs text-muted-foreground italic text-center">Sin servicios</p>}
                                                            {col.names.map((name: string, nIdx: number) => {
                                                                const isMe = mySearchName.length > 2 && name.toUpperCase().includes(mySearchName.toUpperCase());
                                                                return (
                                                                    <div
                                                                        key={nIdx}
                                                                        className={`text-xs p-1.5 rounded border transition-colors ${isMe ? 'bg-green-100 border-green-500 text-green-800 font-bold dark:bg-green-900/40 dark:text-green-300' : 'border-transparent hover:bg-muted/50'}`}
                                                                    >
                                                                        {name}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm italic p-8">
                                            <ScanLineIcon className="h-12 w-12 mb-4 opacity-20" />
                                            <p>La réplica digital aparecerá aquí.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Debug View */}
                    {debugText && !digitalRoster && (
                        <div className="mt-4 p-4 bg-muted rounded-md text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border">
                            <p className="font-bold mb-2">Raw Text (Debug):</p>
                            {debugText}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ScanLineIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        </svg>
    )
}
