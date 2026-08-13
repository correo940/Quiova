'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { NotificationManager } from '@/lib/notifications';

const DISMISS_KEY = 'quioba_push_prompt_dismissed';

function isIos(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
    );
}

// Ofrece activar Web Push (medicación, ITV, seguros…) en navegador/PWA.
// En iPhone, Safari solo permite suscribirse a push desde una PWA ya
// añadida a pantalla de inicio, así que ahí no mostramos nada hasta
// que el usuario la haya instalado.
export default function PushSubscriptionPrompt() {
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        if (checked) return;
        if (Capacitor.isNativePlatform()) return; // la app nativa usa notificaciones locales
        if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
        if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
        if (isIos() && !isStandalone()) return;
        if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
        if (localStorage.getItem(DISMISS_KEY)) return;

        setChecked(true);

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session?.user) return;

            navigator.serviceWorker
                .register('/sw.js')
                .then(async (registration) => {
                    await navigator.serviceWorker.ready;
                    const existing = await registration.pushManager.getSubscription();
                    if (existing) return;

                    toast('Activa los avisos de Quioba', {
                        description:
                            'Medicación, ITV, seguros y más — directamente en tu pantalla, aunque tengas la app cerrada.',
                        duration: Infinity,
                        action: {
                            label: 'Activar',
                            onClick: async () => {
                                const ok = await NotificationManager.subscribeWebPush(session.access_token);
                                toast[ok ? 'success' : 'error'](
                                    ok ? 'Notificaciones activadas' : 'No se pudieron activar las notificaciones'
                                );
                            },
                        },
                        onDismiss: () => localStorage.setItem(DISMISS_KEY, '1'),
                    });
                })
                .catch(() => {});
        });
    }, [checked]);

    return null;
}
