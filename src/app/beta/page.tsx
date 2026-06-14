import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BETA_COOKIE } from '@/lib/beta/constants';
import { getBetaUserByToken } from '@/lib/beta/server';
import BetaLandingSuspense from './_landing';

// Server component: redirect inmediato si existe sesión beta válida.
// El cliente (_landing.tsx) también comprueba y muestra la tarjeta resumen
// en caso de navegación SPA antes de que el redirect del servidor haya procesado.
export const dynamic = 'force-dynamic';

export default async function BetaPage() {
    const token = cookies().get(BETA_COOKIE)?.value;
    if (token) {
        const user = await getBetaUserByToken(token);
        if (user) redirect('/beta/dashboard');
    }
    return <BetaLandingSuspense />;
}
