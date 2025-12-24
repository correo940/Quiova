'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ArrowLeft,
    PiggyBank,
    Plus,
    Landmark,
    TrendingUp,
    Calendar,
    Target,
    Lock,
    ExternalLink,
    Wallet,
    Trash2,
    Save
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format, startOfMonth, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { Progress } from '@/components/ui/progress';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Types
type BankAccount = {
    id: string;
    name: string;
    bank_name: string;
    color: string;
    password_id?: string; // Linked password
    current_balance: number;
    logo_type: 'icon' | 'url';
    logo_url?: string;
    interest_rate?: number; // New: Interest Rate for Account
};

type SavingsGoal = {
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    deadline?: string;
    color: string;
    icon?: string;
    linked_account_id?: string;
    interest_rate?: number;
};

type MonthlyRecord = {
    id: string;
    account_id: string;
    month_date: string;
    balance_start: number;
    balance_end: number;
    savings_amount?: number; // Calculated
    notes?: string;
};

// Mock Bank Logos/Colors
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

export default function SavingsPage() {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const [monthlyStats, setMonthlyStats] = useState({ income: 0, expense: 0 });
    const [chartData, setChartData] = useState<any[]>([]);
    const [passwords, setPasswords] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);

    // Detail States
    const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

    // Transactions State (Shared logic for Account/Goal)
    const [transactions, setTransactions] = useState<{ id: string, amount: number, date: string, description: string }[]>([]);
    const [transType, setTransType] = useState<'deposit' | 'expense'>('deposit');
    const [newTransaction, setNewTransaction] = useState({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });

    // Dialog States
    const [isGoalDetailOpen, setIsGoalDetailOpen] = useState(false);
    const [isAccountDetailOpen, setIsAccountDetailOpen] = useState(false);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);

    // Forms
    const [newAccount, setNewAccount] = useState<{ name: string, bank: string, color: string, passId: string, customBankName?: string, interestRate: string }>({ name: '', bank: 'Otro', color: '#64748b', passId: 'none', interestRate: '' });
    const [newGoal, setNewGoal] = useState({ name: '', target: '', current: '', deadline: '', linkedAccountId: 'none', interestRate: '' });


    useEffect(() => {
        if (user) {
            fetchData();
            fetchPasswordsLite();
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Accounts
            const { data: accs } = await supabase
                .from('savings_accounts')
                .select('*')
                .eq('user_id', user?.id)
                .order('name');
            setAccounts(accs || []);

            // 2. Goals
            const { data: gls } = await supabase
                .from('savings_goals')
                .select('*')
                .eq('user_id', user?.id)
                .order('deadline', { ascending: true });
            setGoals(gls || []);

            // 3. Transactions (Last 30 days for stats & chart)
            // We fetch all transactions to reconstruct history correctly if needed, or just last 30 days if we assume current balance is correct
            // To reconstruct history chart from current balance, we need transactions in reverse chronological order.
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: txs } = await supabase
                .from('savings_account_transactions')
                .select('*')
                .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
                .in('account_id', accs?.map(a => a.id) || [])
                .order('date', { ascending: false }); // Newest first

            setRecentTransactions(txs || []);

            // Calculate Monthly Stats (Current Month)
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            let mIncome = 0;
            let mExpense = 0;

            (txs || []).forEach(tx => {
                const d = new Date(tx.date);
                if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    if (tx.amount > 0) mIncome += tx.amount;
                    else mExpense += Math.abs(tx.amount);
                }
            });
            setMonthlyStats({ income: mIncome, expense: mExpense });

            // Calculate Chart Data (Reconstruct backwards)
            // Start with current total balance
            let currentTotal = accs?.reduce((sum, a) => sum + (a.current_balance || 0), 0) || 0;
            const dailyBalances = [];

            // Loop last 30 days
            for (let i = 0; i < 30; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];

                // Push current state
                dailyBalances.push({
                    date: format(d, 'd MMM', { locale: es }),
                    fullDate: dateStr, // for comparing
                    balance: currentTotal
                });

                // Reverse transactions of this day to find previous day's balance
                // If today we have balance X and transaction +100 happened today, yesterday we had X - 100
                const daysTransactions = (txs || []).filter(t => t.date === dateStr);
                const daysChange = daysTransactions.reduce((sum, t) => sum + t.amount, 0);

                currentTotal -= daysChange; // Go back in time
            }

            setChartData(dailyBalances.reverse());

        } catch (error) {
            console.error(error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const fetchPasswordsLite = async () => {
        const { data } = await supabase
            .from('passwords')
            .select('id, name')
            .eq('user_id', user?.id)
            .order('name');
        setPasswords(data || []);
    };

    // --- GENERIC TRANSACTION FETCHERS ---
    const fetchGoalTransactions = async (goalId: string) => {
        const { data } = await supabase
            .from('savings_goal_transactions')
            .select('*')
            .eq('goal_id', goalId)
            .order('date', { ascending: false });
        setTransactions(data || []);
    };

    const fetchAccountTransactions = async (accountId: string) => {
        const { data } = await supabase
            .from('savings_account_transactions') // Assuming new table
            .select('*')
            .eq('account_id', accountId)
            .order('date', { ascending: false });
        setTransactions(data || []);
    };

    // --- OPEN DETAIL HANDLERS ---
    const handleOpenGoalDetail = async (goal: SavingsGoal) => {
        setSelectedGoal(goal);
        setTransType('deposit');
        setNewTransaction({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });
        setTransactions([]); // Clear prev
        await fetchGoalTransactions(goal.id);
        setIsGoalDetailOpen(true);
    };

    const handleOpenAccountDetail = async (acc: BankAccount) => {
        setSelectedAccount(acc);
        setTransType('deposit');
        setNewTransaction({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });
        setTransactions([]); // Clear prev
        await fetchAccountTransactions(acc.id);
        setIsAccountDetailOpen(true);
    };

    // --- ACTIONS ---

    const handleCreateAccount = async () => {
        if (!newAccount.name) return toast.error('Nombre obligatorio');
        try {
            let bankName = newAccount.bank;
            let bankColor = newAccount.color;
            let bankLogo = null;

            if (newAccount.bank === 'Otro') {
                if (!newAccount.customBankName) return toast.error('Escribe el nombre del banco');
                bankName = newAccount.customBankName;
            } else {
                const bankInfo = BANKS.find(b => b.name === newAccount.bank) || { color: '#64748b', logo: null };
                bankColor = bankInfo.color;
                bankLogo = bankInfo.logo;
            }

            const payload = {
                user_id: user?.id,
                name: newAccount.name,
                bank_name: bankName,
                color: bankColor,
                logo_url: bankLogo,
                password_id: newAccount.passId === 'none' ? null : newAccount.passId,
                interest_rate: newAccount.interestRate ? parseFloat(newAccount.interestRate) : 0
            };
            const { error } = await supabase.from('savings_accounts').insert(payload);
            if (error) throw error;
            toast.success('Cuenta creada');
            setIsAddAccountOpen(false);
            setNewAccount({ name: '', bank: 'Otro', color: '#64748b', passId: 'none', interestRate: '' });
            fetchData();
        } catch (error) {
            toast.error('Error al crear cuenta');
        }
    };

    const handleCreateGoal = async () => {
        if (!newGoal.name || !newGoal.target) return toast.error('Rellena los campos obligatorios');
        try {
            const payload = {
                user_id: user?.id,
                name: newGoal.name,
                target_amount: parseFloat(newGoal.target),
                current_amount: parseFloat(newGoal.current) || 0,
                deadline: newGoal.deadline || null,
                color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                linked_account_id: newGoal.linkedAccountId === 'none' ? null : newGoal.linkedAccountId,
                interest_rate: newGoal.interestRate ? parseFloat(newGoal.interestRate) : 0
            };
            const { error } = await supabase.from('savings_goals').insert(payload);
            if (error) throw error;
            toast.success('Meta creada');
            setIsAddGoalOpen(false);
            setNewGoal({ name: '', target: '', deadline: '', linkedAccountId: 'none', interestRate: '' });
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Error al crear meta');
        }
    };

    const handleAddGoalTransaction = async () => {
        if (!selectedGoal || !newTransaction.amount) return toast.error('Importe obligatorio');
        try {
            let amount = parseFloat(newTransaction.amount);
            if (transType === 'expense') amount = -amount;

            // 1. Insert into savings_goal_transactions
            const { error: txError } = await supabase.from('savings_goal_transactions').insert({
                goal_id: selectedGoal.id,
                amount: amount,
                date: newTransaction.date,
                description: newTransaction.description || (transType === 'deposit' ? 'Aporte' : 'Retiro')
            });
            if (txError) throw txError;

            // 2. Update Goal
            const newTotal = (selectedGoal.current_amount || 0) + amount;
            const { error: upError } = await supabase.from('savings_goals')
                .update({ current_amount: newTotal })
                .eq('id', selectedGoal.id);
            if (upError) throw upError;

            toast.success('Movimiento registrado');
            setNewTransaction({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });

            // Refresh
            fetchGoalTransactions(selectedGoal.id);
            fetchData();
            setSelectedGoal({ ...selectedGoal, current_amount: newTotal });
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar movimiento');
        }
    };

    const handleAddAccountTransaction = async () => {
        if (!selectedAccount || !newTransaction.amount) return toast.error('Importe obligatorio');
        try {
            let amount = parseFloat(newTransaction.amount);
            if (transType === 'expense') amount = -amount;

            // 1. Insert into savings_account_transactions
            const { error: txError } = await supabase.from('savings_account_transactions').insert({
                account_id: selectedAccount.id,
                amount: amount,
                date: newTransaction.date,
                description: newTransaction.description || (transType === 'deposit' ? 'Ingreso' : 'Retiro')
            });
            if (txError) throw txError;

            // 2. Update Account
            const newTotal = (selectedAccount.current_balance || 0) + amount;
            const { error: upError } = await supabase.from('savings_accounts')
                .update({ current_balance: newTotal })
                .eq('id', selectedAccount.id);
            if (upError) throw upError;

            toast.success('Movimiento registrado');
            setNewTransaction({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });

            // Refresh
            fetchAccountTransactions(selectedAccount.id);
            fetchData();
            setSelectedAccount({ ...selectedAccount, current_balance: newTotal });
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar movimiento');
        }
    };

    const handleDeleteAccount = async () => {
        if (!selectedAccount) return;
        if (!window.confirm('¿Seguro que quieres eliminar esta cuenta? Se perderá el historial y las metas asociadas.')) return;

        try {
            const { error } = await supabase.from('savings_accounts').delete().eq('id', selectedAccount.id);
            if (error) throw error;
            toast.success('Cuenta eliminada');
            setIsAccountDetailOpen(false);
            setSelectedAccount(null);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar cuenta');
        }
    };

    const navigateToPassword = (passId: string) => {
        window.open(`/apps/mi-hogar/passwords`, '_blank');
    };

    // --- CALCULATIONS ---
    const totalCurrentBalance = accounts.reduce((acc, curr) => acc + (curr.current_balance || 0), 0);
    const totalGoalSaved = goals.reduce((acc, curr) => acc + (curr.current_amount || 0), 0);
    // Include unlinked goals in total total? Or just accounts?
    // Usually "Accounts" is "Liquid Money". Goals can be "Virtual Partitions" OR "External Cash".
    // For now, let's keep totalCurrentBalance as SUM(Accounts).

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    return (
        <div className="container mx-auto p-4 max-w-6xl space-y-8 pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Link href="/apps/mi-hogar">
                        <Button variant="ghost" className="pl-0 mb-2 hover:pl-2 transition-all">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-xl text-amber-600 dark:text-amber-400">
                            <PiggyBank className="w-8 h-8" />
                        </div>
                        Mis Ahorros
                    </h1>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Balance Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                            {totalCurrentBalance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">En {accounts.length} cuentas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ahorrado para Metas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {totalGoalSaved.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{goals.length} metas activas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Cambio este Mes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-bold ${monthlyStats.income >= monthlyStats.expense ? 'text-green-600' : 'text-red-500'}`}>
                            {monthlyStats.income >= monthlyStats.expense ? '+' : '-'}{Math.abs(monthlyStats.income - monthlyStats.expense).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex gap-2">
                            <span className="text-green-600">+{monthlyStats.income.toFixed(0)}€</span>
                            <span className="text-red-500">-{monthlyStats.expense.toFixed(0)}€</span>
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="overview">Resumen</TabsTrigger>
                    <TabsTrigger value="accounts">Cuentas</TabsTrigger>
                    <TabsTrigger value="goals">Metas</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* CHART */}
                        <Card className="col-span-1 md:col-span-2">
                            <CardHeader>
                                <CardTitle>Evolución 30 Días</CardTitle>
                                <CardDescription>Reconstrucción basada en historial</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                        <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={30} />
                                        <YAxis hide domain={['auto', 'auto']} />
                                        <Tooltip
                                            formatter={(value: number) => [value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), 'Balance']}
                                            labelStyle={{ color: 'black' }}
                                        />
                                        <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorBal)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* ACCOUNTS BREAKDOWN */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Distribución por Banco</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {accounts.map(acc => {
                                    const percentage = totalCurrentBalance > 0 ? ((acc.current_balance || 0) / totalCurrentBalance) * 100 : 0;
                                    return (
                                        <div key={acc.id} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <div className="font-medium flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} />
                                                    {acc.name}
                                                </div>
                                                <span className="text-muted-foreground">{acc.current_balance?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                                            </div>
                                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: acc.color }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* RECENT ACTIVITY */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Actividad Reciente</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-0"> {/* Removed padding to look like a list */}
                                {recentTransactions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">Sin movimientos recientes</p>
                                ) : (
                                    <div className="space-y-4">
                                        {recentTransactions.slice(0, 5).map(tx => {
                                            const acc = accounts.find(a => a.id === tx.account_id);
                                            const isPositive = tx.amount > 0;
                                            return (
                                                <div key={tx.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full ${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 rotate-180" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-sm">{tx.description}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {format(parseISO(tx.date), 'd MMM', { locale: es })} • {acc?.name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                        {isPositive ? '+' : ''}{tx.amount} €
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ACCOUNTS TAB */}
                <TabsContent value="accounts" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Mis Cuentas</h2>
                        <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
                            <DialogTrigger asChild>
                                <Button><Plus className="w-4 h-4 mr-2" /> Nueva Cuenta</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Añadir Cuenta</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Nombre</Label>
                                        <Input placeholder="Ej: Ahorros Piso" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Banco</Label>
                                        <Select value={newAccount.bank} onValueChange={(v) => {
                                            const isManual = v === 'Otro';
                                            if (!isManual) {
                                                const bankInfo = BANKS.find(b => b.name === v);
                                                setNewAccount({ ...newAccount, bank: v, color: bankInfo?.color || '#64748b' });
                                            } else {
                                                setNewAccount({ ...newAccount, bank: v });
                                            }
                                        }}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent className="max-h-[200px]">
                                                {BANKS.map(b => (
                                                    <SelectItem key={b.name} value={b.name}>
                                                        <div className="flex items-center gap-2">
                                                            {b.logo ? (
                                                                <img src={b.logo} alt={b.name} className="w-5 h-5 object-contain" />
                                                            ) : (
                                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: b.color }} />
                                                            )}
                                                            {b.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {newAccount.bank === 'Otro' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2"><Label>Nombre Banco</Label><Input value={newAccount.customBankName || ''} onChange={(e) => setNewAccount({ ...newAccount, customBankName: e.target.value })} /></div>
                                            <div className="space-y-2"><Label>Color</Label><input type="color" className="h-9 w-12 p-1 rounded border cursor-pointer" value={newAccount.color} onChange={(e) => setNewAccount({ ...newAccount, color: e.target.value })} /></div>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label>Interés Anual (%)</Label>
                                        <Input type="number" placeholder="Ej: 3.5" value={newAccount.interestRate} onChange={(e) => setNewAccount({ ...newAccount, interestRate: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Contraseña (Opcional)</Label>
                                        <Select onValueChange={(v) => setNewAccount({ ...newAccount, passId: v })}>
                                            <SelectTrigger><SelectValue placeholder="Sin vincular" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Sin vincular</SelectItem>
                                                {passwords.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCreateAccount}>Crear Cuenta</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {accounts.map(acc => (
                            <Card
                                key={acc.id}
                                className="border-l-4 overflow-hidden cursor-pointer hover:shadow-lg transition-all"
                                style={{ borderLeftColor: acc.color }}
                                onClick={() => handleOpenAccountDetail(acc)}
                            >
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg">{acc.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-1">
                                            <Landmark className="w-3 h-3" /> {acc.bank_name}
                                        </CardDescription>
                                    </div>
                                    <div
                                        className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-1.5 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity z-10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const bank = BANKS.find(b => b.name === acc.bank_name);
                                            if (bank?.url) {
                                                window.open(bank.url, '_blank');
                                            }
                                        }}
                                        title="Ir al banco"
                                    >
                                        {acc.logo_url ? <img src={acc.logo_url} className="w-full h-full object-contain" /> : <PiggyBank className="w-6 h-6" style={{ color: acc.color }} />}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold mb-4">
                                        {acc.current_balance?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                                        <span>
                                            {acc.interest_rate ? <span className="text-emerald-600 font-medium bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded">{acc.interest_rate}% APR</span> : 'Sin interés'}
                                        </span>
                                        {acc.password_id && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-6 text-[10px]"
                                                onClick={(e) => { e.stopPropagation(); navigateToPassword(acc.password_id!); }}
                                            >
                                                <Lock className="w-3 h-3 mr-1" />
                                                Pass
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* GOALS TAB */}
                <TabsContent value="goals" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Metas de Ahorro</h2>
                        <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
                            <DialogTrigger asChild>
                                <Button><Plus className="w-4 h-4 mr-2" /> Nueva Meta</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Nueva Meta de Ahorro</DialogTitle>
                                </DialogHeader>
                                {/* ... Goal Form ... */}
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2"><Label>Nombre</Label><Input value={newGoal.name} onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} /></div>
                                    <div className="space-y-2">
                                        <Label>Banco Asociado</Label>
                                        <Select value={newGoal.linkedAccountId} onValueChange={(v) => setNewGoal({ ...newGoal, linkedAccountId: v })}>
                                            <SelectTrigger><SelectValue placeholder="Selecciona un banco..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Sin asociar</SelectItem>
                                                {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.bank_name})</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label>Objetivo (€)</Label><Input type="number" value={newGoal.target} onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })} /></div>
                                        <div className="space-y-2"><Label>Ya tienes (€)</Label><Input type="number" value={newGoal.current} onChange={(e) => setNewGoal({ ...newGoal, current: e.target.value })} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label>Interés (%)</Label><Input type="number" value={newGoal.interestRate} onChange={(e) => setNewGoal({ ...newGoal, interestRate: e.target.value })} /></div>
                                        <div className="space-y-2"><Label>Fecha Límite</Label><Input type="date" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })} /></div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCreateGoal}>Crear Meta</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {goals.map(goal => {
                            const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                            const linkedAcc = accounts.find(a => a.id === goal.linked_account_id);
                            return (
                                <Card key={goal.id} className="relative overflow-hidden cursor-pointer hover:shadow-lg transition-all" onClick={() => handleOpenGoalDetail(goal)}>
                                    <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: goal.color }} />
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex justify-between items-start text-base">
                                            <span className="truncate pr-2">{goal.name}</span>
                                            {goal.deadline && (
                                                <span className="shrink-0 text-xs font-normal text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{format(parseISO(goal.deadline), 'dd MMM')}</span>
                                            )}
                                        </CardTitle>
                                        {(linkedAcc || goal.interest_rate) && (
                                            <CardDescription className="flex items-center gap-2 text-xs pt-1">
                                                {linkedAcc && <span className="flex items-center gap-1">{linkedAcc.logo_url ? <img src={linkedAcc.logo_url} className="w-3 h-3 object-contain" /> : <Landmark className="w-3 h-3" />}{linkedAcc.bank_name}</span>}
                                                {linkedAcc && goal.interest_rate ? <span>•</span> : null}
                                                {goal.interest_rate ? <span className="text-emerald-600 font-medium">{goal.interest_rate}% APR</span> : null}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Progreso</span><span className="font-bold">{progress.toFixed(0)}%</span></div>
                                        <Progress value={progress} className="h-2" />
                                        <div className="flex justify-between items-end"><div className="text-2xl font-bold">{goal.current_amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div><div className="text-xs text-muted-foreground mb-1">de {goal.target_amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div></div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>
            </Tabs>

            {/* GOAL DETAIL DIALOG */}
            <Dialog open={isGoalDetailOpen} onOpenChange={setIsGoalDetailOpen}>
                <DialogContent className="max-w-md sm:max-w-lg">
                    <DialogHeader><DialogTitle>Detalle: {selectedGoal?.name}</DialogTitle></DialogHeader>
                    <div className="space-y-6 py-2">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg text-center relative">
                            <p className="text-sm text-muted-foreground">Saldo Actual</p>
                            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{selectedGoal?.current_amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
                            <p className="text-xs text-muted-foreground mt-1">Meta: {selectedGoal?.target_amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                            {selectedGoal?.interest_rate ? <div className="absolute top-2 right-2 bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-bold">{selectedGoal.interest_rate}% Interés</div> : null}
                        </div>
                        <div className="space-y-3 border-t pt-4">
                            <div className="flex justify-center gap-4 mb-2">
                                <Button variant={transType === 'deposit' ? 'default' : 'outline'} onClick={() => setTransType('deposit')} className={transType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''} size="sm"><TrendingUp className="w-4 h-4 mr-2" />Aportación</Button>
                                <Button variant={transType === 'expense' ? 'default' : 'outline'} onClick={() => setTransType('expense')} className={transType === 'expense' ? 'bg-red-600 hover:bg-red-700 text-white' : ''} size="sm"><Wallet className="w-4 h-4 mr-2" />Gasto</Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Input placeholder="Importe (Ej: 50)" type="number" value={newTransaction.amount} onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })} />
                                <Input type="date" value={newTransaction.date} onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })} />
                            </div>
                            <div className="flex gap-3">
                                <Input placeholder="Concepto..." value={newTransaction.description} onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })} />
                                <Button size="icon" onClick={handleAddGoalTransaction}><Save className="w-4 h-4" /></Button>
                            </div>
                        </div>
                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                            <h4 className="font-medium text-sm">Historial</h4>
                            {transactions.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">Sin movimientos</p> :
                                transactions.map(tx => (
                                    <div key={tx.id} className="flex justify-between items-center text-sm p-2 border rounded hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <div><p className="font-medium">{tx.description || 'Movimiento'}</p><p className="text-xs text-muted-foreground">{format(parseISO(tx.date), 'dd MMM yyyy', { locale: es })}</p></div>
                                        <span className={tx.amount >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{tx.amount >= 0 ? '+' : ''}{tx.amount}€</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ACCOUNT DETAIL DIALOG (NEW) */}
            <Dialog open={isAccountDetailOpen} onOpenChange={setIsAccountDetailOpen}>
                <DialogContent className="max-w-md sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {selectedAccount?.logo_url && <img src={selectedAccount.logo_url} className="w-6 h-6 object-contain" />}
                                {selectedAccount?.name}
                            </div>
                            <Button variant="ghost" size="icon" onClick={handleDeleteAccount} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-2">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg text-center relative">
                            <p className="text-sm text-muted-foreground">Saldo Disponible</p>
                            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{selectedAccount?.current_balance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
                            {selectedAccount?.interest_rate ? <div className="absolute top-2 right-2 bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-bold">{selectedAccount.interest_rate}% Interés</div> : null}
                        </div>

                        {/* Transaction Form (Reusing states) */}
                        <div className="space-y-3 border-t pt-4">
                            <div className="flex justify-center gap-4 mb-2">
                                <Button variant={transType === 'deposit' ? 'default' : 'outline'} onClick={() => setTransType('deposit')} className={transType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''} size="sm"><TrendingUp className="w-4 h-4 mr-2" />Ingreso</Button>
                                <Button variant={transType === 'expense' ? 'default' : 'outline'} onClick={() => setTransType('expense')} className={transType === 'expense' ? 'bg-red-600 hover:bg-red-700 text-white' : ''} size="sm"><Wallet className="w-4 h-4 mr-2" />Retiro</Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Input placeholder="Importe (Ej: 100)" type="number" value={newTransaction.amount} onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })} />
                                <Input type="date" value={newTransaction.date} onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })} />
                            </div>
                            <div className="flex gap-3">
                                <Input placeholder={transType === 'deposit' ? 'Ej: Nómina' : 'Ej: Transferencia'} value={newTransaction.description} onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })} />
                                <Button size="icon" onClick={handleAddAccountTransaction}><Save className="w-4 h-4" /></Button>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                            <h4 className="font-medium text-sm">Movimientos de la Cuenta</h4>
                            {transactions.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">Sin movimientos recientes</p> :
                                transactions.map(tx => (
                                    <div key={tx.id} className="flex justify-between items-center text-sm p-2 border rounded hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <div><p className="font-medium">{tx.description || 'Movimiento'}</p><p className="text-xs text-muted-foreground">{format(parseISO(tx.date), 'dd MMM yyyy', { locale: es })}</p></div>
                                        <span className={tx.amount >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{tx.amount >= 0 ? '+' : ''}{tx.amount}€</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
