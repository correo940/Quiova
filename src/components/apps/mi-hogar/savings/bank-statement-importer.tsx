'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    FileSpreadsheet,
    FileText,
    X,
    Check,
    Loader2,
    AlertTriangle,
    Sparkles,
    Trash2,
    CheckCircle2,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type BankAccount = {
    id: string;
    name: string;
    bank_name: string;
    color: string;
    current_balance: number;
    logo_url?: string;
};

type ParsedTransaction = {
    date: string;
    description: string;
    amount: number;
    selected: boolean;
};

type ImporterProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accounts: BankAccount[];
    userId: string;
    onImportComplete: () => void;
};

type ImportStep = 'upload' | 'processing' | 'preview' | 'importing' | 'done';

export default function BankStatementImporter({
    open,
    onOpenChange,
    accounts,
    userId,
    onImportComplete
}: ImporterProps) {
    const [step, setStep] = useState<ImportStep>('upload');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
    const [error, setError] = useState<string>('');
    const [importedCount, setImportedCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    const reset = useCallback(() => {
        setStep('upload');
        setFile(null);
        setTransactions([]);
        setError('');
        setSelectedAccountId('');
        setImportedCount(0);
    }, []);

    const handleClose = () => {
        reset();
        onOpenChange(false);
    };

    const acceptedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
    ];

    const acceptedExtensions = ['.pdf', '.xlsx', '.xls', '.csv'];

    const isValidFile = (f: File) => {
        const ext = f.name.toLowerCase().substring(f.name.lastIndexOf('.'));
        return acceptedTypes.includes(f.type) || acceptedExtensions.includes(ext);
    };

    const getFileIcon = (fileName: string) => {
        if (fileName.endsWith('.pdf')) return <FileText className="w-8 h-8 text-red-500" />;
        return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
    };

    const handleFileSelect = (f: File) => {
        if (!isValidFile(f)) {
            toast.error('Formato no soportado. Usa PDF, XLSX, XLS o CSV.');
            return;
        }
        if (f.size > 10 * 1024 * 1024) {
            toast.error('El archivo es demasiado grande (máx. 10MB).');
            return;
        }
        setFile(f);
        setError('');
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) handleFileSelect(droppedFile);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => setDragOver(false), []);

    // --- PROCESS FILE WITH AI ---
    const processFile = async () => {
        if (!file || !selectedAccountId) {
            toast.error('Selecciona un archivo y una cuenta.');
            return;
        }

        setStep('processing');
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/parse-bank-statement', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al procesar el archivo');
            }

            const parsed: ParsedTransaction[] = (data.transactions || []).map((tx: any) => ({
                ...tx,
                selected: true
            }));

            if (parsed.length === 0) {
                throw new Error('No se encontraron movimientos en el archivo.');
            }

            setTransactions(parsed);
            setStep('preview');
        } catch (err: any) {
            console.error('[Importer] Error:', err);
            setError(err.message || 'Error desconocido');
            setStep('upload');
        }
    };

    // --- IMPORT SELECTED TRANSACTIONS ---
    const importTransactions = async () => {
        const selected = transactions.filter(tx => tx.selected);
        if (selected.length === 0) {
            toast.error('Selecciona al menos un movimiento.');
            return;
        }

        setStep('importing');

        try {
            // Insert all transactions
            const inserts = selected.map(tx => ({
                account_id: selectedAccountId,
                user_id: userId,
                amount: tx.amount,
                date: tx.date,
                description: tx.description
            }));

            const { error: insertError } = await supabase
                .from('savings_account_transactions')
                .insert(inserts);

            if (insertError) throw insertError;

            // Update account balance
            const totalDelta = selected.reduce((sum, tx) => sum + tx.amount, 0);
            const account = accounts.find(a => a.id === selectedAccountId);
            if (account) {
                const newBalance = (account.current_balance || 0) + totalDelta;
                await supabase
                    .from('savings_accounts')
                    .update({ current_balance: newBalance })
                    .eq('id', selectedAccountId);
            }

            setImportedCount(selected.length);
            setStep('done');
            onImportComplete();
        } catch (err: any) {
            console.error('[Importer] Import error:', err);
            toast.error('Error al importar: ' + (err.message || 'Error desconocido'));
            setStep('preview');
        }
    };

    const toggleAll = (checked: boolean) => {
        setTransactions(prev => prev.map(tx => ({ ...tx, selected: checked })));
    };

    const toggleOne = (index: number) => {
        setTransactions(prev => prev.map((tx, i) => i === index ? { ...tx, selected: !tx.selected } : tx));
    };

    const selectedCount = transactions.filter(tx => tx.selected).length;
    const selectedIncome = transactions.filter(tx => tx.selected && tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
    const selectedExpense = transactions.filter(tx => tx.selected && tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-violet-500" />
                        Importar Extracto Bancario con IA
                    </DialogTitle>
                    <DialogDescription>
                        Sube un PDF o Excel de tu banco y la IA detectará todos los movimientos automáticamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-2">
                    <AnimatePresence mode="wait">
                        {/* STEP 1: UPLOAD */}
                        {step === 'upload' && (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                {/* Account Selector */}
                                <div className="space-y-2">
                                    <Label className="font-semibold">Cuenta destino</Label>
                                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona la cuenta..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    <div className="flex items-center gap-2">
                                                        {acc.logo_url && <img src={acc.logo_url} className="w-4 h-4" alt="" />}
                                                        {acc.name} ({acc.bank_name})
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Drop Zone */}
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${dragOver
                                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 scale-[1.02]'
                                            : file
                                                ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10'
                                                : 'border-slate-300 dark:border-slate-700 hover:border-violet-400 hover:bg-slate-50 dark:hover:bg-slate-900/30'
                                        }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.xlsx,.xls,.csv"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleFileSelect(f);
                                        }}
                                    />

                                    {file ? (
                                        <div className="flex flex-col items-center gap-3">
                                            {getFileIcon(file.name)}
                                            <div>
                                                <p className="font-semibold text-sm">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {(file.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <X className="w-4 h-4 mr-1" /> Quitar
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                            <Upload className="w-10 h-10" />
                                            <div>
                                                <p className="font-semibold text-foreground">Arrastra tu extracto aquí</p>
                                                <p className="text-xs">o haz clic para seleccionar</p>
                                            </div>
                                            <div className="flex gap-2 mt-1">
                                                {['PDF', 'XLSX', 'XLS', 'CSV'].map(ext => (
                                                    <span key={ext} className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                                                        {ext}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                        <p>{error}</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* STEP 2: PROCESSING */}
                        {step === 'processing' && (
                            <motion.div
                                key="processing"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col items-center justify-center py-12 gap-4"
                            >
                                <div className="relative">
                                    <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
                                    <Sparkles className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
                                </div>
                                <div className="text-center">
                                    <p className="font-semibold">Analizando con IA...</p>
                                    <p className="text-sm text-muted-foreground">Extrayendo movimientos de "{file?.name}"</p>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: PREVIEW */}
                        {step === 'preview' && (
                            <motion.div
                                key="preview"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-3"
                            >
                                {/* Summary bar */}
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold">{selectedCount}/{transactions.length} seleccionados</span>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleAll(true)}>Todos</Button>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleAll(false)}>Ninguno</Button>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                            <ArrowUpRight className="w-3 h-3" /> +{selectedIncome.toFixed(2)}€
                                        </span>
                                        <span className="text-red-500 font-semibold flex items-center gap-1">
                                            <ArrowDownRight className="w-3 h-3" /> -{selectedExpense.toFixed(2)}€
                                        </span>
                                    </div>
                                </div>

                                {/* Transactions list */}
                                <div className="max-h-[350px] overflow-y-auto space-y-1 pr-1">
                                    {transactions.map((tx, i) => (
                                        <div
                                            key={i}
                                            onClick={() => toggleOne(i)}
                                            className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all duration-150 ${tx.selected
                                                    ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700'
                                                    : 'bg-transparent border-transparent opacity-40'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${tx.selected
                                                    ? 'bg-violet-500 border-violet-500'
                                                    : 'border-slate-300 dark:border-slate-600'
                                                }`}>
                                                {tx.selected && <Check className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{tx.description}</p>
                                                <p className="text-xs text-muted-foreground">{tx.date}</p>
                                            </div>
                                            <span className={`text-sm font-bold whitespace-nowrap ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-500'
                                                }`}>
                                                {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}€
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 4: IMPORTING */}
                        {step === 'importing' && (
                            <motion.div
                                key="importing"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col items-center justify-center py-12 gap-4"
                            >
                                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                                <p className="font-semibold">Importando {selectedCount} movimientos...</p>
                            </motion.div>
                        )}

                        {/* STEP 5: DONE */}
                        {step === 'done' && (
                            <motion.div
                                key="done"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex flex-col items-center justify-center py-12 gap-4"
                            >
                                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-lg">¡Importación completada!</p>
                                    <p className="text-sm text-muted-foreground">
                                        Se importaron {importedCount} movimientos correctamente
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Buttons */}
                <DialogFooter className="pt-2 border-t gap-2">
                    {step === 'upload' && (
                        <>
                            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                            <Button
                                onClick={processFile}
                                disabled={!file || !selectedAccountId}
                                className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                Analizar con IA
                            </Button>
                        </>
                    )}
                    {step === 'preview' && (
                        <>
                            <Button variant="outline" onClick={() => { setStep('upload'); setTransactions([]); }}>
                                Volver
                            </Button>
                            <Button
                                onClick={importTransactions}
                                disabled={selectedCount === 0}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Importar {selectedCount} movimientos
                            </Button>
                        </>
                    )}
                    {step === 'done' && (
                        <Button onClick={handleClose} className="w-full">
                            Cerrar
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
