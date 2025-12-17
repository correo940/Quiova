'use client'

import { AuthProvider, useAuth } from '@/components/apps/mi-hogar/auth-context'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2, Lock, Sword } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { GuestExpensesAccess } from '@/components/apps/mi-hogar/expenses/guest-access'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    const [checkingAccess, setCheckingAccess] = useState(true)
    const [isPremium, setIsPremium] = useState(false)
    const [hasPartners, setHasPartners] = useState(false)

    useEffect(() => {
        const checkAccess = async () => {
            if (!user) {
                setCheckingAccess(false)
                return
            }

            try {
                // 1. Check Profile (Premium Status)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_premium')
                    .eq('id', user.id)
                    .single()

                const premium = profile?.is_premium || false
                setIsPremium(premium)

                // 2. Check Partners (Shared Access)
                const { count } = await supabase
                    .from('expense_partners')
                    .select('*', { count: 'exact', head: true })
                    .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)

                const hasPart = (count || 0) > 0
                setHasPartners(hasPart)

            } catch (error) {
                console.error("Access check error:", error)
            } finally {
                setCheckingAccess(false)
            }
        }

        if (!loading) {
            checkAccess()
        }
    }, [user, loading])

    useEffect(() => {
        const isExpenses = pathname?.startsWith('/apps/mi-hogar/expenses');
        if (!loading && !user && pathname !== '/apps/mi-hogar/login' && !isExpenses) {
            router.push('/apps/mi-hogar/login')
        }
    }, [user, loading, pathname, router])

    if (loading || checkingAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (!user && pathname !== '/apps/mi-hogar/login') {
        // Special case: Unauthenticated access to Expenses -> Show Guest Access (Registration)
        if (pathname?.startsWith('/apps/mi-hogar/expenses')) {
            return <GuestExpensesAccess onSuccess={() => window.location.reload()} />;
        }
        return null
    }

    // --- ACCESS CONTROL LOGIC ---
    // If Premium -> Allow everything
    if (isPremium) {
        return <>{children}</>;
    }

    // Guests (Non-Premium)
    const isExpensesPage = pathname?.startsWith('/apps/mi-hogar/expenses');

    // 1. Trying to access Expenses
    if (isExpensesPage) {
        if (hasPartners) {
            return <>{children}</>; // Allow if invited
        } else {
            return <GuestExpensesAccess onSuccess={() => window.location.reload()} />; // Show Gatekeeper
        }
    }

    // 2. Trying to access restricted pages (Anything NOT expenses and NOT login)
    // Note: If you have other free pages, add them to whitelist.
    if (pathname !== '/apps/mi-hogar' && !isExpensesPage) { // Root dashboard might need handling
        // Block!
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <Lock className="w-12 h-12 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold mb-2">Acceso Restringido</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                    No tienes plan Premium. Solo puedes acceder a la Hucha Común si te han invitado.
                </p>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => window.location.href = '/apps/mi-hogar/expenses'}>
                        Ir a Hucha Común
                    </Button>
                    <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => window.location.href = '/apps/debate'}>
                        <Sword className="w-4 h-4 mr-2" />
                        Ir a El Debate
                    </Button>
                    <Button variant="ghost" className="text-red-500" onClick={() => supabase.auth.signOut()}>
                        Cerrar Sesión
                    </Button>
                </div>
            </div>
        );
    }

    // Dashboard handling for guests:
    // If they go to main dashboard, maybe redirect to expenses or show limited dashboard?
    // For now, let's allow dashboard but maybe it looks empty? 
    // Or just let them see the buttons but clicking them will trigger this same guard if they navigate?
    // Let's assume dashboard buttons link to restricted pages, which will be blocked by this logic upon navigation.

    return <>{children}</>
}

export default function MiHogarLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthProvider>
            <AuthGuard>{children}</AuthGuard>
        </AuthProvider>
    )
}
