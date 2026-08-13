import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

const customStorage = {
    getItem: async (key: string) => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(key, value);
    },
    removeItem: async (key: string) => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(key);
    },
}

let _supabase: SupabaseClient | null = null;

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        if (!_supabase) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error('Missing Supabase environment variables');
            }
            _supabase = createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                    storage: customStorage,
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: !Capacitor.isNativePlatform()
                }
            });
        }
        return (_supabase as any)[prop];
    },
});
