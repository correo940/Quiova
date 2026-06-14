'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Landmark, Save, Link2 } from 'lucide-react';

type LinkableAccount = { id: string; name: string; bank_name?: string; parent_account_id?: string | null };

const BANKS = [
    { name: 'BBVA', color: '#004481', logo: 'https://www.google.com/s2/favicons?domain=bbva.es&sz=128', url: 'https://www.bbva.es' },
    { name: 'Santander', color: '#EC0000', logo: 'https://www.google.com/s2/favicons?domain=bancosantander.es&sz=128', url: 'https://www.bancosantander.es' },
    { name: 'CaixaBank', color: '#007dbd', logo: 'https://www.google.com/s2/favicons?domain=caixabank.es&sz=128', url: 'https://www.caixabank.es' },
    { name: 'Sabadell', color: '#006dff', logo: 'https://www.google.com/s2/favicons?domain=bancsabadell.com&sz=128', url: 'https://www.bancsabadell.com' },
    { name: 'ING', color: '#FF6200', logo: 'https://www.google.com/s2/favicons?domain=ing.es&sz=128', url: 'https://www.ing.es' },
    { name: 'Openbank', color: '#EC0000', logo: 'https://www.google.com/s2/favicons?domain=openbank.es&sz=128', url: 'https://www.openbank.es' },
    { name: 'Revolut', color: '#4079FA', logo: 'https://www.google.com/s2/favicons?domain=revolut.com&sz=128', url: 'https://www.revolut.com' },
    { name: 'N26', color: '#36a18b', logo: 'https://www.google.com/s2/favicons?domain=n26.com&sz=128', url: 'https://n26.com' },
    { name: 'Trade Republic', color: '#0e0e0e', logo: 'https://www.google.com/s2/favicons?domain=traderepublic.com&sz=128', url: 'https://traderepublic.com' },
    { name: 'Efectivo', color: '#10b981', logo: null, url: null },
    { name: 'Otro', color: '#64748b', logo: null, url: null },
];

export default function AddAccountDialog({
    open,
    onOpenChange,
    userId,
    accounts = [],
    onSuccess
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
    accounts?: LinkableAccount[];
    onSuccess: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLinked, setIsLinked] = useState(false);
    const [parentAccountId, setParentAccountId] = useState('');
    const [form, setForm] = useState({
        name: '',
        bank_name: 'Efectivo',
        current_balance: '0',
        account_type: 'libre',
        color: '#F5C400' // Quioba Gold default
    });

    // Solo cuentas independientes pueden ser principales (un sobre no puede tener sobres)
    const linkTargets = accounts.filter(a => !a.parent_account_id);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const bankInfo = BANKS.find(b => b.name === form.bank_name);
            const { error } = await supabase.from('savings_accounts').insert({
                user_id: userId,
                name: form.name || 'Nueva Cuenta',
                bank_name: form.bank_name,
                current_balance: parseFloat(form.current_balance) || 0,
                color: form.color,
                logo_url: bankInfo ? bankInfo.logo : null,
                parent_account_id: isLinked && parentAccountId ? parentAccountId : null
            });

            if (error) throw error;
            toast.success('Cuenta creada con éxito');
            setIsLinked(false);
            setParentAccountId('');
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
            <DialogContent className="sm:max-w-[425px] bg-[#faf8f0] dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh]">
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

                <form onSubmit={handleSubmit} className="space-y-4 mt-4 overflow-y-auto flex-1 pr-1">
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
                    <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Entidad Bancaria</label>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                            {BANKS.map(bank => (
                                <button
                                    key={bank.name}
                                    type="button"
                                    onClick={() => {
                                        setForm({
                                            ...form, 
                                            bank_name: bank.name,
                                            color: bank.color || form.color
                                        });
                                    }}
                                    className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${form.bank_name === bank.name ? 'border-[#F5C400] bg-[#F5C400]/10' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                >
                                    {bank.logo ? (
                                        <img src={bank.logo} alt={bank.name} className="w-6 h-6 mb-1 rounded-sm object-contain" />
                                    ) : (
                                        <div className="w-6 h-6 mb-1 bg-slate-100 rounded-sm flex items-center justify-center"><Landmark className="w-4 h-4 text-slate-400" /></div>
                                    )}
                                    <span className="text-[9px] font-semibold text-slate-600 truncate w-full text-center">{bank.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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


                    {linkTargets.length > 0 && (
                        <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isLinked}
                                    onChange={e => setIsLinked(e.target.checked)}
                                    className="h-4 w-4 accent-amber-500"
                                />
                                <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                                    <Link2 className="w-4 h-4" />
                                    Vincular a otra cuenta
                                </span>
                            </label>
                            <p className="text-[11px] leading-snug text-amber-700/80">
                                El dinero se queda físicamente aquí (sigue generando intereses), pero contará como disponible
                                para la cuenta principal. Ideal para ahorrar en una cuenta al 3% y poder gastarlo desde la del día a día.
                            </p>
                            {isLinked && (
                                <select
                                    value={parentAccountId}
                                    onChange={e => setParentAccountId(e.target.value)}
                                    className="flex h-10 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                                >
                                    <option value="">Selecciona la cuenta principal…</option>
                                    {linkTargets.map(a => (
                                        <option key={a.id} value={a.id}>🗂 Vincular a: {a.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

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
