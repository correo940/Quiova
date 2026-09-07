'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import LogoLoader from '@/components/ui/logo-loader';

type Estado =
    | { fase: 'entrando' }
    | { fase: 'sin-sesion' }
    | { fase: 'sin-codigo' }
    | { fase: 'error'; mensaje: string }
    | { fase: 'dentro' };

/**
 * Pantalla a la que llega quien recibe un enlace de invitacion a un grupo de
 * gastos. El codigo se canjea en el servidor (splitsmart_unirse), que es quien
 * comprueba que existe: aqui no se decide nada.
 */
export default function UnirseAGrupo() {
    const router = useRouter();
    const params = useSearchParams();
    const codigo = params?.get('c')?.trim() ?? '';

    const [estado, setEstado] = useState<Estado>({ fase: 'entrando' });

    useEffect(() => {
        let vivo = true;

        (async () => {
            if (!codigo) {
                if (vivo) setEstado({ fase: 'sin-codigo' });
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                // Se guarda para poder volver aqui despues de iniciar sesion.
                try {
                    sessionStorage.setItem('quioba_invitacion_gastos', codigo);
                } catch { /* modo privado: se pedira el enlace otra vez */ }
                if (vivo) setEstado({ fase: 'sin-sesion' });
                return;
            }

            const { error } = await supabase.rpc('splitsmart_unirse', { p_codigo: codigo });

            if (!vivo) return;

            if (error) {
                setEstado({ fase: 'error', mensaje: error.message });
                return;
            }

            setEstado({ fase: 'dentro' });
            setTimeout(() => router.replace('/apps/mi-hogar/expenses'), 1200);
        })();

        return () => { vivo = false; };
    }, [codigo, router]);

    return (
        <main style={{ minHeight: '70dvh', display: 'grid', placeItems: 'center', padding: '24px' }}>
            <div style={{ maxWidth: '30rem', textAlign: 'center' }}>
                {estado.fase === 'entrando' && (
                    <>
                        <LogoLoader size="lg" />
                        <p style={{ marginTop: '16px', color: '#475569' }}>Entrando en el grupo…</p>
                    </>
                )}

                {estado.fase === 'dentro' && (
                    <>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>¡Ya estás dentro! 🎉</h1>
                        <p style={{ marginTop: '8px', color: '#475569' }}>Te llevamos a los gastos del grupo…</p>
                    </>
                )}

                {estado.fase === 'sin-codigo' && (
                    <>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Falta el código</h1>
                        <p style={{ marginTop: '8px', color: '#475569' }}>
                            Este enlace está incompleto. Pide a quien te invitó que te lo mande otra vez.
                        </p>
                    </>
                )}

                {estado.fase === 'sin-sesion' && (
                    <>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Primero inicia sesión</h1>
                        <p style={{ marginTop: '8px', color: '#475569' }}>
                            Necesitas una cuenta de Quioba para entrar en el grupo. Es gratis.
                        </p>
                        <Link
                            // El login solo acepta ?redirect= y solo rutas de /apps/mi-hogar.
                            href={`/apps/mi-hogar/login?redirect=${encodeURIComponent(`/apps/mi-hogar/expenses/unirse?c=${codigo}`)}`}
                            className="btn primary"
                            style={{ display: 'inline-block', marginTop: '16px' }}
                        >
                            Iniciar sesión y entrar
                        </Link>
                    </>
                )}

                {estado.fase === 'error' && (
                    <>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>No hemos podido entrar</h1>
                        <p style={{ marginTop: '8px', color: '#475569' }}>{estado.mensaje}</p>
                        <Link
                            href="/apps/mi-hogar/expenses"
                            className="btn"
                            style={{ display: 'inline-block', marginTop: '16px' }}
                        >
                            Ir a mis gastos
                        </Link>
                    </>
                )}
            </div>
        </main>
    );
}
