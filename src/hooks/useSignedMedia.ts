'use client';

import { useEffect, useState } from 'react';
import { getSignedMediaUrl } from '@/lib/storage-url';

/**
 * Convierte el valor guardado en base de datos (ruta o URL publica antigua)
 * en una URL firmada temporal. Devuelve undefined mientras se resuelve.
 */
export function useSignedMedia(value?: string | null): string | undefined {
    const [url, setUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        let alive = true;

        if (!value) {
            setUrl(undefined);
            return;
        }

        getSignedMediaUrl(value).then((resolved) => {
            if (alive) setUrl(resolved);
        });

        return () => {
            alive = false;
        };
    }, [value]);

    return url;
}
