'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Sparkles, CheckSquare, ShoppingCart, LayoutGrid,
    Lock, ChevronRight,
    Settings, ShoppingBag, ChefHat, ListTodo, Calendar,
    FileText, KeyRound, MessageCircle, Monitor,
    Leaf, Brain, GraduationCap, Building2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAi } from '@/context/AiContext';
import { AppWithStatus } from '@/types/marketplace';

// ── Icon mapping (mismo subconjunto que MobileLauncher) ──────────────
const IconMap: { [key: string]: React.ElementType } = {
    Settings, ShoppingCart, ShoppingBag, ChefHat,
    ListTodo, Calendar, FileText, KeyRound, MessageCircle,
    Monitor, Leaf, Brain, GraduationCap, Sparkles, Building2,
};

// ── Constantes de fallback (copiadas literalmente de MobileLauncher) ─
const LOCAL_MEDITATION_APP: AppWithStatus = {
    id: 'local-meditation', key: 'meditation', name: 'Pausa',
    description: 'Meditacion breve, respiracion y espacio mental.',
    icon_key: 'Brain', route: '/apps/mi-hogar/meditation',
    price: 0, category: 'lifestyle', is_active: true, isOwned: true, isLocked: false,
};

const FALLBACK_APPS: AppWithStatus[] = [
    { id: 'fb-1',  key: 'desktop',    name: 'Quioba Web',            description: 'Acceso al escritorio completo.',         icon_key: 'Settings',      route: '/desktop',                 price: 0,    category: 'utility',      is_active: true, isOwned: true,  isLocked: false },
    { id: 'fb-2',  key: 'shopping',   name: 'Lista de la Compra',    description: 'Gestiona tu lista de la compra.',        icon_key: 'ShoppingBag',   route: '/apps/mi-hogar/shopping',  price: 4.99, category: 'lifestyle',    is_active: true, isOwned: false, isLocked: true  },
    { id: 'fb-3',  key: 'chef-ia',    name: 'Chef IA',               description: 'Tu asistente de cocina y recetas.',      icon_key: 'ChefHat',       route: '/apps/mi-hogar/chef',      price: 2.99, category: 'lifestyle',    is_active: true, isOwned: false, isLocked: true  },
    { id: 'fb-4',  key: 'tasks',      name: 'Gestor de Tareas',      description: 'Organiza tu día a día.',                 icon_key: 'ListTodo',      route: '/apps/mi-hogar/tasks',     price: 1.99, category: 'productivity', is_active: true, isOwned: false, isLocked: true  },
    { id: 'fb-5',  key: 'roster',     name: 'Cuadrante de Turnos',   description: 'Gestiona tu cuadrante de trabajo.',      icon_key: 'Calendar',      route: '/apps/mi-hogar/roster',    price: 3.99, category: 'productivity', is_active: true, isOwned: false, isLocked: true  },
    { id: 'fb-6',  key: 'documents',  name: 'Gestor Documental',     description: 'DNI, Seguros siempre a mano.',           icon_key: 'FileText',      route: '/apps/mi-hogar/documents', price: 4.99, category: 'utility',      is_active: true, isOwned: false, isLocked: true  },
    { id: 'fb-7',  key: 'passwords',  name: 'Gestor de Contraseñas', description: 'Almacena contraseñas seguras.',          icon_key: 'KeyRound',      route: '/apps/passwords',          price: 5.99, category: 'utility',      is_active: true, isOwned: false, isLocked: true  },
    { id: 'fb-8',  key: 'assistant',  name: 'Asistente Quioba',      description: 'Tu asistente personal con IA.',          icon_key: 'MessageCircle', route: '/apps/mi-hogar/asistente', price: 9.99, category: 'productivity', is_active: true, isOwned: false, isLocked: true  },
    { id: 'fb-9',  key: 'huerto',     name: 'Mis Plantas/Huerto',    description: 'Identifica y cuida tus plantas con IA.', icon_key: 'Leaf',          route: '/apps/huerto',             price: 2.99, category: 'lifestyle',    is_active: true, isOwned: false, isLocked: true  },
    { id: 'fb-10', key: 'meditation', name: 'Pausa',                 description: 'Meditacion breve, respiracion.',         icon_key: 'Brain',         route: '/apps/mi-hogar/meditation', price: 0,   category: 'lifestyle',    is_active: true, isOwned: true,  isLocked: false },
    { id: 'fb-11', key: 'el-campus',  name: 'Campus',                description: 'Centro académico.',                      icon_key: 'GraduationCap', route: '/apps/el-campus',          price: 0,    category: 'productivity', is_active: true, isOwned: true,  isLocked: false },
    { id: 'fb-12', key: 'workspace',  name: 'Quioba Studios',        description: 'Planifica tus ideas y guiones.',         icon_key: 'Sparkles',      route: '/apps/mi-hogar/workspace', price: 0,    category: 'productivity', is_active: true, isOwned: true,  isLocked: false },
    { id: 'fb-13', key: 'oficina',    name: 'Oficina',               description: 'Centro de dirección de Quioba.',         icon_key: 'Building2',     route: '/apps/oficina',            price: 0,    category: 'utility',      is_active: true, isOwned: true,  isLocked: false },
];

function withLocalMeditationApp(apps: AppWithStatus[]): AppWithStatus[] {
    if (apps.some(a => a.key === LOCAL_MEDITATION_APP.key)) return apps;
    return [...apps, LOCAL_MEDITATION_APP];
}

// ── Types ─────────────────────────────────────────────────────────────
interface SmartHomeProps {
    user: { id: string; email?: string };
}

interface PendingTask {
    id: string;
    text: string;
    due_date: string | null;
    priority: 'low' | 'medium' | 'high';
}

interface ShoppingItem {
    id: string;
    name: string;
}

// ── Helpers de UI ─────────────────────────────────────────────────────
const PRIORITY_LABEL: Record<string, string> = {
    high: 'Alta', medium: 'Media', low: 'Baja',
};

const PRIORITY_COLOR: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-slate-100 text-slate-500',
};

function getGreeting(): string {
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return 'Buenos días';
    if (h >= 12 && h < 20) return 'Buenas tardes';
    return 'Buenas noches';
}

function getFormattedDate(): string {
    const now = new Date();
    const dayName = now.toLocaleDateString('es-ES', { weekday: 'long' });
    const day = now.getDate();
    const month = now.toLocaleDateString('es-ES', { month: 'long' });
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${day} de ${month}`;
}

function SkeletonLines({ count }: { count: number }) {
    return (
        <div className="px-4 py-4 space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="h-4 bg-slate-100 rounded-full animate-pulse"
                    style={{ width: `${70 + (i % 3) * 10}%` }}
                />
            ))}
        </div>
    );
}

// ── Componente principal ──────────────────────────────────────────────
export default function SmartHome({ user }: SmartHomeProps) {
    const { setIsOpen: openAi } = useAi();

    const [mounted, setMounted] = useState(false);
    const [profile, setProfile] = useState<{ nickname?: string } | null>(null);
    const [tasks, setTasks] = useState<PendingTask[]>([]);
    const [tasksLoading, setTasksLoading] = useState(true);
    const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
    const [shoppingLoading, setShoppingLoading] = useState(true);
    const [apps, setApps] = useState<AppWithStatus[]>([]);
    const [appsLoading, setAppsLoading] = useState(true);

    // Hydration guard — evita mismatch SSR/cliente en fecha y saludo
    useEffect(() => { setMounted(true); }, []);

    // Perfil (nickname para el saludo)
    useEffect(() => {
        if (!mounted) return;
        supabase
            .from('profiles')
            .select('nickname')
            .eq('id', user.id)
            .single()
            .then(({ data }) => { if (data) setProfile(data); });
    }, [mounted, user.id]);

    // Tareas pendientes — query directa a Supabase
    // Se usa query directa (no useTasks()) para no depender de que
    // TasksProvider esté montado en el árbol raíz desde esta ruta.
    useEffect(() => {
        if (!mounted) return;
        supabase
            .from('personal_tasks')
            .select('id, text, due_date, priority')
            .eq('user_id', user.id)
            .eq('completed', false)
            .order('due_date', { ascending: true })
            .limit(5)
            .then(({ data, error }) => {
                if (!error && data) setTasks(data as PendingTask[]);
                setTasksLoading(false);
            });
    }, [mounted, user.id]);

    // Lista de la compra — misma query que MobileLauncher (RLS protege el scope)
    useEffect(() => {
        if (!mounted) return;
        supabase
            .from('shopping_items')
            .select('id, name')
            .eq('is_checked', false)
            .order('created_at', { ascending: false })
            .limit(8)
            .then(({ data, error }) => {
                if (!error && data) setShoppingItems(data as ShoppingItem[]);
                setShoppingLoading(false);
            });
    }, [mounted]);

    // Apps del marketplace — lógica idéntica a MobileLauncher (timeout 3 s)
    useEffect(() => {
        if (!mounted) return;

        const fetchApps = async () => {
            const timeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 3000)
            );

            try {
                const fetch = (async (): Promise<AppWithStatus[]> => {
                    const { data: marketplaceApps, error } = await supabase
                        .from('marketplace_apps')
                        .select('*')
                        .eq('is_active', true)
                        .order('price', { ascending: true });

                    if (error || !marketplaceApps || marketplaceApps.length === 0) {
                        return withLocalMeditationApp(FALLBACK_APPS);
                    }

                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('subscription_tier')
                        .eq('id', user.id)
                        .single();

                    if (profileData?.subscription_tier === 'premium') {
                        return withLocalMeditationApp(
                            marketplaceApps.map(app => ({ ...app, isOwned: true, isLocked: false }))
                        );
                    }

                    const { data: purchases } = await supabase
                        .from('user_app_purchases')
                        .select('app_id, expires_at')
                        .eq('user_id', user.id)
                        .eq('status', 'active');

                    const ownedIds = new Set(
                        (purchases ?? [])
                            .filter(p => !p.expires_at || new Date(p.expires_at) > new Date())
                            .map(p => p.app_id)
                    );

                    return withLocalMeditationApp(
                        marketplaceApps.map(app => ({
                            ...app,
                            isOwned: ownedIds.has(app.id),
                            isLocked: !ownedIds.has(app.id),
                        }))
                    );
                })();

                const result = await Promise.race([fetch, timeout]);
                setApps(result);
            } catch {
                setApps(withLocalMeditationApp(FALLBACK_APPS));
            } finally {
                setAppsLoading(false);
            }
        };

        fetchApps();
    }, [mounted, user.id]);

    const displayName = profile?.nickname || user?.email?.split('@')[0] || 'usuario';

    // No renderizar hasta que el cliente esté listo (evita mismatch de fecha/hora)
    if (!mounted) return null;

    return (
        <main className="min-h-screen bg-slate-50 overflow-y-auto pb-20">

            {/* ── Header: fecha ─────────────────────────────────── */}
            <header className="px-5 pt-12 pb-2">
                <p className="text-xs font-medium text-slate-400 tracking-wide uppercase">
                    {getFormattedDate()}
                </p>
            </header>

            {/* ── Capa 1: QUIOBA IA ─────────────────────────────── */}
            <section className="px-5 pt-4 pb-6">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200/60">
                    <p className="text-sm font-medium opacity-75 mb-1">{getGreeting()},</p>
                    <h1 className="text-2xl font-bold mb-5 capitalize">{displayName}</h1>
                    <button
                        onClick={() => openAi(true)}
                        className="w-full flex items-center justify-center gap-2.5 bg-white/20 hover:bg-white/30 active:scale-[0.98] transition-all rounded-2xl py-3.5 px-4 font-semibold text-white text-sm"
                    >
                        <Sparkles className="w-4 h-4 flex-shrink-0" />
                        Hablar con QUIOBA
                    </button>
                </div>
            </section>

            {/* ── Capa 2: Resumen de vida ───────────────────────── */}
            <section className="px-5 space-y-4 mb-6">

                {/* Tareas pendientes */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                        <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-violet-500" />
                            <h2 className="text-sm font-semibold text-slate-700">Tareas pendientes</h2>
                        </div>
                        <Link
                            href="/apps/mi-hogar/tasks"
                            className="flex items-center gap-0.5 text-xs text-indigo-500 font-medium"
                        >
                            Ver todas <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {tasksLoading ? (
                        <SkeletonLines count={3} />
                    ) : tasks.length === 0 ? (
                        <p className="px-4 py-5 text-sm text-slate-400 text-center">Sin tareas pendientes</p>
                    ) : (
                        <ul className="divide-y divide-slate-50">
                            {tasks.map(task => (
                                <li key={task.id} className="px-4 py-3 flex items-start gap-3">
                                    <div className="w-4 h-4 mt-0.5 rounded-full border-2 border-slate-200 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-700 truncate">{task.text}</p>
                                        {task.due_date && (
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {new Date(task.due_date).toLocaleDateString('es-ES', {
                                                    day: 'numeric', month: 'short',
                                                })}
                                            </p>
                                        )}
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.low}`}>
                                        {PRIORITY_LABEL[task.priority] ?? 'Baja'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Lista de la compra */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4 text-emerald-500" />
                            <h2 className="text-sm font-semibold text-slate-700">Lista de la compra</h2>
                        </div>
                        <Link
                            href="/apps/mi-hogar/shopping"
                            className="flex items-center gap-0.5 text-xs text-indigo-500 font-medium"
                        >
                            Ver lista <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {shoppingLoading ? (
                        <SkeletonLines count={3} />
                    ) : shoppingItems.length === 0 ? (
                        <p className="px-4 py-5 text-sm text-slate-400 text-center">La lista está vacía</p>
                    ) : (
                        <ul className="divide-y divide-slate-50">
                            {shoppingItems.map(item => (
                                <li key={item.id} className="px-4 py-3 flex items-center gap-3">
                                    <div className="w-4 h-4 rounded border-2 border-slate-200 flex-shrink-0" />
                                    <p className="text-sm text-slate-700">{item.name}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>

            {/* ── Capa 3: Aplicaciones ─────────────────────────── */}
            <section className="px-5 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <LayoutGrid className="w-4 h-4 text-slate-400" />
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Aplicaciones</h2>
                </div>

                {appsLoading ? (
                    <div className="grid grid-cols-4 gap-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="aspect-square bg-slate-100 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-3">
                        {apps.map(app => {
                            const Icon = IconMap[app.icon_key] ?? LayoutGrid;

                            if (app.isLocked) {
                                return (
                                    <div
                                        key={app.id}
                                        className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white border border-slate-100 opacity-40"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                                            <Lock className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <span className="text-[10px] text-slate-400 text-center leading-tight line-clamp-2">
                                            {app.name}
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={app.id}
                                    href={app.route}
                                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white border border-slate-100 active:scale-95 transition-transform"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                                        <Icon className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <span className="text-[10px] text-slate-600 text-center leading-tight line-clamp-2">
                                        {app.name}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>


        </main>
    );
}
