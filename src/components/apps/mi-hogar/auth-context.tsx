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
                const { session: localSession, user: localUser } = await getValidatedSession()
                console.log('[AuthProvider] initAuth: session=', !!localSession, 'user=', !!localUser)

                if (localSession) {
                    // Validate the cached session is still usable by probing
                    // the token refresh. If the refresh token is dead the SDK
                    // throws or returns null — in that case clean up.
                    try {
                        const { data, error } = await Promise.race([
                            supabase.auth.getUser(),
                            new Promise<{ data: null; error: Error }>((resolve) =>
                                setTimeout(() => resolve({ data: null, error: new Error('Auth validation timeout') }), 4000)
                            ),
                        ])
                        if (error || !data?.user) {
                            console.warn('[AuthProvider] initAuth: cached session invalid, signing out', error?.message)
                            await supabase.auth.signOut({ scope: 'local' })
                            setSession(null)
                            setUser(null)
                            setIsPremium(false)
                            return
                        }
                    } catch {
                        console.warn('[AuthProvider] initAuth: session validation failed, signing out')
                        await supabase.auth.signOut({ scope: 'local' })
                        setSession(null)
                        setUser(null)
                        setIsPremium(false)
                        return
                    }

                    setSession(localSession)
                    setUser(localUser ?? null)
                    if (localUser) {
                        console.log('[AuthProvider] initAuth: checking premium for', localUser.id)
                        await checkPremiumStatus(localUser.id)
                    }
                } else {
                    setSession(null)
                    setUser(null)
                }
            } catch (error) {
                console.error('[AuthProvider] initAuth: ERROR', error)
                // If anything blows up, ensure we clear corrupted state
                try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* ignore */ }
                setSession(null)
                setUser(null)
                setIsPremium(false)
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

            // If the SDK fires SIGNED_OUT or TOKEN_REFRESHED with no session,
            // the refresh token was rejected — clean up immediately.
            if (_event === 'SIGNED_OUT' || (_event === 'TOKEN_REFRESHED' && !session)) {
                setSession(null)
                setUser(null)
                setIsPremium(false)
                setLoading(false)
                return
            }

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
            try {
                if (document.visibilityState === 'visible') {
                    supabase.auth.startAutoRefresh()
                } else {
                    supabase.auth.stopAutoRefresh()
                }
            } catch (e) {
                console.warn('[AuthProvider] visibility handler error:', e)
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
