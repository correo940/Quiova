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
            ensureCompatibleBrowserStorage()
            try {
                const { session, user } = await getValidatedSession()
                setSession(session)
                setUser(user ?? null)

                if (user) {
                    await checkPremiumStatus(user.id)
                }
            } catch (error) {
                console.error('AuthProvider: Error initializing auth', error)
            } finally {
                setLoading(false)
                clearTimeout(safetyTimer)
            }
        }

        initAuth()

        // Auth state change listener
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
        // When the tab/app returns from background after idle time, the JWT
        // may have expired silently. Re-validate so components don't freeze.
        const handleVisibilityChange = async () => {
            if (document.visibilityState !== 'visible') return
            try {
                const { data: { session: freshSession } } = await supabase.auth.getSession()
                if (!freshSession) {
                    // Session gone — update state so UI reflects signed-out
                    setSession(null)
                    setUser(null)
                    setIsPremium(false)
                } else {
                    // Refresh session object in state
                    setSession(freshSession)
                    setUser(freshSession.user ?? null)
                }
            } catch {
                // Silently ignore network errors on visibility change
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        // ────────────────────────────────────────────────────────────────────

        return () => {
            subscription.unsubscribe()
            clearTimeout(safetyTimer)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
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
