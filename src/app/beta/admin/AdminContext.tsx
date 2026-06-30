'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface AdminCtx {
    token: string | null;
    email: string | null;
    ready: boolean;
    apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

const ctx = createContext<AdminCtx>({
    token: null, email: null, ready: false,
    apiFetch: async () => { throw new Error('AdminContext not initialized'); },
});

export function AdminProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setToken(data.session?.access_token ?? null);
            setEmail(data.session?.user?.email ?? null);
            setReady(true);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
            setToken(s?.access_token ?? null);
            setEmail(s?.user?.email ?? null);
        });
        return () => sub.subscription.unsubscribe();
    }, []);

    const apiFetch = (path: string, options: RequestInit = {}) => {
        return fetch(path, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...(options.headers as Record<string, string> ?? {}),
            },
        });
    };

    return <ctx.Provider value={{ token, email, ready, apiFetch }}>{children}</ctx.Provider>;
}

export function useAdmin() { return useContext(ctx); }
