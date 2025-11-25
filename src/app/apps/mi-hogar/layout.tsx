'use client'

import { AuthProvider, useAuth } from '@/components/apps/mi-hogar/auth-context'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (!loading && !user && pathname !== '/apps/mi-hogar/login') {
            router.push('/apps/mi-hogar/login')
        }
    }, [user, loading, pathname, router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (!user && pathname !== '/apps/mi-hogar/login') {
        return null
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
