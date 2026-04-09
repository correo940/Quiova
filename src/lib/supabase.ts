import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

// The Android WebView persists localStorage, and using Capacitor Preferences
// here can block auth flows in the APK. Keep storage simple and browser-like.
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

// A custom fetch wrapper that enforces a strict 8-second timeout.
// This prevents the notorious mobile browser issue where a TCP connection
// goes zombie during tab suspension, causing Supabase auth mutexes and 
// PostgREST queries to hang indefinitely, resulting in eternal loading spinners.
const customFetch = (url: RequestInfo | URL, options?: RequestInit) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);
    
    return fetch(url, { ...options, signal: controller.signal })
        .catch(err => {
            console.warn('Supabase Network Error or Timeout:', err);
            throw err;
        })
        .finally(() => clearTimeout(id));
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: customStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: !Capacitor.isNativePlatform()
    },
    global: {
        fetch: (...args) => customFetch(...args)
    }
})
