'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminProvider, useAdmin } from './AdminContext';
import AdminSidebar from './AdminSidebar';
import { Loader2, Menu } from 'lucide-react';
import { SUPER_ADMIN_EMAIL } from '@/lib/beta/constants';

function AdminShell({ children }: { children: React.ReactNode }) {
    const { email, ready } = useAdmin();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [pendingReviews, setPendingReviews] = useState(0);
    const { apiFetch } = useAdmin();

    useEffect(() => {
        if (!ready) return;
        if (!email || email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
            router.replace('/beta/login');
        }
    }, [ready, email, router]);

    useEffect(() => {
        if (!ready || !email || email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) return;
        apiFetch('/api/beta/admin/dashboard')
            .then(r => r.json())
            .then(d => setPendingReviews(d?.stats?.pendingReviews?.total ?? 0))
            .catch(() => {});
    }, [ready, email]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-[#1a5c2e]" size={32} />
            </div>
        );
    }

    if (!email || email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar — desktop */}
            <div className="hidden lg:flex shrink-0">
                <AdminSidebar
                    pendingReviews={pendingReviews}
                    collapsed={collapsed}
                    onToggle={() => setCollapsed(c => !c)}
                />
            </div>

            {/* Sidebar — mobile drawer */}
            <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <AdminSidebar pendingReviews={pendingReviews} />
            </div>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile topbar */}
                <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
                    <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                        <Menu size={20} />
                    </button>
                    <span className="font-bold text-gray-900 text-sm">QUIOBA Admin Beta</span>
                </div>

                {/* Page content */}
                <main className="flex-1 overflow-auto p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminProvider>
            <AdminShell>{children}</AdminShell>
        </AdminProvider>
    );
}
