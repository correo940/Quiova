import React from 'react';

/**
 * Iconos 3D de las apps.
 *
 * Los SVG viven en `public/icons/apps/<key>.svg` y salen del set Fluent Emoji
 * de Microsoft (licencia MIT). Se sirven como imagen, no como componente, para
 * que el navegador los cachee y no engorden el bundle: son 264 KB en total y
 * unos 32 KB por la red una vez comprimidos.
 *
 * Al pintarse con <img> el SVG queda aislado: no ejecuta scripts ni hereda
 * estilos de la pagina.
 */

/** Fondo pastel de la pastilla. Cada tono agrupa apps de la misma familia. */
export const PASTEL = {
    green: '#dcfce7',
    emerald: '#d1fae5',
    amber: '#fef3c7',
    orange: '#fff7ed',
    sky: '#e0f2fe',
    violet: '#ede9fe',
    pink: '#fce7f3',
    slate: '#f1f5f9',
} as const;

export type PastelTone = keyof typeof PASTEL;

export function AppIcon({
    name,
    tone,
    label,
    size = 32,
    iconSize = 21,
    className = '',
}: {
    /** Clave de la app: se corresponde con public/icons/apps/<name>.svg */
    name: string;
    tone: PastelTone;
    /** Texto alternativo. Vacio si el nombre de la app ya se lee al lado. */
    label?: string;
    size?: number;
    iconSize?: number;
    className?: string;
}) {
    return (
        <div
            className={className}
            style={{
                width: size,
                height: size,
                borderRadius: Math.round(size * 0.3),
                background: PASTEL[tone],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={`/icons/apps/${name}.svg`}
                alt={label ?? ''}
                aria-hidden={label ? undefined : true}
                width={iconSize}
                height={iconSize}
                loading="lazy"
                draggable={false}
                style={{ width: iconSize, height: iconSize, display: 'block' }}
            />
        </div>
    );
}
