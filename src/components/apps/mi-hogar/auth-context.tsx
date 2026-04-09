'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getValidatedSession } from '@/lib/supabase-session'
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
        // Safety timeout — never stay loading more than 5 seconds
        const safetyTimer = setTimeout(() => {
            setLoading(false)
        }, 5000)

        // Initial session check
        const initAuth = async () => {
            console.log('[AuthProvider] initAuth: starting...')
            ensureCompatibleBrowserStorage()
            try {
                console.log('[AuthProvider] initAuth: calling getValidatedSession...')
                const { session, user } = await getValidatedSession()
                console.log('[AuthProvider] initAuth: session=', !!session, 'user=', !!user)
                setSession(session)
                setUser(user ?? null)

                if (user) {
                    console.log('[AuthProvider] initAuth: checking premium for', user.id)
                    await checkPremiumStatus(user.id)
                }
            } catch (error) {
                console.error('[AuthProvider] initAuth: ERROR', error)
            } finally {
                console.log('[AuthProvider] initAuth: setting loading=false')
                setLoading(false)
                clearTimeout(safetyTimer)
            }
        }

        initAuth()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('[AuthProvider] onAuthStateChange:', _event, 'session=', !!session)
            setSession(session)
            setUser(session?.user ?? null)

            if (session?.user) {
                await checkPremiumStatus(session.user.id)
            } else {
                setIsPremium(false)
            }

            setLoading(false)
        })

        // ─── PAGE VISIBILITY FIX ────────────────────────────────────────────
        // When the tab returns from background the JWT may have expired.
        // Use the SDK's own start/stop auto-refresh to silently renew it
        // without forcing new state objects that would remount children.
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                supabase.auth.startAutoRefresh()
            } else {
                supabase.auth.stopAutoRefresh()
            }
        }
        document.addEventListener('visibilitychange', handleVisibility)
        // ────────────────────────────────────────────────────────────────────

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
