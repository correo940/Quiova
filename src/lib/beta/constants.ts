// Configuración central del programa Beta.

export const BETA_COOKIE = 'beta_token';

// Email del administrador autorizado para el panel beta.
export const SUPER_ADMIN_EMAIL =
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'todojuntomirar@gmail.com';

// URL pública del sitio (para enlaces de referido y dashboard en emails).
export function siteUrl(): string {
    return (
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXTAUTH_URL ||
        'https://quioba.com'
    ).replace(/\/$/, '');
}

export type BetaStatus =
    | 'pendiente'
    | 'validando'
    | 'aprobado'
    | 'rechazado'
    | 'suspendido';

export const STATUS_LABELS: Record<BetaStatus, string> = {
    pendiente: 'Pendiente',
    validando: 'En validación',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
    suspendido: 'Suspendido',
};

export const STATUS_COLORS: Record<BetaStatus, string> = {
    pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
    validando: 'bg-blue-100 text-blue-700 border-blue-200',
    aprobado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rechazado: 'bg-red-100 text-red-700 border-red-200',
    suspendido: 'bg-slate-200 text-slate-600 border-slate-300',
};

export const STATUS_DOT: Record<BetaStatus, string> = {
    pendiente: '🟡',
    validando: '🔵',
    aprobado: '🟢',
    rechazado: '🔴',
    suspendido: '⚫',
};

// Etiquetas legibles para el historial de puntos.
// Tipos e iconos de notificación — accesibles desde cliente y servidor.
export type NotificationType =
    | 'referral' | 'points' | 'achievement' | 'mission'
    | 'rank' | 'approved' | 'rejected' | 'suspended' | 'code' | 'info';

export const NOTIF_ICONS: Record<NotificationType, string> = {
    referral:    '👥',
    points:      '⭐',
    achievement: '🏅',
    mission:     '🎯',
    rank:        '🏆',
    approved:    '🚀',
    rejected:    '❌',
    suspended:   '⏸️',
    code:        '🔑',
    info:        'ℹ️',
};

export function historyReasonLabel(reason: string): string {
    const map: Record<string, string> = {
        'mission:register':          'Registro Beta',
        'mission:follow_tiktok':     'Seguir en TikTok',
        'mission:follow_instagram':  'Seguir en Instagram',
        'mission:follow_youtube':    'Suscribirse en YouTube',
        'mission:invite_friend':     'Invitar a un amigo',
        'mission:secret_code':       'Código secreto (misión)',
        'mission:report_bug':        'Reportar bug',
        'mission:share_content':     'Compartir contenido',
        'secret_code':               'Código secreto canjeado',
        'referral':                  'Referido validado',
        'admin_adjust':              'Ajuste manual del equipo',
    };
    return map[reason] ?? reason.replace('mission:', '').replace(/_/g, ' ');
}
