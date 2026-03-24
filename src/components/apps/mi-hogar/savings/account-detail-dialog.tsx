'use client';

import React, { useEffect, useState } from 'react';
import { format, isSameMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import {
    ArrowDownRight,
    ArrowUpRight,
    CreditCard,
    Edit3,
    Landmark,
    PiggyBank,
    ReceiptText,
    Save,
    Search,
    ShieldCheck,
    Sparkles,
    Trash2,
    Wallet
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type BankAccount = {
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

type SavingsTransaction = {
    id: string;
    amount: number;
    date: string;
    description: string;
};

type TransactionKind = 'deposit' | 'expense';

type TransactionPayload = {
    transactionId?: string;
    amount: number;
    date: string;
    description: string;
    kind: TransactionKind;
};

interface AccountDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    account: BankAccount | null;
    transactions: SavingsTransaction[];
    linkedPasswordName?: string;
    onSubmitTransaction: (payload: TransactionPayload) => Promise<void>;
    onDeleteTransaction: (transactionId: string, amount: number) => Promise<void>;
    onDeleteAccount: () => Promise<void>;
    onToggleIncludeInTotal: (checked: boolean) => Promise<void>;
    onNavigateToPassword?: () => void;
}

const currencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
});

const compactCurrencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1
});

function getAccountTypeLabel(type?: BankAccount['account_type']) {
    switch (type) {
        case 'objetivo':
            return 'Cuenta objetivo';
        case 'bloqueada':
            return 'Cuenta bloqueada';
        case 'libre':
        default:
            return 'Cuenta libre';
    }
}

export default function AccountDetailDialog({
    open,
    onOpenChange,
    account,
    transactions,
    linkedPasswordName,
    onSubmitTransaction,
    onDeleteTransaction,
    onDeleteAccount,
    onToggleIncludeInTotal,
    onNavigateToPassword
}: AccountDetailDialogProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'details'>('overview');
    const [transactionKind, setTransactionKind] = useState<TransactionKind>('deposit');
    const [form, setForm] = useState({
        amount: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd')
    });
    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
    const [isUpdatingIncludeInTotal, setIsUpdatingIncludeInTotal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [movementFilter, setMovementFilter] = useState<'all' | 'income' | 'expense'>('all');

    useEffect(() => {
        if (!open) return;

        setActiveTab('overview');
        setTransactionKind('deposit');
        setForm({
            amount: '',
            description: '',
            date: format(new Date(), 'yyyy-MM-dd')
        });
        setEditingTransactionId(null);
        setSearchTerm('');
        setMovementFilter('all');
    }, [open, account?.id]);

    if (!account) {
        return null;
    }

    const sortedTransactionsAsc = [...transactions].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.id.localeCompare(b.id);
    });

    const startingBalance = account.current_balance - transactions.reduce((sum, tx) => sum + tx.amount, 0);

    let runningBalance = startingBalance;
    const enrichedTransactionsAsc = sortedTransactionsAsc.map((tx) => {
        runningBalance += tx.amount;

        return {
            ...tx,
            runningBalance
        };
    });

    const enrichedTransactionsDesc = [...enrichedTransactionsAsc].sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return b.id.localeCompare(a.id);
    });

    const filteredTransactions = enrichedTransactionsDesc.filter((tx) => {
        const matchesSearch = !searchTerm.trim() ||
            `${tx.description} ${format(parseISO(tx.date), 'dd MMM yyyy', { locale: es })}`
                .toLowerCase()
                .includes(searchTerm.toLowerCase());

        const matchesFilter =
            movementFilter === 'all' ||
            (movementFilter === 'income' && tx.amount > 0) ||
            (movementFilter === 'expense' && tx.amount < 0);

        return matchesSearch && matchesFilter;
    });

    const currentMonthTransactions = transactions.filter((tx) =>
        isSameMonth(parseISO(tx.date), new Date())
    );

    const monthlyIncome = currentMonthTransactions
        .filter((tx) => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0);

    const monthlyExpense = currentMonthTransactions
        .filter((tx) => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const netFlow = monthlyIncome - monthlyExpense;
    const averageMovement = transactions.length > 0
        ? transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / transactions.length
        : 0;
    const latestTransaction = enrichedTransactionsDesc[0];

    const chartData = enrichedTransactionsAsc.length > 0
        ? [
            {
                label: 'Inicio',
                balance: startingBalance,
                fullDate: account.id
            },
            ...enrichedTransactionsAsc.map((tx) => ({
                label: format(parseISO(tx.date), 'd MMM', { locale: es }),
                balance: tx.runningBalance,
                fullDate: tx.date
            }))
        ]
        : [
            {
                label: 'Hoy',
                balance: account.current_balance,
                fullDate: format(new Date(), 'yyyy-MM-dd')
            }
        ];

    const resetTransactionForm = () => {
        setEditingTransactionId(null);
        setTransactionKind('deposit');
        setForm({
            amount: '',
            description: '',
            date: format(new Date(), 'yyyy-MM-dd')
        });
    };

    const handleEditTransaction = (tx: SavingsTransaction) => {
        setEditingTransactionId(tx.id);
        setTransactionKind(tx.amount >= 0 ? 'deposit' : 'expense');
        setForm({
            amount: String(Math.abs(tx.amount)),
            description: tx.description || '',
            date: tx.date
        });
        setActiveTab('overview');
    };

    const handleSubmit = async () => {
        const parsedAmount = Number(form.amount);

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmitTransaction({
                transactionId: editingTransactionId || undefined,
                amount: parsedAmount,
                date: form.date,
                description: form.description,
                kind: transactionKind
            });

            resetTransactionForm();
            setActiveTab('transactions');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteMovement = async (tx: SavingsTransaction) => {
        if (!window.confirm('Eliminar este movimiento? El saldo se recalculara.')) {
            return;
        }

        setDeletingTransactionId(tx.id);
        try {
            await onDeleteTransaction(tx.id, tx.amount);

            if (editingTransactionId === tx.id) {
                resetTransactionForm();
            }
        } finally {
            setDeletingTransactionId(null);
        }
    };

    const handleIncludeInTotalChange = async (checked: boolean) => {
        setIsUpdatingIncludeInTotal(true);
        try {
            await onToggleIncludeInTotal(checked);
        } finally {
            setIsUpdatingIncludeInTotal(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="h-[92vh] w-[96vw] max-w-[96vw] overflow-hidden border-none bg-transparent p-0 shadow-none">
                <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-[0_30px_80px_rgba(15,23,42,0.55)]">
                    <div
                        className="relative overflow-hidden border-b border-white/10 px-6 py-6 sm:px-8"
                        style={{
                            background: `linear-gradient(145deg, ${account.color || '#0f766e'} 0%, #0f172a 55%, #020617 100%)`
                        }}
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_24%)] opacity-90" />

                        <DialogHeader className="relative z-10 space-y-6 text-left">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-lg">
                                            {account.logo_url ? (
                                                <img
                                                    src={account.logo_url}
                                                    alt={account.bank_name}
                                                    className="h-10 w-10 object-contain"
                                                />
                                            ) : (
                                                <Landmark className="h-7 w-7 text-slate-800" />
                                            )}
                                        </div>
                                        <div>
                                            <DialogTitle className="text-3xl font-black tracking-tight text-white">
                                                {account.name}
                                            </DialogTitle>
                                            <DialogDescription className="mt-1 flex flex-wrap items-center gap-2 text-white/75">
                                                <span>{account.bank_name}</span>
                                                <span className="hidden h-1 w-1 rounded-full bg-white/40 sm:inline-flex" />
                                                <span>{getAccountTypeLabel(account.account_type)}</span>
                                            </DialogDescription>
                                        </div>
                                        {account.interest_rate ? (
                                            <Badge className="border-amber-300/30 bg-amber-400/15 px-3 py-1 text-amber-100 hover:bg-amber-400/15">
                                                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                                                {account.interest_rate}% TAE
                                            </Badge>
                                        ) : null}
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-xs uppercase tracking-[0.35em] text-white/55">Saldo actual</p>
                                        <div className="flex flex-wrap items-end gap-4">
                                            <p className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                                                {currencyFormatter.format(account.current_balance)}
                                            </p>
                                            <Badge
                                                className={cn(
                                                    'mb-1 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm',
                                                    netFlow >= 0
                                                        ? 'border-emerald-300/25 bg-emerald-400/15 text-emerald-100'
                                                        : 'border-rose-300/25 bg-rose-400/15 text-rose-100'
                                                )}
                                            >
                                                {netFlow >= 0 ? '+' : '-'}
                                                {currencyFormatter.format(Math.abs(netFlow))} este mes
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 lg:min-w-[360px]">
                                    <Card className="border-white/10 bg-white/10 text-white shadow-none backdrop-blur-xl">
                                        <CardContent className="p-4">
                                            <p className="text-xs uppercase tracking-[0.25em] text-white/55">Ingresos</p>
                                            <p className="mt-3 text-2xl font-bold">{compactCurrencyFormatter.format(monthlyIncome)}</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-white/10 bg-white/10 text-white shadow-none backdrop-blur-xl">
                                        <CardContent className="p-4">
                                            <p className="text-xs uppercase tracking-[0.25em] text-white/55">Gastos</p>
                                            <p className="mt-3 text-2xl font-bold">{compactCurrencyFormatter.format(monthlyExpense)}</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-white/10 bg-white/10 text-white shadow-none backdrop-blur-xl">
                                        <CardContent className="p-4">
                                            <p className="text-xs uppercase tracking-[0.25em] text-white/55">Movimientos</p>
                                            <p className="mt-3 text-2xl font-bold">{transactions.length}</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-white/10 bg-white/10 text-white shadow-none backdrop-blur-xl">
                                        <CardContent className="p-4">
                                            <p className="text-xs uppercase tracking-[0.25em] text-white/55">Ticket medio</p>
                                            <p className="mt-3 text-2xl font-bold">{compactCurrencyFormatter.format(averageMovement)}</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-900">
                        <Tabs
                            value={activeTab}
                            onValueChange={(value) => setActiveTab(value as 'overview' | 'transactions' | 'details')}
                            className="flex h-full flex-col"
                        >
                            <div className="border-b border-slate-200/80 bg-white/80 px-6 py-4 backdrop-blur-xl sm:px-8">
                                <TabsList className="grid w-full max-w-2xl grid-cols-3 rounded-2xl bg-slate-100 p-1">
                                    <TabsTrigger value="overview" className="rounded-xl">Resumen</TabsTrigger>
                                    <TabsTrigger value="transactions" className="rounded-xl">Movimientos</TabsTrigger>
                                    <TabsTrigger value="details" className="rounded-xl">Detalles</TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="overview" className="mt-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                                <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
                                    <Card className="overflow-hidden rounded-[1.75rem] border-white/70 bg-white/80 shadow-xl shadow-slate-200/50">
                                        <CardHeader className="border-b border-slate-100/80 pb-4">
                                            <CardTitle className="flex items-center gap-2 text-lg">
                                                <PiggyBank className="h-5 w-5 text-emerald-600" />
                                                Evolucion del saldo
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <div className="h-[320px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="account-balance-fill" x1="0" x2="0" y1="0" y2="1">
                                                                <stop offset="0%" stopColor={account.color || '#10b981'} stopOpacity={0.35} />
                                                                <stop offset="100%" stopColor={account.color || '#10b981'} stopOpacity={0.02} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.35} />
                                                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                                        <YAxis
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tick={{ fontSize: 12, fill: '#64748b' }}
                                                            tickFormatter={(value) => compactCurrencyFormatter.format(value)}
                                                            width={80}
                                                        />
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: 'rgba(15, 23, 42, 0.96)',
                                                                borderRadius: '16px',
                                                                border: '1px solid rgba(148, 163, 184, 0.15)',
                                                                color: '#f8fafc',
                                                                boxShadow: '0 24px 50px rgba(15, 23, 42, 0.35)'
                                                            }}
                                                            formatter={(value: number) => currencyFormatter.format(value)}
                                                            labelFormatter={(_, payload) => {
                                                                const point = payload?.[0]?.payload;
                                                                if (!point?.fullDate) {
                                                                    return 'Balance';
                                                                }

                                                                return point.fullDate === account.id
                                                                    ? 'Balance inicial'
                                                                    : format(parseISO(point.fullDate), 'dd MMM yyyy', { locale: es });
                                                            }}
                                                        />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="balance"
                                                            stroke={account.color || '#10b981'}
                                                            strokeWidth={3}
                                                            fill="url(#account-balance-fill)"
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>

                                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Balance inicial</p>
                                                    <p className="mt-2 text-lg font-bold text-slate-900">{currencyFormatter.format(startingBalance)}</p>
                                                </div>
                                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Ultimo movimiento</p>
                                                    <p className="mt-2 text-lg font-bold text-slate-900">
                                                        {latestTransaction
                                                            ? format(parseISO(latestTransaction.date), 'dd MMM', { locale: es })
                                                            : 'Sin datos'}
                                                    </p>
                                                </div>
                                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Balance acumulado</p>
                                                    <p className="mt-2 text-lg font-bold text-slate-900">{currencyFormatter.format(account.current_balance)}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="flex flex-col gap-6">
                                        <Card className="overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-white shadow-xl shadow-emerald-100/60">
                                            <CardHeader className="border-b border-emerald-100/80 pb-4">
                                                <CardTitle className="flex items-center gap-2 text-lg">
                                                    <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                                                        <Wallet className="h-4 w-4" />
                                                    </div>
                                                    {editingTransactionId ? 'Editar movimiento' : 'Nuevo movimiento'}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-5 p-6">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => setTransactionKind('deposit')}
                                                        className={cn(
                                                            'h-auto rounded-2xl border px-4 py-4 text-left transition-all',
                                                            transactionKind === 'deposit'
                                                                ? 'border-emerald-500/40 bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                                                                : 'border-emerald-100 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/80'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={cn(
                                                                    'rounded-xl p-2',
                                                                    transactionKind === 'deposit'
                                                                        ? 'bg-white/15 text-white'
                                                                        : 'bg-emerald-100 text-emerald-700'
                                                                )}
                                                            >
                                                                <ArrowUpRight className="h-4 w-4" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold">Ingreso</p>
                                                                <p className={cn('text-xs', transactionKind === 'deposit' ? 'text-white/75' : 'text-slate-500')}>
                                                                    Sube el saldo
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => setTransactionKind('expense')}
                                                        className={cn(
                                                            'h-auto rounded-2xl border px-4 py-4 text-left transition-all',
                                                            transactionKind === 'expense'
                                                                ? 'border-rose-300 bg-rose-50 text-rose-700 shadow-lg shadow-rose-100'
                                                                : 'border-emerald-100 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/80'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={cn(
                                                                    'rounded-xl p-2',
                                                                    transactionKind === 'expense'
                                                                        ? 'bg-rose-100 text-rose-700'
                                                                        : 'bg-slate-100 text-slate-500'
                                                                )}
                                                            >
                                                                <ArrowDownRight className="h-4 w-4" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold">Gasto</p>
                                                                <p className={cn('text-xs', transactionKind === 'expense' ? 'text-rose-500' : 'text-slate-500')}>
                                                                    Baja el saldo
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </Button>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-slate-700">Importe</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="Ej: 95.50"
                                                        value={form.amount}
                                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                                        className="h-12 rounded-2xl border-emerald-100 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-slate-700">Concepto</Label>
                                                    <Input
                                                        placeholder={transactionKind === 'deposit' ? 'Ej: nomina, transferencia...' : 'Ej: compra, alquiler...'}
                                                        value={form.description}
                                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                                        className="h-12 rounded-2xl border-emerald-100 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-slate-700">Fecha</Label>
                                                    <Input
                                                        type="date"
                                                        value={form.date}
                                                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                                                        className="h-12 rounded-2xl border-emerald-100 bg-white text-slate-900 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                                                    {editingTransactionId ? (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={resetTransactionForm}
                                                            className="h-12 rounded-2xl border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                                                        >
                                                            Cancelar edicion
                                                        </Button>
                                                    ) : null}
                                                    <Button
                                                        type="button"
                                                        onClick={handleSubmit}
                                                        disabled={isSubmitting}
                                                        className="h-12 flex-1 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700"
                                                    >
                                                        <Save className="mr-2 h-4 w-4" />
                                                        {editingTransactionId ? 'Guardar cambios' : 'Registrar movimiento'}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="rounded-[1.75rem] border-white/70 bg-white/80 shadow-xl shadow-slate-200/50">
                                            <CardHeader className="pb-4">
                                                <CardTitle className="text-lg">Resumen operativo</CardTitle>
                                            </CardHeader>
                                            <CardContent className="grid gap-3 sm:grid-cols-3">
                                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Balance general</p>
                                                    <p className="mt-2 text-base font-bold text-slate-900">
                                                        {account.include_in_total === false ? 'No incluida' : 'Incluida'}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {account.include_in_total === false
                                                            ? 'Esta cuenta no suma al total global de Mi Economia.'
                                                            : 'Su saldo se refleja en el balance total de Mi Economia.'}
                                                    </p>
                                                </div>
                                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Credencial bancaria</p>
                                                    <p className="mt-2 text-base font-bold text-slate-900">
                                                        {linkedPasswordName || 'No vinculada'}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {linkedPasswordName
                                                            ? 'La cuenta esta conectada con una entrada del gestor de contrasenas.'
                                                            : 'Todavia no hay una credencial asociada a esta cuenta.'}
                                                    </p>
                                                </div>
                                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Ultima actividad</p>
                                                    <p className="mt-2 text-base font-bold text-slate-900">
                                                        {latestTransaction
                                                            ? format(parseISO(latestTransaction.date), 'dd MMM yyyy', { locale: es })
                                                            : 'Sin movimientos'}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {latestTransaction
                                                            ? 'Fecha del ultimo movimiento registrado en esta cuenta.'
                                                            : 'Aun no se han registrado ingresos ni gastos en esta cuenta.'}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="transactions" className="mt-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                                <Card className="rounded-[1.75rem] border-white/70 bg-white/85 shadow-xl shadow-slate-200/50">
                                    <CardHeader className="gap-4 border-b border-slate-100/80 pb-5">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                            <div>
                                                <CardTitle className="flex items-center gap-2 text-lg">
                                                    <ReceiptText className="h-5 w-5 text-emerald-600" />
                                                    Historial de movimientos
                                                </CardTitle>
                                                <p className="mt-2 text-sm text-muted-foreground">
                                                    Edita o elimina cualquier apunte sin salir del detalle de la cuenta.
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-3 sm:flex-row">
                                                <div className="relative min-w-[260px]">
                                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    <Input
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        placeholder="Buscar por concepto o fecha..."
                                                        className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
                                                    {[
                                                        { id: 'all', label: 'Todos' },
                                                        { id: 'income', label: 'Ingresos' },
                                                        { id: 'expense', label: 'Gastos' }
                                                    ].map((item) => (
                                                        <Button
                                                            key={item.id}
                                                            type="button"
                                                            variant="ghost"
                                                            onClick={() => setMovementFilter(item.id as 'all' | 'income' | 'expense')}
                                                            className={cn(
                                                                'rounded-xl px-4 text-sm',
                                                                movementFilter === item.id && 'bg-white shadow-sm'
                                                            )}
                                                        >
                                                            {item.label}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader className="sticky top-0 bg-white/95 backdrop-blur-xl">
                                                <TableRow>
                                                    <TableHead>Movimiento</TableHead>
                                                    <TableHead className="hidden md:table-cell">Fecha</TableHead>
                                                    <TableHead className="hidden lg:table-cell">Tipo</TableHead>
                                                    <TableHead className="text-right">Importe</TableHead>
                                                    <TableHead className="hidden xl:table-cell text-right">Saldo</TableHead>
                                                    <TableHead className="text-right">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredTransactions.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                                                            No hay movimientos que coincidan con ese filtro.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    filteredTransactions.map((tx) => (
                                                        <TableRow key={tx.id} className="hover:bg-slate-50/70">
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <div
                                                                        className={cn(
                                                                            'flex h-10 w-10 items-center justify-center rounded-2xl',
                                                                            tx.amount >= 0
                                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                                : 'bg-rose-100 text-rose-700'
                                                                        )}
                                                                    >
                                                                        {tx.amount >= 0 ? (
                                                                            <ArrowUpRight className="h-4 w-4" />
                                                                        ) : (
                                                                            <ArrowDownRight className="h-4 w-4" />
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-semibold text-slate-900">
                                                                            {tx.description || 'Movimiento sin concepto'}
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground md:hidden">
                                                                            {format(parseISO(tx.date), 'dd MMM yyyy', { locale: es })}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="hidden md:table-cell text-muted-foreground">
                                                                {format(parseISO(tx.date), 'dd MMM yyyy', { locale: es })}
                                                            </TableCell>
                                                            <TableCell className="hidden lg:table-cell">
                                                                <Badge
                                                                    className={cn(
                                                                        'rounded-full px-3 py-1 font-semibold',
                                                                        tx.amount >= 0
                                                                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                                                            : 'bg-rose-100 text-rose-700 hover:bg-rose-100'
                                                                    )}
                                                                >
                                                                    {tx.amount >= 0 ? 'Ingreso' : 'Gasto'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell
                                                                className={cn(
                                                                    'text-right font-bold',
                                                                    tx.amount >= 0 ? 'text-emerald-600' : 'text-slate-900'
                                                                )}
                                                            >
                                                                {tx.amount >= 0 ? '+' : '-'}{currencyFormatter.format(Math.abs(tx.amount))}
                                                            </TableCell>
                                                            <TableCell className="hidden xl:table-cell text-right font-semibold text-slate-600">
                                                                {currencyFormatter.format(tx.runningBalance)}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                                                        onClick={() => handleEditTransaction(tx)}
                                                                    >
                                                                        <Edit3 className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                                                                        onClick={() => handleDeleteMovement(tx)}
                                                                        disabled={deletingTransactionId === tx.id}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="details" className="mt-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                                    <Card className="rounded-[1.75rem] border-white/70 bg-white/85 shadow-xl shadow-slate-200/50">
                                        <CardHeader className="border-b border-slate-100/80 pb-4">
                                            <CardTitle className="flex items-center gap-2 text-lg">
                                                <CreditCard className="h-5 w-5 text-indigo-600" />
                                                Ficha de cuenta
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Nombre</p>
                                                <p className="mt-2 text-lg font-bold text-slate-900">{account.name}</p>
                                            </div>
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Banco</p>
                                                <p className="mt-2 text-lg font-bold text-slate-900">{account.bank_name}</p>
                                            </div>
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Tipo</p>
                                                <p className="mt-2 text-lg font-bold text-slate-900">{getAccountTypeLabel(account.account_type)}</p>
                                            </div>
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Interes</p>
                                                <p className="mt-2 text-lg font-bold text-slate-900">
                                                    {account.interest_rate ? `${account.interest_rate}% TAE` : 'Sin interes'}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Ultima actividad</p>
                                                <p className="mt-2 text-lg font-bold text-slate-900">
                                                    {latestTransaction
                                                        ? format(parseISO(latestTransaction.date), 'dd MMM yyyy', { locale: es })
                                                        : 'Sin movimientos'}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Saldo en panel</p>
                                                <p className="mt-2 text-lg font-bold text-slate-900">
                                                    {account.include_in_total === false ? 'Oculta del balance total' : 'Visible en balance total'}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 md:col-span-2">
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <p className="text-xs uppercase tracking-[0.25em] text-emerald-700">Balance general</p>
                                                        <p className="mt-2 text-lg font-bold text-slate-900">
                                                            {account.include_in_total === false ? 'Excluida del computo global' : 'Incluida en el computo global'}
                                                        </p>
                                                        <p className="mt-1 text-sm text-slate-600">
                                                            Decide si esta cuenta debe sumar o no al total principal de Mi Economia.
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-medium text-slate-700">
                                                            {account.include_in_total === false ? 'Excluida' : 'Incluida'}
                                                        </span>
                                                        <Switch
                                                            checked={account.include_in_total !== false}
                                                            onCheckedChange={handleIncludeInTotalChange}
                                                            disabled={isUpdatingIncludeInTotal}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="flex flex-col gap-6">
                                        <Card className="rounded-[1.75rem] border-white/70 bg-white/85 shadow-xl shadow-slate-200/50">
                                            <CardHeader className="border-b border-slate-100/80 pb-4">
                                                <CardTitle className="flex items-center gap-2 text-lg">
                                                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                                    Vinculacion y acceso
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4 p-6">
                                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Password Manager</p>
                                                    <p className="mt-2 text-base font-bold text-slate-900">
                                                        {linkedPasswordName || 'No hay credencial vinculada'}
                                                    </p>
                                                    {linkedPasswordName && onNavigateToPassword ? (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className="mt-4 rounded-2xl"
                                                            onClick={onNavigateToPassword}
                                                        >
                                                            Abrir contrasena vinculada
                                                        </Button>
                                                    ) : null}
                                                </div>
                                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Color de cuenta</p>
                                                    <div className="mt-3 flex items-center gap-3">
                                                        <div
                                                            className="h-10 w-10 rounded-2xl border border-slate-200 shadow-inner"
                                                            style={{ backgroundColor: account.color || '#10b981' }}
                                                        />
                                                        <p className="font-semibold text-slate-900">{account.color || '#10b981'}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="rounded-[1.75rem] border-rose-200 bg-gradient-to-br from-white to-rose-50 shadow-xl shadow-rose-100/60">
                                            <CardHeader className="pb-4">
                                                <CardTitle className="flex items-center gap-2 text-lg text-rose-700">
                                                    <Trash2 className="h-5 w-5" />
                                                    Zona delicada
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <p className="text-sm text-rose-700/80">
                                                    Si eliminas esta cuenta, desaparecera tambien su historial de movimientos asociado.
                                                </p>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    className="w-full rounded-2xl"
                                                    onClick={() => void onDeleteAccount()}
                                                >
                                                    Eliminar cuenta
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
