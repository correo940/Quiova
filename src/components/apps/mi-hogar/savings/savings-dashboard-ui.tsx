'use client';

import React, { useState, useEffect } from 'react';
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
    Trash2,
    ReceiptText,
    Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getApiUrl } from '@/lib/api-utils';
import PendingBalanceTab from './pending-balance-tab';

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
    include_in_total?: boolean;
    account_type?: 'libre' | 'objetivo' | 'bloqueada';
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

const BANK_LOGOS: Record<string, string> = {
    'BBVA': 'https://www.google.com/s2/favicons?domain=bbva.es&sz=128',
    'Santander': 'https://www.google.com/s2/favicons?domain=bancosantander.es&sz=128',
    'CaixaBank': 'https://www.google.com/s2/favicons?domain=caixabank.es&sz=128',
    'Sabadell': 'https://www.google.com/s2/favicons?domain=bancsabadell.com&sz=128',
    'ING': 'https://www.google.com/s2/favicons?domain=ing.es&sz=128',
    'Openbank': 'https://www.google.com/s2/favicons?domain=openbank.es&sz=128',
    'Revolut': 'https://www.google.com/s2/favicons?domain=revolut.com&sz=128',
    'N26': 'https://www.google.com/s2/favicons?domain=n26.com&sz=128',
    'Trade Republic': 'https://www.google.com/s2/favicons?domain=traderepublic.com&sz=128',
    'Imagin': 'https://www.google.com/s2/favicons?domain=imagin.com&sz=128',
};

function getBankLogo(bankName?: string) {
    if (!bankName) return null;
    return BANK_LOGOS[bankName] || null;
}

export type MonthlyStats = {
    income: number;
    expense: number;
    savingsRate?: number;
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
    recentTransactions?: { id: string, amount: number, date: string, description: string, account_id?: string }[];
    recurringItems?: RecurringItem[];
    onAddRecurring?: () => void;
    onDeleteRecurring?: (id: string) => void;
    userId?: string;
    onBalanceChange?: () => void;
    pendingTotal?: number;
    onResetData?: () => Promise<void>;
    selectedMonth?: Date;
    onSyncAll?: () => Promise<void>;
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
    onDeleteRecurring,
    userId,
    onBalanceChange,
    pendingTotal = 0,
    selectedMonth = new Date(),
    onSyncAll
}: SavingsDashboardUIProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'goals' | 'recurring' | 'pending'>('overview');

    const [aiInsight, setAiInsight] = useState<{insight: string, metricHighlight: string, type: string} | null>(null);
    const [aiLoading, setAiLoading] = useState(true);
    const [aiError, setAiError] = useState(false);

    useEffect(() => {
        if (loading) {
            setAiLoading(true);
            return;
        }

        if (!monthlyStats || recentTransactions.length === 0) {
            setAiLoading(false);
            return;
        }

        const fetchInsight = async () => {
            const cachedInsight = localStorage.getItem('quioba_ai_insight_v2');
            const cachedDate = localStorage.getItem('quioba_ai_insight_v2_date');
            const now = new Date().getTime();
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 8000);

            if (cachedInsight && cachedDate && (now - parseInt(cachedDate) < 1000 * 60 * 60 * 12)) {
                try {
                    setAiInsight(JSON.parse(cachedInsight));
                    setAiLoading(false);
                    window.clearTimeout(timeoutId);
                    return;
                } catch (e) {
                    console.error('Error parsing cached insight', e);
                }
            }

            setAiLoading(true);
            setAiError(false);
            try {
                const apiUrl = getApiUrl('api/financial-insights');
                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ monthlyStats, recentTransactions }),
                    signal: controller.signal
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.insight) {
                        setAiInsight(data);
                        localStorage.setItem('quioba_ai_insight_v2', JSON.stringify(data));
                        localStorage.setItem('quioba_ai_insight_v2_date', now.toString());
                    } else {
                        setAiError(true);
                    }
                } else {
                    setAiError(true);
                }
            } catch (error) {
                console.error(error);
                setAiError(true);
            } finally {
                window.clearTimeout(timeoutId);
                setAiLoading(false);
            }
        };

        if (activeTab === 'overview') {
            fetchInsight();
        }
    }, [monthlyStats, recentTransactions, activeTab, loading]);

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
            <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 p-8 text-white shadow-2xl shadow-emerald-900/30 border border-emerald-600/20">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
                    {/* Left: Main Balance */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-emerald-100/80">
                            <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
                                <Wallet className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium tracking-wide uppercase">Balance Total</span>
                            {onSyncAll && (
                                <button 
                                    onClick={() => {
                                        if(window.confirm('¿Re-sincronizar todos los saldos con el historial?')) {
                                            onSyncAll();
                                        }
                                    }}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors ml-1"
                                    title="Sincronizar todo"
                                >
                                    <Repeat className="w-3 h-3 text-emerald-100/60" />
                                </button>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-sm">
                                {totalBalance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </h1>
                            <div className="flex items-center gap-2 text-emerald-100/80 text-sm">
                                <span className="bg-emerald-600/40 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 text-white">
                                    <TrendingUp className="w-3 h-3 text-emerald-300" />
                                    +2.4% este mes
                                </span>
                                <span className="opacity-70">vs mes anterior</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 min-w-[280px]">
                        {/* Stat 1: Monthly Income */}
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-2 text-emerald-100/80 mb-2">
                                <div className="p-1 bg-emerald-500/30 rounded-full border border-emerald-400/20">
                                    <ArrowUpRight className="w-3 h-3 text-emerald-200" />
                                </div>
                                <span className="text-xs font-medium">Ingresos</span>
                            </div>
                            <p className="text-xl font-bold">{monthlyStats.income.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</p>
                        </div>

                        {/* Stat 2: Monthly Expense */}
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-2 text-emerald-100/80 mb-2">
                                <div className="p-1 bg-rose-500/30 rounded-full border border-rose-400/20">
                                    <ArrowDownRight className="w-3 h-3 text-rose-200" />
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
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 flex gap-1 relative overflow-x-auto">
                    {(['overview', 'accounts', 'goals', 'recurring', 'pending'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                                relative px-4 md:px-6 py-2.5 rounded-xl text-sm font-medium transition-colors z-10 flex items-center gap-2 whitespace-nowrap
                                ${activeTab === tab ? 'text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}
                            `}
                        >
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="activeTab"
                                    className={`absolute inset-0 rounded-xl ${tab === 'overview' ? 'bg-emerald-700' :
                                        tab === 'accounts' ? 'bg-blue-600' :
                                            tab === 'goals' ? 'bg-amber-600' :
                                                tab === 'recurring' ? 'bg-purple-600' :
                                                    'bg-orange-600'
                                        }`}
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                {tab === 'overview' && <TrendingUp className="w-4 h-4" />}
                                {tab === 'accounts' && <CreditCard className="w-4 h-4" />}
                                {tab === 'goals' && <Target className="w-4 h-4" />}
                                {tab === 'recurring' && <Repeat className="w-4 h-4" />}
                                {tab === 'pending' && <ReceiptText className="w-4 h-4" />}
                                {tab === 'overview' ? 'Resumen' : tab === 'accounts' ? 'Cuentas' : tab === 'goals' ? 'Metas' : tab === 'recurring' ? 'Fijos' : 'Balance Pendiente'}
                                {tab === 'pending' && pendingTotal > 0 && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'pending' ? 'bg-white/20' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                                        {pendingTotal.toLocaleString('es-ES', { notation: 'compact', compactDisplay: 'short', currency: 'EUR', style: 'currency' })}
                                    </span>
                                )}
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
                        <div className="flex flex-col gap-6">
                            {/* TOP KPI CARDS */}
                            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <motion.div variants={itemVariants}>
                                    <Card className="border-none shadow-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl hover:shadow-xl transition-shadow relative overflow-hidden group">
                                        <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-100/30 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                                        <CardContent className="p-5 flex flex-col justify-center relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 capitalize">Ingresos ({format(selectedMonth, 'MMMM', { locale: es })})</span>
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                                    <ArrowDownRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{monthlyStats.income.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-2 font-medium"><TrendingUp className="w-3 h-3" /> +12% vs anterior</span>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                <motion.div variants={itemVariants}>
                                    <Card className="border-none shadow-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl hover:shadow-xl transition-shadow relative overflow-hidden group">
                                        <div className="absolute right-0 top-0 w-24 h-24 bg-rose-100/30 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                                        <CardContent className="p-5 flex flex-col justify-center relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 capitalize">Gastos ({format(selectedMonth, 'MMMM', { locale: es })})</span>
                                                <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                                    <ArrowUpRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{monthlyStats.expense.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-2 font-medium"><TrendingUp className="w-3 h-3" /> Reducción del 5%</span>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                <motion.div variants={itemVariants}>
                                    <Card className="border-none shadow-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl hover:shadow-xl transition-shadow relative overflow-hidden group">
                                        <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-100/30 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                                        <CardContent className="p-5 flex flex-col justify-center relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Ahorro Neto</span>
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                                    <PiggyBank className="w-4 h-4" />
                                                </div>
                                            </div>
                                            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{(monthlyStats.income - monthlyStats.expense).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-2 font-medium"><TrendingUp className="w-3 h-3" /> Gran desempeño</span>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                <motion.div variants={itemVariants}>
                                    <Card className="border-none shadow-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl hover:shadow-xl transition-shadow relative overflow-hidden group">
                                        <div className="absolute right-0 top-0 w-24 h-24 bg-amber-100/30 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                                        <CardContent className="p-5 flex flex-col justify-center relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Tasa de Ahorro</span>
                                                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                                    <Target className="w-4 h-4" />
                                                </div>
                                            </div>
                                            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{(monthlyStats.savingsRate || 0).toFixed(1)}%</span>
                                            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-2 font-medium">{(monthlyStats.savingsRate || 0) > 20 ? 'Excelente nivel' : (monthlyStats.savingsRate || 0) > 0 ? 'Ahorro positivo' : 'Vigila tus gastos'}</span>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </motion.div>

                            {/* BENTO GRID MAIN AREA */}
                            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                
                                {/* Chart Card Area (Left 8 cols) */}
                                <motion.div variants={itemVariants} className="lg:col-span-8 flex flex-col gap-6">
                                    <Card className="h-[430px] border-none shadow-xl shadow-slate-200/40 dark:shadow-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl overflow-hidden relative group">
                                        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-slate-800/10 pointer-events-none" />
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                                                            <TrendingUp className="w-5 h-5" />
                                                        </div>
                                                        Evolución Patrimonial
                                                    </CardTitle>
                                                    <CardDescription className="mt-1">Fluctuación de tus activos y ahorros en tiempo real</CardDescription>
                                                </div>
                                                <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-lg">
                                                    {['1M', '3M', '6M', 'YTD', '1A'].map((period) => (
                                                        <button 
                                                            key={period} 
                                                            className={`text-[11px] px-3 py-1.5 rounded-md font-bold transition-all ${period === '1M' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-700 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                                        >
                                                            {period}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="h-[330px] pr-0">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                                                    <XAxis
                                                        dataKey="date"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                                                        dy={10}
                                                        minTickGap={20}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                                                        tickFormatter={(value) => `${value / 1000}k`}
                                                        dx={10}
                                                        domain={['auto', 'auto']}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                            backdropFilter: 'blur(12px)',
                                                            borderRadius: '12px',
                                                            border: '1px solid rgba(0,0,0,0.05)',
                                                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                                            color: '#0f172a'
                                                        }}
                                                        itemStyle={{ color: '#0f172a', fontWeight: '800', fontSize: '1.1rem' }}
                                                        cursor={{ stroke: '#10b981', strokeWidth: 2, strokeDasharray: '4 4' }}
                                                        formatter={(value: number) => [`${value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}`, 'Patrimonio']}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="value"
                                                        stroke="#10b981"
                                                        strokeWidth={4}
                                                        fillOpacity={1}
                                                        fill="url(#colorValue)"
                                                        animationDuration={1500}
                                                    >
                                                    </Area>
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    {/* Recent Transactions Widget - WIDER Layout */}
                                    <Card className="border-none shadow-lg shadow-slate-200/40 dark:shadow-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-semibold flex items-center justify-between">
                                                <span><span className="text-emerald-600 mr-2">â—</span>Últimos Movimientos</span>
                                                <Button variant="ghost" size="sm" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 h-6 flex items-center gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors">
                                                    Ver extracto <ArrowUpRight className="w-3 h-3" />
                                                </Button>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {recentTransactions.slice(0, 5).map(tx => {
                                                    const account = accounts.find(a => a.id === tx.account_id);
                                                    const bankLogoUrl = account ? (account.logo_url || getBankLogo(account.bank_name)) : null;
                                                    
                                                    return (
                                                        <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer">
                                                            <div className="flex items-center gap-4">
                                                                {bankLogoUrl ? (
                                                                    <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                                                                        <img src={bankLogoUrl} alt={account?.bank_name} className="w-7 h-7 object-contain" />
                                                                    </div>
                                                                ) : account ? (
                                                                    <div 
                                                                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 text-white font-bold text-lg"
                                                                        style={{ backgroundColor: account.color || (tx.amount > 0 ? '#10b981' : '#64748b') }}
                                                                    >
                                                                        {account.bank_name ? account.bank_name.charAt(0).toUpperCase() : <Landmark className="w-5 h-5" />}
                                                                    </div>
                                                                ) : (
                                                                    <div className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-transform group-hover:scale-110 shrink-0 ${tx.amount > 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                                        {tx.amount > 0 ? <ArrowUpRight className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                                                                    </div>
                                                                )}
                                                                
                                                                <div className="min-w-0">
                                                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{tx.description || 'Gasto General'}</p>
                                                                    <p className="text-[11px] text-muted-foreground mt-0.5 tracking-wide font-medium truncate flex items-center gap-1.5">
                                                                        <span className="uppercase text-slate-600 dark:text-slate-400 font-bold">{account ? account.bank_name : (tx.amount > 0 ? 'Ingreso' : 'Compra Tarjeta')}</span> 
                                                                        <span className="opacity-50">•</span> 
                                                                        <span>{format(new Date(tx.date), 'd MMM', { locale: es })}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <span className={`text-base font-bold tracking-tight shrink-0 ml-4 ${tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                                                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                {recentTransactions.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                                                            <ReceiptText className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                                                        </div>
                                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Sin movimientos recientes</p>
                                                        <p className="text-xs mt-1">Tu extracto aparecerá aquí de forma automática.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>

                                {/* Right Column (4 cols) */}
                                <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-6">
                                    
                                    {/* Smart AI Insights */}
                                    <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 text-white shadow-xl shadow-indigo-900/20 p-px">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                                        <div className="bg-indigo-950/40 rounded-[1.4rem] p-6 h-full backdrop-blur-md relative min-h-[170px]">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-full bg-indigo-500/30 flex items-center justify-center border border-indigo-400/30 relative">
                                                    {aiLoading ? (
                                                        <div className="w-5 h-5 flex animate-pulse items-center justify-center">
                                                            <Sparkles className="w-4 h-4 text-indigo-400" />
                                                        </div>
                                                    ) : (
                                                        <Sparkles className="w-5 h-5 text-indigo-200" />
                                                    )}
                                                    <div className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-indigo-900 ${aiLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                                                </div>
                                                <span className="font-semibold text-indigo-100 text-sm tracking-wide">Quioba IA</span>
                                            </div>
                                            
                                            {aiLoading ? (
                                                <div className="space-y-3 animate-pulse">
                                                    <div className="h-4 bg-indigo-500/20 rounded w-full"></div>
                                                    <div className="h-4 bg-indigo-500/20 rounded w-5/6"></div>
                                                    <div className="h-10 bg-black/10 rounded-xl mt-4 w-full"></div>
                                                </div>
                                            ) : aiInsight ? (
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                                                    <p className="text-indigo-50/90 text-[15px] leading-relaxed mb-4">
                                                        {aiInsight.insight}
                                                    </p>
                                                    {aiInsight.metricHighlight && (
                                                        <div className="bg-black/20 rounded-xl p-3 flex gap-3 items-center">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${aiInsight.type === 'warning' ? 'bg-amber-500/20 text-amber-300' : aiInsight.type === 'neutral' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                                                {aiInsight.type === 'warning' ? '!' : aiInsight.type === 'neutral' ? 'i' : '+'}
                                                            </div>
                                                            <p className="text-xs text-indigo-200 font-medium leading-loose whitespace-pre-line">{aiInsight.metricHighlight}</p>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ) : aiError ? (
                                                <p className="text-amber-200/80 text-sm italic py-4">No se pudo generar un análisis en este momento. Inténtalo más tarde.</p>
                                            ) : (
                                                <p className="text-indigo-200/50 text-sm italic py-4">Añade más movimientos financieros para un análisis inteligente...</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <Card className="border-none shadow-lg shadow-slate-200/40 dark:shadow-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                                        <CardContent className="p-6">
                                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 text-sm uppercase tracking-wide">Operaciones Rápidas</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                                                    <Button variant="outline" className="w-full h-auto py-5 flex flex-col items-center gap-3 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/50 bg-transparent transition-all hover:border-emerald-300" onClick={onAddTransaction}>
                                                        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl text-emerald-600 shadow-sm">
                                                            <Plus className="w-5 h-5" />
                                                        </div>
                                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ingresar</span>
                                                    </Button>
                                                </motion.div>
                                                <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                                                    <Button variant="outline" className="w-full h-auto py-5 flex flex-col items-center gap-3 border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 bg-transparent transition-all hover:border-indigo-300" onClick={onAddTransaction}>
                                                        <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/60 rounded-xl text-indigo-600 shadow-sm">
                                                            <Repeat className="w-5 h-5" />
                                                        </div>
                                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Transferir</span>
                                                    </Button>
                                                </motion.div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Distribution Chart */}
                                    <Card className="border-none shadow-lg shadow-slate-200/40 dark:shadow-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex-grow flex flex-col">
                                        <CardHeader className="pb-0">
                                            <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Distribución de Activos</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6 flex flex-col flex-grow">
                                            <div className="h-[200px] w-full flex items-center justify-center relative">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={accounts}
                                                            dataKey="current_balance"
                                                            nameKey="bank_name"
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={65}
                                                            outerRadius={85}
                                                            paddingAngle={4}
                                                            stroke="none"
                                                        >
                                                            {accounts.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color || '#10b981'} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', color: '#0f172a', fontWeight: 600 }}
                                                            formatter={(value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                    <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold">Liquidez</span>
                                                    <span className="text-xl font-black text-slate-800 dark:text-white mt-1">
                                                        {totalBalance.toLocaleString('es-ES', { notation: 'compact', compactDisplay: 'short', currency: 'EUR', style: 'currency' })}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-auto space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar pt-2 border-t border-slate-100 dark:border-slate-800">
                                                {accounts.map(acc => (
                                                    <div key={acc.id} className="flex justify-between items-center text-sm group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: acc.color }} />
                                                            <span className="font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[120px] transition-colors group-hover:text-slate-900 dark:group-hover:text-white">{acc.name}</span>
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full">{Math.round((acc.current_balance / totalBalance) * 100) || 0}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
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
                            <motion.div 
                                variants={itemVariants} 
                                onClick={onAddAccount} 
                                whileHover={{ scale: 1.02, y: -4 }}
                                whileTap={{ scale: 0.98 }}
                                className="cursor-pointer group relative overflow-hidden rounded-[1.5rem] border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 flex flex-col items-center justify-center gap-4 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 transition-colors min-h-[220px]"
                            >
                                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900 transition-colors">
                                    <Plus className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 dark:text-slate-500 dark:group-hover:text-emerald-400" />
                                </div>
                                <p className="font-medium text-slate-500 group-hover:text-emerald-700 dark:text-slate-400">Añadir Nueva Cuenta</p>
                            </motion.div>

                        {accounts.map((account) => {
                            const currentMonth = selectedMonth.getMonth();
                            const currentYear = selectedMonth.getFullYear();
                            let accIncome = 0;
                            let accExpense = 0;
                            const accountTransactions = recentTransactions.filter(tx => tx.account_id === account.id);
                            accountTransactions.forEach(tx => {
                                const d = new Date(tx.date);
                                if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                                   if (tx.amount > 0) accIncome += tx.amount;
                                   else accExpense += Math.abs(tx.amount);
                                }
                            });

                            return (
                                <motion.div
                                    key={account.id}
                                    variants={itemVariants}
                                    onClick={() => onViewAccount && onViewAccount(account)}
                                    whileHover={{ scale: 1.02, y: -4 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="relative overflow-hidden rounded-[1.5rem] text-white shadow-xl group cursor-pointer transition-shadow hover:shadow-2xl"
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

                                            <div className="flex justify-between items-center bg-black/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                                                <div>
                                                    <p className="text-[10px] text-white/60 uppercase tracking-widest mb-0.5">Ingresos ({format(selectedMonth, 'MMM', { locale: es })})</p>
                                                    <p className="font-bold text-emerald-300">{accIncome.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</p>
                                                </div>
                                                <div className="h-6 w-px bg-white/20" />
                                                <div>
                                                    <p className="text-[10px] text-white/60 uppercase tracking-widest mb-0.5">Gastos ({format(selectedMonth, 'MMM', { locale: es })})</p>
                                                    <p className="font-bold text-rose-300">{accExpense.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</p>
                                                </div>
                                                <div className="h-6 w-px bg-white/20" />
                                                <div>
                                                    <p className="text-[10px] text-white/60 uppercase tracking-widest mb-0.5">Dif.</p>
                                                    <p className={`font-bold ${(accIncome - accExpense) >= 0 ? 'text-white' : 'text-rose-200'}`}>{(accIncome - accExpense).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</p>
                                                </div>
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
                                                        <span className="font-bold text-sm">{account.interest_rate}% TAE</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
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

                    {activeTab === 'pending' && userId && (
                        <PendingBalanceTab
                            userId={userId}
                            accounts={accounts}
                            onBalanceChange={onBalanceChange}
                        />
                    )}

                </motion.div>
            </AnimatePresence >
        </motion.div >
    );
}

