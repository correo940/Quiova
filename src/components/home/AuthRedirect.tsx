'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LogoLoader from '@/components/ui/logo-loader';

// Supabase guarda la sesión en localStorage bajo `sb-<project-ref>-auth-token`.
// Leerla es síncrono, así que sabemos al instante si el usuario tiene sesión
// sin esperar a la validación de red (que puede tardar hasta 5 s).
function hasStoredSession(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && /^sb-.+-auth-token$/.test(key) && localStorage.getItem(key)) {
                return true;
            }
        }
    } catch {
        // localStorage puede no estar disponible (modo privado, WebView restringido)
    }
    return false;
}

// Evita un bucle si la sesión guardada resulta ser inválida: /desktop devuelve
// al usuario a / y sin esta marca volveríamos a redirigir indefinidamente.
const OPTIMISTIC_FLAG = 'quioba:optimistic-desktop-redirect';

export default function AuthRedirect() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [redirecting, setRedirecting] = useState(false);

    // Redirección optimista: si hay sesión guardada salimos de la landing de
    // inmediato, en vez de mostrar los artículos mientras se resuelve la auth.
    useEffect(() => {
        if (!hasStoredSession()) return;
        try {
            if (sessionStorage.getItem(OPTIMISTIC_FLAG)) return;
            sessionStorage.setItem(OPTIMISTIC_FLAG, '1');
        } catch {
            // Sin sessionStorage seguimos adelante: la marca es solo un seguro.
        }
        setRedirecting(true);
        router.replace('/desktop');
    }, [router]);

    // Redirección definitiva, una vez confirmada la sesión.
    useEffect(() => {
        if (!loading && user) {
            setRedirecting(true);
            router.replace('/desktop');
        }
    }, [user, loading, router]);

    if (!redirecting) return null;

    // Tapa la landing para que no se vean los artículos durante el salto.
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-white">
            <LogoLoader size="lg" />
            <p className="text-xl font-medium text-slate-600 animate-pulse">Cargando tu panel...</p>
        </div>
    );
}
