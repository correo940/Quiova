import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';

export interface ResetOptions {
    transactions: boolean;
    accounts: boolean;
    goals: boolean;
    recurring: boolean;
    pending: boolean;
}

interface ResetDataDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (options: ResetOptions) => Promise<void>;
}

export default function ResetDataDialog({ isOpen, onClose, onConfirm }: ResetDataDialogProps) {
    const [loading, setLoading] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    
    const [options, setOptions] = useState<ResetOptions>({
        transactions: true, // Por defecto, es la que más se quiere borrar siempre
        accounts: false,
        goals: false,
        recurring: false,
        pending: false
    });

    const isConfirmValid = confirmText === 'RESETEAR';
    const isAnySelected = Object.values(options).some(Boolean);

    const handleConfirm = async () => {
        if (!isConfirmValid || !isAnySelected) return;
        setLoading(true);
        try {
            await onConfirm(options);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setConfirmText('');
        }
    };

    // If accounts are deleted, transactions are naturally deleted too due to relational logic / or explicit wiping.
    const handleAccountToggle = (checked: boolean) => {
        setOptions(prev => ({
            ...prev,
            accounts: checked,
            ...(checked ? { transactions: true } : {})
        }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) onClose();
            setConfirmText('');
        }}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border-rose-200 dark:border-rose-900 shadow-2xl shadow-rose-900/10 rounded-3xl">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-4 text-rose-600 dark:text-rose-500">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <DialogTitle className="text-xl font-bold text-center text-slate-800 dark:text-slate-200">
                        Zona de Peligro
                    </DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        Selecciona exactamente qué datos financieros deseas purgar. <br className="hidden sm:block" />Esta acción <b>no se puede deshacer</b>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                        {/* Options List */}
                        <div className="flex items-start space-x-3">
                            <Checkbox 
                                id="res-acc" 
                                checked={options.accounts}
                                onCheckedChange={handleAccountToggle}
                                className="mt-1 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label htmlFor="res-acc" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">Cuentas Bancarias y Tarjetas</label>
                                <p className="text-xs text-slate-500">Elimina las cuentas y automáticamente todas sus transacciones asociadas.</p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Checkbox 
                                id="res-tx" 
                                checked={options.transactions}
                                disabled={options.accounts}
                                onCheckedChange={(c) => setOptions(p => ({...p, transactions: c as boolean}))}
                                className="mt-1 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label htmlFor="res-tx" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">Solo Historial de Transacciones</label>
                                <p className="text-xs text-slate-500">Borra todos los movimientos y pone a cero (0€) el saldo de las cuentas existentes.</p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Checkbox 
                                id="res-pending" 
                                checked={options.pending}
                                onCheckedChange={(c) => setOptions(p => ({...p, pending: c as boolean}))}
                                className="mt-1 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label htmlFor="res-pending" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">Auto-Deudas y Balance Pendiente</label>
                                <p className="text-xs text-slate-500">Borra todos los gastos pendientes de reposición y proyectos creados.</p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Checkbox 
                                id="res-goals" 
                                checked={options.goals}
                                onCheckedChange={(c) => setOptions(p => ({...p, goals: c as boolean}))}
                                className="mt-1 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label htmlFor="res-goals" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">Metas de Ahorro</label>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Checkbox 
                                id="res-recurring" 
                                checked={options.recurring}
                                onCheckedChange={(c) => setOptions(p => ({...p, recurring: c as boolean}))}
                                className="mt-1 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label htmlFor="res-recurring" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">Transacciones Automáticas/Recurrentes</label>
                            </div>
                        </div>
                    </div>

                    <div className="bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-100 dark:border-rose-900/50">
                        <div className="flex gap-2 items-center mb-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            <span className="text-sm font-semibold text-rose-800 dark:text-rose-400">Verificación de seguridad</span>
                        </div>
                        <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mb-3">
                            Para proceder, escribe <strong className="font-bold uppercase select-none">RESETEAR</strong> en el cuadro inferior.
                        </p>
                        <Input 
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="Escribe RESETEAR aquí..."
                            className="bg-white dark:bg-slate-900 border-rose-200 focus-visible:ring-rose-500"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">
                        Cancelar
                    </Button>
                    <Button 
                        variant="destructive" 
                        onClick={handleConfirm} 
                        disabled={!isConfirmValid || !isAnySelected || loading} 
                        className="rounded-xl gap-2 min-w-[120px]"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <><Trash2 className="w-4 h-4" /> Ejecutar Purga</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

