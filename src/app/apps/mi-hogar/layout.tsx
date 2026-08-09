'use client'

import { useAuth } from '@/components/apps/mi-hogar/auth-context'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, useRef } from 'react'
import { Lock, Sword } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { GuestExpensesAccess } from '@/components/apps/mi-hogar/expenses/guest-access'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AuthGuardSkeleton } from '@/components/ui/skeleton-loaders'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { FAMILY_APP_REGISTRY } from '@/lib/family/app-registry'

type FamilyPerm = { slug: string; label: string };

function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading, isPremium } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [hasPartners, setHasPartners] = useState(false)
    const [hasTaskInvite, setHasTaskInvite] = useState(false)
    const [familyApps, setFamilyApps] = useState<FamilyPerm[]>([])
    const [isFamilyMember, setIsFamilyMember] = useState(false)
    const [accessChecked, setAccessChecked] = useState(false)
    const hasCheckedOnce = useRef(false)

    // Background access check — NEVER blocks the UI
    useEffect(() => {
        if (loading || !user || hasCheckedOnce.current) return

        const checkAccess = async () => {
            try {
                const [partnersResult, tasksResult, familyResult] = await Promise.allSettled([
                    supabase
                        .from('expense_partners')
                        .select('*', { count: 'exact', head: true })
                        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`),
                    supabase
                        .from('task_list_members')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id),
                    supabase
                        .from('family_members')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('status', 'active')
                        .maybeSingle()
                ])

                if (partnersResult.status === 'fulfilled') {
                    setHasPartners((partnersResult.value.count || 0) > 0)
                }
                if (tasksResult.status === 'fulfilled') {
                    setHasTaskInvite((tasksResult.value.count || 0) > 0)
                }
                // Check active membership by user_id
                if (familyResult.status === 'fulfilled' && familyResult.value.data) {
                    setIsFamilyMember(true)
                    const memberId = familyResult.value.data.id
                    const { data: perms } = await supabase
                        .from('family_app_permissions')
                        .select('app_slug, level')
                        .eq('member_id', memberId)
                        .in('level', ['view', 'full'])
                    const allowed: FamilyPerm[] = (perms ?? []).map(p => {
                        const entry = FAMILY_APP_REGISTRY.find(a => a.slug === p.app_slug)
                        return { slug: p.app_slug, label: entry?.label ?? p.app_slug }
                    })
                    setFamilyApps(allowed)
                } else if (user.email) {
                    // Check pending invite by email (user_id is null until accepted)
                    const { data: pendingInvite } = await supabase
                        .from('family_members')
                        .select('id')
                        .eq('invited_email', user.email)
                        .eq('status', 'pending')
                        .maybeSingle()
                    if (pendingInvite) {
                        setIsFamilyMember(true)
                        // Auto-accept: link user to their pending invite
                        try {
                            const session = await supabase.auth.getSession()
                            await fetch('/api/family/auto-accept', {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${session.data.session?.access_token}` },
                            })
                        } catch {}
                    }
                }
            } catch (error) {
                console.error("Access check error:", error)
            } finally {
                hasCheckedOnce.current = true
                setAccessChecked(true)
            }
        }

        // Run with a timeout safety net
        const timer = setTimeout(() => {
            hasCheckedOnce.current = true
            setAccessChecked(true)
        }, 3000)

        checkAccess().finally(() => clearTimeout(timer))

        return () => clearTimeout(timer)
    }, [user?.id, loading])

    // Redirect unauthenticated users
    useEffect(() => {
        if (loading) return

        const isPublicAuthPage = pathname === '/apps/mi-hogar/login'

        if (!user && !isPublicAuthPage) {
            if (pathname?.startsWith('/apps/mi-hogar/expenses')) {
                return // Allow guest expenses access
            }
            const query = searchParams?.toString()
            const fullPath = query ? `${pathname}?${query}` : pathname
            const redirect = fullPath && fullPath !== '/apps/mi-hogar'
                ? `?redirect=${encodeURIComponent(fullPath!)}`
                : ''
            router.push(`/apps/mi-hogar/login${redirect}`)
        }
    }, [user, loading, pathname, searchParams, router])

    // ONLY block on initial auth loading — NEVER on access checks
    if (loading) {
        return <AuthGuardSkeleton />
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
        return <ErrorBoundary>{children}</ErrorBoundary>;
    }

    // While the background access check is still running, show children
    // (prevents flash of "Access Restricted" before we know the user's status)
    if (!accessChecked) {
        return <ErrorBoundary>{children}</ErrorBoundary>;
    }

    // Guests (Non-Premium) — only enforced AFTER accessChecked=true
    const isExpensesPage = pathname?.startsWith('/apps/mi-hogar/expenses');
    const isTasksPage = pathname?.startsWith('/apps/mi-hogar/tasks');
    const isFamiliaPage = pathname?.startsWith('/apps/mi-hogar/familia');

    // 1. Family members — allow access to familia page + apps with permissions
    if (isFamilyMember) {
        if (isFamiliaPage) {
            return <ErrorBoundary>{children}</ErrorBoundary>;
        }
        const segment = pathname?.replace('/apps/mi-hogar/', '').split('/')[0];
        const currentSlug = segment ? `mi-hogar.${segment}` : null;
        if (currentSlug && familyApps.some(a => a.slug === currentSlug)) {
            return <ErrorBoundary>{children}</ErrorBoundary>;
        }
    }

    // 2. Accessing Expenses
    if (isExpensesPage) {
        if (hasPartners) {
            return <>{children}</>; // Allow if invited
        } else {
            return <GuestExpensesAccess onSuccess={() => window.location.reload()} />; // Show Gatekeeper
        }
    }

    // 3. Accessing Tasks
    if (isTasksPage) {
        if (hasTaskInvite) {
            return <>{children}</>; // Allow if invited/member
        }
    }

    // 4. Trying to access restricted pages — show available options
    if (pathname !== '/apps/mi-hogar/login') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 pb-nav text-center">
                <Lock className="w-12 h-12 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold mb-2">Acceso Restringido</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                    {isFamilyMember
                        ? 'No tienes permiso para esta sección. Accede a las apps que tu familia te ha asignado.'
                        : 'No tienes plan Premium. Solo puedes acceder a las secciones donde has sido invitado.'}
                </p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    {isFamilyMember && familyApps.length > 0 && familyApps.map(app => {
                        const segment = app.slug.replace('mi-hogar.', '');
                        return (
                            <Button key={app.slug} variant="outline" onClick={() => window.location.href = `/apps/mi-hogar/${segment}`}>
                                Ir a {app.label}
                            </Button>
                        );
                    })}
                    {isFamilyMember && (
                        <Button variant="outline" onClick={() => window.location.href = '/apps/mi-hogar/familia'}>
                            Mi Familia
                        </Button>
                    )}
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

    return <ErrorBoundary>{children}</ErrorBoundary>
}

export default function MiHogarLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <Suspense>
            <AuthGuard>{children}</AuthGuard>
        </Suspense>
    )
}
