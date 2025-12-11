'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, ArrowLeft, PiggyBank, Receipt, DollarSign, TrendingUp, Wallet, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ExpenseDialog, ExpenseForm } from '@/components/apps/mi-hogar/expenses/expense-dialog';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

type Expense = {
    id: string;
    title: string;
    amount: number;
    paid_by: string; // 'Mi' | 'Partner'
    category: string;
    date: string;
    created_at: string;
};

const DEFAULT_FORM: ExpenseForm = {
    title: '',
    amount: 0,
    paid_by: 'Mi',
    category: '',
    date: new Date().toISOString().split('T')[0],
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState<ExpenseForm>(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;
            setExpenses(data || []);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            toast.error('Error al cargar la hucha');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            const payload = {
                user_id: user.id,
                title: formData.title,
                amount: formData.amount,
                paid_by: formData.paid_by,
                category: formData.category,
                date: formData.date
            };

            if (formData.id) {
                const { error } = await supabase.from('expenses').update(payload).eq('id', formData.id);
                if (error) throw error;
                toast.success('Gasto actualizado');
            } else {
                const { error } = await supabase.from('expenses').insert([payload]);
                if (error) throw error;
                toast.success('Gasto apuntado 💰');
            }

            setIsDialogOpen(false);
            setFormData(DEFAULT_FORM);
            fetchExpenses();

        } catch (error) {
            console.error('Save error:', error);
            toast.error('Error al guardar el gasto');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Borrar este gasto?')) return;
        try {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) throw error;
            setExpenses(expenses.filter(e => e.id !== id));
            toast.success('Gasto eliminado');
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    // Calculations
    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const myTotal = expenses.filter(e => e.paid_by === 'Mi').reduce((acc, curr) => acc + curr.amount, 0);
    const partnerTotal = expenses.filter(e => e.paid_by === 'Partner').reduce((acc, curr) => acc + curr.amount, 0);

    // Balance: Assuming 50/50 split
    // "I paid X, half was for me, half for partner." -> Partner owes me X/2
    // "Partner paid Y, half for me, half for them." -> I owe partner Y/2
    // Net: (MyPaid/2) - (PartnerPaid/2) = (MyPaid - PartnerPaid) / 2
    // If positive: Partner owes me. If negative: I owe partner.
    const netBalance = (myTotal - partnerTotal) / 2;

    // Chart Data
    const categoryData = Object.entries(expenses.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <Link href="/apps/mi-hogar">
                            <Button variant="ghost" className="pl-0 mb-2 hover:pl-2 transition-all">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <span className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
                                <PiggyBank className="w-8 h-8" />
                            </span>
                            Hucha Común
                        </h1>
                    </div>
                    <Button onClick={() => { setFormData(DEFAULT_FORM); setIsDialogOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full md:w-auto shadow-lg shadow-emerald-500/20">
                        <Plus className="w-4 h-4 mr-2" /> Añadir Gasto
                    </Button>
                </div>

                {/* Balance Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Wallet className="w-4 h-4" /> Total Gastado
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalSpent.toFixed(2)}€</div>
                            <p className="text-xs text-muted-foreground mt-1">Acumulado total</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" /> Tu Aportación
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{myTotal.toFixed(2)}€</div>
                            <p className="text-xs text-muted-foreground mt-1">vs {partnerTotal.toFixed(2)}€ (Pareja)</p>
                        </CardContent>
                    </Card>

                    <Card className={cn(
                        "border-l-4",
                        netBalance > 0 ? "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10" :
                            netBalance < 0 ? "border-l-rose-500 bg-rose-50/50 dark:bg-rose-900/10" :
                                "border-l-slate-300"
                    )}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <DollarSign className="w-4 h-4" /> Balance (50/50)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={cn("text-2xl font-bold", netBalance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
                                {Math.abs(netBalance).toFixed(2)}€
                            </div>
                            <p className="text-sm font-medium mt-1">
                                {netBalance > 0 ? 'Te deben' : netBalance < 0 ? 'Debes' : 'Estáis en paz'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Expense List */}
                    <div className="lg:col-span-2 space-y-4">
                        <h2 className="font-semibold text-lg flex items-center gap-2">
                            <Receipt className="w-5 h-5" /> Movimientos
                        </h2>
                        {expenses.length === 0 ? (
                            <Card className="p-8 text-center text-muted-foreground border-dashed">
                                <p>No hay gastos registrados aún.</p>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {expenses.map(expense => (
                                    <div key={expense.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs",
                                                expense.paid_by === 'Mi' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                                            )}>
                                                {expense.paid_by === 'Mi' ? 'YO' : 'OTRO'}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-slate-900 dark:text-slate-100">{expense.title}</h3>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{expense.category}</span>
                                                    <span>•</span>
                                                    <span>{format(parseISO(expense.date), 'dd MMM', { locale: es })}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-slate-700 dark:text-slate-300">
                                                {expense.amount.toFixed(2)}€
                                            </span>
                                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(expense.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Chart */}
                    <div className="space-y-4">
                        <h2 className="font-semibold text-lg flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" /> Desglose
                        </h2>
                        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <div className="h-[300px] w-full">
                                {categoryData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {categoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip formatter={(value: number) => `${value}€`} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                        Sin datos suficientes
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            <ExpenseDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                form={formData}
                setForm={setFormData}
                onSave={handleSave}
                saving={saving}
            />
        </div>
    );
}
