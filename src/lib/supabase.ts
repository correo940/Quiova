import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

// Custom storage adapter that uses localStorage on web and Preferences on native
const customStorage = {
    getItem: async (key: string) => {
        if (typeof window === 'undefined') return null;
        if (Capacitor.isNativePlatform()) {
            const { Preferences } = await import('@capacitor/preferences');
            const { value } = await Preferences.get({ key });
            return value;
        }
        return localStorage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
        if (typeof window === 'undefined') return;
        if (Capacitor.isNativePlatform()) {
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.set({ key, value });
            return;
        }
        localStorage.setItem(key, value);
    },
    removeItem: async (key: string) => {
        if (typeof window === 'undefined') return;
        if (Capacitor.isNativePlatform()) {
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.remove({ key });
            return;
        }
        localStorage.removeItem(key);
    },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: customStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
})
