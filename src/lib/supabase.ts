import { createClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

// Custom storage adapter for Capacitor Preferences
const capacitorStorage = {
    getItem: async (key: string) => {
        const { value } = await Preferences.get({ key })
        return value
    },
    setItem: async (key: string, value: string) => {
        await Preferences.set({ key, value })
    },
    removeItem: async (key: string) => {
        await Preferences.remove({ key })
    },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: capacitorStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
})
