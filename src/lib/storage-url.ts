import { supabase } from '@/lib/supabase';

/**
 * Los buckets pasaron a privados. En base de datos hay guardadas tanto rutas
 * ("bucket/carpeta/fichero") como URLs publicas antiguas
 * (".../storage/v1/object/public/bucket/carpeta/fichero"). Esto normaliza ambas
 * y devuelve una URL firmada temporal.
 */
export function parseStorageValue(value?: string | null): { bucket: string; path: string } | null {
    if (!value) return null;

    const marker = '/storage/v1/object/public/';
    const idx = value.indexOf(marker);

    let rest: string;
    if (idx !== -1) {
        rest = value.slice(idx + marker.length);
    } else if (value.startsWith('http')) {
        return null; // URL externa (avatar de Google, etc.): se usa tal cual
    } else {
        rest = value;
    }

    const clean = rest.split('?')[0].replace(/^\/+/, '');
    const slash = clean.indexOf('/');
    if (slash <= 0) return null;

    return { bucket: clean.slice(0, slash), path: clean.slice(slash + 1) };
}

const cache = new Map<string, { url: string; expires: number }>();
const TTL_SECONDS = 3600;

export async function getSignedMediaUrl(value?: string | null): Promise<string | undefined> {
    if (!value) return undefined;

    const parsed = parseStorageValue(value);
    if (!parsed) return value; // externa o no reconocida: se deja como esta

    const key = `${parsed.bucket}/${parsed.path}`;
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.url;

    const { data, error } = await supabase.storage
        .from(parsed.bucket)
        .createSignedUrl(parsed.path, TTL_SECONDS);

    if (error || !data?.signedUrl) return undefined;

    cache.set(key, { url: data.signedUrl, expires: Date.now() + (TTL_SECONDS - 300) * 1000 });
    return data.signedUrl;
}
