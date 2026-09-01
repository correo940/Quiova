import React from 'react';

/**
 * QUIOBA Icon System — estilo Apple, trazo 1.75, lienzo 24x24.
 *
 * Los trece primeros iconos estan copiados tal cual del set que ya usaba el
 * dashboard Modern (DashboardNext), para que ambos dibujen exactamente lo
 * mismo; el resto se han anadido siguiendo el mismo trazo y proporciones.
 */
export type QuiobaIconName = keyof typeof QI;

export const QI = {
    // ── Set original del dashboard Modern ──────────────────────────────────
    shopping: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 3h11L20 8H4L6.5 3z" /><rect x="4" y="8" width="16" height="13" rx="1.5" /><path d="M9.5 12.5a2.5 2.5 0 005 0" /></svg>,
    wallet: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="15" rx="2.5" /><path d="M2 11h20" /><path d="M16 15h2.5" /><path d="M6 6V5a2 2 0 014 0v1" /></svg>,
    car: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17H2.5v-4l3-5.5h13l3 5.5V17H20" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /><path d="M9 17h6" /><path d="M4.5 11.5h15" /></svg>,
    document: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8.5L14 2z" /><path d="M14 2v7h7" /><path d="M9 13l2 2 4-4" /></svg>,
    health: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="8" height="8" rx="2.5" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>,
    shield: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L4.5 7v4.5c0 4.25 3.25 8 7.5 9 4.25-1 7.5-4.75 7.5-9V7L12 3z" /><path d="M9.5 12l2 2 3.5-3.5" /></svg>,
    sparkle: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" /></svg>,
    creditcard: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20" /><path d="M6 15h4.5" /><path d="M14.5 15h3" /></svg>,
    check: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.5" /><path d="M8.5 12l3 3 4.5-5" /></svg>,
    bag: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l3 5H3L6 3z" /><path d="M3 8v13a1 1 0 001 1h16a1 1 0 001-1V8" /><path d="M9.5 12.5a2.5 2.5 0 005 0" /></svg>,
    receipt: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V3l2 1.5L8 3l2 1.5L12 3l2 1.5L16 3l2 1.5L20 3v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>,
    wallet2: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="15" rx="2.5" /><path d="M2 11h20" /><path d="M16 15h2.5" /></svg>,
    task: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>,

    // ── Anadidos para cubrir el resto de la parrilla ────────────────────────
    // `health` (el del set original) se dibuja en un tercio del lienzo y al
    // lado del resto se ve diminuto, asi que el botiquin usa este.
    firstaid: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="6.5" width="19" height="13" rx="2.5" /><path d="M8.5 6.5V5a1.5 1.5 0 011.5-1.5h4A1.5 1.5 0 0115.5 5v1.5" /><path d="M12 10.5v5M9.5 13h5" /></svg>,
    leaf: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20c0-8 5.5-14.5 16.5-15C20.5 16 14 20.5 7 20.5c-1.6 0-3-.2-3-.5z" /><path d="M8.5 16.5c1.5-3.5 4-6.5 7.5-8.5" /></svg>,
    message: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 11.5a8.5 8.5 0 01-12.2 7.7L3.5 20.5l1.3-4.8A8.5 8.5 0 1120.5 11.5z" /><path d="M8.5 11.5h7M8.5 14.5h4.5" /></svg>,
    utensils: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2.5v6a3 3 0 003 3 3 3 0 003-3v-6" /><path d="M7 11.5V21.5" /><path d="M20 2.5c-1.8 1.2-3 3.4-3 6 0 1.9 1 3 2.2 3H20" /><path d="M20 2.5v19" /></svg>,
    wrench: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14.9 6.4a1 1 0 000 1.4l1.5 1.5a1 1 0 001.4 0l3.6-3.6a6 6 0 01-7.9 7.9l-6.6 6.6a2.1 2.1 0 01-3-3l6.6-6.6a6 6 0 017.9-7.9L14.9 6.4z" /></svg>,
    key: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="4" /><path d="M10.4 12.6L20.5 2.5" /><path d="M17.5 5.5l2.5 2.5" /><path d="M14.5 8.5l2.5 2.5" /></svg>,
    calendar: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18" /><path d="M8 3v4M16 3v4" /><path d="M7.5 14h3M7.5 17.5h7" /></svg>,
    newspaper: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20H5a2 2 0 01-2-2V5a1 1 0 011-1h13a1 1 0 011 1v13a2 2 0 002 2 2 2 0 002-2V9h-3" /><path d="M7 8.5h8M7 12h8M7 15.5h5" /></svg>,
    graduation: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5L2 8.5l10 5 10-5-10-5z" /><path d="M6 11v4.5c0 1.7 2.7 3 6 3s6-1.3 6-3V11" /><path d="M22 8.5v5" /></svg>,
    users: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" /><path d="M16.5 5.2a3.5 3.5 0 010 6.6" /><path d="M18 14.2c2.1.9 3.5 2.9 3.5 5.3" /></svg>,
    plane: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5c1.5-1.5 2-3.5 1.5-4.5-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-.5 1 3 2 2 3 1-.5V17l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z" /></svg>,
    umbrella: (c: string, s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12.5a9.5 9.5 0 0119 0z" /><path d="M12 12.5v6.5a2.5 2.5 0 005 0" /><path d="M12 2v1.5" /></svg>,
};

/**
 * Paleta pastel: cada tono es un fondo suave con el icono en su version
 * saturada. Los valores verde/ambar/violeta/cielo son los que ya usaba el
 * dashboard Modern, para que las dos pantallas se vean de la misma familia.
 */
export const PASTEL = {
    green: { bg: '#dcfce7', fg: '#16a34a' },
    emerald: { bg: '#d1fae5', fg: '#059669' },
    amber: { bg: '#fef3c7', fg: '#d97706' },
    orange: { bg: '#fff7ed', fg: '#ea580c' },
    sky: { bg: '#e0f2fe', fg: '#0284c7' },
    violet: { bg: '#ede9fe', fg: '#7c3aed' },
    pink: { bg: '#fce7f3', fg: '#db2777' },
    slate: { bg: '#f1f5f9', fg: '#475569' },
} as const;

export type PastelTone = keyof typeof PASTEL;

/** Pastilla redondeada con fondo pastel y el icono en el color a juego. */
export function IconBubble({
    name,
    tone,
    size = 30,
    iconSize = 16,
    className = '',
}: {
    name: QuiobaIconName;
    tone: PastelTone;
    size?: number;
    iconSize?: number;
    className?: string;
}) {
    const { bg, fg } = PASTEL[tone];
    return (
        <div
            className={className}
            style={{
                width: size,
                height: size,
                borderRadius: Math.round(size * 0.32),
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}
        >
            {QI[name]?.(fg, iconSize)}
        </div>
    );
}
