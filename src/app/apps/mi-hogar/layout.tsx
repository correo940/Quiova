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
    const { user, loading, isPremium } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    const [checkingAccess, setCheckingAccess] = useState(true)
    const [hasPartners, setHasPartners] = useState(false)
    const [hasTaskInvite, setHasTaskInvite] = useState(false)

    useEffect(() => {
        const checkAccess = async () => {
            if (!user) {
                setCheckingAccess(false)
                return
            }

            try {
                // Check Partners (Shared Expenses Access)
                const { count: expensesCount } = await supabase
                    .from('expense_partners')
                    .select('*', { count: 'exact', head: true })
                    .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)

                setHasPartners((expensesCount || 0) > 0)

                // Check Task List Members (Shared Tasks Access)
                const { count: tasksCount } = await supabase
                    .from('task_list_members')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)

                setHasTaskInvite((tasksCount || 0) > 0)

            } catch (error) {
                console.error("Access check error:", error)
            } finally {
                setCheckingAccess(false)
            }
        }

        if (!loading) {
            checkAccess()
        }
    }, [user, loading]) // isPremium is already loaded in context

    useEffect(() => {
        if (loading || checkingAccess) return;

        const isPublicAuthPage = pathname === '/apps/mi-hogar/login';

        if (!user && !isPublicAuthPage) {
            // Special case: Unauthenticated access to Expenses -> Show Guest Access
            if (pathname?.startsWith('/apps/mi-hogar/expenses')) {
                // Allow rendering GuestExpensesAccess component directly in return
                return;
            }
            // Or Tasks sharing? usually requires login first.
            // If not logged in and not on login page, redirect
            router.push('/apps/mi-hogar/login')
        }
    }, [user, loading, checkingAccess, pathname, router])

    if (loading || checkingAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (!user && pathname !== '/apps/mi-hogar/login') {
        if (pathname?.startsWith('/apps/mi-hogar/expenses')) {
            return <GuestExpensesAccess onSuccess={() => window.location.reload()} />;
        }
        return null // Will redirect in useEffect
    }

    // --- ACCESS CONTROL LOGIC ---
    // If Premium -> Allow everything
    if (isPremium) {
        return <>{children}</>;
    }

    // Guests (Non-Premium)
    const isExpensesPage = pathname?.startsWith('/apps/mi-hogar/expenses');
    const isTasksPage = pathname?.startsWith('/apps/mi-hogar/tasks');

    // 1. Accessing Expenses
    if (isExpensesPage) {
        if (hasPartners) {
            return <>{children}</>; // Allow if invited
        } else {
            return <GuestExpensesAccess onSuccess={() => window.location.reload()} />; // Show Gatekeeper
        }
    }

    // 2. Accessing Tasks
    if (isTasksPage) {
        if (hasTaskInvite) {
            return <>{children}</>; // Allow if invited/member
        }
        // If not invited, they will see the block screen below
    }

    // 3. Trying to access restricted pages
    // Allowed pages for free users (if invited):
    const allowed = (isExpensesPage && hasPartners) || (isTasksPage && hasTaskInvite);

    // Whitelist public pages if any (e.g. root dashboard might be allowed but empty?)
    // For now, if they are not premium and try to access anything else, block.
    // NOTE: /apps/mi-hogar root might need to be allowed to show the menu?
    // User requirement: "no ver el resto de las aplicaciones" implies blocking.

    if (!allowed && pathname !== '/apps/mi-hogar/login') {
        // Allow root '/apps/mi-hogar' only if they have at least one permission?
        // Or block it too and force them to go to their allowed app?
        // Let's block dashboard if they have absolutely no permissions.
        // If they have permissions, maybe show dashboard? But user said "no ver el resto".

        // Simpler approach: If on a specific app page they don't have access to, block.
        // If on root, maybe allow? Let's stick to blocking restricted paths.

        if (pathname === '/apps/mi-hogar') {
            // If they have tasks access, redirect to tasks?
            if (hasTaskInvite) {
                router.replace('/apps/mi-hogar/tasks');
                return null;
            }
            // If expsense access, redirect to expenses?
            if (hasPartners) {
                router.replace('/apps/mi-hogar/expenses');
                return null;
            }
        }

        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <Lock className="w-12 h-12 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold mb-2">Acceso Restringido</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                    No tienes plan Premium. Solo puedes acceder a las secciones donde has sido invitado.
                </p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    {hasTaskInvite && (
                        <Button variant="outline" onClick={() => window.location.href = '/apps/mi-hogar/tasks'}>
                            Ir a Mis Tareas
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => window.location.href = '/apps/mi-hogar/expenses'}>
                        Ir a Gastos (Invitado)
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
