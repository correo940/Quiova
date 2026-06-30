'use client';

import React, { useEffect, useState } from 'react';
import { addMonths, format, isSameMonth, parseISO, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import {
    AreaChart as AreaChartIcon,
    ArrowDownRight,
    ArrowLeft,
    ArrowUpRight,
    BarChart3,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    CreditCard,
    Edit3,
    Landmark,
    LineChart as LineChartIcon,
    Plus,
    RefreshCw,
    Save,
    Search,
    ShieldCheck,
    Trash2,
    X
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
    parent_account_id?: string | null;
    envelope_spent?: number;
};

type SavingsTransaction = {
    id: string;
    amount: number;
    date: string;
    description: string;
    account_id: string;
    is_envelope_spend?: boolean;
};

type TransactionKind = 'deposit' | 'expense';

type TransactionPayload = {
    transactionId?: string;
    amount: number;
    date: string;
    description: string;
    kind: TransactionKind;
    is_envelope_spend?: boolean;
};

interface AccountDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    account: BankAccount | null;
    transactions: SavingsTransaction[];
    linkedPasswordName?: string;
    onSubmitTransaction: (payload: TransactionPayload) => Promise<void>;
    onDeleteTransaction: (transactionId: string, amount: number) => Promise<void>;
    onDeleteTransactions?: (transactionIds: string[], totalAmount: number) => Promise<void>;
    onDeleteAccount: () => Promise<void>;
    onSyncBalance?: (accountId: string) => Promise<void>;
    onToggleIncludeInTotal: (checked: boolean) => Promise<void>;
    onNavigateToPassword?: () => void;
    onUpdateBalance?: (accountId: string, newBalance: number) => Promise<void>;
    onUpdateAccount?: (accountId: string, updates: Partial<BankAccount>) => Promise<void>;
    onNavigateAccount?: (acc: BankAccount) => void;
    accounts?: BankAccount[];
}

const currencyFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const compactCurrencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1
});

function getAccountTypeLabel(type?: BankAccount['account_type']) {
    switch (type) {
        case 'objetivo': return 'Cuenta objetivo';
        case 'bloqueada': return 'Cuenta bloqueada';
        default: return 'Cuenta libre';
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
    onDeleteTransactions,
    onDeleteAccount,
    onSyncBalance,
    onToggleIncludeInTotal,
    onNavigateToPassword,
    onUpdateBalance,
    onUpdateAccount,
    onNavigateAccount,
    accounts = []
}: AccountDetailDialogProps) {
    const [transactionKind, setTransactionKind] = useState<TransactionKind>('deposit');
    const [form, setForm] = useState({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), is_envelope_spend: false });
    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
    const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
    const [isUpdatingIncludeInTotal, setIsUpdatingIncludeInTotal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [movementFilter, setMovementFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
    const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
    const [exactMonthFilter, setExactMonthFilter] = useState('');
    const [exactDateFilter, setExactDateFilter] = useState('');
    const [isEditingBalance, setIsEditingBalance] = useState(false);
    const [manualBalanceValue, setManualBalanceValue] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [chartOpen, setChartOpen] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        if (!open) return;
        setTransactionKind('deposit');
        setForm({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), is_envelope_spend: !!account?.parent_account_id });
        setEditingTransactionId(null);
        setSearchTerm('');
        setMovementFilter('all');
        setSelectedMonth(new Date());
        setSelectedTxIds(new Set());
        setShowAddForm(false);
        setChartOpen(false);
        setShowDetails(false);
        setIsEditingBalance(false);
    }, [open, account?.id]);

    const handleNextAccount = () => {
        if (!account || accounts.length <= 1 || !onNavigateAccount) return;
        const i = accounts.findIndex(a => a.id === account.id);
        onNavigateAccount(accounts[(i + 1) % accounts.length]);
    };

    const handlePrevAccount = () => {
        if (!account || accounts.length <= 1 || !onNavigateAccount) return;
        const i = accounts.findIndex(a => a.id === account.id);
        onNavigateAccount(accounts[(i - 1 + accounts.length) % accounts.length]);
    };

    if (!account) return null;

    const sortedAsc = [...transactions].sort((a, b) => {
        const d = new Date(a.date).getTime() - new Date(b.date).getTime();
        return d !== 0 ? d : a.id.localeCompare(b.id);
    });

    const startingBalance = account.current_balance - transactions.reduce((s, tx) => s + tx.amount, 0);

    let running = startingBalance;
    let displayRunning = 0;
    const enrichedAsc = sortedAsc.map(tx => { running += tx.amount; displayRunning += tx.amount; return { ...tx, runningBalance: running, displayRunningBalance: displayRunning }; });
    const enrichedDesc = [...enrichedAsc].sort((a, b) => {
        const d = new Date(b.date).getTime() - new Date(a.date).getTime();
        return d !== 0 ? d : b.id.localeCompare(a.id);
    });

    const filteredTransactions = enrichedAsc.filter(tx => {
        const matchSearch = !searchTerm.trim() ||
            `${tx.description} ${format(parseISO(tx.date), 'dd MMM yyyy', { locale: es })}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchFilter = movementFilter === 'all' || (movementFilter === 'income' && tx.amount > 0) || (movementFilter === 'expense' && tx.amount < 0);
        const matchMonth = !exactMonthFilter || tx.date.startsWith(exactMonthFilter);
        const matchDate = !exactDateFilter || tx.date === exactDateFilter;
        return matchSearch && matchFilter && matchMonth && matchDate;
    });

    const monthTxs = transactions.filter(tx => isSameMonth(parseISO(tx.date), selectedMonth));
    const monthlyIncome = monthTxs.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
    const monthlyExpense = monthTxs.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const netFlow = monthlyIncome - monthlyExpense;
    const isCurrentMonth = isSameMonth(selectedMonth, new Date());
    const selectedMonthLabel = format(selectedMonth, 'MMM yyyy', { locale: es });
    const latestTx = enrichedDesc[0];

    // Desglose para cuentas vinculadas: ingresos = para gastar, gastos = pertenecen a la principal
    const parentAccount = account.parent_account_id ? accounts.find(a => a.id === account.parent_account_id) : null;
    const totalIncome = transactions.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
    const totalExpense = transactions.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const availableToSpend = totalIncome - totalExpense;

    const chartData = enrichedAsc.length > 0
        ? [{ label: 'Inicio', balance: startingBalance, fullDate: account.id }, ...enrichedAsc.map(tx => ({ label: format(parseISO(tx.date), 'd MMM', { locale: es }), balance: tx.runningBalance, fullDate: tx.date }))]
        : [{ label: 'Hoy', balance: account.current_balance, fullDate: format(new Date(), 'yyyy-MM-dd') }];

    const tooltipContentStyle = {
        backgroundColor: 'rgba(15,23,42,0.96)', borderRadius: '14px',
        border: '1px solid rgba(148,163,184,0.15)', color: '#f8fafc',
        boxShadow: '0 20px 40px rgba(15,23,42,0.35)'
    };
    const tooltipLabelFormatter = (_: unknown, payload?: ReadonlyArray<{ payload?: { fullDate?: string } }>) => {
        const p = payload?.[0]?.payload;
        if (!p?.fullDate) return 'Balance';
        return p.fullDate === account.id ? 'Balance inicial' : format(parseISO(p.fullDate), 'dd MMM yyyy', { locale: es });
    };
    const tooltipFormatter = (value: number) => currencyFormatter.format(value);

    const groupedByDate = filteredTransactions.reduce((g, tx) => {
        if (!g[tx.date]) g[tx.date] = [];
        g[tx.date].push(tx);
        return g;
    }, {} as Record<string, typeof filteredTransactions>);
    const groupedDates = Object.keys(groupedByDate).sort((a, b) => a.localeCompare(b));

    const resetForm = () => {
        setEditingTransactionId(null);
        setTransactionKind('deposit');
        setForm({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), is_envelope_spend: !!account?.parent_account_id });
        setShowAddForm(false);
    };

    const handleEditTransaction = (tx: SavingsTransaction) => {
        setEditingTransactionId(tx.id);
        setTransactionKind(tx.amount >= 0 ? 'deposit' : 'expense');
        setForm({ amount: String(Math.abs(tx.amount)), description: tx.description || '', date: tx.date, is_envelope_spend: tx.is_envelope_spend || false });
        setShowAddForm(true);
    };

    const handleManualBalanceSave = async () => {
        const val = parseFloat(manualBalanceValue.replace(',', '.'));
        if (isNaN(val) || !onUpdateBalance) return;
        await onUpdateBalance(account.id, val);
        setIsEditingBalance(false);
    };

    const handleSubmit = async () => {
        const parsed = Number(form.amount);
        if (!Number.isFinite(parsed) || parsed <= 0) return;
        setIsSubmitting(true);
        try {
            await onSubmitTransaction({ transactionId: editingTransactionId || undefined, amount: parsed, date: form.date, description: form.description, kind: transactionKind, is_envelope_spend: form.is_envelope_spend });
            resetForm();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteMovement = async (tx: SavingsTransaction) => {
        if (!window.confirm('Eliminar este movimiento? El saldo se recalculara.')) return;
        setDeletingTransactionId(tx.id);
        try {
            await onDeleteTransaction(tx.id, tx.amount);
            if (editingTransactionId === tx.id) resetForm();
        } finally {
            setDeletingTransactionId(null);
        }
    };

    const handleIncludeInTotalChange = async (checked: boolean) => {
        setIsUpdatingIncludeInTotal(true);
        try { await onToggleIncludeInTotal(checked); } finally { setIsUpdatingIncludeInTotal(false); }
    };

    const handleUpdateEnvelopeField = async (field: 'parent_account_id' | 'envelope_spent', value: string | null | number) => {
        if (!account || !onUpdateAccount) return;
        setIsUpdatingAccount(true);
        try { await onUpdateAccount(account.id, { [field]: value }); } finally { setIsUpdatingAccount(false); }
    };

    const handleBulkDelete = async () => {
        if (!selectedTxIds.size || !onDeleteTransactions) return;
        if (!window.confirm(`¿Eliminar ${selectedTxIds.size} movimientos? El saldo se recalculará.`)) return;
        setIsSubmitting(true);
        try {
            const toDelete = transactions.filter(t => selectedTxIds.has(t.id));
            await onDeleteTransactions(Array.from(selectedTxIds), toDelete.reduce((s, t) => s + t.amount, 0));
            setSelectedTxIds(new Set());
        } finally { setIsSubmitting(false); }
    };

    const toggleAllVisible = () => {
        if (selectedTxIds.size >= filteredTransactions.length && filteredTransactions.length > 0) setSelectedTxIds(new Set());
        else setSelectedTxIds(new Set(filteredTransactions.map(tx => tx.id)));
    };

    const toggleSelection = (id: string) => {
        const s = new Set(selectedTxIds);
        if (s.has(id)) s.delete(id); else s.add(id);
        setSelectedTxIds(s);
    };

    const axisProps = { tickLine: false as const, axisLine: false as const, tick: { fontSize: 10, fill: '#64748b' } };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="h-[92vh] w-[96vw] max-w-[96vw] overflow-hidden border-none bg-transparent p-0 shadow-none [&>button]:hidden">
                <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-[0_30px_80px_rgba(15,23,42,0.55)]">

                    {/* ── COMPACT HEADER ── */}
                    <div
                        className="relative overflow-hidden border-b border-white/10 px-4 pt-3 pb-4 shrink-0"
                        style={{ background: `linear-gradient(145deg, ${account.color || '#0f766e'} 0%, #0f172a 55%, #020617 100%)` }}
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_24%)] opacity-90" />

                        <DialogHeader className="relative z-10 space-y-0">
                            {/* Row 1: Logo + Name + Nav + Actions */}
                            <div className="flex items-center gap-2">
                                <div className="h-9 w-9 rounded-xl border border-white/20 bg-white/95 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                                    {account.logo_url
                                        ? <img src={account.logo_url} alt={account.bank_name} className="h-6 w-6 object-contain" />
                                        : <Landmark className="h-4 w-4 text-slate-800" />}
                                </div>

                                {onNavigateAccount && accounts.length > 1 && (
                                    <button onClick={handlePrevAccount} className="p-1 hover:bg-white/10 rounded-md transition-colors" title="Cuenta anterior">
                                        <ChevronLeft className="w-4 h-4 text-white/50 hover:text-white" />
                                    </button>
                                )}

                                <div className="flex-1 min-w-0">
                                    <DialogTitle className="text-base font-black text-white leading-tight truncate">{account.name}</DialogTitle>
                                    <DialogDescription className="text-[10px] text-white/60 flex flex-wrap items-center gap-1 mt-0.5">
                                        <span>{account.bank_name}</span>
                                        <span className="h-0.5 w-0.5 rounded-full bg-white/30" />
                                        <span>{getAccountTypeLabel(account.account_type)}</span>
                                        {account.interest_rate && (<><span className="h-0.5 w-0.5 rounded-full bg-white/30" /><span className="text-amber-300">{account.interest_rate}% TAE</span></>)}
                                    </DialogDescription>
                                </div>

                                {onNavigateAccount && accounts.length > 1 && (
                                    <button onClick={handleNextAccount} className="p-1 hover:bg-white/10 rounded-md transition-colors" title="Siguiente cuenta">
                                        <ChevronRight className="w-4 h-4 text-white/50 hover:text-white" />
                                    </button>
                                )}

                                <button onClick={() => setShowDetails(true)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors" title="Detalles de cuenta">
                                    <CreditCard className="w-4 h-4" />
                                </button>
                                <button onClick={() => onOpenChange(false)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/50 hover:text-white transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Row 2: Balance + Month stats */}
                            <div className="flex items-end justify-between mt-3 gap-3 flex-wrap">
                                <div className="group">
                                    <p className="text-[9px] uppercase tracking-[0.3em] text-white/40 flex items-center gap-1">
                                        Saldo actual
                                        {onUpdateBalance && (
                                            <button onClick={() => { setIsEditingBalance(!isEditingBalance); setManualBalanceValue(String(account.current_balance)); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/10 rounded">
                                                <Edit3 className="w-2.5 h-2.5 text-white/60" />
                                            </button>
                                        )}
                                        {onSyncBalance && (
                                            <button onClick={() => onSyncBalance(account.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/10 rounded" title="Sincronizar">
                                                <RefreshCw className="w-2.5 h-2.5 text-white/60" />
                                            </button>
                                        )}
                                    </p>
                                    {isEditingBalance ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <Input className="h-7 w-28 bg-white/10 border-white/20 text-white font-bold text-sm" value={manualBalanceValue} onChange={e => setManualBalanceValue(e.target.value)} autoFocus />
                                            <Button size="sm" className="h-7 px-2 bg-green-500 hover:bg-green-800" onClick={handleManualBalanceSave}><Save className="w-3 h-3" /></Button>
                                            <Button size="sm" variant="ghost" className="h-7 px-2 text-white/60 hover:text-white" onClick={() => setIsEditingBalance(false)}><X className="w-3 h-3" /></Button>
                                        </div>
                                    ) : (
                                        <p className="text-2xl font-black text-white tracking-tight sm:text-3xl">{currencyFormatter.format(parentAccount ? totalIncome : account.current_balance)}</p>
                                    )}
                                </div>

                                <div className="text-right shrink-0">
                                    <div className="flex items-center gap-1 justify-end mb-1.5">
                                        <button onClick={() => setSelectedMonth(p => subMonths(p, 1))} className="h-5 w-5 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors">
                                            <ChevronLeft className="w-3 h-3" />
                                        </button>
                                        <span className="text-[10px] font-bold uppercase text-white/80 min-w-[64px] text-center">{selectedMonthLabel}</span>
                                        <button onClick={() => { if (!isCurrentMonth) setSelectedMonth(p => addMonths(p, 1)); }} disabled={isCurrentMonth} className={cn("h-5 w-5 flex items-center justify-center rounded transition-colors", isCurrentMonth ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-white/10 hover:bg-white/20 text-white/60 hover:text-white")}>
                                            <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3 justify-end">
                                        <div className="text-right">
                                            <p className="text-[8px] uppercase tracking-wider text-white/40">Ing</p>
                                            <p className="text-xs font-bold text-green-300">{compactCurrencyFormatter.format(monthlyIncome)}</p>
                                        </div>
                                        <div className="w-px h-5 bg-white/15" />
                                        <div className="text-right">
                                            <p className="text-[8px] uppercase tracking-wider text-white/40">Gas</p>
                                            <p className="text-xs font-bold text-rose-300">{compactCurrencyFormatter.format(monthlyExpense)}</p>
                                        </div>
                                        <div className="w-px h-5 bg-white/15" />
                                        <div className="text-right">
                                            <p className="text-[8px] uppercase tracking-wider text-white/40">Dif</p>
                                            <p className={cn("text-xs font-bold", netFlow >= 0 ? "text-green-300" : "text-rose-300")}>
                                                {netFlow >= 0 ? '+' : ''}{compactCurrencyFormatter.format(netFlow)}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-white/25 mt-1">{monthTxs.length} mov. en {selectedMonthLabel}</p>
                                </div>
                            </div>

                            {/* Desglose de cuenta vinculada */}
                            {parentAccount && (
                                <div className="mt-3 flex items-stretch gap-2">
                                    <div className="flex-1 rounded-xl bg-green-500/15 border border-green-400/20 px-3 py-2">
                                        <p className="text-[9px] uppercase tracking-wider text-green-200/70">Disponible para gastar</p>
                                        <p className="text-base font-black text-green-300">{currencyFormatter.format(availableToSpend)}</p>
                                    </div>
                                    <div className="flex-1 rounded-xl bg-amber-500/15 border border-amber-400/20 px-3 py-2">
                                        <p className="text-[9px] uppercase tracking-wider text-amber-200/70">Pertenece a {parentAccount.name}</p>
                                        <p className="text-base font-black text-amber-300">{currencyFormatter.format(totalExpense)}</p>
                                    </div>
                                </div>
                            )}
                        </DialogHeader>
                    </div>

                    {/* ── BODY ── */}
                    <div className="relative flex-1 overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
                        <div className="h-full overflow-y-auto">

                            {/* Collapsible chart */}
                            <div className="border-b border-slate-200/80">
                                <button onClick={() => setChartOpen(!chartOpen)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/60 transition-colors">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <BarChart3 className="w-3.5 h-3.5" />
                                        <span className="text-xs font-semibold">Evolución del saldo</span>
                                        <span className="text-[10px] text-slate-400">· {transactions.length} mov. total</span>
                                    </div>
                                    {chartOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                </button>

                                {chartOpen && (
                                    <div className="px-4 pb-4 bg-white/80">
                                        <div className="flex items-center justify-end gap-1 mb-3 rounded-lg bg-slate-100 p-0.5 w-fit ml-auto">
                                            {([
                                                { id: 'area', label: 'Área', Icon: AreaChartIcon },
                                                { id: 'line', label: 'Línea', Icon: LineChartIcon },
                                                { id: 'bar', label: 'Barras', Icon: BarChart3 }
                                            ] as const).map(({ id, label, Icon }) => (
                                                <button key={id} type="button" onClick={() => setChartType(id)}
                                                    className={cn("flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all", chartType === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                                                    <Icon className="h-3 w-3" />{label}
                                                </button>
                                            ))}
                                        </div>

                                        <div style={{ height: '180px' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                {chartType === 'bar' ? (
                                                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.35} />
                                                        <XAxis dataKey="label" {...axisProps} />
                                                        <YAxis {...axisProps} tickFormatter={(v: number) => compactCurrencyFormatter.format(v)} width={70} />
                                                        <Tooltip contentStyle={tooltipContentStyle} formatter={tooltipFormatter} labelFormatter={tooltipLabelFormatter} />
                                                        <Bar dataKey="balance" fill={account.color || '#10b981'} radius={[4, 4, 0, 0]} opacity={0.85} />
                                                    </BarChart>
                                                ) : chartType === 'line' ? (
                                                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.35} />
                                                        <XAxis dataKey="label" {...axisProps} />
                                                        <YAxis {...axisProps} tickFormatter={(v: number) => compactCurrencyFormatter.format(v)} width={70} />
                                                        <Tooltip contentStyle={tooltipContentStyle} formatter={tooltipFormatter} labelFormatter={tooltipLabelFormatter} />
                                                        <Line type="monotone" dataKey="balance" stroke={account.color || '#10b981'} strokeWidth={2} dot={{ fill: account.color || '#10b981', r: 3 }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                                                    </LineChart>
                                                ) : (
                                                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
                                                        <defs>
                                                            <linearGradient id="account-balance-fill" x1="0" x2="0" y1="0" y2="1">
                                                                <stop offset="0%" stopColor={account.color || '#10b981'} stopOpacity={0.35} />
                                                                <stop offset="100%" stopColor={account.color || '#10b981'} stopOpacity={0.02} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.35} />
                                                        <XAxis dataKey="label" {...axisProps} />
                                                        <YAxis {...axisProps} tickFormatter={(v: number) => compactCurrencyFormatter.format(v)} width={70} />
                                                        <Tooltip contentStyle={tooltipContentStyle} formatter={tooltipFormatter} labelFormatter={tooltipLabelFormatter} />
                                                        <Area type="monotone" dataKey="balance" stroke={account.color || '#10b981'} strokeWidth={2} fill="url(#account-balance-fill)" />
                                                    </AreaChart>
                                                )}
                                            </ResponsiveContainer>
                                        </div>

                                        <div className="mt-3 grid grid-cols-3 gap-2">
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                                                <p className="text-[9px] uppercase tracking-widest text-slate-400">Inicio</p>
                                                <p className="text-sm font-bold text-slate-900 mt-0.5">{currencyFormatter.format(startingBalance)}</p>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                                                <p className="text-[9px] uppercase tracking-widest text-slate-400">Último mov.</p>
                                                <p className="text-sm font-bold text-slate-900 mt-0.5">{latestTx ? format(parseISO(latestTx.date), 'dd MMM', { locale: es }) : '—'}</p>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-start justify-between">
                                                <div>
                                                    <p className="text-[9px] uppercase tracking-widest text-slate-400">Actual</p>
                                                    <p className="text-sm font-bold text-slate-900 mt-0.5">{currencyFormatter.format(account.current_balance)}</p>
                                                </div>
                                                {onSyncBalance && (
                                                    <button onClick={() => { if (window.confirm('¿Sincronizar y recalcular el saldo desde el historial?')) onSyncBalance(account.id); }} className="text-slate-400 hover:text-green-800 transition-colors mt-0.5">
                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Search + filter bar */}
                            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-200/80 px-3 py-2 flex flex-wrap gap-2 items-center">
                                <div className="relative flex-1 min-w-[120px]">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar..." className="pl-8 h-8 rounded-xl border-slate-200 bg-slate-50 text-sm" />
                                </div>
                                <div className="flex items-center gap-0.5 rounded-xl bg-slate-100 p-0.5">
                                    {(['all', 'income', 'expense'] as const).map(f => (
                                        <button key={f} onClick={() => setMovementFilter(f)} className={cn("px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all", movementFilter === f ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700")}>
                                            {f === 'all' ? 'Todos' : f === 'income' ? 'Ing' : 'Gas'}
                                        </button>
                                    ))}
                                </div>
                                <select value={exactMonthFilter} onChange={e => { setExactMonthFilter(e.target.value); if (e.target.value) setExactDateFilter(''); }} className="h-8 rounded-xl border border-slate-200 bg-slate-50 text-xs px-2 text-slate-600 max-w-[110px]">
                                    <option value="">Mes...</option>
                                    {Array.from({ length: 12 }).map((_, i) => {
                                        const d = new Date(); d.setMonth(d.getMonth() - i);
                                        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                        return <option key={val} value={val}>{new Intl.DateTimeFormat('es-ES', { month: 'short', year: '2-digit' }).format(d)}</option>;
                                    })}
                                </select>
                                {selectedTxIds.size > 0 && onDeleteTransactions && (
                                    <Button variant="destructive" size="sm" className="h-8 rounded-xl gap-1 text-xs" onClick={handleBulkDelete} disabled={isSubmitting}>
                                        <Trash2 className="w-3 h-3" /> {selectedTxIds.size}
                                    </Button>
                                )}
                            </div>

                            {/* Select all row */}
                            {filteredTransactions.length > 0 && (
                                <div className="flex items-center gap-3 px-4 py-2 bg-white/40 border-b border-slate-100">
                                    <Checkbox checked={selectedTxIds.size > 0 && selectedTxIds.size >= filteredTransactions.length} onCheckedChange={toggleAllVisible} className="border-slate-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-none" />
                                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">{filteredTransactions.length} movimientos</span>
                                </div>
                            )}

                            {/* Transaction list – bank statement style */}
                            {filteredTransactions.length === 0 ? (
                                <div className="py-20 text-center text-slate-400">
                                    <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">Sin movimientos</p>
                                </div>
                            ) : (
                                <div>
                                    {groupedDates.map(dateKey => (
                                        <React.Fragment key={dateKey}>
                                            <div className="px-4 py-1.5 bg-slate-100/80 border-b border-slate-200/40">
                                                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                                                    {format(parseISO(dateKey), 'EEEE, d MMM yyyy', { locale: es })}
                                                </p>
                                            </div>
                                            {groupedByDate[dateKey].map(tx => (
                                                <div
                                                    key={tx.id}
                                                    className={cn("flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-white/70 transition-colors cursor-pointer", selectedTxIds.has(tx.id) && "bg-green-50/60 hover:bg-green-50/80")}
                                                    onClick={() => toggleSelection(tx.id)}
                                                >
                                                    <div onClick={e => e.stopPropagation()}>
                                                        <Checkbox checked={selectedTxIds.has(tx.id)} onCheckedChange={() => toggleSelection(tx.id)} className="border-slate-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-none" />
                                                    </div>
                                                    <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shrink-0", tx.amount >= 0 ? "bg-green-100" : "bg-rose-100")}>
                                                        {tx.amount >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 text-green-800" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-700" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-900 truncate leading-none">{tx.description || 'Sin concepto'}</p>
                                                        {tx.is_envelope_spend && <span className="mt-0.5 inline-block text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-0.5">sobre</span>}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className={cn("text-sm font-bold leading-none", tx.amount >= 0 ? "text-green-800" : "text-slate-900")}>
                                                            {tx.amount >= 0 ? '+' : '-'}{currencyFormatter.format(Math.abs(tx.amount))}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 mt-0.5">{currencyFormatter.format(tx.displayRunningBalance)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                                                        <button onClick={() => handleEditTransaction(tx)} className="p-1.5 rounded-lg text-slate-300 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => handleDeleteMovement(tx)} disabled={deletingTransactionId === tx.id} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                    <div className="h-20" />
                                </div>
                            )}
                        </div>

                        {/* ── FAB ── */}
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="absolute bottom-5 right-5 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 z-10"
                            style={{ backgroundColor: account.color || '#10b981', boxShadow: `0 8px 32px ${account.color || '#10b981'}66` }}
                        >
                            <Plus className="w-6 h-6" />
                        </button>

                        {/* ── ADD / EDIT FORM OVERLAY ── */}
                        {showAddForm && (
                            <div className="absolute inset-0 bg-black/50 z-30 flex items-end backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) resetForm(); }}>
                                <div className="w-full bg-white rounded-t-[1.75rem] shadow-2xl p-5 space-y-4 max-h-[85%] overflow-y-auto">
                                    <div className="flex items-center justify-between">
                                        <p className="text-base font-black text-slate-900">{editingTransactionId ? 'Editar movimiento' : 'Nuevo movimiento'}</p>
                                        <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                                        <button type="button" onClick={() => setTransactionKind('deposit')} className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold transition-all", transactionKind === 'deposit' ? "bg-green-500 text-white shadow-md" : "text-slate-500 hover:text-slate-800")}>
                                            <ArrowUpRight className="w-4 h-4" /> Ingreso
                                        </button>
                                        <button type="button" onClick={() => setTransactionKind('expense')} className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold transition-all", transactionKind === 'expense' ? "bg-rose-500 text-white shadow-md" : "text-slate-500 hover:text-slate-800")}>
                                            <ArrowDownRight className="w-4 h-4" /> Gasto
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Input type="number" placeholder="Importe (€)" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="h-11 rounded-xl border-slate-200 text-base font-bold" autoFocus />
                                        <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="h-11 rounded-xl border-slate-200" />
                                    </div>
                                    <Input placeholder="Concepto" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="h-11 rounded-xl border-slate-200" />

                                    {account.parent_account_id && transactionKind === 'expense' && (
                                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                                            <Switch checked={form.is_envelope_spend} onCheckedChange={checked => setForm({ ...form, is_envelope_spend: checked })} className="mt-0.5 data-[state=checked]:bg-amber-500" />
                                            <span className="text-xs text-amber-800 leading-snug">
                                                Pagado con tarjeta de <b>{accounts.find(a => a.id === account.parent_account_id)?.name || 'la cuenta principal'}</b>. Se marcará como pendiente de devolver.
                                            </span>
                                        </div>
                                    )}

                                    <Button onClick={handleSubmit} disabled={isSubmitting || !form.amount} className="w-full h-12 rounded-xl font-bold text-base text-white disabled:opacity-40" style={{ backgroundColor: account.color || '#10b981' }}>
                                        <Save className="w-4 h-4 mr-2" />
                                        {isSubmitting ? 'Guardando...' : editingTransactionId ? 'Guardar cambios' : 'Añadir movimiento'}
                                    </Button>

                                    {editingTransactionId && (
                                        <button type="button" onClick={resetForm} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors">
                                            Cancelar edición
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── DETAILS OVERLAY ── */}
                        {showDetails && (
                            <div className="absolute inset-0 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] z-20">
                                <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center gap-3">
                                    <button onClick={() => setShowDetails(false)} className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
                                        <ArrowLeft className="w-4 h-4 text-slate-600" />
                                    </button>
                                    <p className="text-sm font-bold text-slate-900">Detalles · {account.name}</p>
                                </div>

                                <div className="p-4 space-y-4">
                                    <div className="rounded-2xl border border-white/70 bg-white/85 shadow-lg overflow-hidden">
                                        <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-indigo-500" />
                                            <p className="text-sm font-bold text-slate-900">Ficha de cuenta</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3">
                                            {[
                                                { label: 'Nombre', value: account.name },
                                                { label: 'Banco', value: account.bank_name },
                                                { label: 'Tipo', value: getAccountTypeLabel(account.account_type) },
                                                { label: 'Interés', value: account.interest_rate ? `${account.interest_rate}% TAE` : 'Sin interés' },
                                                { label: 'Última actividad', value: latestTx ? format(parseISO(latestTx.date), 'dd MMM yyyy', { locale: es }) : 'Sin movimientos' },
                                                { label: 'Balance general', value: account.include_in_total === false ? 'Excluida' : 'Incluida' }
                                            ].map(({ label, value }) => (
                                                <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                                                    <p className="text-[9px] uppercase tracking-widest text-slate-400">{label}</p>
                                                    <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-green-200 bg-green-50/70 p-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-bold text-green-900 uppercase tracking-wider">Balance general</p>
                                                <p className="text-sm text-slate-700 mt-1">{account.include_in_total === false ? 'Excluida del cómputo global' : 'Incluida en el cómputo global'}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Decide si esta cuenta suma al total de Mi Economía.</p>
                                            </div>
                                            <Switch checked={account.include_in_total !== false} onCheckedChange={handleIncludeInTotalChange} disabled={isUpdatingIncludeInTotal} />
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
                                        <div>
                                            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Vincular a otra cuenta (Sobre)</p>
                                            <p className="text-xs text-slate-600 mt-1">El dinero se queda aquí generando intereses, pero contará para la cuenta principal.</p>
                                        </div>
                                        <div className="flex flex-col gap-3 sm:flex-row">
                                            <div className="flex-1 space-y-1.5">
                                                <Label className="text-xs text-amber-900">Cuenta principal</Label>
                                                <select className="w-full bg-white border border-amber-200 rounded-xl p-2 text-sm disabled:opacity-50" value={account.parent_account_id || 'none'} disabled={isUpdatingAccount} onChange={e => handleUpdateEnvelopeField('parent_account_id', e.target.value === 'none' ? null : e.target.value)}>
                                                    <option value="none">Independiente (no es sobre)</option>
                                                    {accounts.filter(a => a.id !== account.id && !a.parent_account_id).map(acc => (
                                                        <option key={acc.id} value={acc.id}>Sobre de: {acc.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {account.parent_account_id && (
                                                <div className="flex-1 space-y-1.5">
                                                    <Label className="text-xs text-amber-900">Pendiente de devolver (€)</Label>
                                                    <Input type="number" defaultValue={account.envelope_spent || 0} disabled={isUpdatingAccount} className="bg-white border-amber-200 rounded-xl" onBlur={e => handleUpdateEnvelopeField('envelope_spent', parseFloat(e.target.value) || 0)} />
                                                    <p className="text-[9px] text-amber-700/70">Pulsa fuera del campo para guardar.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-white/70 bg-white/85 shadow-lg p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <ShieldCheck className="w-4 h-4 text-green-800" />
                                            <p className="text-sm font-bold text-slate-900">Credencial bancaria</p>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800">{linkedPasswordName || 'No vinculada'}</p>
                                        <p className="text-xs text-slate-500 mt-1">{linkedPasswordName ? 'Conectada con el gestor de contraseñas.' : 'Todavía no hay credencial asociada.'}</p>
                                        {linkedPasswordName && onNavigateToPassword && (
                                            <Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={onNavigateToPassword}>Abrir contraseña vinculada</Button>
                                        )}
                                    </div>

                                    <div className="rounded-2xl border border-white/70 bg-white/85 shadow-lg p-4">
                                        <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Color de cuenta</p>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl border border-slate-200 shadow-inner" style={{ backgroundColor: account.color || '#10b981' }} />
                                            <p className="font-mono text-sm text-slate-700">{account.color || '#10b981'}</p>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-white to-rose-50 p-4">
                                        <p className="text-sm font-bold text-rose-700 flex items-center gap-2 mb-2"><Trash2 className="w-4 h-4" /> Zona delicada</p>
                                        <p className="text-xs text-rose-600/80 mb-3">Si eliminas esta cuenta, desaparecerá también su historial de movimientos.</p>
                                        <Button variant="destructive" className="w-full rounded-xl" onClick={() => void onDeleteAccount()}>Eliminar cuenta</Button>
                                    </div>

                                    <div className="h-4" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
