'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { useAuth } from '@/components/apps/mi-hogar/auth-context'
import type { ReactNode } from 'react'
import type { PillarTheme } from './theme'

interface AuthGateProps {
  children: ReactNode
  theme: PillarTheme
}

export function AuthGate({ children, theme }: AuthGateProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="animate-spin rounded-full h-6 w-6 border-b-2"
          style={{ borderColor: theme.color }}
        />
      </div>
    )
  }

  if (!user) {
    return (
      <div
        className="rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-5"
        style={{ backgroundColor: theme.bg, border: `1.5px solid ${theme.border}` }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: theme.badge }}
        >
          <Lock size={22} style={{ color: theme.color }} />
        </div>
        <div className="space-y-1">
          <p className="font-black text-lg" style={{ color: '#0f172a' }}>
            Contenido exclusivo para miembros
          </p>
          <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
            Únete a QUIOBA para acceder a este análisis completo.
          </p>
        </div>
        <Link
          href="/apps/mi-hogar/login"
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: theme.color }}
        >
          Ser miembro
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
