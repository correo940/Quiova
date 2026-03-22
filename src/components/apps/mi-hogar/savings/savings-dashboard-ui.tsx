'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    Target,
    PiggyBank,
    CreditCard,
    TrendingUp,
    Plus,
    MoreHorizontal,
    Sparkles,
    Landmark,
    Lock,
    ExternalLink,
    Search,
    Repeat,
    CalendarClock,
    Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- TYPES (Duplicated from page.tsx for decoupling) ---
export type BankAccount = {
    id: string;
    name: string;
    bank_name: string;
    color: string;
    password_id?: string;
    current_balance: number;
    logo_type: 'icon' | 'url';
    logo_url?: string;
    interest_rate?: number;
};

export type SavingsGoal = {
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

export type MonthlyStats = {
    income: number;
    expense: number;
};

export type RecurringItem = {
    id: string;
    name: string;
    amount: number;
    type: 'income' | 'expense';
    day_of_month?: number;
    category?: string;
    target_account_id?: string;
    end_date?: string;
    last_run_date?: string;
};

interface SavingsDashboardUIProps {
    accounts: BankAccount[];
    goals: SavingsGoal[];
    monthlyStats: MonthlyStats;
    totalBalance: number;
    totalGoalSaved: number;
    chartData: any[];
    loading?: boolean;
    onAddAccount?: () => void;
    onAddGoal?: () => void;
    onAddTransaction?: () => void;
    onViewAccount?: (account: BankAccount) => void;
    recentTransactions?: { id: string, amount: number, date: string, description: string }[];
    recurringItems?: RecurringItem[];
    onAddRecurring?: () => void;
    onDeleteRecurring?: (id: string) => void;
}

export default function SavingsDashboardUI({
    accounts,
    goals,
    monthlyStats,
    totalBalance,
    totalGoalSaved,
    chartData,
    loading,
    onAddAccount,
    onAddGoal,
    onAddTransaction,
    onViewAccount,
    recentTransactions = [],
    recurringItems = [],
    onAddRecurring,
    onDeleteRecurring
}: SavingsDashboardUIProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'goals' | 'recurring'>('overview');

    // Calculate Recurring Stats
    const recurringIncome = recurringItems.filter(i => i.type === 'income').reduce((sum, i) => sum + i.amount, 0);
    const recurringExpense = recurringItems.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0);
    const expectedCashflow = recurringIncome - recurringExpense;

    // --- ANIMATION VARIANTS ---
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: 'spring', stiffness: 100 }
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* HERO SECTION - Glassmorphism Card */}
            <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 p-8 text-white shadow-2xl shadow-emerald-900/20">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-400/20 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
                    {/* Left: Main Balance */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-emerald-100/80">
                            <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
                                <Wallet className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium tracking-wide uppercase">Balance Total</span>
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-sm">
                                {totalBalance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </h1>
                            <div className="flex items-center gap-2 text-emerald-100 text-sm">
                                <span className="bg-emerald-500/30 px-2 py-0.5 rounded-full border border-emerald-400/20 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    +2.4% este mes
                                </span>
                                <span className="opacity-70">vs mes anterior</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 min-w-[280px]">
                        {/* Stat 1: Monthly Income */}
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/5 hover:bg-white/15 transition-colors">
                            <div className="flex items-center gap-2 text-emerald-100 mb-2">
                                <div className="p-1 bg-emerald-400/20 rounded-full">
                                    <ArrowUpRight className="w-3 h-3 text-emerald-300" />
                                </div>
                                <span className="text-xs font-medium">Ingresos</span>
                            </div>
                            <p className="text-xl font-bold">{monthlyStats.income.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</p>
                        </div>

                        {/* Stat 2: Monthly Expense */}
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/5 hover:bg-white/15 transition-colors">
                            <div className="flex items-center gap-2 text-emerald-100 mb-2">
                                <div className="p-1 bg-rose-400/20 rounded-full">
                                    <ArrowDownRight className="w-3 h-3 text-rose-300" />
                                </div>
                                <span className="text-xs font-medium">Gastos</span>
                            </div>
                            <p className="text-xl font-bold">{monthlyStats.expense.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</p>
                        </div>

                        {/* Stat 3: Active Goals */}
                        <div className="col-span-2 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5 hover:bg-white/15 transition-colors flex justify-between items-center group cursor-pointer" onClick={() => setActiveTab('goals')}>
                            <div>
                                <div className="flex items-center gap-2 text-emerald-100 mb-1">
                                    <Target className="w-3.5 h-3.5" />
                                    <span className="text-xs font-medium">Metas Activas</span>
                                </div>
                                <p className="text-lg font-bold">
                                    {totalGoalSaved.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                                    <span className="text-sm font-normal text-emerald-200/70 ml-2">en {goals.length} objetivos</span>
                                </p>
                            </div>
                            <div className="bg-white/20 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
                                <ArrowUpRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* NAVIGATION TABS (Pills) */}
            <div className="flex justify-center">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 flex gap-1 relative">
                    {(['overview', 'accounts', 'goals', 'recurring'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                                relative px-6 py-2.5 rounded-xl text-sm font-medium transition-colors z-10 flex items-center gap-2
                                ${activeTab === tab ? 'text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}
                            `}
                        >
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="activeTab"
                                    className={`absolute inset-0 rounded-xl ${tab === 'overview' ? 'bg-emerald-500' :
                                        tab === 'accounts' ? 'bg-blue-500' :
                                            tab === 'goals' ? 'bg-amber-500' :
                                                'bg-purple-500'
                                        }`}
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                {tab === 'overview' && <TrendingUp className="w-4 h-4" />}
                                {tab === 'accounts' && <CreditCard className="w-4 h-4" />}
                                {tab === 'goals' && <Target className="w-4 h-4" />}
                                {tab === 'recurring' && <Repeat className="w-4 h-4" />}
                                {tab === 'overview' ? 'Resumen' : tab === 'accounts' ? 'Cuentas' : tab === 'goals' ? 'Metas' : 'Fijos'}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENT AREA */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="min-h-[400px]"
                >
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Chart Card */}
                            <motion.div variants={itemVariants} className="md:col-span-2">
                                <Card className="h-full border-none shadow-xl shadow-slate-200/40 dark:shadow-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-slate-800/10 pointer-events-none" />
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                                                <TrendingUp className="w-5 h-5" />
                                            </div>
                                            Evolución Patrimonial
                                        </CardTitle>
                                        <CardDescription>Comportamiento de tu economía los últimos 30 días</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                                <XAxis
                                                    dataKey="date"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                    tickFormatter={(value) => `${value / 1000}k`}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                        color: '#fff'
                                                    }}
                                                    itemStyle={{ color: '#fff' }}
                                                    cursor={{ stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5 5' }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke="#10b981"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorValue)"
                                                    animationDuration={1500}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Recent Activity / Quick Actions Mockup */}
                            <motion.div variants={itemVariants} className="space-y-6">
                                <Card className="border-none shadow-lg shadow-slate-200/40 dark:shadow-none bg-emerald-50/50 dark:bg-emerald-950/10 backdrop-blur-xl">
                                    <CardContent className="p-6">
                                        <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-4">Acciones Rápidas</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 bg-white/50" onClick={onAddTransaction}>
                                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-full text-emerald-600">
                                                    <Plus className="w-5 h-5" />
                                                </div>
                                                <span className="text-xs font-medium">Ingresar</span>
                                            </Button>
                                            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-900/20 bg-white/50" onClick={onAddTransaction}>
                                                <div className="p-2 bg-rose-100 dark:bg-rose-900 rounded-full text-rose-600">
                                                    <ArrowUpRight className="w-5 h-5" />
                                                </div>
                                                <span className="text-xs font-medium">Transferir</span>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* RECENT TRANSACTIONS WIDGET */}
                                <Card className="border-none shadow-lg shadow-slate-200/40 dark:shadow-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center justify-between">
                                            <span>Últimos Movimientos</span>
                                            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-6">Ver todo</Button>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {recentTransactions.slice(0, 5).map(tx => (
                                                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full ${tx.amount > 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'}`}>
                                                            {tx.amount > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">{tx.description || 'Movimiento'}</p>
                                                            <p className="text-xs text-muted-foreground">{format(new Date(tx.date), 'd MMM', { locale: es })}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-100'}`}>
                                                        {tx.amount > 0 ? '+' : ''}{tx.amount}€
                                                    </span>
                                                </div>
                                            ))}
                                            {recentTransactions.length === 0 && (
                                                <div className="p-8 text-center text-muted-foreground text-sm">No hay movimientos recientes</div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-lg shadow-slate-200/40 dark:shadow-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                                    <CardHeader>
                                        <CardTitle className="text-base">Distribución</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0">
                                        <div className="h-[200px] w-full flex items-center justify-center relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={accounts}
                                                        dataKey="current_balance"
                                                        nameKey="bank_name" // Use bank name for better label
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                    >
                                                        {accounts.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color || '#10b981'} strokeWidth={0} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '8px', border: 'none', color: '#fff' }}
                                                        itemStyle={{ color: '#fff' }}
                                                        formatter={(value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            {/* Center Label for Total Liquidity */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-xs text-muted-foreground">Liquidez</span>
                                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                                    {totalBalance.toLocaleString('es-ES', { notation: 'compact', compactDisplay: 'short', currency: 'EUR', style: 'currency' })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Legend List */}
                                        <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                            {accounts.map(acc => (
                                                <div key={acc.id} className="flex justify-between items-center text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: acc.color }} />
                                                        <span className="font-medium truncate max-w-[120px]">{acc.name}</span>
                                                    </div>
                                                    <span className="text-muted-foreground">{Math.round((acc.current_balance / totalBalance) * 100) || 0}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    )}

                    {activeTab === 'accounts' && (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {/* Add Account Card */}
                            <motion.div variants={itemVariants} onClick={onAddAccount} className="cursor-pointer group relative overflow-hidden rounded-[1.5rem] border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 flex flex-col items-center justify-center gap-4 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 transition-all min-h-[220px]">
                                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900 transition-colors">
                                    <Plus className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 dark:text-slate-500 dark:group-hover:text-emerald-400" />
                                </div>
                                <p className="font-medium text-slate-500 group-hover:text-emerald-700 dark:text-slate-400">Añadir Nueva Cuenta</p>
                            </motion.div>

                            {/* Account Cards */}
                            {accounts.map((account) => (
                                <motion.div
                                    key={account.id}
                                    variants={itemVariants}
                                    onClick={() => onViewAccount && onViewAccount(account)}
                                    className="relative overflow-hidden rounded-[1.5rem] text-white shadow-xl group cursor-pointer transition-transform hover:-translate-y-1"
                                    style={{
                                        background: `linear-gradient(135deg, ${account.color || '#10b981'}, ${account.color ? account.color + 'dd' : '#059669'})`
                                    }}
                                >
                                    {/* Card Pattern/Texture */}
                                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                                    <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

                                    <div className="relative p-6 h-full flex flex-col justify-between min-h-[220px]">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-white/80 text-sm mb-1">{account.bank_name}</p>
                                                <h3 className="font-bold text-xl tracking-tight">{account.name}</h3>
                                            </div>
                                            {account.logo_url ? (
                                                <div className="w-12 h-12 bg-white rounded-lg p-1 shadow-sm">
                                                    <img src={account.logo_url} alt={account.bank_name} className="w-full h-full object-contain" />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                                                    <Landmark className="w-6 h-6" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white/40" />)}
                                                </div>
                                                <span className="text-white/60 font-mono text-sm ml-2">•••• {account.id.substring(0, 4)}</span>
                                            </div>

                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-xs text-white/70 uppercase tracking-widest mb-1">Saldo Disponible</p>
                                                    <p className="text-3xl font-bold tracking-tight">
                                                        {account.current_balance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                                    </p>
                                                </div>
                                                {account.interest_rate && (
                                                    <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                                        <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                                            <span className="font-bold text-sm">{account.interest_rate}% TAE</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === 'goals' && (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 md:grid-cols-2 gap-6"
                        >
                            <motion.div variants={itemVariants} onClick={onAddGoal} className="cursor-pointer group relative overflow-hidden rounded-[1.5rem] border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 flex flex-col items-center justify-center gap-4 hover:border-amber-500/50 hover:bg-amber-50/50 dark:hover:bg-amber-950/10 transition-all min-h-[200px]">
                                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:bg-amber-100 dark:group-hover:bg-amber-900 transition-colors">
                                    <Plus className="w-8 h-8 text-slate-400 group-hover:text-amber-600 dark:text-slate-500 dark:group-hover:text-amber-400" />
                                </div>
                                <p className="font-medium text-slate-500 group-hover:text-amber-700 dark:text-slate-400">Crear Nueva Meta</p>
                            </motion.div>

                            {goals.map(goal => (
                                <motion.div
                                    key={goal.id}
                                    variants={itemVariants}
                                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] p-6 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: goal.color }} />
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: goal.color }}>
                                                <Target className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{goal.name}</h3>
                                                <p className="text-sm text-muted-foreground">{goal.interest_rate ? `${goal.interest_rate}% Interés` : 'Sin interés'}</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-xs font-medium">
                                            {Math.round((goal.current_amount / goal.target_amount) * 100)}%
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>{goal.current_amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                                            <span className="text-muted-foreground">{goal.target_amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                                        </div>
                                        <Progress value={(goal.current_amount / goal.target_amount) * 100} className="h-2.5" />
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>

                    )}

                    {activeTab === 'recurring' && (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="space-y-6"
                        >
                            {/* Summary Card */}
                            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="border-none shadow-lg shadow-purple-200/40 dark:shadow-none bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 backdrop-blur-xl">
                                    <CardContent className="p-6 flex flex-col justify-between h-full">
                                        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                                            <CalendarClock className="w-5 h-5" />
                                            <h3 className="font-semibold">Flujo Mensual Estimado</h3>
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2">
                                                {expectedCashflow > 0 ? '+' : ''}{expectedCashflow.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">Lo que te queda tras gastos fijos</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-none bg-emerald-50/50 dark:bg-emerald-950/10">
                                    <CardContent className="p-6">
                                        <p className="text-sm text-emerald-600 font-medium mb-1">Ingresos Fijos</p>
                                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                                            {recurringIncome.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-none bg-rose-50/50 dark:bg-rose-950/10">
                                    <CardContent className="p-6">
                                        <p className="text-sm text-rose-600 font-medium mb-1">Gastos Fijos</p>
                                        <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                                            {recurringExpense.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Add Button */}
                            <div className="flex justify-end">
                                <Button onClick={onAddRecurring} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 rounded-full px-6 shadow-lg shadow-purple-500/20">
                                    <Plus className="w-5 h-5" /> Añadir Fijo
                                </Button>
                            </div>

                            {/* Lists */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Incomes List */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-emerald-600 flex items-center gap-2"><ArrowUpRight className="w-4 h-4" /> Ingresos Recurrentes</h4>
                                    {recurringItems.filter(i => i.type === 'income').length === 0 ? (
                                        <div className="p-4 border border-dashed border-emerald-200 rounded-xl text-center text-sm text-muted-foreground">No tienes ingresos fijos</div>
                                    ) : (
                                        recurringItems.filter(i => i.type === 'income').map(item => (
                                            <motion.div variants={itemVariants} key={item.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 text-xs font-bold">
                                                        {item.day_of_month || 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{item.name}</p>
                                                        <p className="text-xs text-muted-foreground">Día {item.day_of_month}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-emerald-600">+{item.amount}€</span>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => onDeleteRecurring && onDeleteRecurring(item.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>

                                {/* Expenses List */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-rose-600 flex items-center gap-2"><ArrowDownRight className="w-4 h-4" /> Gastos Recurrentes</h4>
                                    {recurringItems.filter(i => i.type === 'expense').length === 0 ? (
                                        <div className="p-4 border border-dashed border-rose-200 rounded-xl text-center text-sm text-muted-foreground">No tienes gastos fijos</div>
                                    ) : (
                                        recurringItems.filter(i => i.type === 'expense').map(item => (
                                            <motion.div variants={itemVariants} key={item.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 text-xs font-bold">
                                                        {item.day_of_month || 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{item.name}</p>
                                                        <p className="text-xs text-muted-foreground">Día {item.day_of_month}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-rose-600">-{item.amount}€</span>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => onDeleteRecurring && onDeleteRecurring(item.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                </motion.div>
            </AnimatePresence >
        </motion.div >
    );
}
