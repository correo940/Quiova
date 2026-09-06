import { getApiUrl } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

/**
 * fetch hacia nuestras propias rutas /api que exigen sesion.
 * Resuelve la URL igual que getApiUrl y adjunta el token de Supabase.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const { data: { session } } = await supabase.auth.getSession();

    const headers = new Headers(init.headers);
    if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    const url = path.startsWith('http') ? path : getApiUrl(path);
    return fetch(url, { ...init, headers });
}
