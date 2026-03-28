'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    Save,
    FileUp,
    Settings
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import SavingsNotificationSettings from '@/components/apps/mi-hogar/savings/savings-notification-settings';
import SavingsNotificationManager from '@/components/apps/mi-hogar/savings/savings-notification-manager';
import SavingsDashboardUI from '@/components/apps/mi-hogar/savings/savings-dashboard-ui';
import BankStatementImporter from '@/components/apps/mi-hogar/savings/bank-statement-importer';
import ResetDataDialog, { ResetOptions } from '@/components/apps/mi-hogar/savings/reset-data-dialog';
import AccountDetailDialog from '@/components/apps/mi-hogar/savings/account-detail-dialog';

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
    interest_rate?: number;
    include_in_total?: boolean;
    account_type?: 'libre' | 'objetivo' | 'bloqueada';
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

type SavingsTransaction = {
    id: string;
    amount: number;
    date: string;
    description: string;
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
    const { user, loading: authLoading } = useAuth();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const [monthlyStats, setMonthlyStats] = useState({ income: 0, expense: 0, savingsRate: 0 });
    const [chartData, setChartData] = useState<any[]>([]);
    const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
    const [passwords, setPasswords] = useState<{ id: string, name: string }[]>([]);
    const [pendingTotal, setPendingTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    // Detail States
    const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

    // Transactions State
    const [goalTransactions, setGoalTransactions] = useState<SavingsTransaction[]>([]);
    const [accountTransactions, setAccountTransactions] = useState<SavingsTransaction[]>([]);
    const [transType, setTransType] = useState<'deposit' | 'expense'>('deposit');
    const [newTransaction, setNewTransaction] = useState({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });

    // Dialog States
    const [isGoalDetailOpen, setIsGoalDetailOpen] = useState(false);
    const [isAccountDetailOpen, setIsAccountDetailOpen] = useState(false);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
    const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);
    const [isImporterOpen, setIsImporterOpen] = useState(false);
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

    // Forms
    const [newAccount, setNewAccount] = useState<{ name: string, bank: string, color: string, passId: string, customBankName?: string, interestRate: string, includeInTotal: boolean }>({ name: '', bank: 'Otro', color: '#64748b', passId: 'none', interestRate: '', includeInTotal: true });
    const [newGoal, setNewGoal] = useState({ name: '', target: '', current: '', deadline: '', linkedAccountId: 'none', interestRate: '' });
    const [newRecurring, setNewRecurring] = useState({ name: '', amount: '', type: 'expense', day: '', targetAccountId: 'none', endDate: '' });

    const resetSavingsState = () => {
        setAccounts([]);
        setGoals([]);
        setRecentTransactions([]);
        setMonthlyStats({ income: 0, expense: 0, savingsRate: 0 });
        setChartData([]);
        setRecurringItems([]);
        setPasswords([]);
        setPendingTotal(0);
        setLoading(false);
    };


    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            resetSavingsState();
            return;
        }

        const userId = user.id;

        fetchData(userId).then(() => {
            // Run automation after fetching data
            processAutoDeposits(userId);
        });
        fetchPasswordsLite(userId);
    }, [user, authLoading]);

    // --- AUTOMATION LOGIC ---
    const processAutoDeposits = async (userId?: string) => {
        if (!userId) return;

        const today = new Date();
        const currentDay = today.getDate(); // 1-31
        const currentMonthStr = format(today, 'yyyy-MM'); // 2024-02

        // Fetch valid items for automation directly to insure freshness
        const { data: items } = await supabase
            .from('savings_recurring_items')
            .select('*')
            .eq('user_id', userId)
            .eq('type', 'income') // Only incomes are automated for now per user request
            .not('target_account_id', 'is', null);

        if (!items || items.length === 0) return;

        let processedCount = 0;

        for (const item of items) {
            // Check if it should run today or if we missed it this month
            // Condition 1: Day of month has passed or is today
            if ((item.day_of_month || 1) > currentDay) continue;

            // Condition 2: Has NOT run this month yet
            // We check if last_run_date is in current month
            if (item.last_run_date && item.last_run_date.startsWith(currentMonthStr)) continue;

            // Condition 3: End Date not passed
            if (item.end_date && new Date(item.end_date) < today) continue;

            // EXECUTE DEPOSIT
            console.log('Executing Auto Deposit:', item.name);

            // 1. Transaction Record
            await supabase.from('savings_account_transactions').insert({
                user_id: userId,
                account_id: item.target_account_id,
                amount: item.amount,
                date: format(today, 'yyyy-MM-dd'),
                description: `Auto: ${item.name}`
            });

            // 2. Update Account Balance
            // We need current balance first
            const { data: acc } = await supabase.from('savings_accounts').select('current_balance').eq('id', item.target_account_id).single();
            if (acc) {
                await supabase.from('savings_accounts').update({
                    current_balance: (acc.current_balance || 0) + item.amount
                }).eq('id', item.target_account_id);
            }

            // 3. Mark as Run
            await supabase.from('savings_recurring_items').update({
                last_run_date: format(today, 'yyyy-MM-dd')
            }).eq('id', item.id);

            processedCount++;
        }

        if (processedCount > 0) {
            toast.success(`Se han procesado ${processedCount} ingresos automÃ¡ticos`);
            // Refetch to update UI
            fetchData(userId);
        }
    };

    const fetchData = async (userId?: string) => {
        if (!userId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // 1. Accounts
            const { data: accs } = await supabase
                .from('savings_accounts')
                .select('*')
                .eq('user_id', userId)
                .order('name');
            setAccounts(accs || []);

            // 2. Goals
            const { data: gls } = await supabase
                .from('savings_goals')
                .select('*')
                .eq('user_id', userId)
                .order('deadline', { ascending: true });
            setGoals(gls || []);

            // 3. Transactions (Last 30 days for stats & chart)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: txs } = await supabase
                .from('savings_account_transactions')
                .select('*')
                .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
                .in('account_id', accs?.map(a => a.id) || [])
                .order('date', { ascending: false });

            setRecentTransactions(txs || []);

            // 4. Recurring Items
            const { data: recs } = await supabase
                .from('savings_recurring_items')
                .select('*')
                .eq('user_id', userId)
                .order('day_of_month', { ascending: true });
            setRecurringItems((recs as RecurringItem[]) || []);

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
            
            const rate = mIncome > 0 ? ((mIncome - mExpense) / mIncome) * 100 : 0;
            setMonthlyStats({ income: mIncome, expense: mExpense, savingsRate: rate > 0 ? rate : 0 });

            // Calculate Chart Data (Reconstruct backwards)
            let currentTotal = accs?.reduce((sum, a) => sum + (a.current_balance || 0), 0) || 0;
            const dailyBalances = [];

            for (let i = 0; i < 30; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];

                dailyBalances.push({
                    date: format(d, 'd MMM', { locale: es }),
                    fullDate: dateStr,
                    value: currentTotal // Using 'value' for Recharts compatibility
                });

                const daysTransactions = (txs || []).filter(t => t.date === dateStr);
                const daysChange = daysTransactions.reduce((sum, t) => sum + t.amount, 0);

                currentTotal -= daysChange;
            }

            setChartData(dailyBalances.reverse());

            // 5. Pending Balance Total
            const { data: pendingExps } = await supabase
                .from('pending_balance_expenses')
                .select('amount')
                .eq('user_id', userId)
                .eq('status', 'pending');
            const pTotal = (pendingExps || []).reduce((s: number, e: any) => s + (e.amount || 0), 0);
            setPendingTotal(pTotal);

        } catch (error) {
            console.error(error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const fetchPasswordsLite = async (userId?: string) => {
        if (!userId) {
            setPasswords([]);
            return;
        }

        const { data } = await supabase.from('passwords').select('id, name').eq('user_id', userId).order('name');
        setPasswords(data || []);
    };

    // --- GENERIC TRANSACTION FETCHERS ---
    const fetchGoalTransactions = async (goalId: string) => {
        const { data } = await supabase.from('savings_goal_transactions').select('*').eq('goal_id', goalId).order('date', { ascending: false });
        setGoalTransactions(data || []);
    };

    const fetchAccountTransactions = async (accountId: string) => {
        const { data } = await supabase.from('savings_account_transactions').select('*').eq('account_id', accountId).order('date', { ascending: false });
        setAccountTransactions(data || []);
    };

    // --- OPEN DETAIL HANDLERS ---
    const handleOpenGoalDetail = async (goal: SavingsGoal) => {
        setSelectedGoal(goal);
        setTransType('deposit');
        setNewTransaction({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });
        setGoalTransactions([]);
        await fetchGoalTransactions(goal.id);
        setIsGoalDetailOpen(true);
    };

    const handleOpenAccountDetail = async (acc: BankAccount) => {
        setSelectedAccount(acc);
        setAccountTransactions([]);
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
                interest_rate: newAccount.interestRate ? parseFloat(newAccount.interestRate) : 0,
                include_in_total: newAccount.includeInTotal
            };
            const { error } = await supabase.from('savings_accounts').insert(payload);
            if (error) throw error;
            toast.success('Cuenta creada');
            setIsAddAccountOpen(false);
            setNewAccount({ name: '', bank: 'Otro', color: '#64748b', passId: 'none', interestRate: '', includeInTotal: true });
            fetchData(user?.id);
        } catch (error) {
            toast.error('Error al crear cuenta');
        }
    };

    const handleToggleAccountInTotal = async (checked: boolean) => {
        if (!selectedAccount) return;

        try {
            const { error } = await supabase
                .from('savings_accounts')
                .update({ include_in_total: checked })
                .eq('id', selectedAccount.id);

            if (error) throw error;

            const updatedAccount = { ...selectedAccount, include_in_total: checked };
            setSelectedAccount(updatedAccount);
            setAccounts((prev) => prev.map((account) => (
                account.id === updatedAccount.id
                    ? { ...account, include_in_total: checked }
                    : account
            )));
            toast.success(checked ? 'Cuenta incluida en el balance general' : 'Cuenta excluida del balance general');
            fetchData(user?.id);
        } catch (error) {
            console.error(error);
            toast.error('No se pudo actualizar el balance general');
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
            setNewGoal({ name: '', target: '', current: '', deadline: '', linkedAccountId: 'none', interestRate: '' });
            fetchData(user?.id);
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
            const { error: txError } = await supabase.from('savings_goal_transactions').insert({
                goal_id: selectedGoal.id,
                amount: amount,
                date: newTransaction.date,
                description: newTransaction.description || (transType === 'deposit' ? 'Aporte' : 'Retiro')
            });
            if (txError) throw txError;
            const newTotal = (selectedGoal.current_amount || 0) + amount;
            const { error: upError } = await supabase.from('savings_goals').update({ current_amount: newTotal }).eq('id', selectedGoal.id);
            if (upError) throw upError;
            toast.success('Movimiento registrado');
            setNewTransaction({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });
            fetchGoalTransactions(selectedGoal.id);
            fetchData(user?.id);
            setSelectedGoal({ ...selectedGoal, current_amount: newTotal });
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar movimiento');
        }
    };

    const handleSubmitAccountTransaction = async ({
        transactionId,
        amount,
        date,
        description,
        kind
    }: {
        transactionId?: string;
        amount: number;
        date: string;
        description: string;
        kind: 'deposit' | 'expense';
    }) => {
        if (!selectedAccount) {
            toast.error('Selecciona una cuenta');
            return;
        }

        try {
            const signedAmount = kind === 'expense' ? -Math.abs(amount) : Math.abs(amount);
            const currentTransaction = transactionId
                ? accountTransactions.find((tx) => tx.id === transactionId)
                : null;

            if (transactionId && !currentTransaction) {
                throw new Error('Movimiento no encontrado');
            }

            if (currentTransaction) {
                const { error: txError } = await supabase
                    .from('savings_account_transactions')
                    .update({
                        amount: signedAmount,
                        date,
                        description: description || (kind === 'deposit' ? 'Ingreso' : 'Retiro')
                    })
                    .eq('id', transactionId);

                if (txError) throw txError;

                const recalculatedBalance = (selectedAccount.current_balance || 0) - currentTransaction.amount + signedAmount;
                const { error: accountError } = await supabase
                    .from('savings_accounts')
                    .update({ current_balance: recalculatedBalance })
                    .eq('id', selectedAccount.id);

                if (accountError) throw accountError;

                setSelectedAccount({ ...selectedAccount, current_balance: recalculatedBalance });
                toast.success('Movimiento actualizado');
            } else {
                const { error: txError } = await supabase.from('savings_account_transactions').insert({
                    account_id: selectedAccount.id,
                    amount: signedAmount,
                    date,
                    description: description || (kind === 'deposit' ? 'Ingreso' : 'Retiro')
                });

                if (txError) throw txError;

                const recalculatedBalance = (selectedAccount.current_balance || 0) + signedAmount;
                const { error: accountError } = await supabase
                    .from('savings_accounts')
                    .update({ current_balance: recalculatedBalance })
                    .eq('id', selectedAccount.id);

                if (accountError) throw accountError;

                setSelectedAccount({ ...selectedAccount, current_balance: recalculatedBalance });
                toast.success('Movimiento registrado');
            }

            await fetchAccountTransactions(selectedAccount.id);
            await fetchData(user?.id);
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar movimiento');
        }
    };

    const handleDeleteAccountTransaction = async (transactionId: string, amount: number) => {
        if (!selectedAccount) return;

        try {
            const { error: txError } = await supabase
                .from('savings_account_transactions')
                .delete()
                .eq('id', transactionId);

            if (txError) throw txError;

            const recalculatedBalance = (selectedAccount.current_balance || 0) - amount;
            const { error: accountError } = await supabase
                .from('savings_accounts')
                .update({ current_balance: recalculatedBalance })
                .eq('id', selectedAccount.id);

            if (accountError) throw accountError;

            setSelectedAccount({ ...selectedAccount, current_balance: recalculatedBalance });
            await fetchAccountTransactions(selectedAccount.id);
            await fetchData(user?.id);
            toast.success('Movimiento eliminado');
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar movimiento');
        }
    };


    const handleDeleteAccount = async () => {
        if (!selectedAccount) return;
        if (!window.confirm('Â¿Seguro que quieres eliminar esta cuenta? Se perderÃ¡ el historial y las metas asociadas.')) return;
        try {
            const { error } = await supabase.from('savings_accounts').delete().eq('id', selectedAccount.id);
            if (error) throw error;
            toast.success('Cuenta eliminada');
            setIsAccountDetailOpen(false);
            setSelectedAccount(null);
            setAccountTransactions([]);
            fetchData(user?.id);
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar cuenta');
        }
    };
    const handleResetData = async (options: ResetOptions) => {
        if (!user) return;
        try {
            const allAccountIds = accounts.map((account) => account.id);
            const targetAccountIds = options.accounts
                ? options.accountDeletionMode === 'single' && options.selectedAccountId
                    ? [options.selectedAccountId]
                    : allAccountIds
                : allAccountIds;

            if (options.accounts) {
                if (targetAccountIds.length > 0) {
                    await supabase.from('savings_account_transactions').delete().in('account_id', targetAccountIds);
                    await supabase.from('savings_accounts').delete().in('id', targetAccountIds);
                }
            } else if (options.transactions && targetAccountIds.length > 0) {
                await supabase.from('savings_account_transactions').delete().in('account_id', targetAccountIds);
                await supabase.from('savings_accounts').update({ current_balance: 0 }).in('id', targetAccountIds);
            }

            if (options.goals) {
                await supabase.from('savings_goals').delete().eq('user_id', user.id);
            }
            if (options.recurring) {
                await supabase.from('savings_recurring_items').delete().eq('user_id', user.id);
            }
            if (options.pending) {
                await supabase.from('pending_balance_expenses').delete().eq('user_id', user.id);
                await supabase.from('pending_balance_projects').delete().eq('user_id', user.id);
            }

            toast.success(options.accounts && options.accountDeletionMode === 'single' ? 'Cuenta eliminada correctamente' : 'Datos eliminados correctamente');
            setIsResetDialogOpen(false);
            fetchData(user.id);
        } catch (error) {
            console.error(error);
            toast.error('Error al resetear datos');
        }
    };
    const handleCreateRecurring = async () => {
        if (!newRecurring.name || !newRecurring.amount) return toast.error('Rellena nombre e importe');
        try {
            const payload = {
                user_id: user?.id,
                name: newRecurring.name,
                amount: parseFloat(newRecurring.amount),
                type: newRecurring.type,
                day_of_month: newRecurring.day ? parseInt(newRecurring.day) : null,
                category: 'General',
                target_account_id: newRecurring.targetAccountId === 'none' ? null : newRecurring.targetAccountId,
                end_date: newRecurring.endDate || null
            };
            const { error } = await supabase.from('savings_recurring_items').insert(payload);
            if (error) throw error;
            toast.success('Fijo aÃ±adido');
            setIsAddRecurringOpen(false);
            setNewRecurring({ name: '', amount: '', type: 'expense', day: '', targetAccountId: 'none', endDate: '' });
            fetchData(user?.id);
        } catch (error) {
            console.error(error);
            toast.error('Error al crear fijo');
        }
    };

    const handleDeleteRecurring = async (id: string) => {
        if (!window.confirm('Â¿Eliminar este gasto/ingreso fijo?')) return;
        try {
            const { error } = await supabase.from('savings_recurring_items').delete().eq('id', id);
            if (error) throw error;
            toast.success('Eliminado');
            fetchData(user?.id);
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const navigateToPassword = (passId: string) => {
        window.open(`/apps/mi-hogar/passwords`, '_blank');
    };

    // --- CALCULATIONS ---
    const selectedAccountPasswordId = selectedAccount?.password_id;
    const selectedAccountPasswordName = selectedAccountPasswordId
        ? passwords.find((p) => p.id === selectedAccountPasswordId)?.name
        : undefined;
    const totalCurrentBalance = accounts.filter(a => a.include_in_total !== false).reduce((acc, curr) => acc + (curr.current_balance || 0), 0);
    const totalGoalSaved = goals.reduce((acc, curr) => acc + (curr.current_amount || 0), 0);

    return (
        <div className="container mx-auto p-4 max-w-6xl space-y-6 pb-24">
            {/* Header */}
            <div className="flex justify-between items-center">
                <Link href="/apps/mi-hogar">
                    <Button variant="ghost" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Volver
                    </Button>
                </Link>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsImporterOpen(true)}>
                        <FileUp className="h-4 w-4" /> Importar Extracto
                    </Button>
                    <SavingsNotificationSettings />
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20 w-9 h-9 sm:w-8 sm:h-8" 
                        onClick={() => setIsResetDialogOpen(true)}
                        title="Purgar Datos"
                    >
                        <Settings className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Notification Manager (invisible) */}
            <SavingsNotificationManager />

            {/* MAIN DASHBOARD UI */}
            <SavingsDashboardUI
                accounts={accounts}
                goals={goals}
                monthlyStats={monthlyStats}
                totalBalance={totalCurrentBalance}
                totalGoalSaved={totalGoalSaved}
                chartData={chartData}
                loading={loading}
                onAddAccount={() => setIsAddAccountOpen(true)}
                onAddGoal={() => setIsAddGoalOpen(true)}
                onAddTransaction={() => {
                    if (accounts.length > 0) {
                        handleOpenAccountDetail(accounts[0]);
                    } else {
                        toast.info("AÃ±ade una cuenta primero");
                    }
                }}
                onViewAccount={handleOpenAccountDetail}
                recentTransactions={recentTransactions}
                recurringItems={recurringItems}
                onDeleteRecurring={handleDeleteRecurring}
                userId={user?.id}
                pendingTotal={pendingTotal}
                onBalanceChange={() => fetchData(user?.id)}
            />

            {/* --- BANK STATEMENT IMPORTER --- */}
            <BankStatementImporter
                open={isImporterOpen}
                onOpenChange={setIsImporterOpen}
                accounts={accounts}
                userId={user?.id || ''}
                onImportComplete={() => fetchData(user?.id)}
            />

            {/* --- RESET DATA DIALOG --- */}
            <ResetDataDialog 
                isOpen={isResetDialogOpen}
                onClose={() => setIsResetDialogOpen(false)}
                onConfirm={handleResetData}
                accounts={accounts.map((account) => ({
                    id: account.id,
                    name: account.name,
                    bank_name: account.bank_name,
                }))}
            />

            {/* --- DIALOGS --- */}

            <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>AÃ±adir Cuenta</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Nombre</Label><Input placeholder="Ej: Ahorros Piso" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} /></div>
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
                                        <SelectItem key={b.name} value={b.name}><div className="flex items-center gap-2">{b.logo ? <img src={b.logo} alt={b.name} className="w-5 h-5 object-contain" /> : <div className="w-4 h-4 rounded-full" style={{ backgroundColor: b.color }} />}{b.name}</div></SelectItem>
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
                        <div className="space-y-2"><Label>InterÃ©s Anual (%)</Label><Input type="number" placeholder="Ej: 3.5" value={newAccount.interestRate} onChange={(e) => setNewAccount({ ...newAccount, interestRate: e.target.value })} /></div>
                        <div className="space-y-2">
                            <Label>ContraseÃ±a (Opcional)</Label>
                            <Select onValueChange={(v) => setNewAccount({ ...newAccount, passId: v })}>
                                <SelectTrigger><SelectValue placeholder="Sin vincular" /></SelectTrigger>
                                <SelectContent><SelectItem value="none">Sin vincular</SelectItem>{passwords.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                            <div className="space-y-1">
                                <Label htmlFor="include-in-total" className="text-sm font-semibold text-slate-900">Incluir en balance general</Label>
                                <p className="text-xs text-slate-500">Esta cuenta sumarÃ¡ al total principal de Mi EconomÃ­a.</p>
                            </div>
                            <Switch
                                id="include-in-total"
                                checked={newAccount.includeInTotal}
                                onCheckedChange={(checked) => setNewAccount({ ...newAccount, includeInTotal: checked })}
                            />
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleCreateAccount}>Crear Cuenta</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Nueva Meta de EconomÃ­a</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Nombre</Label><Input value={newGoal.name} onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} /></div>
                        <div className="space-y-2">
                            <Label>Banco Asociado</Label>
                            <Select value={newGoal.linkedAccountId} onValueChange={(v) => setNewGoal({ ...newGoal, linkedAccountId: v })}>
                                <SelectTrigger><SelectValue placeholder="Selecciona un banco..." /></SelectTrigger>
                                <SelectContent><SelectItem value="none">Sin asociar</SelectItem>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.bank_name})</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Objetivo (â‚¬)</Label><Input type="number" value={newGoal.target} onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Ya tienes (â‚¬)</Label><Input type="number" value={newGoal.current} onChange={(e) => setNewGoal({ ...newGoal, current: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>InterÃ©s (%)</Label><Input type="number" value={newGoal.interestRate} onChange={(e) => setNewGoal({ ...newGoal, interestRate: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Fecha LÃ­mite</Label><Input type="date" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })} /></div>
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleCreateGoal}>Crear Meta</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddRecurringOpen} onOpenChange={setIsAddRecurringOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Nuevo Ingreso/Gasto Fijo</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Nombre</Label><Input placeholder="Ej: Alquiler, NÃ³mina..." value={newRecurring.name} onChange={(e) => setNewRecurring({ ...newRecurring, name: e.target.value })} /></div>
                        <div className="flex gap-4">
                            <Button variant={newRecurring.type === 'income' ? 'default' : 'outline'} onClick={() => setNewRecurring({ ...newRecurring, type: 'income' })} className={newRecurring.type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 w-full' : 'w-full'}>Ingreso</Button>
                            <Button variant={newRecurring.type === 'expense' ? 'default' : 'outline'} onClick={() => setNewRecurring({ ...newRecurring, type: 'expense' })} className={newRecurring.type === 'expense' ? 'bg-rose-600 hover:bg-rose-700 w-full' : 'w-full'}>Gasto</Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Importe (â‚¬)</Label><Input type="number" value={newRecurring.amount} onChange={(e) => setNewRecurring({ ...newRecurring, amount: e.target.value })} /></div>
                            <div className="space-y-2"><Label>DÃ­a del mes</Label><Input type="number" min="1" max="31" placeholder="Ej: 5" value={newRecurring.day} onChange={(e) => setNewRecurring({ ...newRecurring, day: e.target.value })} /></div>
                        </div>

                        {newRecurring.type === 'income' && (
                            <div className="space-y-2 p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-900">
                                <Label className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-2">
                                    <Landmark className="w-4 h-4" /> Ingreso AutomÃ¡tico (Opcional)
                                </Label>
                                <p className="text-xs text-muted-foreground mb-2">Si seleccionas una cuenta, el dinero se sumarÃ¡ automÃ¡ticamente el dÃ­a elegido.</p>
                                <Select value={newRecurring.targetAccountId} onValueChange={(v) => setNewRecurring({ ...newRecurring, targetAccountId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona cuenta destino..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No automatizar (Solo recordatorio)</SelectItem>
                                        {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.bank_name})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Fin (Opcional)</Label>
                            <Input type="date" value={newRecurring.endDate} onChange={(e) => setNewRecurring({ ...newRecurring, endDate: e.target.value })} />
                            <p className="text-xs text-muted-foreground">Dejar en blanco para indefinido.</p>
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleCreateRecurring}>Guardar</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isGoalDetailOpen} onOpenChange={setIsGoalDetailOpen}>
                <DialogContent className="max-w-md sm:max-w-lg">
                    <DialogHeader><DialogTitle>Detalle: {selectedGoal?.name}</DialogTitle></DialogHeader>
                    <div className="space-y-6 py-2">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg text-center relative">
                            <p className="text-sm text-muted-foreground">Saldo Actual</p>
                            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{selectedGoal?.current_amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
                            <p className="text-xs text-muted-foreground mt-1">Meta: {selectedGoal?.target_amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                            {selectedGoal?.interest_rate ? <div className="absolute top-2 right-2 bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-bold">{selectedGoal.interest_rate}% InterÃ©s</div> : null}
                        </div>
                        <div className="space-y-3 border-t pt-4">
                            <div className="flex justify-center gap-4 mb-2">
                                <Button variant={transType === 'deposit' ? 'default' : 'outline'} onClick={() => setTransType('deposit')} className={transType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''} size="sm"><TrendingUp className="w-4 h-4 mr-2" />AportaciÃ³n</Button>
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
                            {goalTransactions.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">Sin movimientos</p> :
                                goalTransactions.map(tx => (
                                    <div key={tx.id} className="flex justify-between items-center text-sm p-2 border rounded hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <div><p className="font-medium">{tx.description || 'Movimiento'}</p><p className="text-xs text-muted-foreground">{format(parseISO(tx.date), 'dd MMM yyyy', { locale: es })}</p></div>
                                        <span className={tx.amount >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{tx.amount >= 0 ? '+' : ''}{tx.amount}â‚¬</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AccountDetailDialog
                open={isAccountDetailOpen}
                onOpenChange={setIsAccountDetailOpen}
                account={selectedAccount}
                transactions={accountTransactions}
                linkedPasswordName={selectedAccountPasswordName}
                onSubmitTransaction={handleSubmitAccountTransaction}
                onDeleteTransaction={handleDeleteAccountTransaction}
                onDeleteAccount={handleDeleteAccount}
                onToggleIncludeInTotal={handleToggleAccountInTotal}
                onNavigateToPassword={selectedAccountPasswordId ? () => navigateToPassword(selectedAccountPasswordId) : undefined}
            />

        </div>
    );
}


