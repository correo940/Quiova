'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Landmark, Save } from 'lucide-react';

export default function AddAccountDialog({ 
    open, 
    onOpenChange, 
    userId,
    onSuccess 
}: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void;
    userId: string;
    onSuccess: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: '',
        bank_name: 'Efectivo',
        current_balance: '0',
        account_type: 'libre',
        color: '#F5C400' // Quioba Gold default
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('savings_accounts').insert({
                user_id: userId,
                name: form.name || 'Nueva Cuenta',
                bank_name: form.bank_name,
                current_balance: parseFloat(form.current_balance) || 0,
                color: form.color
            });

            if (error) throw error;
            toast.success('Cuenta creada con éxito');
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error('Error al crear la cuenta');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-[#faf8f0] dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold">
                        <div className="w-8 h-8 rounded-lg bg-[#F5C400]/20 flex items-center justify-center text-[#d4aa00]">
                            <Landmark className="w-4 h-4" />
                        </div>
                        Añadir Nueva Cuenta
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Crea una nueva cuenta bancaria, monedero o hucha.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Nombre de la cuenta</label>
                        <Input 
                            placeholder="Ej. Cuenta Corriente, Ahorros, Efectivo..." 
                            value={form.name}
                            onChange={e => setForm({...form, name: e.target.value})}
                            required
                            className="h-10 rounded-xl bg-white border-slate-200"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Entidad</label>
                            <Input 
                                placeholder="Ej. BBVA, Santander..." 
                                value={form.bank_name}
                                onChange={e => setForm({...form, bank_name: e.target.value})}
                                required
                                className="h-10 rounded-xl bg-white border-slate-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Saldo Inicial (€)</label>
                            <Input 
                                type="number"
                                step="0.01"
                                placeholder="0.00" 
                                value={form.current_balance}
                                onChange={e => setForm({...form, current_balance: e.target.value})}
                                required
                                className="h-10 rounded-xl bg-white border-slate-200 font-bold"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Tipo</label>
                            <select 
                                value={form.account_type}
                                onChange={e => setForm({...form, account_type: e.target.value})}
                                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C400]"
                            >
                                <option value="libre">Libre (Gasto)</option>
                                <option value="objetivo">Objetivo (Ahorro)</option>
                                <option value="bloqueada">Bloqueada (Plazo fijo)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Color de tarjeta</label>
                            <div className="flex h-10 items-center rounded-xl overflow-hidden border border-slate-200 p-0.5 bg-white">
                                <input 
                                    type="color" 
                                    value={form.color}
                                    onChange={e => setForm({...form, color: e.target.value})}
                                    className="w-full h-full p-0 border-0 rounded-lg cursor-pointer bg-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl text-slate-500 hover:text-slate-800">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white gap-2 font-medium">
                            <Save className="w-4 h-4" />
                            Guardar Cuenta
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
