'use client'

import { AuthProvider } from '@/components/apps/mi-hogar/auth-context'

export default function MiViajeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthProvider>
            {children}
        </AuthProvider>
    )
}
