'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, ArrowLeft, PiggyBank, Receipt, DollarSign, TrendingUp, Wallet, Trash2, FileText, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShareExpensesDialog } from '@/components/apps/mi-hogar/expenses/share-expenses-dialog';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, X, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

type Expense = {
    id: string;
    title: string;
    amount: number;
    paid_by: 'Mi' | 'Partner';
    category: string;
    date: string;
    user_id?: string;
    receipt_url?: string;
    created_at?: string;
};

type ExpenseForm = {
    id?: string;
    title: string;
    amount: string; // Keeps it as string for Input handling
    paid_by: string; // Can be 'Mi', 'Partner', or UUID
    category: string;
    date: string;
    receipt_url?: string;
};

type Category = {
    id: string;
    name: string;
};


type Settlement = {
    id: string;
    payer_id: string;
    receiver_id: string;
    amount: number;
    created_at: string;
    payment_method: string;
};




const DEFAULT_FORM: ExpenseForm = {
    title: '',
    amount: '', // Initialize as empty string
    paid_by: 'Mi',
    category: '',
    date: new Date().toISOString().split('T')[0],
    receipt_url: undefined,
};


const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];
const DEFAULT_CATEGORIES = ['Comida', 'Hogar', 'Facturas', 'Ocio', 'Viajes', 'Otros'];

export default function ExpensesPage() {
    const [user, setUser] = useState<any>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [partnerCount, setPartnerCount] = useState(0);
    const [nicknames, setNicknames] = useState<Record<string, string>>({});
    const [potentialPayers, setPotentialPayers] = useState<{ id: string, name: string }[]>([]);
    const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
    const [isSettleDialogOpen, setIsSettleDialogOpen] = useState(false);
    const [formData, setFormData] = useState<ExpenseForm>(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isCustomCategory, setIsCustomCategory] = useState(false);

    // Settlement State
    const [paymentMethod, setPaymentMethod] = useState('Efectivo');
    const [selectedReceiver, setSelectedReceiver] = useState<string>('');
    const [settleAmount, setSettleAmount] = useState('');

    useEffect(() => {
        fetchExpenses();
        if (user) fetchCategories(user.id);
    }, [user]);

    useEffect(() => {
        if (user && formData.paid_by === 'Mi') {
            setFormData(prev => ({ ...prev, paid_by: user.id }));
        }
    }, [user, formData.paid_by]);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);

                // Fetch Partner Count
                const { count } = await supabase
                    .from('expense_partners')
                    .select('*', { count: 'exact', head: true })
                    .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

                if (count !== null) setPartnerCount(count);
            }

            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;
            setExpenses(data || []);

            // Fetch Settlements
            const { data: settlementData } = await supabase
                .from('settlements')
                .select('*')
                .order('created_at', { ascending: false });
            setSettlements(settlementData || []);

            // Fetch ALL Linked Partners for Potential Payers logic
            // (Crucial: Must include partners even if they haven't created expenses yet)
            const { data: partnersData } = await supabase
                .from('expense_partners')
                .select('user_id_1, user_id_2')
                .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

            // Extract distinct Partner IDs
            const partnerIds = new Set<string>();
            if (partnersData) {
                partnersData.forEach(p => {
                    const pid = p.user_id_1 === user.id ? p.user_id_2 : p.user_id_1;
                    if (pid) partnerIds.add(pid);
                });
            }

            // Also include IDs from existing expenses (in case of legacy/unlinked but present data)
            if (data) {
                data.forEach(e => {
                    if (e.user_id && e.user_id !== user.id) partnerIds.add(e.user_id);
                });
            }

            // Fetch Profiles for everyone involved
            const allInvolvedIds = Array.from(partnerIds);
            // Always include myself
            if (!allInvolvedIds.includes(user.id)) allInvolvedIds.push(user.id);

            if (allInvolvedIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, nickname')
                    .in('id', allInvolvedIds);

                if (profiles) {
                    const map: Record<string, string> = {};
                    profiles.forEach(p => {
                        if (p.nickname) map[p.id] = p.nickname;
                    });
                    setNicknames(map);

                    const payers = profiles.map(p => ({
                        id: p.id,
                        name: p.id === user.id ? (p.nickname || 'Yo') : (p.nickname || 'Usuario')
                    }));

                    // Ensure "Yo" is always first/identifiable or just use the mapped list
                    // Sort so "Yo" isn't buried
                    payers.sort((a, b) => (a.id === user.id ? -1 : b.id === user.id ? 1 : 0));

                    setPotentialPayers(payers);
                }
            } else {
                setPotentialPayers([{ id: user.id, name: 'Yo' }]);
            }

        } catch (error) {
            console.error('Error fetching expenses:', error);
            toast.error('Error al cargar la hucha');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('expense_categories')
                .select('*')
                .order('name');

            if (error) throw error;

            if (!data || data.length === 0) {
                // Seed defaults
                const seedData = DEFAULT_CATEGORIES.map(name => ({
                    name,
                    created_by: userId
                }));
                const { data: newData, error: seedError } = await supabase
                    .from('expense_categories')
                    .insert(seedData)
                    .select();

                if (seedError) {
                    // Ignore unique constraint violation (code 23505) if race condition occurred
                    if (seedError.code !== '23505') throw seedError;

                    // If failed, re-fetch to get the existing ones
                    const { data: refetched } = await supabase
                        .from('expense_categories')
                        .select('*')
                        .order('name');
                    setAvailableCategories(refetched || []);
                } else {
                    setAvailableCategories(newData || []);
                }
            } else {
                setAvailableCategories(data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            // Fallback to defaults in memory if DB fails
            setAvailableCategories(DEFAULT_CATEGORIES.map(c => ({ id: 'default-' + c, name: c })));
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('¿Borrar categoría?')) return;
        try {
            const { error } = await supabase.from('expense_categories').delete().eq('id', id);
            if (error) throw error;
            setAvailableCategories(availableCategories.filter(c => c.id !== id));
            toast.success('Categoría eliminada');
        } catch (error) {
            toast.error('Error al borrar categoría');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            let receiptUrl = formData.receipt_url; // Start with existing URL if any

            // Handle New Category Persistence
            if (isCustomCategory && formData.category.trim()) {
                const normalizedCat = formData.category.trim();
                // Check if exists case-insensitive
                const exists = availableCategories.find(c => c.name.toLowerCase() === normalizedCat.toLowerCase());
                if (!exists) {
                    // Save to DB
                    const { data: newCat } = await supabase
                        .from('expense_categories')
                        .insert({ name: normalizedCat, created_by: user.id })
                        .select()
                        .single();

                    if (newCat) {
                        setAvailableCategories([...availableCategories, newCat].sort((a, b) => a.name.localeCompare(b.name)));
                    }
                }
            }

            // Upload new receipt file if provided
            if (receiptFile) {
                const fileExt = receiptFile.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('receipts')
                    .upload(fileName, receiptFile);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('receipts')
                    .getPublicUrl(fileName);

                receiptUrl = publicUrlData.publicUrl;
            }

            const payload = {
                user_id: user.id,
                title: formData.title,
                amount: parseFloat(formData.amount) || 0,
                paid_by: formData.paid_by,
                category: formData.category,
                date: formData.date,
                receipt_url: receiptUrl
            };

            if (formData.id) {
                const { error } = await supabase.from('expenses').update(payload).eq('id', formData.id);
                if (error) throw error;
                toast.success('Gasto actualizado');
            } else {
                const { error } = await supabase.from('expenses').insert([payload]);
                if (error) throw error;
                toast.success('Gasto añadido');
            }

            setFormData(DEFAULT_FORM);
            setReceiptFile(null); // Clear file input after save
            setIsDialogOpen(false);
            fetchExpenses();
        } catch (error: any) {
            console.error('Error saving expense:', error);
            toast.error('Error al guardar: ' + (error.message || 'Inténtalo de nuevo'));
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
    const myTotal = expenses
        .filter(e => {
            if (!user) return false;
            // Legacy Logic:
            const isMyRecord = e.user_id === user.id;
            const isLegacyMyPay = (isMyRecord && e.paid_by === 'Mi') || (!isMyRecord && e.paid_by === 'Partner');

            // New Logic (UUID):
            const isExplicitPay = e.paid_by === user.id;

            return isExplicitPay || isLegacyMyPay;
        })
        .reduce((sum, expense) => sum + expense.amount, 0);

    const partnerTotal = totalSpent - myTotal;

    // Dynamic Split: Me + Partners
    const totalPeople = 1 + partnerCount;
    const fairShare = totalSpent / totalPeople;

    // Settlements Calculation
    const myPaidSettlements = settlements.filter(s => s.payer_id === user?.id).reduce((sum, s) => sum + s.amount, 0);
    const myReceivedSettlements = settlements.filter(s => s.receiver_id === user?.id).reduce((sum, s) => sum + s.amount, 0);

    // --- PAIRWISE DEBT CALCULATION (Unified Logic) ---
    // 1. Calculate how much everyone owes everyone else based on expenses
    const debtMatrix: Record<string, Record<string, number>> = {};
    const allUsers = potentialPayers.map(p => p.id);

    // Init matrix
    allUsers.forEach(u1 => {
        debtMatrix[u1] = {};
        allUsers.forEach(u2 => {
            if (u1 !== u2) debtMatrix[u1][u2] = 0;
        });
    });

    expenses.forEach(e => {
        // Resolve Payer
        let payerId = e.user_id; // Default to creator
        if (e.paid_by === user?.id) payerId = user.id;
        else if (e.paid_by === 'Mi') payerId = e.user_id;
        else if (e.paid_by === 'Partner') payerId = e.user_id === user?.id ? (potentialPayers.find(p => p.id !== user.id)?.id || '') : user?.id; // Guesswork for legacy
        else if (e.paid_by && e.paid_by.length > 10) payerId = e.paid_by; // UUID

        if (!allUsers.includes(payerId)) return; // Unknown payer

        const amount = e.amount;
        // Using allUsers.length is safer than partnerCount because it maps to actual known users in the JS context
        const split = amount / (allUsers.length || 1);

        allUsers.forEach(debtorId => {
            if (debtorId !== payerId) {
                if (debtMatrix[debtorId][payerId] !== undefined) {
                    debtMatrix[debtorId][payerId] += split;
                }
            }
        });
    });

    // 2. Apply Settlements (Direct Reductions)
    settlements.forEach(s => {
        if (debtMatrix[s.payer_id] && debtMatrix[s.payer_id][s.receiver_id] !== undefined) {
            debtMatrix[s.payer_id][s.receiver_id] -= s.amount;
        }
    });

    // 3. Determine My Specific Debts & Global Net Balance
    let totalIOwe = 0;
    let totalOwedToMe = 0;

    const mySpecificDebts = potentialPayers
        .filter(p => p.id !== user?.id)
        .map(p => {
            const iOweThem = debtMatrix[user?.id]?.[p.id] || 0;
            const theyOweMe = debtMatrix[p.id]?.[user?.id] || 0;

            // Net for this specific relationship
            const net = iOweThem - theyOweMe;

            if (net > 0) totalIOwe += net;
            else totalOwedToMe += Math.abs(net);

            return {
                ...p,
                netOwed: net // Positive = I owe them. Negative = They owe me.
            };
        })
        .filter(p => Math.abs(p.netOwed) > 0.01); // Show all non-zero relationships

    // Unified Net Balance: (People Owe Me) - (I Owe People)
    // If Positive: I am owed money.
    // If Negative: I owe money.
    const netBalance = totalOwedToMe - totalIOwe;


    const handleSettleDebt = async () => {
        if (!selectedReceiver || !settleAmount) return;
        try {
            const { error } = await supabase.from('settlements').insert({
                payer_id: user.id,
                receiver_id: selectedReceiver,
                amount: parseFloat(settleAmount),
                payment_method: paymentMethod
            });
            if (error) throw error;
            toast.success('Deuda saldada');
            setIsSettleDialogOpen(false);
            fetchExpenses();
            setSettleAmount('');
        } catch (error) {
            toast.error('Error al guardar');
        }
    };

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

                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <Button variant="outline" onClick={() => setIsShareDialogOpen(true)} className="w-full md:w-auto">
                            <UserPlus className="w-4 h-4 mr-2" /> Compartir
                        </Button>
                        <Button onClick={() => { setFormData(DEFAULT_FORM); setReceiptFile(null); setIsDialogOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full md:w-auto shadow-lg shadow-emerald-500/20">
                            <Plus className="w-4 h-4 mr-2" /> Añadir Gasto
                        </Button>
                    </div>
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
                                <TrendingUp className="w-4 h-4" /> Aportaciones
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600 mb-2">{myTotal.toFixed(2)}€</div>

                            <div className="space-y-1">
                                {potentialPayers.map(p => {
                                    // Calculate total for this specific payer
                                    const amount = expenses.reduce((sum, e) => {
                                        // Resolve payer for expense 'e'
                                        let payerId = e.user_id;
                                        if (e.paid_by === user?.id) payerId = user.id;
                                        else if (e.paid_by === 'Mi') payerId = e.user_id;
                                        else if (e.paid_by === 'Partner') payerId = e.user_id === user?.id ? (potentialPayers.find(pi => pi.id !== user.id)?.id || '') : user?.id;
                                        else if (e.paid_by && e.paid_by.length > 10) payerId = e.paid_by;

                                        return payerId === p.id ? sum + e.amount : sum;
                                    }, 0);

                                    if (amount < 0.01 && p.id !== user?.id) return null; // Hide others with 0 contribution

                                    return (
                                        <div key={p.id} className="flex justify-between text-xs items-center">
                                            <span className={cn("truncate max-w-[100px]", p.id === user?.id ? "font-bold" : "text-muted-foreground")}>
                                                {p.name}
                                            </span>
                                            <span className="font-mono">{amount.toFixed(2)}€</span>
                                        </div>
                                    );
                                })}
                            </div>
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
                                <DollarSign className="w-4 h-4" /> Balance (Entre {allUsers.length || 1})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={cn("text-2xl font-bold mb-2", netBalance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
                                {netBalance > 0 ? "+" : ""}{netBalance.toFixed(2)}€
                            </div>

                            <div className="space-y-2 mt-2">
                                {mySpecificDebts.length > 0 ? (
                                    mySpecificDebts.map(d => (
                                        <div key={d.id} className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-1 last:border-0 last:pb-0">
                                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px]" title={d.name}>
                                                {d.name}
                                            </span>
                                            {d.netOwed > 0 ? (
                                                <span className="text-rose-600 flex items-center gap-1">
                                                    debes <span className="font-bold">{d.netOwed.toFixed(2)}€</span>
                                                </span>
                                            ) : (
                                                <span className="text-emerald-600 flex items-center gap-1">
                                                    te debe <span className="font-bold">{Math.abs(d.netOwed).toFixed(2)}€</span>
                                                </span>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">Cuentas saldadas</p>
                                )}
                            </div>

                            <Button
                                variant={netBalance !== 0 ? "default" : "secondary"}
                                size="sm"
                                className="w-full mt-3 h-8 text-xs bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                                onClick={() => setIsSettleDialogOpen(true)}
                                disabled={Math.abs(netBalance) < 0.01}
                            >
                                Saldar Deudas
                            </Button>
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
                                {expenses.map(expense => {
                                    // Determine Payer Name
                                    // 1. If paid_by matches a user ID -> Use nickname/Yo
                                    // 2. Legacy 'Mi'/'Partner' fallback

                                    let iPaid = false;
                                    let payerName = 'Otro';

                                    if (expense.paid_by === user?.id) {
                                        iPaid = true;
                                        payerName = nicknames[user.id] || 'Yo';
                                    } else if (expense.paid_by === 'Mi') {
                                        // Legacy: 'Mi' means creator paid.
                                        if (expense.user_id === user?.id) {
                                            iPaid = true;
                                            payerName = 'Yo';
                                        } else {
                                            payerName = nicknames[expense.user_id || ''] || 'Compi';
                                        }
                                    } else if (expense.paid_by === 'Partner') {
                                        // Legacy: Creator said 'Partner' paid.
                                        if (expense.user_id !== user?.id) {
                                            payerName = 'Otro';
                                        }
                                    } else {
                                        // paid_by is a UUID of someone else
                                        if (nicknames[expense.paid_by]) {
                                            payerName = nicknames[expense.paid_by];
                                            if (expense.paid_by === user?.id) iPaid = true; // Should be covered by first check but just in case
                                        }
                                    }

                                    return (
                                        <div key={expense.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-colors",
                                                        iPaid ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                                                    )}>
                                                        {iPaid ? 'YO' : 'OTRO'}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-medium max-w-[60px] truncate">
                                                        {payerName}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <h3 className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                        {expense.title}
                                                        {expense.receipt_url && (
                                                            <a
                                                                href={expense.receipt_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-slate-400 hover:text-blue-500 transition-colors"
                                                                title="Ver Factura"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>{expense.category}</span>
                                                        <span>•</span>
                                                        <span>{format(parseISO(expense.date), 'dd MMM', { locale: es })}</span>
                                                    </div>
                                                    {/* DEBUG INFO REMOVED */}
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
                                    );
                                })}
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{formData.id ? 'Editar Gasto' : 'Nuevo Gasto'}</DialogTitle>
                        <DialogDescription>Rellena los detalles del gasto.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Concepto</Label>
                            <Input
                                placeholder="Ej: Compra Mercadona"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Importe (€)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Pagado por</Label>
                                <Select value={formData.paid_by} onValueChange={(v) => setFormData({ ...formData, paid_by: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {potentialPayers.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                        {potentialPayers.length === 0 && <SelectItem value="Mi">Mí</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Categoría</Label>
                            <div className="flex gap-2">
                                {isCustomCategory ? (
                                    <Input
                                        placeholder="Nueva categoría..."
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        autoFocus
                                    />
                                ) : (
                                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Selecciona..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableCategories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                        setIsCustomCategory(!isCustomCategory);
                                        if (!isCustomCategory) setFormData({ ...formData, category: '' }); // Clear when switching to custom
                                    }}
                                    title={isCustomCategory ? "Elegir de lista" : "Añadir nueva"}
                                >
                                    {isCustomCategory ? <Receipt className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </Button>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsManageCategoriesOpen(true)}
                                    title="Gestionar Categorías"
                                >
                                    <Settings className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Fecha</Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Adjuntar Factura/Ticket (Opcional)</Label>
                            <Input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                            />
                        </div>

                        <DialogFooter className="mt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Guardar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Manage Categories Dialog */}
            <Dialog open={isManageCategoriesOpen} onOpenChange={setIsManageCategoriesOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Gestionar Categorías</DialogTitle>
                        <DialogDescription>
                            Elimina las categorías que no uses.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
                        {availableCategories.length === 0 && <p className="text-center text-muted-foreground text-sm">No hay categorías.</p>}
                        {availableCategories.map((cat) => (
                            <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg border bg-slate-50 dark:bg-slate-900">
                                <span className="text-sm font-medium">{cat.name}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleDeleteCategory(cat.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsManageCategoriesOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>



            {/* Settle Debt Dialog */}
            <Dialog open={isSettleDialogOpen} onOpenChange={setIsSettleDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Saldar Deuda</DialogTitle>
                        <DialogDescription>
                            Elige a quién pagar y cómo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border text-center">
                            <span className="text-sm text-muted-foreground">Tu Balance</span>
                            <div className={cn("text-2xl font-bold", netBalance < 0 ? "text-rose-500" : "text-emerald-500")}>
                                {Math.abs(netBalance).toFixed(2)} €
                                <span className="text-sm font-normal text-muted-foreground block">
                                    {netBalance < 0 ? "Debes en total" : "Te deben en total"}
                                </span>
                            </div>
                        </div>


                        {netBalance !== 0 && (
                            <div className="space-y-4">
                                {mySpecificDebts.length > 0 && (
                                    <div className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded">
                                        <strong className="block mb-2">Desglose:</strong>
                                        <ul className="space-y-1">
                                            {/* Who Owes Me */}
                                            {mySpecificDebts.filter(d => d.netOwed < 0).map(d => (
                                                <li key={d.id} className="text-emerald-600 dark:text-emerald-400">
                                                    Te debe {d.name}: <strong>{Math.abs(d.netOwed).toFixed(2)}€</strong>
                                                </li>
                                            ))}

                                            {/* Who I Owe */}
                                            {mySpecificDebts.filter(d => d.netOwed > 0).map(d => (
                                                <li key={d.id} className="text-rose-600 dark:text-rose-400">
                                                    Debes a {d.name}: <strong>{d.netOwed.toFixed(2)}€</strong>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {netBalance < 0 && (
                                    <>
                                        <div className="space-y-1">
                                            <Label>¿A quién pagas?</Label>
                                            <Select onValueChange={(val) => {
                                                setSelectedReceiver(val);
                                                // Auto-fill recommended amount for this specific person
                                                const specificDebt = mySpecificDebts.find(d => d.id === val);
                                                if (specificDebt && specificDebt.netOwed > 0) {
                                                    setSettleAmount(specificDebt.netOwed.toFixed(2));
                                                }
                                            }} value={selectedReceiver}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar compañaero" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {potentialPayers
                                                        .filter(p => p.id !== user?.id)
                                                        .filter(p => {
                                                            const debt = mySpecificDebts.find(d => d.id === p.id);
                                                            return debt && debt.netOwed > 0; // Only show people I OWE money to
                                                        })
                                                        .map(p => (
                                                            <SelectItem key={p.id} value={p.id}>
                                                                {p.name}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1">
                                            <Label>Cantidad (€)</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={settleAmount}
                                                onChange={(e) => setSettleAmount(e.target.value)}
                                                placeholder="0.00"
                                            />
                                            {selectedReceiver && (() => {
                                                const specificDebt = mySpecificDebts.find(d => d.id === selectedReceiver);
                                                return specificDebt ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        Deuda total con {specificDebt.name}: {specificDebt.netOwed.toFixed(2)} €
                                                    </p>
                                                ) : null;
                                            })()}
                                        </div>

                                        <div className="space-y-1">
                                            <Label>Forma de Pago</Label>
                                            <Select onValueChange={setPaymentMethod} value={paymentMethod}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Método" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                                                    <SelectItem value="Bizum">Bizum</SelectItem>
                                                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                                                    <SelectItem value="Otro">Otro</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <Button
                                            className="w-full mt-4"
                                            onClick={handleSettleDebt}
                                            disabled={!selectedReceiver || !settleAmount}
                                        >
                                            Pagar {settleAmount || '0'} €
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}

                        {netBalance >= 0 && (
                            <p className="text-center text-sm text-muted-foreground">
                                No tienes deudas pendientes. ¡Genial!
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>


            <ShareExpensesDialog
                open={isShareDialogOpen}
                onOpenChange={setIsShareDialogOpen}
            />
        </div >
    );
}
