'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ensureCompatibleBrowserStorage } from '@/lib/browser-storage-version'

type AuthContextType = {
    session: Session | null
    user: User | null
    loading: boolean
    isPremium: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [isPremium, setIsPremium] = useState(false)
    const router = useRouter()

    const checkPremiumStatus = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('is_premium, subscription_tier')
                .eq('id', userId)
                .single()
            if (data && !error) {
                setIsPremium(data.is_premium || data.subscription_tier === 'premium')
            }
        } catch (error) {
            console.error('Error fetching premium status:', error)
        }
    }

    useEffect(() => {
        ensureCompatibleBrowserStorage()

        // ✅ FIX 1: Dejar que Supabase gestione todo via onAuthStateChange
        // No llamar a getValidatedSession() manualmente — Supabase ya emite
        // INITIAL_SESSION al montar, que es más fiable que leer caché manual.
        const safetyTimer = setTimeout(() => setLoading(false), 5000)

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                console.log('[AuthProvider] onAuthStateChange:', event, 'session=', !!newSession)

                // ✅ FIX 2: Manejar INITIAL_SESSION explícitamente
                if (event === 'INITIAL_SESSION') {
                    if (newSession) {
                        // Validar que el token del servidor sigue siendo válido
                        const { error } = await supabase.auth.getUser()
                        if (error) {
                            console.warn('[AuthProvider] INITIAL_SESSION inválida, cerrando sesión')
                            await supabase.auth.signOut({ scope: 'local' })
                            setSession(null)
                            setUser(null)
                            setIsPremium(false)
                        } else {
                            setSession(newSession)
                            setUser(newSession.user)
                            await checkPremiumStatus(newSession.user.id)
                        }
                    } else {
                        setSession(null)
                        setUser(null)
                    }
                    clearTimeout(safetyTimer)
                    setLoading(false)
                    return
                }

                if (event === 'SIGNED_OUT') {
                    setSession(null)
                    setUser(null)
                    setIsPremium(false)
                    setLoading(false)
                    return
                }

                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    setSession(newSession)
                    setUser(newSession?.user ?? null)
                    if (newSession?.user) {
                        await checkPremiumStatus(newSession.user.id)
                    }
                    setLoading(false)
                    return
                }
            }
        )

        // ✅ FIX 3: Al volver visible, pedir refresco activo en vez de solo startAutoRefresh
        const handleVisibility = async () => {
            if (document.visibilityState === 'visible') {
                // Forzar refresco real del token al volver
                const { data, error } = await supabase.auth.getSession()
                if (error || !data.session) {
                    await supabase.auth.signOut({ scope: 'local' })
                    setSession(null)
                    setUser(null)
                    setIsPremium(false)
                    router.push('/apps/mi-hogar/login')
                }
                supabase.auth.startAutoRefresh()
            } else {
                // ✅ NO parar el autorefresh al ocultar — dejarlo correr
                // stopAutoRefresh() causaba que el token muriera al cerrar
            }
        }

        document.addEventListener('visibilitychange', handleVisibility)

        return () => {
            subscription.unsubscribe()
            clearTimeout(safetyTimer)
            document.removeEventListener('visibilitychange', handleVisibility)
        }
    }, [])

    const signOut = async () => {
        await supabase.auth.signOut()
        router.push('/apps/mi-hogar/login')
    }

    return (
        <AuthContext.Provider value={{ session, user, loading, isPremium, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
