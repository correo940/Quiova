"use client";

import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  format, addDays, startOfDay, isSameDay,
  differenceInDays, parseISO, addMonths, startOfWeek,
  startOfMonth, endOfMonth, isSameMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';

interface DailyNotificationSettings {
  enabled: boolean;
  time: string;
  categories: {
    tasks: boolean; shifts: boolean; vehicles: boolean; shopping: boolean;
    money: boolean; medicines: boolean; insurances: boolean; warranties: boolean; expenses: boolean;
  };
}

interface DebtDetail {
  id: string;
  name: string;
  amount: number;
}

// ── Bank brand → visual identity ─────────────────────────────────────────────
type BankInfo = { bg: string; color: string; abbr: string; bankName: string; domain: string };

function getBankStyle(name: string): BankInfo {
  const n = (name || '').toLowerCase();
  if (n.includes('bbva'))       return { bg: '#004481', color: '#fff', abbr: 'BB',  bankName: 'BBVA',           domain: 'bbva.es' };
  if (n.includes('caixa'))      return { bg: '#007BC4', color: '#fff', abbr: 'CX',  bankName: 'CaixaBank',      domain: 'caixabank.es' };
  if (n.includes('santander'))  return { bg: '#EC0000', color: '#fff', abbr: 'SN',  bankName: 'Santander',      domain: 'santander.es' };
  if (n.includes('ing'))        return { bg: '#FF6200', color: '#fff', abbr: 'ING', bankName: 'ING',            domain: 'ing.es' };
  if (n.includes('revolut'))    return { bg: '#191C20', color: '#fff', abbr: 'RV',  bankName: 'Revolut',        domain: 'revolut.com' };
  if (n.includes('openbank'))   return { bg: '#CC0000', color: '#fff', abbr: 'OB',  bankName: 'Openbank',       domain: 'openbank.es' };
  if (n.includes('sabadell'))   return { bg: '#0059A8', color: '#fff', abbr: 'SB',  bankName: 'Sabadell',       domain: 'sabadell.com' };
  if (n.includes('bankinter'))  return { bg: '#FF6600', color: '#fff', abbr: 'BK',  bankName: 'Bankinter',      domain: 'bankinter.com' };
  if (n.includes('paypal'))     return { bg: '#003087', color: '#fff', abbr: 'PP',  bankName: 'PayPal',         domain: 'paypal.com' };
  if (n.includes('n26'))        return { bg: '#2D2D2D', color: '#fff', abbr: 'N26', bankName: 'N26',            domain: 'n26.com' };
  if (n.includes('wizink'))     return { bg: '#8B1A6B', color: '#fff', abbr: 'WZ',  bankName: 'WiZink',         domain: 'wizink.es' };
  if (n.includes('myinvestor')) return { bg: '#FF4343', color: '#fff', abbr: 'MI',  bankName: 'MyInvestor',     domain: 'myinvestor.es' };
  if (n.includes('trade'))      return { bg: '#1DB954', color: '#fff', abbr: 'TR',  bankName: 'Trade Republic', domain: 'traderepublic.com' };
  if (n.includes('degiro'))     return { bg: '#00A86B', color: '#fff', abbr: 'DG',  bankName: 'DEGIRO',         domain: 'degiro.es' };
  if (n.includes('unicaja'))    return { bg: '#004990', color: '#fff', abbr: 'UC',  bankName: 'Unicaja',        domain: 'unicajabanco.es' };
  if (n.includes('kutxabank'))  return { bg: '#E30613', color: '#fff', abbr: 'KX',  bankName: 'Kutxabank',      domain: 'kutxabank.es' };
  if (n.includes('ibercaja'))   return { bg: '#009FE3', color: '#fff', abbr: 'IB',  bankName: 'Ibercaja',       domain: 'ibercaja.es' };
  if (n.includes('abanca'))     return { bg: '#00A19A', color: '#fff', abbr: 'AB',  bankName: 'Abanca',         domain: 'abanca.com' };
  if (n.includes('lacaixa') || n.includes('la caixa')) return { bg: '#007BC4', color: '#fff', abbr: 'CX', bankName: 'CaixaBank', domain: 'caixabank.es' };
  const letter = (name || 'A').charAt(0).toUpperCase();
  return { bg: '#6B7280', color: '#fff', abbr: letter, bankName: name || 'Cuenta', domain: '' };
}

// ── Bank logo: Google Favicon (reliable from localhost), fallback to abbr ─────
function BankLogo({ bank, size = 40 }: { bank: BankInfo; size?: number }) {
  const [err, setErr] = useState(false);
  const radius = Math.round(size * 0.28);
  const imgSize = Math.round(size * 0.68);
  // Google's favicon service works from any origin, no CORS issues
  const faviconUrl = bank.domain
    ? `https://www.google.com/s2/favicons?domain=${bank.domain}&sz=128`
    : null;

  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: bank.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 4px 12px ${bank.bg}55`,
      overflow: 'hidden',
    }}>
      {faviconUrl && !err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconUrl}
          width={imgSize} height={imgSize}
          style={{ objectFit: 'contain', display: 'block', imageRendering: 'crisp-edges' }}
          onError={() => setErr(true)}
          alt={bank.bankName}
        />
      ) : (
        <span style={{
          fontSize: bank.abbr.length > 2 ? Math.round(size * 0.2) : Math.round(size * 0.26),
          fontWeight: 900, color: '#fff', letterSpacing: '-0.5px',
        }}>
          {bank.abbr}
        </span>
      )}
    </div>
  );
}

// Strip bank keywords to get the user's custom account label
function getAccountLabel(accName: string): string {
  const kw = /\b(bbva|caixabank|lacaixa|la caixa|caixa|santander|ing direct|ing|revolut|openbank|sabadell|bankinter|paypal|n26|wizink|myinvestor|trade republic|degiro|unicaja|kutxabank|ibercaja|abanca)\b/gi;
  const stripped = accName.replace(kw, '').replace(/\s+/g, ' ').trim();
  return stripped || accName;
}

// ── Mini bar chart ────────────────────────────────────────────────────────────
function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 22 }}>
      {data.map((v, i) => {
        const h = Math.max(2, Math.round((v / max) * 20));
        const isLast = i === data.length - 1;
        return (
          <div key={i} style={{
            flex: 1, height: h, borderRadius: 2,
            background: isLast ? color : color + '55',
          }} />
        );
      })}
    </div>
  );
}

// ── Status dot ────────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: 'ok' | 'warn' | 'alert' }) {
  return <div style={{
    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
    background: status === 'ok' ? '#22c55e' : status === 'warn' ? '#f97316' : '#ef4444',
    boxShadow: `0 0 4px ${status === 'ok' ? '#22c55e' : status === 'warn' ? '#f97316' : '#ef4444'}55`,
  }} />;
}

// ── Shopping emoji mapper ─────────────────────────────────────────────────────
function shopEmoji(name: string): string {
  const n = (name || '').toLowerCase();
  const map: [string, string][] = [
    ['leche', '🥛'], ['tomate', '🍅'], ['pan', '🥖'], ['huevo', '🥚'], ['huevos', '🥚'],
    ['pollo', '🍗'], ['carne', '🥩'], ['pescado', '🐟'], ['verdura', '🥦'], ['fruta', '🍎'],
    ['yogur', '🍦'], ['queso', '🧀'], ['mantequilla', '🧈'], ['arroz', '🍚'], ['pasta', '🍝'],
    ['aceite', '🫒'], ['agua', '💧'], ['café', '☕'], ['cafe', '☕'], ['zumo', '🧃'],
    ['cerveza', '🍺'], ['vino', '🍷'], ['papel', '🧻'], ['jabón', '🧼'], ['jabon', '🧼'],
    ['detergente', '🧹'], ['limón', '🍋'], ['manzana', '🍎'], ['plátano', '🍌'],
    ['platano', '🍌'], ['naranja', '🍊'], ['fresa', '🍓'], ['ajo', '🧄'], ['cebolla', '🧅'],
    ['patata', '🥔'], ['zanahoria', '🥕'], ['lechuga', '🥬'], ['sal', '🧂'], ['azúcar', '🍬'],
    ['harina', '🌾'], ['aceite oliva', '🫒'], ['atún', '🐟'], ['atun', '🐟'],
  ];
  for (const [key, emoji] of map) {
    if (n.includes(key)) return emoji;
  }
  return '•';
}

// ── QUIOBA Icon System — Apple-style, strokeWidth 1.75 ───────────────────────
const QI: Record<string, (c: string, s: number) => React.ReactNode> = {
  shopping: (c, s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 3h11L20 8H4L6.5 3z"/><rect x="4" y="8" width="16" height="13" rx="1.5"/><path d="M9.5 12.5a2.5 2.5 0 005 0"/></svg>,
  wallet: (c, s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="15" rx="2.5"/><path d="M2 11h20"/><path d="M16 15h2.5"/><path d="M6 6V5a2 2 0 014 0v1"/></svg>,
  car: (c, s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17H2.5v-4l3-5.5h13l3 5.5V17H20"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/><path d="M4.5 11.5h15"/></svg>,
  document: (c, s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8.5L14 2z"/><path d="M14 2v7h7"/><path d="M9 13l2 2 4-4"/></svg>,
  health: (c, s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="8" height="8" rx="2.5"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>,
  shield: (c, s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L4.5 7v4.5c0 4.25 3.25 8 7.5 9 4.25-1 7.5-4.75 7.5-9V7L12 3z"/><path d="M9.5 12l2 2 3.5-3.5"/></svg>,
  sparkle: (c, s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/></svg>,
  creditcard: (c, s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><path d="M6 15h4.5"/><path d="M14.5 15h3"/></svg>,
  check: (c, s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M8.5 12l3 3 4.5-5"/></svg>,
  bag: (c, s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l3 5H3L6 3z"/><path d="M3 8v13a1 1 0 001 1h16a1 1 0 001-1V8"/><path d="M9.5 12.5a2.5 2.5 0 005 0"/></svg>,
  receipt: (c, s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V3l2 1.5L8 3l2 1.5L12 3l2 1.5L16 3l2 1.5L20 3v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>,
  wallet2: (c, s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="15" rx="2.5"/><path d="M2 11h20"/><path d="M16 15h2.5"/></svg>,
  task: (c, s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
};

// ── Icon bubble ───────────────────────────────────────────────────────────────
function IB({ name, bg, color, size = 32, iconSize = 15 }: { name: string; bg: string; color: string; size?: number; iconSize?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {QI[name]?.(color, iconSize)}
    </div>
  );
}

// ── InsightRow ────────────────────────────────────────────────────────────────
function InsightRow({ icon, iconBg, bg, border, textColor, text, trailing, onClick }: {
  icon: React.ReactNode; iconBg: string; bg: string; border?: string;
  textColor: string; text: string; trailing: React.ReactNode; onClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 10px',
        background: bg, borderRadius: 11, border, cursor: 'pointer',
        transform: hov ? 'translateX(3px)' : 'none',
        boxShadow: hov ? '0 2px 10px rgba(0,0,0,0.07)' : 'none',
        transition: 'all 0.18s ease',
      }}>
      <div style={{ width: 24, height: 24, background: iconBg, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <p style={{ fontSize: 11, color: textColor, fontWeight: 500, flex: 1, lineHeight: 1.45, margin: 0 }}>{text}</p>
      <div style={{ flexShrink: 0, marginTop: 2 }}>{trailing}</div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardNext() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<DailyNotificationSettings | null>(null);

  const [todayData, setTodayData] = useState<any>({});
  const [shoppingList, setShoppingList] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [insurances, setInsurances] = useState<any[]>([]);
  const [debts, setDebts] = useState<DebtDetail[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [historicalAdj, setHistoricalAdj] = useState<Record<string, number>>({});
  const [monthlyFlow, setMonthlyFlow] = useState<{ income: number; spend: number; daily: number[] }>({ income: 0, spend: 0, daily: Array(7).fill(0) });
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('week');

  const MONTH_BUDGET = 2000;

  const loadRangeData = async (start: Date, end: Date) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const startStr = startOfDay(start).toISOString();
    const endStr = startOfDay(end).toISOString();
    const [{ data: tasks }, { data: shifts }] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', u.id).gte('due_date', startStr).lte('due_date', endStr).eq('is_completed', false).order('due_date'),
      supabase.from('work_shifts').select('*').eq('user_id', u.id).gte('start_time', startStr).lte('start_time', endStr).order('start_time'),
    ]);
    setTodayData({ tasks: tasks || [], shifts: shifts || [] });
  };

  useEffect(() => {
    if (!user) return;
    const start = calendarView === 'month'
      ? startOfMonth(selectedDate)
      : calendarView === 'week'
      ? startOfWeek(selectedDate, { weekStartsOn: 1 })
      : selectedDate;
    const end = calendarView === 'month'
      ? addDays(endOfMonth(selectedDate), 1)
      : calendarView === 'week'
      ? addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), 7)
      : addDays(selectedDate, 1);
    loadRangeData(start, end);
  }, [selectedDate, calendarView, user]);

  // Reactive financial data: refetch from Supabase with server-side date filters every time selectedDate or accounts change
  useEffect(() => {
    if (!user || accounts.length === 0) return;
    const accountIds = accounts.map((a: any) => a.id);
    const todayNow   = new Date();
    // "after selectedDate" = transactions from the day AFTER the selected date up to today
    const dayAfter   = format(addDays(selectedDate, 1), 'yyyy-MM-dd');
    const todayStr   = format(addDays(todayNow, 1),    'yyyy-MM-dd'); // exclusive upper bound
    const monthStart = format(startOfMonth(selectedDate),              'yyyy-MM-dd');
    const monthEnd   = format(addMonths(startOfMonth(selectedDate), 1),'yyyy-MM-dd');

    Promise.all([
      // 1. Transactions to subtract: happened AFTER selected day and ON OR BEFORE today
      supabase
        .from('savings_account_transactions')
        .select('account_id, amount')
        .in('account_id', accountIds)
        .gte('date', dayAfter)
        .lt('date', todayStr),
      // 2. Transactions in the selected month (for income/spend panel)
      supabase
        .from('savings_account_transactions')
        .select('amount, date')
        .in('account_id', accountIds)
        .gte('date', monthStart)
        .lt('date', monthEnd),
    ]).then(([{ data: adjData }, { data: flowData }]) => {
      // Build per-account adjustment map
      const adj: Record<string, number> = {};
      (adjData || []).forEach((tx: any) => {
        adj[tx.account_id] = (adj[tx.account_id] || 0) + Number(tx.amount);
      });
      setHistoricalAdj(adj);

      // Monthly income / spend
      const txs = flowData || [];
      const income = txs.filter((t: any) => Number(t.amount) > 0).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const spend  = txs.filter((t: any) => Number(t.amount) < 0).reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);
      // Daily bars: last 7 days ending on selectedDate
      const daily = Array.from({ length: 7 }, (_, i) => {
        const dayStr = format(addDays(selectedDate, -(6 - i)), 'yyyy-MM-dd');
        return txs.filter((t: any) => t.date && String(t.date).slice(0, 10) === dayStr).reduce((s: number, t: any) => s + Number(t.amount), 0);
      });
      setMonthlyFlow({ income, spend, daily });
    });
  }, [selectedDate, user, accounts]);

  useEffect(() => {
    const saved = localStorage.getItem('dailyNotificationSettings');
    if (saved) {
      try { setSettings(JSON.parse(saved)); } catch { /* ignore */ }
    } else {
      setSettings({
        enabled: false, time: '08:00',
        categories: { tasks: true, shifts: true, vehicles: true, shopping: true, money: true, medicines: true, insurances: true, warranties: true, expenses: true },
      });
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      const today = new Date();
      const weekLater = addDays(today, 6);

      const [
        { data: shopping }, { data: accs }, { data: vhcls },
        { data: meds }, { data: wrnties }, { data: ins },
      ] = await Promise.all([
        supabase.from('shopping_items').select('*').eq('user_id', user.id).eq('is_checked', false),
        supabase.from('savings_accounts').select('*').eq('user_id', user.id),
        supabase.from('vehicles').select('*').eq('user_id', user.id),
        supabase.from('medicines').select('*').eq('user_id', user.id),
        supabase.from('warranties').select('*').eq('user_id', user.id),
        supabase.from('v_insurance_policies').select('*'),
      ]);

      setShoppingList(shopping || []);
      setAccounts(accs || []);
      setVehicles(vhcls || []);
      setMedicines(meds || []);
      setWarranties(wrnties || []);
      setInsurances(ins || []);

      // Expenses — fetch once, stats computed reactively from selectedDate
      const { data: expenses } = await supabase.from('expenses').select('*').is('folder_id', null).order('date', { ascending: false });
      setAllExpenses(expenses || []);
      const { data: settlements } = await supabase.from('settlements').select('*').is('folder_id', null);
      const { data: partners } = await supabase.from('expense_partners').select('user_id_1, user_id_2').or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      const userIds = new Set<string>([user.id]);
      partners?.forEach((p: any) => {
        if (p.user_id_1 !== user.id) userIds.add(p.user_id_1);
        if (p.user_id_2 !== user.id) userIds.add(p.user_id_2);
      });
      expenses?.forEach((e: any) => {
        if (e.user_id) userIds.add(e.user_id);
        if (e.paid_by?.length > 10) userIds.add(e.paid_by);
      });

      const { data: profiles } = await supabase.from('profiles').select('id, nickname').in('id', Array.from(userIds));
      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.id] = p.nickname || 'Usuario'; });

      const allIds = Array.from(userIds);
      const debtMatrix: Record<string, Record<string, number>> = {};
      allIds.forEach(u1 => { debtMatrix[u1] = {}; allIds.forEach(u2 => { if (u1 !== u2) debtMatrix[u1][u2] = 0; }); });

      const getPayerId = (e: any) => {
        if (e.paid_by === user.id) return user.id;
        if (e.paid_by === 'Mi') return e.user_id;
        if (e.paid_by === 'Partner') return e.user_id === user.id ? 'partner_placeholder' : user.id;
        return e.paid_by?.length > 10 ? e.paid_by : e.user_id;
      };

      expenses?.forEach((e: any) => {
        const payerId = getPayerId(e);
        if (!userIds.has(payerId)) return;
        const split = e.amount / (userIds.size || 1);
        allIds.forEach(debtorId => {
          if (debtorId !== payerId) {
            if (!debtMatrix[debtorId]) debtMatrix[debtorId] = {};
            if (debtMatrix[debtorId][payerId] === undefined) debtMatrix[debtorId][payerId] = 0;
            debtMatrix[debtorId][payerId] += split;
          }
        });
      });
      settlements?.forEach((s: any) => {
        if (debtMatrix[s.payer_id]?.[s.receiver_id] !== undefined) debtMatrix[s.payer_id][s.receiver_id] -= s.amount;
      });

      const myDebts: DebtDetail[] = [];
      allIds.forEach(otherId => {
        if (otherId === user.id) return;
        const iOweThem = debtMatrix[user.id]?.[otherId] || 0;
        const theyOweMe = debtMatrix[otherId]?.[user.id] || 0;
        const net = iOweThem - theyOweMe;
        if (Math.abs(net) > 0.1) myDebts.push({ id: otherId, name: nameMap[otherId] || 'Compañero', amount: net });
      });
      setDebts(myDebts);

      // Today's tasks & shifts
      const startStr = startOfDay(today).toISOString();
      const endStr = startOfDay(weekLater).toISOString();
      const [{ data: tasks }, { data: shifts }] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).gte('due_date', startStr).lte('due_date', endStr).eq('is_completed', false).order('due_date'),
        supabase.from('work_shifts').select('*').eq('user_id', user.id).gte('start_time', startStr).lte('start_time', endStr).order('start_time'),
      ]);
      setTodayData({ tasks: tasks || [], shifts: shifts || [] });

    } catch (err) {
      console.error('Error loading daily summary:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Computed ───────────────────────────────────────────────────────────────

  const today = new Date();
  const displayTasks = todayData.tasks?.filter((t: any) => isSameDay(new Date(t.due_date), selectedDate)) || [];
  const displayShifts = todayData.shifts?.filter((s: any) => isSameDay(new Date(s.start_time), selectedDate)) || [];

  const expiringMeds = medicines.filter(m => m.expiration_date && differenceInDays(parseISO(m.expiration_date), today) <= 30 && differenceInDays(parseISO(m.expiration_date), today) >= 0);
  const expiringWarranties = warranties.filter(w => {
    const expiry = addMonths(parseISO(w.purchase_date), w.warranty_months);
    return differenceInDays(expiry, today) <= 30 && differenceInDays(expiry, today) >= 0;
  });
  const expiringInsurances = insurances.filter(i => i.expiration_date && differenceInDays(parseISO(i.expiration_date), today) <= 30 && differenceInDays(parseISO(i.expiration_date), today) >= 0);
  const vehicleAlerts = vehicles.filter(v => {
    const itvDue = v.next_itv_date && differenceInDays(parseISO(v.next_itv_date), today) <= 30 && differenceInDays(parseISO(v.next_itv_date), today) >= 0;
    const insDue = v.insurance_expiry_date && differenceInDays(parseISO(v.insurance_expiry_date), today) <= 30;
    const oilDue = v.last_oil_change_km && v.current_kilometers && (v.current_kilometers - v.last_oil_change_km) > (v.oil_change_interval_km || 15000);
    return itvDue || insDue || oilDue;
  });
  const dailyMedicines = medicines.filter(m => m.alarm_times?.length > 0);

  // Historical balance per account: current_balance minus transactions that happened after selectedDate (up to today)
  const accountBalanceAt = (acc: any): number => Number(acc.current_balance) - (historicalAdj[acc.id] || 0);
  const totalBalance = accounts.reduce((sum, acc) => sum + accountBalanceAt(acc), 0);

  const monthIncome = monthlyFlow.income;
  const monthSpend  = monthlyFlow.spend;
  const monthNet    = monthIncome - monthSpend;
  const weeklyFlow  = monthlyFlow.daily;
  const hour = today.getHours();
  const greeting = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const displayName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Usuario';

  const hasUrgentItems =
    (displayTasks.length > 0) ||
    vehicleAlerts.length > 0 ||
    expiringMeds.length > 0 ||
    expiringInsurances.length > 0;

  // Expense stats — reactive to selectedDate, filters by date only (household scope)
  const _expMonthStart = startOfMonth(selectedDate);
  const _expPrevStart  = startOfMonth(addMonths(selectedDate, -1));

  const monthExpenses = allExpenses
    .filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d >= _expMonthStart && d < addMonths(_expMonthStart, 1);
    })
    .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  const prevMonthExpenses = allExpenses
    .filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d >= _expPrevStart && d < _expMonthStart;
    })
    .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  const weeklyExpenses = Array.from({ length: 7 }, (_, i) => {
    const dayStr = format(addDays(selectedDate, -(6 - i)), 'yyyy-MM-dd');
    return allExpenses
      .filter((e: any) => e.date && String(e.date).slice(0, 10) === dayStr)
      .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  });

  const expPct = MONTH_BUDGET > 0 ? Math.min(100, Math.round((monthExpenses / MONTH_BUDGET) * 100)) : 0;
  const expDiff = prevMonthExpenses > 0 ? Math.round(((monthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100) : 0;
  const expBarColor = expPct >= 90 ? '#ef4444' : expPct >= 70 ? '#f97316' : '#d97706';

  // Calendar helpers
  const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthGridStart = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
  const monthDays = Array.from({ length: 42 }, (_, i) => addDays(monthGridStart, i));

  const navigate = (dir: -1 | 1) => {
    setSelectedDate(d => {
      if (calendarView === 'day') return addDays(d, dir);
      if (calendarView === 'week') return addDays(d, dir * 7);
      return addMonths(d, dir);
    });
  };

  const getCalendarLabel = () => {
    if (calendarView === 'day') return format(selectedDate, "d 'de' MMMM yyyy", { locale: es });
    if (calendarView === 'week') {
      const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(ws, 'd MMM', { locale: es })} – ${format(addDays(ws, 6), 'd MMM', { locale: es })}`;
    }
    return format(selectedDate, 'MMMM yyyy', { locale: es });
  };

  const itvVehicle = vehicles.find(v => v.next_itv_date && differenceInDays(parseISO(v.next_itv_date), today) > 0 && differenceInDays(parseISO(v.next_itv_date), today) <= 60);
  const itvDays = itvVehicle ? differenceInDays(parseISO(itvVehicle.next_itv_date), today) : null;

  // Task priority styles
  function taskPriorityStyle(priority: string): { dot: string; bg: string; border: string } {
    if (priority === 'urgent' || priority === 'high') return { dot: '#ef4444', bg: '#fef2f2', border: 'rgba(239,68,68,0.15)' };
    if (priority === 'important' || priority === 'medium') return { dot: '#f97316', bg: '#fff7ed', border: 'rgba(249,115,22,0.15)' };
    return { dot: '#22c55e', bg: 'rgba(255,255,255,0.52)', border: 'rgba(255,255,255,0.68)' };
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading || !settings) {
    return (
      <>
        <div style={{ position: 'fixed', inset: 0, backgroundImage: "url('/images/dashboard-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center', filter: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.22)', zIndex: 1 }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, background: 'rgba(220,252,231,0.9)', borderRadius: '50%', backdropFilter: 'blur(12px)' }} />
            <div style={{ width: 120, height: 10, background: 'rgba(220,252,231,0.7)', borderRadius: 6 }} />
          </div>
        </div>
      </>
    );
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  const glass: CSSProperties = {
    background: 'rgba(255, 255, 255, 0.62)',
    backdropFilter: 'blur(22px)',
    WebkitBackdropFilter: 'blur(22px)',
    border: '0.5px solid rgba(255, 255, 255, 0.72)',
    borderRadius: 22,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), 0 1px 0 rgba(255, 255, 255, 0.85) inset',
  };

  const cardInner: CSSProperties = {
    background: 'rgba(255, 255, 255, 0.52)',
    border: '0.5px solid rgba(255, 255, 255, 0.68)',
    borderRadius: 14,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  };

  // Shared rich-widget card style
  const wCard: CSSProperties = {
    background: '#f8f9fb',
    border: '0.5px solid rgba(0,0,0,0.06)',
    borderRadius: 16,
    padding: '13px 12px 11px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: "url('/images/dashboard-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center', filter: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.22)', zIndex: 1 }} />

      <div style={{
        position: 'relative', zIndex: 2, minHeight: '100vh',
        padding: '20px 24px 60px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
      }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>

        {/* ── LEFT ──────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* GREETING + CALENDAR */}
          <div style={{ ...glass, padding: '22px 26px', display: 'flex', gap: 24, alignItems: 'stretch' }}>
            <div style={{ flex: '0 0 42%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h1 style={{ fontSize: 22, fontWeight: 600, color: '#111827', letterSpacing: '-0.5px', margin: 0 }}>
                {greeting}, {displayName} 👋
              </h1>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 14px', fontWeight: 400, textTransform: 'capitalize' }}>
                {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: hasUrgentItems ? '#fff7ed' : '#f0fdf4',
                border: `0.5px solid ${hasUrgentItems ? '#fed7aa' : '#bbf7d0'}`,
                borderRadius: 10, padding: '7px 12px',
              }}>
                {hasUrgentItems
                  ? <AlertTriangle size={13} color="#ea580c" />
                  : <CheckCircle2 size={13} color="#16a34a" />}
                <span style={{ fontSize: 11, fontWeight: 500, color: hasUrgentItems ? '#9a3412' : '#166534' }}>
                  {hasUrgentItems
                    ? `${displayTasks.length + vehicleAlerts.length + expiringMeds.length} elemento${(displayTasks.length + vehicleAlerts.length + expiringMeds.length) !== 1 ? 's' : ''} requiere${(displayTasks.length + vehicleAlerts.length + expiringMeds.length) === 1 ? '' : 'n'} atención`
                    : 'Todo está bajo control'
                  }
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '8px 0 0', lineHeight: 1.5 }}>
                {hasUrgentItems ? 'Revisa los avisos en el panel derecho.' : 'No tienes tareas urgentes ni vencimientos.'}
              </p>
            </div>

            <div style={{ width: 1, background: 'rgba(0,0,0,0.07)', alignSelf: 'stretch', borderRadius: 1 }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9, padding: 3, gap: 1 }}>
                  {(['day', 'week', 'month'] as const).map(v => (
                    <button key={v} onClick={() => setCalendarView(v)} style={{
                      padding: '4px 10px', borderRadius: 7, border: 'none', fontSize: 11,
                      background: calendarView === v ? 'white' : 'transparent',
                      color: calendarView === v ? '#111827' : '#9ca3af',
                      fontWeight: calendarView === v ? 600 : 400,
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      boxShadow: calendarView === v ? '0 1px 4px rgba(0,0,0,0.09)' : 'none',
                    }}>
                      {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <button onClick={() => navigate(-1)} style={{ width: 26, height: 26, borderRadius: 7, background: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e5e7eb'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'; }}>
                    <ChevronLeft size={13} color="#374151" />
                  </button>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', minWidth: 120, textAlign: 'center', textTransform: 'capitalize', letterSpacing: '-0.2px' }}>
                    {getCalendarLabel()}
                  </span>
                  <button onClick={() => navigate(1)} style={{ width: 26, height: 26, borderRadius: 7, background: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e5e7eb'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'; }}>
                    <ChevronRight size={13} color="#374151" />
                  </button>
                </div>
              </div>

              {calendarView === 'day' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 2px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: isSameDay(selectedDate, today) ? '#166534' : '#f3f4f6', borderRadius: 16, flexShrink: 0 }}>
                    <span style={{ fontSize: 26, fontWeight: 700, color: isSameDay(selectedDate, today) ? 'white' : '#111827', lineHeight: 1 }}>{format(selectedDate, 'd')}</span>
                    <span style={{ fontSize: 9, color: isSameDay(selectedDate, today) ? 'rgba(255,255,255,0.75)' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{format(selectedDate, 'MMM', { locale: es })}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0, textTransform: 'capitalize' }}>{format(selectedDate, 'EEEE', { locale: es })}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '3px 0 0' }}>{displayTasks.length + displayShifts.length > 0 ? `${displayTasks.length + displayShifts.length} evento${displayTasks.length + displayShifts.length !== 1 ? 's' : ''}` : 'Sin eventos'}</p>
                  </div>
                  <button onClick={() => setSelectedDate(today)} style={{ marginLeft: 'auto', fontSize: 10, color: '#16a34a', background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: 7, padding: '4px 9px', cursor: 'pointer', fontWeight: 500 }}>Hoy</button>
                </div>
              )}

              {calendarView === 'week' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                  {dayLabels.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 9, color: '#9ca3af', paddingBottom: 4, fontWeight: 500 }}>{d}</div>
                  ))}
                  {weekDays.map((d, i) => {
                    const isToday = isSameDay(d, today);
                    const isSelected = isSameDay(d, selectedDate);
                    const hasTasks = todayData.tasks?.some((t: any) => isSameDay(new Date(t.due_date), d)) || todayData.shifts?.some((s: any) => isSameDay(new Date(s.start_time), d));
                    return (
                      <div key={i} onClick={() => setSelectedDate(d)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '3px 2px', borderRadius: 10, transition: 'background 0.15s' }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#f3f4f6'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
                        <span style={{
                          width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isSelected ? '#166534' : isToday ? 'rgba(22,101,52,0.12)' : 'transparent',
                          color: isSelected ? 'white' : isToday ? '#166534' : '#374151',
                          fontSize: 12, fontWeight: isSelected || isToday ? 700 : 400,
                          transition: 'all 0.15s ease',
                        }}>
                          {format(d, 'd')}
                        </span>
                        {hasTasks && <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.7)' : '#16a34a' }} />}
                      </div>
                    );
                  })}
                </div>
              )}

              {calendarView === 'month' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                  {dayLabels.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 9, color: '#9ca3af', paddingBottom: 3, fontWeight: 500 }}>{d}</div>
                  ))}
                  {monthDays.map((d, i) => {
                    const isToday = isSameDay(d, today);
                    const isSelected = isSameDay(d, selectedDate);
                    const inMonth = isSameMonth(d, selectedDate);
                    const hasTasks = todayData.tasks?.some((t: any) => isSameDay(new Date(t.due_date), d)) || todayData.shifts?.some((s: any) => isSameDay(new Date(s.start_time), d));
                    return (
                      <div key={i} onClick={() => setSelectedDate(d)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', padding: '2px 0' }}>
                        <span style={{
                          width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isSelected ? '#166534' : isToday ? 'rgba(22,101,52,0.12)' : 'transparent',
                          color: isSelected ? 'white' : !inMonth ? '#d1d5db' : isToday ? '#166534' : '#374151',
                          fontSize: 10, fontWeight: isSelected || isToday ? 700 : 400,
                          transition: 'all 0.15s ease',
                        }}>
                          {format(d, 'd')}
                        </span>
                        {hasTasks && inMonth && <span style={{ width: 3, height: 3, borderRadius: '50%', background: isSelected ? '#bbf7d0' : '#16a34a' }} />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Dashboard switcher ── */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, marginTop: 14, paddingTop: 12, borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: '#b45309', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>Dashboard</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 999, padding: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  <div style={{ position: 'absolute', top: 2, left: 2 + 1 * 58, width: 56, height: 24, borderRadius: 999, background: '#fde68a', boxShadow: '0 1px 4px rgba(0,0,0,0.12)', pointerEvents: 'none' }} />
                  <Link href="/desktop" style={{ position: 'relative', zIndex: 1, width: 56, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, fontSize: 11, fontWeight: 600, color: '#92400e', textDecoration: 'none' }}>Classic</Link>
                  <span style={{ position: 'relative', zIndex: 1, width: 56, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, fontSize: 11, fontWeight: 600, color: '#92400e' }}>Modern</span>
                </div>
              </div>
            </div>
          </div>

          {/* HOY EN QUIOBA — rich widgets */}
          <div style={{ ...glass, padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 13 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>Estado actual</h3>
              <span style={{ fontSize: 9, color: '#d1d5db', fontWeight: 400 }}>Refleja el estado en tiempo real</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>

              {/* 1. COMPRA */}
              <RichWidget
                iconName="shopping" iconBg="#dcfce7" iconColor="#16a34a"
                status={shoppingList.length === 0 ? 'ok' : 'warn'}
                title="Lista de compra"
                value={shoppingList.length === 0 ? 'Sin pendientes' : `${shoppingList.length} productos`}
                onClick={() => router.push('/apps/mi-hogar/shopping')}
              >
                {shoppingList.length === 0 ? (
                  <p style={{ fontSize: 10, color: '#22c55e', margin: 0 }}>Todo comprado ✓</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                    {shoppingList.slice(0, 2).map((item: any) => (
                      <p key={item.id} style={{ fontSize: 10, color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {shopEmoji(item.name)} {item.name}
                      </p>
                    ))}
                    {shoppingList.length > 2 && (
                      <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>+{shoppingList.length - 2} más</p>
                    )}
                  </div>
                )}
              </RichWidget>

              {/* 2. GASTOS */}
              <RichWidget
                iconName="wallet" iconBg="#fef3c7" iconColor="#d97706"
                status={expPct >= 90 ? 'alert' : expPct >= 70 ? 'warn' : 'ok'}
                title="Gastos del mes"
                value={`${Math.round(monthExpenses).toLocaleString('es-ES')}€`}
                onClick={() => router.push('/finanzas')}
              >
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: '#9ca3af' }}>{expPct}% de {MONTH_BUDGET.toLocaleString('es-ES')}€</span>
                    {prevMonthExpenses > 0 && (
                      <span style={{ fontSize: 9, color: expDiff > 0 ? '#ef4444' : '#22c55e', fontWeight: 500 }}>
                        {expDiff > 0 ? '+' : ''}{expDiff}% vs anterior
                      </span>
                    )}
                  </div>
                  <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', width: `${expPct}%`, background: expBarColor, borderRadius: 2, transition: 'width 0.6s ease' }} />
                  </div>
                  <MiniBarChart data={weeklyExpenses} color={expBarColor} />
                </div>
              </RichWidget>

              {/* 3. VEHÍCULOS */}
              <RichWidget
                iconName="car" iconBg="#ede9fe" iconColor="#7c3aed"
                status={vehicleAlerts.length > 0 ? 'alert' : 'ok'}
                title="Vehículos"
                value={`${vehicles.length} registrado${vehicles.length !== 1 ? 's' : ''}`}
                onClick={() => router.push('/apps/mi-hogar/garage')}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 5 }}>
                  {vehicles.slice(0, 2).map((v: any) => {
                    const itvD = v.next_itv_date ? differenceInDays(parseISO(v.next_itv_date), today) : null;
                    const hasAlert = vehicleAlerts.some(a => a.id === v.id);
                    return (
                      <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <p style={{ fontSize: 10, color: '#374151', margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {v.brand} {v.model}
                        </p>
                        {itvD !== null && (
                          <span style={{ fontSize: 9, color: hasAlert ? '#ea580c' : '#9ca3af', whiteSpace: 'nowrap' }}>
                            ITV {itvD}d
                          </span>
                        )}
                        <StatusDot status={hasAlert ? 'alert' : 'ok'} />
                      </div>
                    );
                  })}
                  {vehicles.length === 0 && <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>Sin vehículos</p>}
                </div>
              </RichWidget>

              {/* 4. GARANTÍAS */}
              <RichWidget
                iconName="document" iconBg="#e0f2fe" iconColor="#0284c7"
                status={expiringWarranties.length > 0 ? 'warn' : 'ok'}
                title="Garantías"
                value={`${warranties.length} registrada${warranties.length !== 1 ? 's' : ''}`}
                onClick={() => router.push('/apps/mi-hogar/warranties')}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                  {warranties.slice(0, 2).map((w: any) => (
                    <p key={w.id} style={{ fontSize: 10, color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📄 {w.product_name || 'Garantía'}
                    </p>
                  ))}
                  {expiringWarranties.length > 0 && (
                    <p style={{ fontSize: 10, color: '#f97316', margin: 0, fontWeight: 500 }}>{expiringWarranties.length} por vencer</p>
                  )}
                  {warranties.length === 0 && <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>Sin garantías</p>}
                </div>
              </RichWidget>

              {/* 5. BOTIQUÍN */}
              <RichWidget
                iconName="health" iconBg="#fce7f3" iconColor="#db2777"
                status={expiringMeds.length > 0 ? 'alert' : 'ok'}
                title="Botiquín"
                value={`${medicines.length} medicamento${medicines.length !== 1 ? 's' : ''}`}
                onClick={() => router.push('/apps/mi-hogar/pharmacy')}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                  {dailyMedicines.slice(0, 2).map((m: any) => (
                    <p key={m.id} style={{ fontSize: 10, color: '#9d174d', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      💊 {m.name}
                    </p>
                  ))}
                  {expiringMeds.length > 0 && (
                    <p style={{ fontSize: 10, color: '#ef4444', margin: 0, fontWeight: 500 }}>{expiringMeds.length} por caducar</p>
                  )}
                  {medicines.length === 0 && <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>Sin medicamentos</p>}
                </div>
              </RichWidget>

              {/* 6. SEGUROS */}
              <RichWidget
                iconName="shield" iconBg="#fff7ed" iconColor="#ea580c"
                status={expiringInsurances.length > 0 ? 'alert' : 'ok'}
                title="Seguros"
                value={`${insurances.length} póliza${insurances.length !== 1 ? 's' : ''}`}
                onClick={() => router.push('/apps/mi-hogar/insurance')}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                  {insurances.slice(0, 3).map((ins: any) => {
                    const daysLeft = ins.expiration_date ? differenceInDays(parseISO(ins.expiration_date), today) : null;
                    const st: 'ok' | 'warn' | 'alert' = daysLeft === null ? 'ok' : daysLeft <= 14 ? 'alert' : daysLeft <= 30 ? 'warn' : 'ok';
                    return (
                      <div key={ins.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <StatusDot status={st} />
                        <span style={{ fontSize: 10, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ins.entity_name || ins.insurance_type || 'Seguro'}
                        </span>
                        {daysLeft !== null && daysLeft <= 30 && (
                          <span style={{ fontSize: 9, color: st === 'alert' ? '#ef4444' : '#f97316', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {daysLeft}d
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {insurances.length === 0 && <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>Sin seguros</p>}
                </div>
              </RichWidget>

            </div>
          </div>

          {/* AGENDA */}
          <div style={{ ...glass, padding: '18px 22px' }}>
            <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 3, marginBottom: 16 }}>
              {[
                { label: 'Agenda', count: displayShifts.length + displayTasks.length },
                { label: 'Medicación', count: dailyMedicines.length },
                { label: 'Alertas', count: vehicleAlerts.length + expiringInsurances.length + expiringMeds.length + expiringWarranties.length },
                { label: 'Finanzas', count: debts.length },
              ].map((tab, i) => (
                <button key={tab.label} onClick={() => setActiveTab(i)} style={{
                  flex: 1, background: activeTab === i ? 'white' : 'none', border: 'none',
                  borderRadius: 8, padding: '6px 0', fontSize: 11,
                  fontWeight: activeTab === i ? 500 : 400, color: activeTab === i ? '#374151' : '#9ca3af', cursor: 'pointer',
                  boxShadow: activeTab === i ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}>
                  {tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Pestaña 0: Agenda */}
              {activeTab === 0 && (<>
                {displayShifts.map((shift: any) => (
                  <div key={shift.id} onClick={() => router.push('/apps/cuadrante')}
                    style={{ ...cardInner, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s ease' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                    {/* Hora */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0, width: 40 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{format(new Date(shift.start_time), 'HH:mm')}</span>
                      <div style={{ width: 2, height: 14, background: '#16a34a', borderRadius: 1 }} />
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>{format(new Date(shift.end_time), 'HH:mm')}</span>
                    </div>
                    {/* Color bar */}
                    <div style={{ width: 3, height: 36, background: '#16a34a', borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{shift.title}</span>
                        <span style={{ fontSize: 9, background: '#dcfce7', color: '#166534', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>TURNO</span>
                      </div>
                      {shift.location && (
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>📍 {shift.location}</span>
                      )}
                    </div>
                    <ChevronRight size={13} color="#d1d5db" />
                  </div>
                ))}
                {displayTasks.slice(0, 4).map((task: any) => {
                  const ps = taskPriorityStyle(task.priority);
                  return (
                    <div key={task.id} onClick={() => router.push('/apps/mi-hogar/tasks')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer',
                        background: ps.bg, border: `0.5px solid ${ps.border}`,
                        borderRadius: 14, backdropFilter: 'blur(10px)', transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: ps.dot, flexShrink: 0, boxShadow: `0 0 4px ${ps.dot}55` }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#111827' }}>{task.title}</span>
                        {task.due_date && (
                          <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 0' }}>
                            {format(new Date(task.due_date), 'HH:mm') !== '00:00' && format(new Date(task.due_date), 'HH:mm')}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={13} color="#d1d5db" />
                    </div>
                  );
                })}
                {(!displayShifts.length && !displayTasks.length) && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>Sin eventos para este día</div>
                )}
              </>)}

              {/* Pestaña 1: Medicación */}
              {activeTab === 1 && (<>
                {dailyMedicines.length > 0 ? dailyMedicines.map((med: any) => (
                  <div key={med.id} style={{ ...cardInner, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px' }}>
                    <IB name="health" bg="#fce7f3" color="#db2777" size={30} iconSize={14} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#9d174d', margin: 0 }}>{med.name}</p>
                      <p style={{ fontSize: 10, color: '#f9a8d4', margin: '2px 0 0' }}>{med.alarm_times?.join(' · ')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {med.alarm_times?.slice(0, 3).map((t: string, i: number) => (
                        <span key={i} style={{ fontSize: 9, background: '#fce7f3', color: '#db2777', borderRadius: 5, padding: '2px 5px', fontWeight: 600 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>Sin medicación programada</div>
                )}
              </>)}

              {/* Pestaña 2: Alertas */}
              {activeTab === 2 && (<>
                {vehicleAlerts.map((v: any) => (
                  <div key={v.id} onClick={() => router.push('/apps/mi-hogar/garage')} style={{ ...cardInner, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                    <IB name="car" bg="#fff7ed" color="#ea580c" size={30} iconSize={14} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#9a3412', margin: 0 }}>{v.brand} {v.model}</p>
                      <p style={{ fontSize: 10, color: '#fb923c', margin: '2px 0 0' }}>Revisión próxima</p>
                    </div>
                    <ChevronRight size={12} color="#ea580c" />
                  </div>
                ))}
                {expiringInsurances.map((ins: any) => (
                  <div key={ins.id} onClick={() => router.push('/apps/mi-hogar/insurance')} style={{ ...cardInner, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                    <IB name="shield" bg="#fff7ed" color="#ea580c" size={30} iconSize={14} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#9a3412', margin: 0 }}>{ins.entity_name || 'Seguro'}</p>
                      <p style={{ fontSize: 10, color: '#fb923c', margin: '2px 0 0' }}>Vence en {differenceInDays(parseISO(ins.expiration_date), today)} días</p>
                    </div>
                    <ChevronRight size={12} color="#ea580c" />
                  </div>
                ))}
                {expiringMeds.map((med: any) => (
                  <div key={med.id} onClick={() => router.push('/apps/mi-hogar/pharmacy')} style={{ ...cardInner, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                    <IB name="health" bg="#fce7f3" color="#db2777" size={30} iconSize={14} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#9d174d', margin: 0 }}>{med.name}</p>
                      <p style={{ fontSize: 10, color: '#f9a8d4', margin: '2px 0 0' }}>Caduca en {differenceInDays(parseISO(med.expiration_date), today)} días</p>
                    </div>
                    <ChevronRight size={12} color="#db2777" />
                  </div>
                ))}
                {expiringWarranties.map((w: any) => (
                  <div key={w.id} onClick={() => router.push('/apps/mi-hogar/warranties')} style={{ ...cardInner, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                    <IB name="receipt" bg="#ede9fe" color="#7c3aed" size={30} iconSize={14} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#5b21b6', margin: 0 }}>{w.product_name || 'Garantía'}</p>
                      <p style={{ fontSize: 10, color: '#a78bfa', margin: '2px 0 0' }}>Vence en {differenceInDays(addMonths(parseISO(w.purchase_date), w.warranty_months), today)} días</p>
                    </div>
                    <ChevronRight size={12} color="#7c3aed" />
                  </div>
                ))}
                {vehicleAlerts.length === 0 && expiringInsurances.length === 0 && expiringMeds.length === 0 && expiringWarranties.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>Sin alertas activas</div>
                )}
              </>)}

              {/* Pestaña 3: Finanzas */}
              {activeTab === 3 && (<>
                {debts.length > 0 ? debts.map(debt => (
                  <div key={debt.id} style={{
                    ...cardInner, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px',
                    background: debt.amount > 0 ? 'rgba(254,242,242,0.8)' : 'rgba(240,253,244,0.8)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <IB name="wallet2" bg={debt.amount > 0 ? '#fee2e2' : '#dcfce7'} color={debt.amount > 0 ? '#dc2626' : '#16a34a'} size={30} iconSize={14} />
                      <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{debt.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: debt.amount > 0 ? '#dc2626' : '#16a34a' }}>
                      {debt.amount > 0 ? '-' : '+'}{Math.abs(debt.amount).toFixed(0)}€
                    </span>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>Sin deudas compartidas</div>
                )}
              </>)}

            </div>
          </div>

        </div>

        {/* ── RIGHT ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>


          {/* SMART INSIGHTS */}
          <div style={{ ...glass, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <IB name="sparkle" bg="#dcfce7" color="#16a34a" size={30} iconSize={14} />
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>Resumen de hoy</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {expiringInsurances.length === 0 && (
                <InsightRow icon={QI.shield('#16a34a', 12)} iconBg="#dcfce7" bg="#f0fdf4"
                  textColor="#166534" text="No tienes seguros que renovar"
                  trailing={<CheckCircle2 size={14} color="#16a34a" />}
                  onClick={() => router.push('/apps/mi-hogar/insurance')} />
              )}
              {itvVehicle && itvDays !== null && (
                <InsightRow icon={QI.car('#d97706', 12)} iconBg="#fef3c7" bg="#fffbeb"
                  border="0.5px solid rgba(251,191,36,0.25)" textColor="#92400e"
                  text={`Tu coche (${itvVehicle.brand}) necesita pasar la ITV en ${itvDays} días`}
                  trailing={<ChevronRight size={12} color="#d97706" />}
                  onClick={() => router.push('/apps/mi-hogar/garage')} />
              )}
              {displayTasks.length > 0 && (
                <InsightRow icon={QI.task('#0284c7', 12)} iconBg="#e0f2fe" bg="#f0f9ff"
                  textColor="#075985"
                  text={`Tienes ${displayTasks.length} tarea${displayTasks.length > 1 ? 's' : ''} pendiente${displayTasks.length > 1 ? 's' : ''} hoy`}
                  trailing={<ChevronRight size={12} color="#0284c7" />}
                  onClick={() => router.push('/apps/mi-hogar/tasks')} />
              )}
              {shoppingList.length > 0 && (
                <InsightRow icon={QI.bag('#374151', 12)} iconBg="#f3f4f6" bg="#f8f9fb"
                  textColor="#374151"
                  text={`${shoppingList.length} productos en la lista de la compra`}
                  trailing={<ChevronRight size={12} color="#9ca3af" />}
                  onClick={() => router.push('/apps/mi-hogar/shopping')} />
              )}
              {expiringMeds.length > 0 && (
                <InsightRow icon={QI.health('#db2777', 12)} iconBg="#fce7f3" bg="#fdf2f8"
                  border="0.5px solid rgba(219,39,119,0.15)" textColor="#9d174d"
                  text={`${expiringMeds.length} medicamento${expiringMeds.length > 1 ? 's caducan' : ' caduca'} pronto`}
                  trailing={<ChevronRight size={12} color="#db2777" />}
                  onClick={() => router.push('/apps/mi-hogar/pharmacy')} />
              )}
              {expiringWarranties.length > 0 && (
                <InsightRow icon={QI.receipt('#7c3aed', 12)} iconBg="#ede9fe" bg="#f5f3ff"
                  border="0.5px solid rgba(124,58,237,0.15)" textColor="#5b21b6"
                  text={`${expiringWarranties.length} garantía${expiringWarranties.length > 1 ? 's vencen' : ' vence'} en 30 días`}
                  trailing={<ChevronRight size={12} color="#7c3aed" />}
                  onClick={() => router.push('/apps/mi-hogar/warranties')} />
              )}
              {!hasUrgentItems && shoppingList.length === 0 && (
                <InsightRow icon={QI.check('#16a34a', 12)} iconBg="#dcfce7" bg="#f0fdf4"
                  textColor="#166534" text="Todo en orden. Buen día por delante."
                  trailing={<CheckCircle2 size={14} color="#16a34a" />} />
              )}
            </div>
          </div>

          {/* CUENTAS — premium banking widget */}
          <div style={{ ...glass, padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IB name="creditcard" bg="#dcfce7" color="#16a34a" size={28} iconSize={13} />
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.2px' }}>Mis cuentas</h3>
                <span style={{ fontSize: 9, color: '#9ca3af', background: '#f3f4f6', borderRadius: 6, padding: '2px 6px', fontWeight: 500 }}>Saldo actual</span>
              </div>
              <button onClick={() => router.push('/apps/mi-hogar/savings')} style={{ fontSize: 10, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 2 }}>
                Ver todo <ChevronRight size={10} color="#9ca3af" />
              </button>
            </div>

            {accounts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {accounts.slice(0, 5).map((acc: any) => {
                  const detectionSrc = acc.bank_name || acc.institution_name || acc.name || '';
                  const bank = getBankStyle(detectionSrc);
                  const label = getAccountLabel(acc.name || '');
                  const bal = accountBalanceAt(acc);
                  return (
                    <div key={acc.id} onClick={() => router.push('/apps/mi-hogar/savings')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px',
                        background: 'white',
                        border: '0.5px solid rgba(0,0,0,0.06)',
                        borderRadius: 14, cursor: 'pointer',
                        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                        transition: 'all 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px ${bank.bg}30`;
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
                        (e.currentTarget as HTMLDivElement).style.borderColor = `${bank.bg}40`;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 6px rgba(0,0,0,0.04)';
                        (e.currentTarget as HTMLDivElement).style.transform = 'none';
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,0,0,0.06)';
                      }}>
                      {/* Bank logo — real via Clearbit, fallback abbr */}
                      <BankLogo bank={bank} size={42} />

                      {/* Bank name + account label */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.2px' }}>
                          {bank.bankName}
                        </p>
                        <p style={{ fontSize: 10, color: '#9ca3af', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 400 }}>
                          {label !== bank.bankName ? label : (acc.account_type || 'Cuenta')}
                        </p>
                      </div>

                      {/* Balance */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{
                          fontSize: 14, fontWeight: 700,
                          color: bal >= 0 ? '#111827' : '#ef4444',
                          margin: 0, letterSpacing: '-0.5px',
                        }}>
                          {bal.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Total balance row */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', marginTop: 2,
                  background: '#f8f9fb', borderRadius: 12,
                  border: '0.5px solid rgba(0,0,0,0.05)',
                }}>
                  <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Patrimonio total</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#111827', letterSpacing: '-0.6px' }}>
                    {totalBalance.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>Sin cuentas registradas</p>
            )}

            {/* ── Panel de análisis financiero ── */}
            <div style={{
              marginTop: 12,
              background: '#f8f9fb',
              borderRadius: 14,
              padding: '14px 14px 12px',
              border: '0.5px solid rgba(0,0,0,0.05)',
            }}>
              {/* Header */}
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {format(selectedDate, 'MMMM yyyy', { locale: es })}
              </p>

              {/* Ingresos / Gastos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '8px 10px' }}>
                  <p style={{ fontSize: 9, color: '#16a34a', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Ingresos</p>
                  <p style={{ fontSize: 17, fontWeight: 800, color: monthIncome === 0 ? '#d1d5db' : '#16a34a', margin: 0, letterSpacing: '-0.5px', lineHeight: 1 }}>
                    +{Math.round(monthIncome).toLocaleString('es-ES')} €
                  </p>
                </div>
                <div style={{ background: '#fef2f2', borderRadius: 10, padding: '8px 10px' }}>
                  <p style={{ fontSize: 9, color: '#dc2626', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Gastos</p>
                  <p style={{ fontSize: 17, fontWeight: 800, color: monthSpend === 0 ? '#d1d5db' : '#dc2626', margin: 0, letterSpacing: '-0.5px', lineHeight: 1 }}>
                    -{Math.round(monthSpend).toLocaleString('es-ES')} €
                  </p>
                </div>
              </div>

              {/* Neto */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '6px 10px', background: 'white', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500 }}>Balance neto del mes</span>
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.4px', color: monthNet >= 0 ? '#16a34a' : '#dc2626' }}>
                  {monthNet >= 0 ? '+' : ''}{Math.round(monthNet).toLocaleString('es-ES')} €
                </span>
              </div>

              {/* Gráfico 7 días — barras verdes/rojas según flujo neto */}
              <div>
                <p style={{ fontSize: 8, color: '#d1d5db', margin: '0 0 4px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Flujo últimos 7 días</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 36 }}>
                  {weeklyFlow.map((v, i) => {
                    const maxAbs = Math.max(...weeklyFlow.map(Math.abs), 1);
                    const pct = Math.abs(v) / maxAbs;
                    const h = Math.max(3, Math.round(pct * 32));
                    const isLast = i === weeklyFlow.length - 1;
                    const color = v >= 0 ? '#22c55e' : '#ef4444';
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <div style={{
                          width: '100%', height: h, borderRadius: 3,
                          background: isLast ? color : color + '55',
                          transition: 'height 0.5s ease',
                        }} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {monthIncome === 0 && monthSpend === 0 && (
                <p style={{ fontSize: 10, color: '#9ca3af', margin: '8px 0 0', textAlign: 'center' }}>Sin movimientos registrados este mes</p>
              )}
            </div>

            {/* Deudas compartidas */}
            {debts.length > 0 && (
              <>
                <div style={{ height: 1, background: 'rgba(0,0,0,0.05)', margin: '12px 0' }} />
                <h4 style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Deudas compartidas
                </h4>
                {debts.map(debt => (
                  <div key={debt.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', marginBottom: 5, borderRadius: 10,
                    background: debt.amount > 0 ? '#fef2f2' : '#f0fdf4',
                    border: `0.5px solid ${debt.amount > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(22,163,74,0.12)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: debt.amount > 0 ? '#ef4444' : '#22c55e' }} />
                      <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{debt.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: debt.amount > 0 ? '#dc2626' : '#16a34a', letterSpacing: '-0.3px' }}>
                      {debt.amount > 0 ? '−' : '+'} {Math.abs(debt.amount).toFixed(0)} €
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* MEDICACIÓN HOY */}
          {dailyMedicines.length > 0 && (
            <div style={{ ...glass, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>Medicación hoy</h3>
                <button onClick={() => router.push('/apps/mi-hogar/pharmacy')} style={{ fontSize: 10, color: '#db2777', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Ver todo →</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {dailyMedicines.slice(0, 4).map((med: any) => (
                  <div key={med.id} onClick={() => router.push('/apps/mi-hogar/pharmacy')}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', background: '#fdf2f8', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(2px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                    <IB name="health" bg="#fce7f3" color="#db2777" size={28} iconSize={13} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 500, color: '#9d174d', margin: 0 }}>{med.name}</p>
                      <p style={{ fontSize: 9, color: '#f9a8d4', margin: '1px 0 0' }}>{med.alarm_times?.join(' · ')}</p>
                    </div>
                    <ChevronRight size={11} color="#f9a8d4" />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  </>
  );
}

// ── RichWidget — mini-panel para "Hoy en QUIOBA" ──────────────────────────────
function RichWidget({
  iconName, iconBg, iconColor, status, title, value, onClick, children,
}: {
  iconName: string; iconBg: string; iconColor: string;
  status: 'ok' | 'warn' | 'alert';
  title: string; value: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#f0f9ff' : '#f8f9fb',
        border: `0.5px solid ${hov ? 'rgba(2,132,199,0.15)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 16, padding: '13px 12px 11px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? '0 6px 20px rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: hov ? 'scale(1.08)' : 'scale(1)',
          boxShadow: hov ? `0 3px 10px ${iconBg}` : '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          {QI[iconName]?.(iconColor, 16)}
        </div>
        <StatusDot status={status} />
      </div>
      {/* Value */}
      <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 1px', letterSpacing: '-0.4px', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 10, fontWeight: 500, color: '#6b7280', margin: '0 0 2px' }}>{title}</p>
      {/* Slot */}
      {children}
    </div>
  );
}
