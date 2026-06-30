'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ClipboardList, Target, Key, Bell, Settings, BarChart3, LogOut, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface NavItem {
    href: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
}

const BASE = '/beta/admin';

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
    const pathname = usePathname();
    const active = item.href === BASE ? pathname === BASE : (pathname ?? '').startsWith(item.href);

    return (
        <Link
            href={item.href}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                    ? 'bg-[#1a5c2e] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-[#edf7f1] hover:text-[#1a5c2e]'
            }`}
        >
            <span className="shrink-0 w-5 h-5 flex items-center justify-center">{item.icon}</span>
            {!collapsed && (
                <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                            {item.badge > 99 ? '99+' : item.badge}
                        </span>
                    )}
                </>
            )}
        </Link>
    );
}

interface Props { pendingReviews?: number; collapsed?: boolean; onToggle?: () => void; }

export default function AdminSidebar({ pendingReviews = 0, collapsed = false, onToggle }: Props) {
    const router = useRouter();

    const nav: NavItem[] = [
        { href: BASE, label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { href: `${BASE}/participants`, label: 'Participantes', icon: <Users size={18} /> },
        { href: `${BASE}/reviews`, label: 'Revisiones', icon: <ClipboardList size={18} />, badge: pendingReviews },
        { href: `${BASE}/missions`, label: 'Misiones', icon: <Target size={18} /> },
        { href: `${BASE}/codes`, label: 'Códigos Secretos', icon: <Key size={18} /> },
        { href: `${BASE}/notifications`, label: 'Notificaciones', icon: <Bell size={18} /> },
        { href: `${BASE}/config`, label: 'Configuración', icon: <Settings size={18} /> },
        { href: `${BASE}/analytics`, label: 'Analítica', icon: <BarChart3 size={18} /> },
    ];

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push('/beta/login');
    }

    return (
        <div className={`flex flex-col h-full bg-white border-r border-gray-100 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: '#1a5c2e' }}>
                            Q
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 text-sm leading-none">QUIOBA</p>
                            <p className="text-xs text-gray-400 mt-0.5">Admin Beta</p>
                        </div>
                    </div>
                )}
                {collapsed && (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm mx-auto" style={{ background: '#1a5c2e' }}>
                        Q
                    </div>
                )}
                {onToggle && (
                    <button onClick={onToggle} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <ChevronRight size={16} className={`transition-transform ${collapsed ? '' : 'rotate-180'}`} />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {nav.map(item => <NavLink key={item.href} item={item} collapsed={collapsed} />)}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100">
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors ${collapsed ? 'justify-center' : ''}`}
                >
                    <LogOut size={18} className="shrink-0" />
                    {!collapsed && <span>Cerrar sesión</span>}
                </button>
            </div>
        </div>
    );
}
