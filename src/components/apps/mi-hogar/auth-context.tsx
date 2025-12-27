'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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

    useEffect(() => {
        // Initial session check
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setSession(session)
            setUser(session?.user ?? null)

            if (session?.user) {
                await checkPremiumStatus(session.user.id)
            }

            setLoading(false)
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

        return () => subscription.unsubscribe()
    }, [])

    const checkPremiumStatus = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('is_premium')
                .eq('id', userId)
                .single()

            if (data && !error) {
                setIsPremium(data.is_premium || false)
            }
        } catch (error) {
            console.error('Error fetching premium status:', error)
        }
    }

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
