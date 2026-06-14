'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
    LayoutGrid, ScanLine, ShoppingCart,
    ChevronRight, Battery, Signal, Wifi,
    Settings, Bell, Search, Monitor, Calendar,
    FileText, KeyRound, MessageCircle,
    ShoppingBag, ChefHat, ListTodo, Lock,
    Wallet, CreditCard, Sparkles, Star,
    Pencil, Check, X as XIcon, CheckSquare, ArrowDown,
    AlertTriangle, Info, Pill, ShieldAlert, Car, Send, Leaf, Brain, GraduationCap,
    Mic, Loader2, PenLine, MicOff, Building2, CloudSun
} from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getProductEmoji } from '@/lib/shopping-list-ai-helpers';
import SmartScanner from './smart-scanner';
import ScanRosterDialog from '@/components/apps/mi-hogar/roster/scan-roster-dialog';
import ChatInterface from '@/components/apps/asistente/chat-interface';
import VoiceAssistantModal from './voice-assistant-modal';
import { getSecretarySettings, getAvatarById } from '@/lib/secretary-settings';
import { useJournal } from '@/context/JournalContext';
import { AppWithStatus, MarketplaceApp, UserAppPurchase } from '@/types/marketplace';
import PurchaseDialog from './purchase-dialog';
import { useRouter } from 'next/navigation';
import { fetchPendingTasks, fetchMedicines, fetchInsurances, fetchVehicles } from '@/components/apps/asistente/data-fetchers';

// Icon mapping for dynamic rendering
const IconMap: { [key: string]: any } = {
    Settings, ShoppingCart, ShoppingBag, ChefHat,
    ListTodo, Calendar, FileText, KeyRound, MessageCircle,
    Monitor, Leaf, Brain, GraduationCap, Sparkles, Building2
};

// Supermarket config for shopping list modal
type SupermarketCfg = { name: string; aliases: string[]; logo?: string; bg: string; text: string; border: string };
const SHOP_MARKETS: SupermarketCfg[] = [
    { name: 'Mercadona', aliases: ['mercadona', 'hacendado'], logo: '/images/supermarkets/mercadona.svg', bg: 'bg-emerald-700', text: 'text-white', border: 'border-emerald-800' },
    { name: 'Carrefour',  aliases: ['carrefour','carrefur'],  logo: '/images/supermarkets/carrefour.svg',  bg: 'bg-blue-700',    text: 'text-white', border: 'border-blue-800' },
    { name: 'Lidl',       aliases: ['lidl'],                  logo: '/images/supermarkets/lidl.svg',       bg: 'bg-yellow-300',  text: 'text-blue-900', border: 'border-blue-700' },
    { name: 'DIA',        aliases: ['dia'],                   logo: '/images/supermarkets/dia.svg',        bg: 'bg-red-600',     text: 'text-white', border: 'border-red-700' },
    { name: 'ALDI',       aliases: ['aldi'],                  logo: '/images/supermarkets/aldi.svg',       bg: 'bg-cyan-700',    text: 'text-white', border: 'border-cyan-800' },
    { name: 'Alcampo',    aliases: ['alcampo','auchan'],       logo: '/images/supermarkets/alcampo.png',    bg: 'bg-red-500',     text: 'text-white', border: 'border-red-600' },
    { name: 'Eroski',     aliases: ['eroski'],                logo: '/images/supermarkets/eroski.svg',     bg: 'bg-blue-600',    text: 'text-white', border: 'border-blue-700' },
    { name: 'El Corte Inglés', aliases: ['el corte ingles','corte ingles','eci'], logo: '/images/supermarkets/el-corte-ingles.svg', bg: 'bg-green-700', text: 'text-white', border: 'border-green-800' },
    { name: 'Consum',     aliases: ['consum'],                bg: 'bg-orange-500',  text: 'text-white', border: 'border-orange-600' },
];
const resolveMarket = (raw?: string | null): SupermarketCfg | null => {
    if (!raw?.trim()) return null;
    const n = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    return SHOP_MARKETS.find(m => m.aliases.some(a => n.includes(a))) ?? null;
};

// Fallback apps - used when marketplace_apps table doesn't exist yet
const FALLBACK_APPS: AppWithStatus[] = [
    { id: 'fb-1', key: 'desktop', name: 'Quioba Web', description: 'Acceso al escritorio completo.', icon_key: 'Settings', route: '/desktop', price: 0, category: 'utility', is_active: true, isOwned: true, isLocked: false },
    { id: 'fb-2', key: 'shopping', name: 'Lista de la Compra', description: 'Gestiona tu lista de la compra y despensa.', icon_key: 'ShoppingBag', route: '/apps/mi-hogar/shopping', price: 4.99, category: 'lifestyle', is_active: true, isOwned: false, isLocked: true },
    { id: 'fb-3', key: 'chef-ia', name: 'Chef IA', description: 'Tu asistente de cocina y recetas.', icon_key: 'ChefHat', route: '/apps/mi-hogar/chef', price: 2.99, category: 'lifestyle', is_active: true, isOwned: false, isLocked: true },
    { id: 'fb-4', key: 'tasks', name: 'Gestor de Tareas', description: 'Organiza tu día a día.', icon_key: 'ListTodo', route: '/apps/mi-hogar/tasks', price: 1.99, category: 'productivity', is_active: true, isOwned: false, isLocked: true },
    { id: 'fb-5', key: 'roster', name: 'Cuadrante de Turnos', description: 'Gestiona tu cuadrante de trabajo.', icon_key: 'Calendar', route: '/apps/mi-hogar/roster', price: 3.99, category: 'productivity', is_active: true, isOwned: false, isLocked: true },
    { id: 'fb-6', key: 'documents', name: 'Gestor Documental', description: 'DNI, Seguros siempre a mano.', icon_key: 'FileText', route: '/apps/mi-hogar/documents', price: 4.99, category: 'utility', is_active: true, isOwned: false, isLocked: true },
    { id: 'fb-7', key: 'passwords', name: 'Gestor de Contraseñas', description: 'Almacena contraseñas seguras.', icon_key: 'KeyRound', route: '/apps/passwords', price: 5.99, category: 'utility', is_active: true, isOwned: false, isLocked: true },
    { id: 'fb-8', key: 'assistant', name: 'Asistente Quioba', description: 'Tu asistente personal con IA.', icon_key: 'MessageCircle', route: '/apps/mi-hogar/asistente', price: 9.99, category: 'productivity', is_active: true, isOwned: false, isLocked: true },
    { id: 'fb-9', key: 'huerto', name: 'Mis Plantas/Huerto', description: 'Identifica y cuida tus plantas con IA.', icon_key: 'Leaf', route: '/apps/huerto', price: 2.99, category: 'lifestyle', is_active: true, isOwned: false, isLocked: true },
    { id: 'fb-10', key: 'meditation', name: 'Pausa', description: 'Meditacion breve, respiracion y espacio mental.', icon_key: 'Brain', route: '/apps/mi-hogar/meditation', price: 0, category: 'lifestyle', is_active: true, isOwned: true, isLocked: false },
    { id: 'fb-11', key: 'el-campus', name: 'Campus', description: 'Centro académico para alumnos, familias y universidad.', icon_key: 'GraduationCap', route: '/apps/el-campus', price: 0, category: 'productivity', is_active: true, isOwned: true, isLocked: false },
    { id: 'fb-12', key: 'workspace', name: 'Quioba Studios', description: 'Planifica tus ideas y guiones.', icon_key: 'Sparkles', route: '/apps/mi-hogar/workspace', price: 0, category: 'productivity', is_active: true, isOwned: true, isLocked: false },
    { id: 'fb-13', key: 'oficina', name: 'Oficina', description: 'Centro de dirección de Quioba.', icon_key: 'Building2', route: '/apps/oficina', price: 0, category: 'utility', is_active: true, isOwned: true, isLocked: false },
];

const LOCAL_MEDITATION_APP: AppWithStatus = {
    id: 'local-meditation',
    key: 'meditation',
    name: 'Pausa',
    description: 'Meditacion breve, respiracion y espacio mental.',
    icon_key: 'Brain',
    route: '/apps/mi-hogar/meditation',
    price: 0,
    category: 'lifestyle',
    is_active: true,
    isOwned: true,
    isLocked: false
};

function withLocalMeditationApp(apps: AppWithStatus[]) {
    if (apps.some((app) => app.key === LOCAL_MEDITATION_APP.key)) {
        return apps;
    }

    return [...apps, LOCAL_MEDITATION_APP];
}

// Helper: load quick app keys from localStorage
function loadQuickApps(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem('quioba_quick_apps');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

// Helper: save quick app keys to localStorage
function saveQuickApps(keys: string[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('quioba_quick_apps', JSON.stringify(keys));
    window.dispatchEvent(new Event('quioba_quick_apps_changed'));
}

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info';
    date: string;
    icon: any;
}

interface MobileLauncherProps {
    onLaunchDesktop: () => void;
    user: any;
}

const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    try {
        await Haptics.impact({ style });
    } catch (e) {
        // Ignorar en web
    }
};

export default function MobileLauncher({ onLaunchDesktop, user: initialUser }: MobileLauncherProps) {
    const router = useRouter();
    const { setIsOpen: setIsJournalOpen } = useJournal();
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<any>(initialUser);
    const [profile, setProfile] = useState<any>(null);
    const [currentTime, setCurrentTime] = useState('');
    const [currentDate, setCurrentDate] = useState('');

    // Name editing
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [savingName, setSavingName] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Quick apps (favorites)
    const [quickAppKeys, setQuickAppKeys] = useState<string[]>([]);

    // Avatar del asistente IA (leído de localStorage al montar)
    const [aiAvatarEmoji, setAiAvatarEmoji] = useState('🤖');

    // Feature States
    const [showScanner, setShowScanner] = useState(false);
    const [showScanRoster, setShowScanRoster] = useState(false);
    const [showAssistant, setShowAssistant] = useState(false);
    const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
    const [inlineChatInput, setInlineChatInput] = useState('');

    // Quick Task Modal
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskText, setTaskText] = useState('');
    const [taskLoading, setTaskLoading] = useState(false);
    const [taskListening, setTaskListening] = useState(false);
    const [taskDate, setTaskDate] = useState('');
    const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low' | ''>('');
    const [taskLists, setTaskLists] = useState<{ id: string; name: string }[]>([]);
    const [selectedListId, setSelectedListId] = useState<string>('');
    const taskInputRef = useRef<HTMLInputElement>(null);

    // Shopping List Modal
    const [showShoppingList, setShowShoppingList] = useState(false);
    const [shoppingItems, setShoppingItems] = useState<{ id: string; name: string; supermarket?: string; is_checked: boolean }[]>([]);
    const [shoppingLoading, setShoppingLoading] = useState(false);
    const [selectedSupermarketView, setSelectedSupermarketView] = useState<string | null>(null);

    // Quick Note Modal
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [noteSaving, setNoteSaving] = useState(false);
    const [noteListening, setNoteListening] = useState(false);
    const noteInputRef = useRef<HTMLTextAreaElement>(null);
    const noteRecognitionRef = useRef<any>(null);
    const [assistantInitialMessage, setAssistantInitialMessage] = useState('');

    // Marketplace States
    const [apps, setApps] = useState<AppWithStatus[]>([]);
    const [loadingApps, setLoadingApps] = useState(true);
    const [selectedAppForPurchase, setSelectedAppForPurchase] = useState<MarketplaceApp | null>(null);

    // Pull to Refresh & Time Themes
    const [timeTheme, setTimeTheme] = useState<'morning' | 'afternoon' | 'night'>('afternoon');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullProgress, setPullProgress] = useState(0);
    const startY = useRef(0);

    // Notifications
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    // Network Status
    const [isOffline, setIsOffline] = useState(false);

    // Spotlight Search
    const [showSpotlight, setShowSpotlight] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Reorderable Actions
    const [quickActionOrder, setQuickActionOrder] = useState<string[]>(['escanear', 'cuadrante', 'asistente', 'tareas']);

    const handleReorder = (newOrder: string[]) => {
        setQuickActionOrder(newOrder);
        if (typeof window !== 'undefined') {
            localStorage.setItem('quioba_quick_actions_order', JSON.stringify(newOrder));
        }
    };

    const getQuickActionData = (id: string) => {
        switch (id) {
            case 'escanear': return { id, icon: ScanLine, label: 'Escanear', sublabel: 'Producto', colorClass: 'bg-green-100 text-green-800', action: () => setShowScanner(true) };
            case 'cuadrante': return { id, icon: Calendar, label: 'Cuadrante', sublabel: 'Subir Foto', colorClass: 'bg-indigo-50 text-indigo-600', action: () => setShowScanRoster(true) };
            case 'asistente': return { id, icon: Sparkles, label: 'Asistente', sublabel: 'Consultar IA', colorClass: 'bg-violet-50 text-violet-600', action: () => { triggerHaptic(ImpactStyle.Light); setShowAssistant(true); } };
            case 'tareas': return { id, icon: CheckSquare, label: 'Tareas', sublabel: 'Añadir Nueva', colorClass: 'bg-purple-50 text-purple-600', route: '/apps/mi-hogar/tasks' };
        }
        return null;
    };

    // Focus spotlight input when opened
    useEffect(() => {
        if (showSpotlight && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [showSpotlight]);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
        setQuickAppKeys(loadQuickApps());
        const settings = getSecretarySettings();
        setAiAvatarEmoji(getAvatarById(settings.avatarId).emoji);
    }, []);

    // Network status listener
    useEffect(() => {
        let networkListener: any;
        
        const updateOfflineStatus = (e: Event) => setIsOffline(!navigator.onLine);
        
        const initNetwork = async () => {
            try {
                const status = await Network.getStatus();
                setIsOffline(!status.connected);
                
                networkListener = await Network.addListener('networkStatusChange', (status: any) => {
                    setIsOffline(!status.connected);
                });
            } catch (e) {
                // Fallback to web API
                setIsOffline(!navigator.onLine);
                window.addEventListener('offline', updateOfflineStatus);
                window.addEventListener('online', updateOfflineStatus);
            }
        };
        initNetwork();
        return () => {
            if (networkListener) networkListener.remove();
            window.removeEventListener('offline', updateOfflineStatus);
            window.removeEventListener('online', updateOfflineStatus);
        };
    }, []);

    // Close notifications on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus name input when editing starts
    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, [isEditingName]);

    const loadNotifications = async (userId: string) => {
        try {
            const ctx = { userId };
            const [tasksData, medsData, insurancesData, vehiclesData] = await Promise.all([
                fetchPendingTasks(ctx),
                fetchMedicines(ctx),
                fetchInsurances(ctx),
                fetchVehicles(ctx)
            ]);

            const notifs: NotificationItem[] = [];
            
            if (tasksData.overdue?.length > 0) {
                notifs.push({
                    id: 'tasks-overdue',
                    title: 'Tareas Caducadas',
                    message: `Tienes ${tasksData.overdue.length} tareas vencidas sin completar.`,
                    type: 'error',
                    date: new Date().toISOString(),
                    icon: AlertTriangle
                });
            }
            if (tasksData.today?.length > 0) {
                notifs.push({
                    id: 'tasks-today',
                    title: 'Tareas para Hoy',
                    message: `Tienes ${tasksData.today.length} tareas programadas para hoy.`,
                    type: 'info',
                    date: new Date().toISOString(),
                    icon: CheckSquare
                });
            }
            if (medsData.lowStock?.length > 0) {
                notifs.push({
                    id: 'meds-stock',
                    title: 'Stock Medicamentos',
                    message: `Queda poco de ${medsData.lowStock.map(m => m.name).join(', ')}.`,
                    type: 'warning',
                    date: new Date().toISOString(),
                    icon: Pill
                });
            }
            if (insurancesData.expiringSoon?.length > 0) {
                notifs.push({
                    id: 'ins-exp',
                    title: 'Seguros Próximos',
                    message: `Tus seguros de ${insurancesData.expiringSoon.map(i => i.name).join(', ')} vencen pronto.`,
                    type: 'warning',
                    date: new Date().toISOString(),
                    icon: ShieldAlert
                });
            }
            if (vehiclesData.pendingITV?.length > 0) {
                notifs.push({
                    id: 'car-itv',
                    title: 'ITV Próxima',
                    message: `El vehículo ${vehiclesData.pendingITV[0].name} tiene la ITV pronto.`,
                    type: 'warning',
                    date: new Date().toISOString(),
                    icon: Car
                });
            }
            if (vehiclesData.pendingMaintenance?.length > 0) {
                notifs.push({
                    id: 'car-maint',
                    title: 'Mantenimiento',
                    message: `Revisión pendiente para ${vehiclesData.pendingMaintenance[0].name}.`,
                    type: 'warning',
                    date: new Date().toISOString(),
                    icon: Settings
                });
            }

            setNotifications(notifs);
        } catch (e) {
            console.error('Error fetching notifications:', e);
        }
    };

    const fetchApps = async (userId: string) => {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('FetchApps Timeout')), 3000)
        );

        try {
            const fetchPromise = (async () => {
                const { data: marketplaceApps, error: appsError } = await supabase
                    .from('marketplace_apps')
                    .select('*')
                    .eq('is_active', true)
                    .order('price', { ascending: true });

                if (appsError || !marketplaceApps || marketplaceApps.length === 0) {
                    console.warn('📱 Marketplace: Using fallback apps', appsError?.message);
                    return withLocalMeditationApp(FALLBACK_APPS);
                }

                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('subscription_tier')
                    .eq('id', userId)
                    .single();

                const isPremium = profileData?.subscription_tier === 'premium';

                if (isPremium) {
                    return withLocalMeditationApp(marketplaceApps.map(app => ({
                        ...app,
                        isOwned: true,
                        isLocked: false
                    })));
                }

                const { data: purchases } = await supabase
                    .from('user_app_purchases')
                    .select('app_id, expires_at')
                    .eq('user_id', userId)
                    .eq('status', 'active');

                const ownedAppIds = new Set(
                    (purchases || [])
                        .filter(p => !p.expires_at || new Date(p.expires_at) > new Date())
                        .map(p => p.app_id)
                );

                return withLocalMeditationApp(marketplaceApps.map(app => ({
                    ...app,
                    isOwned: ownedAppIds.has(app.id),
                    isLocked: !ownedAppIds.has(app.id)
                })));
            })();

            const result = await Promise.race([fetchPromise, timeoutPromise]) as AppWithStatus[];
            setApps(result);
        } catch (error) {
            console.error('📱 Marketplace: Error/Timeout, using fallback', error);
            setApps(withLocalMeditationApp(FALLBACK_APPS));
        } finally {
            setLoadingApps(false);
        }
    };

    // Format time and date
    const updateDateTime = () => {
        const now = new Date();
        setCurrentTime(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
        const dayName = now.toLocaleDateString('es-ES', { weekday: 'long' });
        const day = now.getDate();
        const month = now.toLocaleDateString('es-ES', { month: 'long' });
        // Capitalize first letter
        const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        setCurrentDate(`${capitalizedDay}, ${day} de ${month}`);
        
        const hour = now.getHours();
        if (hour >= 6 && hour < 12) setTimeTheme('morning');
        else if (hour >= 18 || hour < 6) setTimeTheme('night');
        else setTimeTheme('afternoon');
    };

    useEffect(() => {
        if (!mounted) return;

        let isReplaced = false;
        const safetyTimeout = setTimeout(() => {
            if (loadingApps && !isReplaced) {
                console.warn('📱 MobileLauncher: Safety timeout reached');
                setApps(FALLBACK_APPS);
                setLoadingApps(false);
            }
        }, 4000);

        const init = async () => {
            try {
                // Use Initial User if available from props to avoid redundant getSession
                const currentUser = initialUser || (await supabase.auth.getSession()).data.session?.user;

                if (currentUser) {
                    setUser(currentUser);
                    
                    // Fetch profile in background
                    supabase.from('profiles').select('*').eq('id', currentUser.id).single()
                        .then(({ data }) => { if (data) setProfile(data); });

                    await fetchApps(currentUser.id);
                    await loadNotifications(currentUser.id);
                } else {
                    console.log('📱 MobileLauncher: No user session, using fallback');
                    setApps(withLocalMeditationApp(FALLBACK_APPS));
                    setLoadingApps(false);
                }
            } catch (err) {
                console.error('📱 MobileLauncher: Initialization error', err);
                setApps(withLocalMeditationApp(FALLBACK_APPS));
                setLoadingApps(false);
            } finally {
                isReplaced = true;
                clearTimeout(safetyTimeout);
            }
        };

        init();
        updateDateTime();

        const timer = setInterval(updateDateTime, 1000);
        return () => {
            clearInterval(timer);
            clearTimeout(safetyTimeout);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted]);

    // --- Name Editing ---
    const startEditingName = () => {
        setEditedName(profile?.nickname || user?.email?.split('@')[0] || '');
        setIsEditingName(true);
    };

    const saveNickname = async () => {
        if (!editedName.trim() || !user) return;
        setSavingName(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ nickname: editedName.trim() })
                .eq('id', user.id);

            if (error) throw error;
            setProfile({ ...profile, nickname: editedName.trim() });
            triggerHaptic(ImpactStyle.Heavy);
        } catch (err) {
            console.error('Error saving nickname:', err);
        } finally {
            setSavingName(false);
            setIsEditingName(false);
        }
    };

    const cancelEditingName = () => {
        setIsEditingName(false);
        setEditedName('');
    };

    // --- Shopping List ---
    const fetchShoppingItems = async () => {
        if (!user) return;
        setShoppingLoading(true);
        try {
            const { data, error } = await supabase
                .from('shopping_items')
                .select('id, name, supermarket, is_checked')
                .eq('is_checked', false)
                .order('created_at', { ascending: false });
            if (!error && data) setShoppingItems(data);
        } catch (e) { console.error('fetchShoppingItems', e); }
        finally { setShoppingLoading(false); }
    };

    const toggleShoppingItem = async (id: string) => {
        setShoppingItems(prev => prev.filter(i => i.id !== id));
        await supabase.from('shopping_items').update({ is_checked: true }).eq('id', id);
    };

    // --- Quick Note ---
    const saveQuickNote = async () => {
        if (!noteText.trim() || !user) return;
        setNoteSaving(true);
        try {
            await supabase.from('journal_entries').insert({
                user_id: user.id,
                context_id: `/journal/quick-${Date.now()}`,
                content: `<p>${noteText.trim()}</p>`,
                metadata: { title: noteText.trim().slice(0, 60), source: 'quick-note' },
                tags: [],
                entry_type: 'note',
            });
            setNoteText('');
            setShowNoteModal(false);
        } catch (e) { console.error('saveQuickNote', e); }
        finally { setNoteSaving(false); }
    };

    const toggleNoteVoice = () => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
        if (noteListening) {
            noteRecognitionRef.current?.stop();
            setNoteListening(false);
            return;
        }
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const rec = new SR();
        noteRecognitionRef.current = rec;
        rec.lang = 'es-ES';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e: any) => {
            const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('');
            setNoteText(transcript);
        };
        rec.onend = () => setNoteListening(false);
        rec.start();
        setNoteListening(true);
    };

    // --- Quick Task ---
    const fetchTaskLists = async () => {
        if (!user || taskLists.length > 0) return;
        try {
            const { data: owned } = await supabase
                .from('task_lists')
                .select('id, name')
                .eq('owner_id', user.id)
                .order('name');

            const { data: membered } = await supabase
                .from('task_list_members')
                .select('list_id, task_lists(id, name)')
                .eq('user_id', user.id)
                .neq('role', 'viewer');

            const memberLists = (membered ?? [])
                .map((m: any) => m.task_lists)
                .filter(Boolean)
                .filter((l: any) => !(owned ?? []).some((o: any) => o.id === l.id));

            let all = [...(owned ?? []), ...memberLists] as { id: string; name: string }[];

            if (all.length === 0) {
                const { data: created } = await supabase
                    .from('task_lists')
                    .insert([{ name: 'Mis Tareas', owner_id: user.id }])
                    .select('id, name')
                    .single();
                if (created) all = [created];
            }

            setTaskLists(all);
            if (all.length > 0 && !selectedListId) setSelectedListId(all[0].id);
        } catch (e) { console.error('fetchTaskLists', e); }
    };

    const handleQuickTaskSubmit = async () => {
        if (!taskText.trim() || !user || !selectedListId) return;
        setTaskLoading(true);
        try {
            const res = await fetch('/api/mi-hogar/quick-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: taskText.trim() })
            });
            const { title, due_date, priority } = await res.json();

            // Manual values override Groq
            const finalDate = taskDate
                ? new Date(taskDate).toISOString()
                : (due_date ?? new Date(Date.now() + 86400000).toISOString());
            const finalPriority = taskPriority || priority || 'medium';

            await supabase.from('tasks').insert([{
                user_id: user.id,
                list_id: selectedListId,
                is_completed: false,
                title: title || taskText.trim(),
                due_date: finalDate,
                priority: finalPriority
            }]);

            setTaskText('');
            setTaskDate('');
            setTaskPriority('');
            setShowTaskModal(false);
            triggerHaptic(ImpactStyle.Heavy);
        } catch (e) {
            console.error('quick-task error', e);
        } finally {
            setTaskLoading(false);
        }
    };

    const startVoiceTask = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) { alert('Tu navegador no soporta voz'); return; }
        const recognition = new SR();
        recognition.lang = 'es-ES';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onstart = () => setTaskListening(true);
        recognition.onresult = (e: any) => {
            setTaskText(e.results[0][0].transcript);
            setTaskListening(false);
        };
        recognition.onerror = () => setTaskListening(false);
        recognition.onend = () => setTaskListening(false);
        recognition.start();
    };

    // --- Quick Apps ---
    const toggleQuickApp = (appKey: string) => {
        setQuickAppKeys(prev => {
            let next: string[];
            if (prev.includes(appKey)) {
                next = prev.filter(k => k !== appKey);
            } else {
                // Max 3 quick apps
                if (prev.length >= 3) {
                    next = [...prev.slice(1), appKey];
                } else {
                    next = [...prev, appKey];
                }
            }
            saveQuickApps(next);
            triggerHaptic(ImpactStyle.Medium);
            return next;
        });
    };

    const visibleApps = apps.filter(app => {
        if (app.key === 'workspace' || app.key === 'oficina') {
            return user?.email === 'todojuntomirar@gmail.com';
        }
        return true;
    });

    const quickApps = visibleApps.filter(a => quickAppKeys.includes(a.key) && !a.isLocked);

    // PIN Modal State
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pendingSecureApp, setPendingSecureApp] = useState<AppWithStatus | null>(null);

    const handlePinKeypad = (num: string) => {
        triggerHaptic(ImpactStyle.Light);
        const newPin = pinInput + num;
        setPinInput(newPin);
        if (newPin.length === 4) {
            if (newPin === '1234') { 
                triggerHaptic(ImpactStyle.Medium);
                setShowPinModal(false);
                if (pendingSecureApp) router.push(pendingSecureApp.route);
                setPendingSecureApp(null);
                setPinInput('');
            } else {
                triggerHaptic(ImpactStyle.Heavy);
                setPinInput('');
            }
        }
    };

    const handleAppClick = (app: AppWithStatus) => {
        if (app.isLocked) {
            setSelectedAppForPurchase(app);
            return;
        }
        
        if (app.key === 'passwords' || app.key === 'documents' || app.key === 'workspace') {
            triggerHaptic(ImpactStyle.Light);
            setPendingSecureApp(app);
            setPinInput('');
            setShowPinModal(true);
            return;
        }
        
        if (app.key === 'desktop') {
            onLaunchDesktop();
        } else if (app.key === 'scanner') {
            triggerHaptic(ImpactStyle.Light);
            setShowScanner(true);
        } else if (app.key === 'roster') {
            triggerHaptic(ImpactStyle.Light);
            setShowScanRoster(true);
        } else {
            triggerHaptic(ImpactStyle.Light);
            router.push(app.route);
        }
    };

    const getAppStyle = (appKey: string) => {
        switch (appKey) {
            case 'desktop': return { bg: 'bg-green-100', text: 'text-green-800', decoration: 'bg-green-800', shadow: 'green' };
            case 'shopping': return { bg: 'bg-orange-50', text: 'text-orange-600', decoration: 'bg-orange-500', shadow: 'orange' };
            case 'chef-ia': return { bg: 'bg-red-50', text: 'text-red-600', decoration: 'bg-red-500', shadow: 'red' };
            case 'tasks': return { bg: 'bg-purple-50', text: 'text-purple-600', decoration: 'bg-purple-500', shadow: 'purple' };
            case 'roster': return { bg: 'bg-indigo-50', text: 'text-indigo-600', decoration: 'bg-indigo-500', shadow: 'indigo' };
            case 'documents': return { bg: 'bg-blue-50', text: 'text-blue-600', decoration: 'bg-blue-500', shadow: 'blue' };
            case 'passwords': return { bg: 'bg-amber-50', text: 'text-amber-600', decoration: 'bg-amber-500', shadow: 'amber' };
            case 'assistant': return { bg: 'bg-violet-50', text: 'text-violet-600', decoration: 'bg-violet-500', shadow: 'violet' };
            case 'huerto': return { bg: 'bg-green-100', text: 'text-green-800', decoration: 'bg-green-800', shadow: 'green' };
            case 'el-campus': return { bg: 'bg-blue-50', text: 'text-blue-700', decoration: 'bg-blue-600', shadow: 'blue' };
            case 'workspace': return { bg: 'bg-emerald-50', text: 'text-emerald-600', decoration: 'bg-emerald-500', shadow: 'emerald' };
            default: return { bg: 'bg-slate-50', text: 'text-slate-600', decoration: 'bg-slate-500', shadow: 'slate' };
        }
    };

    const filteredApps = visibleApps.filter(app => 
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (app.description && app.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (!mounted) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center pt-20 px-6 gap-8">
                {/* Time skeleton */}
                <div className="text-center space-y-2">
                    <div className="h-12 w-32 bg-slate-200/60 rounded-2xl animate-pulse mx-auto" />
                    <div className="h-4 w-48 bg-slate-200/40 rounded-lg animate-pulse mx-auto" />
                </div>
                {/* Quick actions skeleton */}
                <div className="flex gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="w-16 h-20 bg-slate-200/50 rounded-2xl animate-pulse" />
                    ))}
                </div>
                {/* App grid skeleton */}
                <div className="grid grid-cols-4 gap-4 w-full max-w-sm">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 bg-slate-200/50 rounded-2xl animate-pulse" />
                            <div className="h-3 w-10 bg-slate-200/40 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        if (typeof window !== 'undefined' && window.scrollY === 0) startY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (startY.current > 0 && typeof window !== 'undefined' && window.scrollY <= 0) {
            const currentY = e.touches[0].clientY;
            const diff = currentY - startY.current;
            if (diff > 0 && diff < 150) {
                setPullProgress(Math.min(diff / 80, 1));
            }
        }
    };

    const handleTouchEnd = async () => {
        if (pullProgress > 0.8 && !isRefreshing) {
            triggerHaptic(ImpactStyle.Heavy);
            setIsRefreshing(true);
            setPullProgress(1);
            
            updateDateTime();
            if (user) await fetchApps(user.id);
            
            triggerHaptic(ImpactStyle.Light);
            setIsRefreshing(false);
        }
        setPullProgress(0);
        startY.current = 0;
    };

    return (
        <div 
            className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans relative overflow-x-hidden selection:bg-green-100 pb-24"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Global Spotlight */}
            <AnimatePresence>
                {showSpotlight && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm p-4 pt-20"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setShowSpotlight(false);
                        }}
                    >
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md mx-auto flex flex-col max-h-[80vh]">
                            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                                <Search className="w-5 h-5 text-green-800" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Buscar aplicaciones o funciones..."
                                    className="flex-1 outline-none text-base text-slate-800 placeholder:text-slate-400 bg-transparent font-medium"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                <button onClick={() => setShowSpotlight(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-white shadow-sm border border-slate-200 rounded-full transition-all active:scale-90">
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="overflow-y-auto p-4 flex flex-col gap-2">
                                {searchQuery.trim() === '' ? (
                                    <div className="text-center text-slate-500 py-10 flex flex-col items-center">
                                        <Search className="w-10 h-10 mb-3 opacity-20" />
                                        <p className="text-sm font-medium">Busca utilidades, funciones o contenido de Quioba.</p>
                                    </div>
                                ) : filteredApps.length === 0 ? (
                                    <p className="text-center text-slate-500 text-sm py-8 font-medium">No se encontraron resultados para "{searchQuery}"</p>
                                ) : (
                                    filteredApps.map(app => {
                                        const Icon = IconMap[app.icon_key] || LayoutGrid;
                                        const style = getAppStyle(app.key);
                                        return (
                                            <button
                                                key={app.id}
                                                onClick={() => {
                                                    setShowSpotlight(false);
                                                    handleAppClick(app);
                                                }}
                                                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 text-left transition-colors active:scale-95"
                                            >
                                                <div className={`p-3 rounded-xl ${style.bg} ${style.text}`}>
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 leading-tight">{app.name}</h4>
                                                    {app.isLocked ? (
                                                        <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1">
                                                            <Lock className="w-3 h-3" /> Requiere Quioba+
                                                        </span>
                                                    ) : (
                                                        <p className="text-xs text-slate-500 mt-1 line-clamp-1 leading-snug">{app.description}</p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* PIN Modal for Sensitive Apps */}
            <AnimatePresence>
                {showPinModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-end justify-center sm:items-center"
                    >
                        <motion.div 
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-t-[32px] sm:rounded-3xl w-full max-w-sm p-6 pb-12 shadow-2xl flex flex-col items-center"
                        >
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-8"></div>
                            
                            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-4 shadow-sm">
                                <Lock className="w-8 h-8" />
                            </div>
                            
                            <h3 className="text-xl font-bold text-slate-900 mb-1">Acceso Seguro</h3>
                            <p className="text-sm text-slate-500 mb-8 max-w-[250px] text-center">
                                Introduce tu PIN (por defecto 1234) para acceder a {pendingSecureApp?.name || 'esta aplicación'}.
                            </p>

                            {/* PIN Display */}
                            <div className="flex gap-4 mb-10">
                                {[0, 1, 2, 3].map((index) => (
                                    <div 
                                        key={index}
                                        className={`w-4 h-4 rounded-full transition-all duration-200 ${
                                            pinInput.length > index 
                                                ? 'bg-green-800 scale-110 shadow-[0_0_10px_rgba(22,101,52,0.3)]' 
                                                : 'bg-slate-200'
                                        }`}
                                    />
                                ))}
                            </div>

                            {/* Numpad */}
                            <div className="grid grid-cols-3 gap-x-8 gap-y-6 mb-8">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => handlePinKeypad(num.toString())}
                                        className="w-16 h-16 rounded-full text-2xl font-semibold text-slate-700 hover:bg-slate-100 hover:text-green-800 active:bg-slate-200 active:scale-95 transition-all flex items-center justify-center"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <div className="col-start-2">
                                    <button
                                        onClick={() => handlePinKeypad('0')}
                                        className="w-16 h-16 rounded-full text-2xl font-semibold text-slate-700 hover:bg-slate-100 hover:text-green-800 active:bg-slate-200 active:scale-95 transition-all flex items-center justify-center"
                                    >
                                        0
                                    </button>
                                </div>
                                <div className="col-start-3 flex items-center justify-center">
                                    <button
                                        onClick={() => {
                                            triggerHaptic(ImpactStyle.Light);
                                            setPinInput(prev => prev.slice(0, -1));
                                        }}
                                        disabled={pinInput.length === 0}
                                        className="w-12 h-12 rounded-full text-slate-400 hover:bg-slate-100 hover:text-rose-500 disabled:opacity-30 disabled:hover:bg-transparent active:scale-95 transition-all flex items-center justify-center"
                                    >
                                        <XIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => {
                                    setShowPinModal(false);
                                    setPinInput('');
                                    setPendingSecureApp(null);
                                }}
                                className="text-slate-400 font-medium py-3 px-6 hover:bg-slate-50 rounded-xl transition-colors active:scale-95"
                            >
                                Cancelar
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Shopping List Modal */}
            <AnimatePresence>
                {showShoppingList && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="fixed inset-0 bg-[#f2f2f7] dark:bg-slate-950 z-[90] flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-5 pt-12 pb-4 flex items-center gap-3 flex-shrink-0">
                            {selectedSupermarketView ? (
                                <button
                                    onClick={() => setSelectedSupermarketView(null)}
                                    className="p-2 -ml-1 rounded-full text-slate-500 active:bg-slate-100"
                                >
                                    <ChevronRight className="w-5 h-5 rotate-180" />
                                </button>
                            ) : null}
                            <div className="flex-1">
                                <h2 className="font-black text-slate-900 dark:text-white text-lg leading-tight">
                                    {selectedSupermarketView ?? 'Lista de la Compra'}
                                </h2>
                                <p className="text-xs text-slate-400">
                                    {selectedSupermarketView
                                        ? `${shoppingItems.filter(i => (i.supermarket?.trim() || 'Sin supermercado') === selectedSupermarketView).length} productos`
                                        : `${shoppingItems.length} pendiente${shoppingItems.length !== 1 ? 's' : ''}`}
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowShoppingList(false); setSelectedSupermarketView(null); }}
                                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4">
                            {shoppingLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-6 h-6 animate-spin text-green-700" />
                                </div>
                            ) : shoppingItems.length === 0 ? (
                                <div className="text-center py-20 text-slate-400">
                                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-25" />
                                    <p className="text-sm">No hay productos pendientes</p>
                                </div>
                            ) : selectedSupermarketView ? (
                                /* ── Vista productos ── */
                                <AnimatePresence>
                                    <div className="space-y-2">
                                        {shoppingItems
                                            .filter(i => (i.supermarket?.trim() || 'Sin supermercado') === selectedSupermarketView)
                                            .map(item => (
                                                <motion.div
                                                    key={item.id}
                                                    layout
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 60, height: 0, marginBottom: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl px-3 py-3 shadow-sm border border-slate-100 dark:border-slate-800"
                                                >
                                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 flex items-center justify-center">
                                                        <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{getProductEmoji(item.name)}</span>
                                                    </div>
                                                    <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                                                    <button
                                                        onClick={() => {
                                                            triggerHaptic(ImpactStyle.Light);
                                                            toggleShoppingItem(item.id);
                                                        }}
                                                        className="flex items-center gap-1.5 bg-green-600 active:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                        Coger
                                                    </button>
                                                </motion.div>
                                            ))}
                                    </div>
                                </AnimatePresence>
                            ) : (
                                /* ── Vista supermercados ── */
                                (() => {
                                    const groups: Record<string, number> = {};
                                    shoppingItems.forEach(item => {
                                        const key = item.supermarket?.trim() || 'Sin supermercado';
                                        groups[key] = (groups[key] || 0) + 1;
                                    });
                                    const sortedKeys = Object.keys(groups).sort((a, b) =>
                                        a === 'Sin supermercado' ? 1 : b === 'Sin supermercado' ? -1 : a.localeCompare(b)
                                    );
                                    return (
                                        <div className="grid grid-cols-2 gap-3">
                                            {sortedKeys.map(name => {
                                                const cfg = resolveMarket(name);
                                                return (
                                                    <motion.button
                                                        key={name}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => { triggerHaptic(ImpactStyle.Light); setSelectedSupermarketView(name); }}
                                                        className="aspect-square bg-white dark:bg-slate-900 rounded-[24px] flex flex-col items-center justify-center gap-2 shadow-sm border border-slate-100 dark:border-slate-800 p-4"
                                                    >
                                                        {cfg?.logo ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={cfg.logo} alt={name} className="w-14 h-14 object-contain" />
                                                        ) : (
                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black border-2 ${cfg ? `${cfg.bg} ${cfg.text} ${cfg.border}` : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                                {name.slice(0, 3).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 text-center leading-tight">{name}</span>
                                                        <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 font-semibold px-2 py-0.5 rounded-full">{groups[name]} item{groups[name] !== 1 ? 's' : ''}</span>
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    );
                                })()
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Note Modal */}
            <AnimatePresence>
                {showNoteModal && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="fixed inset-x-0 bottom-0 bg-white dark:bg-slate-900 rounded-t-[28px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-[90] p-6 pb-10"
                    >
                        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-5" />
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-yellow-50 p-2 rounded-xl">
                                <PenLine className="w-5 h-5 text-yellow-500" />
                            </div>
                            <h3 className="font-black text-slate-900 dark:text-white text-lg">Nota rápida</h3>
                            <button onClick={() => { setShowNoteModal(false); setNoteText(''); }} className="ml-auto p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <textarea
                            ref={noteInputRef}
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            placeholder="Escribe tu nota..."
                            rows={4}
                            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400 mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={toggleNoteVoice}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-colors ${noteListening ? 'bg-red-100 text-red-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                            >
                                {noteListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                {noteListening ? 'Parar' : 'Voz'}
                            </button>
                            <button
                                onClick={saveQuickNote}
                                disabled={!noteText.trim() || noteSaving}
                                className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-slate-900 font-bold py-2.5 rounded-2xl text-sm"
                            >
                                {noteSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Guardar en Journal
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Task Modal */}
            <AnimatePresence>
                {showTaskModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm flex items-end justify-center"
                        onClick={(e) => { if (e.target === e.currentTarget) { setShowTaskModal(false); setTaskText(''); setTaskDate(''); setTaskPriority(''); } }}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-white rounded-t-[32px] w-full max-w-md p-6 pb-10 shadow-2xl"
                        >
                            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="bg-violet-50 p-2.5 rounded-[14px]">
                                        <CheckSquare className="w-5 h-5 text-violet-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900">Nueva Tarea</h2>
                                </div>
                                <button
                                    onClick={() => { setShowTaskModal(false); setTaskText(''); setTaskDate(''); setTaskPriority(''); }}
                                    className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                                >
                                    <XIcon className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            {/* Texto + mic */}
                            <div className="flex gap-2 mb-4">
                                <input
                                    ref={taskInputRef}
                                    type="text"
                                    placeholder='Ej: "Llamar al médico mañana a las 10h"'
                                    value={taskText}
                                    onChange={(e) => setTaskText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !taskLoading && handleQuickTaskSubmit()}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                                />
                                <button
                                    onClick={startVoiceTask}
                                    disabled={taskListening}
                                    className={`p-3.5 rounded-2xl transition-all flex-shrink-0 ${taskListening ? 'bg-red-500 text-white' : 'bg-violet-100 text-violet-600 hover:bg-violet-200'}`}
                                >
                                    {taskListening ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                                </button>
                            </div>

                            {taskListening && (
                                <p className="text-xs text-center text-red-500 font-medium mb-3 animate-pulse">Escuchando... habla ahora</p>
                            )}

                            {/* Fecha y hora */}
                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Fecha y hora</label>
                                <input
                                    type="datetime-local"
                                    value={taskDate}
                                    onChange={(e) => setTaskDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                                />
                                <p className="text-[10px] text-slate-400 mt-1 ml-1">Si no pones fecha, Groq la detecta del texto</p>
                            </div>

                            {/* Prioridad */}
                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Prioridad</label>
                                <div className="flex gap-2">
                                    {([
                                        { value: 'low', label: 'Baja', color: taskPriority === 'low' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-500' },
                                        { value: 'medium', label: 'Normal', color: taskPriority === 'medium' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500' },
                                        { value: 'high', label: 'Alta', color: taskPriority === 'high' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500' },
                                    ] as const).map(p => (
                                        <button
                                            key={p.value}
                                            onClick={() => setTaskPriority(prev => prev === p.value ? '' : p.value)}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${p.color}`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                                {!taskPriority && <p className="text-[10px] text-slate-400 mt-1 ml-1">Sin selección → Groq la detecta del texto</p>}
                            </div>

                            {/* Lista */}
                            <div className="mb-5">
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Lista</label>
                                {taskLists.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">Cargando listas...</p>
                                ) : (
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                        {taskLists.map(list => (
                                            <button
                                                key={list.id}
                                                onClick={() => setSelectedListId(list.id)}
                                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                                                    selectedListId === list.id
                                                        ? 'bg-violet-600 text-white shadow-sm'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                {list.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Guardar */}
                            <button
                                onClick={handleQuickTaskSubmit}
                                disabled={!taskText.trim() || taskLoading || !selectedListId}
                                className="w-full bg-violet-600 text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-all"
                            >
                                {taskLoading ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Procesando con IA...</>
                                ) : (
                                    <><CheckSquare className="w-5 h-5" /> Guardar Tarea</>
                                )}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Offline Indicator */}
            <AnimatePresence>
                {isOffline && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-0 left-0 right-0 z-[100] flex justify-center mt-2 mx-4 pointer-events-none"
                    >
                        <div className="bg-slate-800/90 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-semibold">
                            <Wifi className="w-4 h-4 text-slate-400 opacity-50 relative">
                                <span className="absolute inset-0 bg-red-500 w-[2px] h-5 rotate-45 left-2 -top-0.5 rounded-full" />
                            </Wifi>
                            Sin conexión
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pull to Refresh Indicator */}
            <div 
                className="absolute top-0 left-0 right-0 flex justify-center z-50 pointer-events-none transition-transform"
                style={{ 
                    transform: `translateY(${pullProgress > 0 || isRefreshing ? Math.max(0, (pullProgress * 60) - 10) : -50}px)`,
                    opacity: pullProgress > 0 || isRefreshing ? 1 : 0
                }}
            >
                <div className="bg-white rounded-full p-2.5 shadow-md border border-slate-100">
                    {isRefreshing ? (
                        <div className="w-5 h-5 border-2 border-green-800 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <ArrowDown 
                            className="w-5 h-5 text-green-800 transition-transform" 
                            style={{ transform: `rotate(${pullProgress * 180}deg)` }} 
                        />
                    )}
                </div>
            </div>

            {/* Ambient Background Elements */}
            <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[30%] blur-[100px] rounded-full pointer-events-none transition-colors duration-1000 ${
                timeTheme === 'morning' ? 'bg-amber-100/40' : 
                timeTheme === 'afternoon' ? 'bg-green-100/40' : 'bg-indigo-300/20'
            }`} />
            <div className={`absolute bottom-[10%] right-[-10%] w-[50%] h-[40%] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000 ${
                timeTheme === 'morning' ? 'bg-orange-100/30' : 
                timeTheme === 'afternoon' ? 'bg-blue-100/30' : 'bg-violet-300/20'
            }`} />

            {/* Header Section */}
            <header className="px-6 pt-8 pb-10 bg-white/60 backdrop-blur-xl rounded-b-[48px] shadow-[0_8px_32px_rgba(0,0,0,0.04)] border-b border-white/40 mb-8 relative z-10 mx-2 mt-2">
                {/* Date and Time Row */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center justify-between mb-4"
                >
                    <p className="text-xs font-medium text-slate-400 tracking-wide">
                        {currentDate}
                    </p>
                    <button
                        onClick={() => { triggerHaptic(ImpactStyle.Heavy); setShowVoiceAssistant(true); }}
                        className="flex-1 mx-3 flex items-center justify-center gap-2 bg-green-800 text-white py-2.5 rounded-xl font-bold shadow-sm active:scale-95 transition-all"
                    >
                        <span className="text-lg leading-none">{aiAvatarEmoji}</span>
                        <span className="text-sm">Hablar con IA</span>
                    </button>
                    <p className="text-xs font-bold text-green-800 tabular-nums">
                        {currentTime}
                    </p>
                </motion.div>

                {/* Botones principales */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Comprar / Despensa */}
                    <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => { triggerHaptic(ImpactStyle.Medium); setShowScanner(true); }}
                        className="aspect-square bg-white/80 backdrop-blur-md rounded-[28px] flex flex-col items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/60"
                    >
                        <div className="bg-orange-50 p-3 rounded-[18px]">
                            <ShoppingCart className="w-7 h-7 text-orange-500" />
                        </div>
                        <div className="text-center px-2">
                            <span className="block font-bold text-slate-900 text-xs leading-snug">Comprar /</span>
                            <span className="block font-bold text-slate-900 text-xs leading-snug">Despensa</span>
                        </div>
                    </motion.button>

                    {/* Tareas */}
                    <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => {
                            triggerHaptic(ImpactStyle.Medium);
                            setShowTaskModal(true);
                            fetchTaskLists();
                            setTimeout(() => taskInputRef.current?.focus(), 300);
                        }}
                        className="aspect-square bg-white/80 backdrop-blur-md rounded-[28px] flex flex-col items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/60"
                    >
                        <div className="bg-violet-50 p-3 rounded-[18px]">
                            <CheckSquare className="w-7 h-7 text-violet-600" />
                        </div>
                        <span className="block font-bold text-slate-900 text-xs">Tareas</span>
                    </motion.button>

                    {/* ¿Qué me pongo? */}
                    <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => { triggerHaptic(ImpactStyle.Medium); router.push('/apps/mi-hogar/tiempo'); }}
                        className="aspect-square bg-white/80 backdrop-blur-md rounded-[28px] flex flex-col items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/60"
                    >
                        <div className="bg-sky-50 p-3 rounded-[18px]">
                            <CloudSun className="w-7 h-7 text-sky-500" />
                        </div>
                        <div className="text-center px-2">
                            <span className="block font-bold text-slate-900 text-xs leading-snug">¿Qué me</span>
                            <span className="block font-bold text-slate-900 text-xs leading-snug">pongo?</span>
                        </div>
                    </motion.button>

                    {/* Lista de la Compra */}
                    <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => { triggerHaptic(ImpactStyle.Medium); fetchShoppingItems(); setShowShoppingList(true); }}
                        className="aspect-square bg-white/80 backdrop-blur-md rounded-[28px] flex flex-col items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/60"
                    >
                        <div className="bg-green-50 p-3 rounded-[18px]">
                            <ShoppingBag className="w-7 h-7 text-green-700" />
                        </div>
                        <div className="text-center px-2">
                            <span className="block font-bold text-slate-900 text-xs leading-snug">Lista de la</span>
                            <span className="block font-bold text-slate-900 text-xs leading-snug">Compra</span>
                        </div>
                    </motion.button>

                    {/* Farmacia */}
                    <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => { triggerHaptic(ImpactStyle.Medium); router.push('/apps/mi-hogar/pharmacy'); }}
                        className="aspect-square bg-white/80 backdrop-blur-md rounded-[28px] flex flex-col items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/60"
                    >
                        <div className="bg-red-50 p-3 rounded-[18px]">
                            <Pill className="w-7 h-7 text-red-500" />
                        </div>
                        <span className="block font-bold text-slate-900 text-xs">Farmacia</span>
                    </motion.button>

                    {/* Cuadrante */}
                    <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => { triggerHaptic(ImpactStyle.Medium); setShowScanRoster(true); }}
                        className="aspect-square bg-white/80 backdrop-blur-md rounded-[28px] flex flex-col items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/60"
                    >
                        <div className="bg-indigo-50 p-3 rounded-[18px]">
                            <Calendar className="w-7 h-7 text-indigo-600" />
                        </div>
                        <span className="block font-bold text-slate-900 text-xs">Cuadrante</span>
                    </motion.button>

                    {/* Economía */}
                    <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => { triggerHaptic(ImpactStyle.Medium); router.push('/apps/mi-hogar/savings'); }}
                        className="aspect-square bg-white/80 backdrop-blur-md rounded-[28px] flex flex-col items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/60"
                    >
                        <div className="bg-amber-50 p-3 rounded-[18px]">
                            <Wallet className="w-7 h-7 text-amber-500" />
                        </div>
                        <span className="block font-bold text-slate-900 text-xs">Economía</span>
                    </motion.button>

                    {/* Notas rápidas */}
                    <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => { triggerHaptic(ImpactStyle.Medium); setIsJournalOpen(true); }}
                        className="aspect-square bg-white/80 backdrop-blur-md rounded-[28px] flex flex-col items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/60"
                    >
                        <div className="bg-yellow-50 p-3 rounded-[18px]">
                            <PenLine className="w-7 h-7 text-yellow-500" />
                        </div>
                        <span className="block font-bold text-slate-900 text-xs">Mis Apuntes</span>
                    </motion.button>

                </div>

            </header>

            {/* Main Content */}
            <main className="px-6 relative z-10" />

            {/* Dynamic Bottom Navigation is now handled globally by MobileNav */}

            {/* Modals */}
            {showScanner && (
                <SmartScanner
                    onClose={() => setShowScanner(false)}
                    onProductAdded={async (product) => {
                        console.log('Product added', product);
                    }}
                />
            )}

            <ScanRosterDialog
                open={showScanRoster}
                onOpenChange={setShowScanRoster}
                onSuccess={() => setShowScanRoster(false)}
            />

            <PurchaseDialog
                app={selectedAppForPurchase}
                open={!!selectedAppForPurchase}
                onClose={() => setSelectedAppForPurchase(null)}
                onPurchaseComplete={() => {
                    if (user) fetchApps(user.id);
                }}
            />

            <VoiceAssistantModal
                open={showVoiceAssistant}
                onClose={() => setShowVoiceAssistant(false)}
                userName={profile?.nickname || user?.email?.split('@')[0]}
            />
        </div>
    );
}
