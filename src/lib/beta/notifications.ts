// server-only: todas las funciones usan supabaseAdmin (service_role).
// Los tipos e iconos están en constants.ts para que el cliente también los use.
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { NotificationType } from './constants';

export type { NotificationType };

export interface BetaNotification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Crear notificación (fire-and-forget safe — no lanza excepciones al caller)
// ---------------------------------------------------------------------------
export async function createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata: Record<string, unknown> = {}
): Promise<void> {
    await supabaseAdmin.from('beta_notifications').insert({
        user_id: userId, type, title, message, metadata,
    });
}

// ---------------------------------------------------------------------------
// Helpers tipados para eventos concretos
// ---------------------------------------------------------------------------
export function notifyReferral(referrerId: string, refereeName: string) {
    return createNotification(
        referrerId, 'referral',
        '👥 Nuevo referido registrado',
        `${refereeName} se ha unido a la Beta con tu enlace. ¡+10 puntos para ti!`,
        { refereeName }
    );
}

export function notifyAchievement(userId: string, icon: string, title: string, description: string) {
    return createNotification(
        userId, 'achievement',
        `${icon} Logro desbloqueado: ${title}`,
        description,
        { achievementTitle: title }
    );
}

export function notifyCodeClaimed(userId: string, points: number, code: string) {
    return createNotification(
        userId, 'code',
        `🔑 Código canjeado (+${points} pts)`,
        `Has canjeado el código ${code} y ganado ${points} puntos.`,
        { code, points }
    );
}

export function notifyApproved(userId: string) {
    return createNotification(
        userId, 'approved',
        '🚀 ¡Has sido seleccionado para acceder a Quioba!',
        'El equipo de Quioba te ha dado acceso. Ya puedes comenzar a utilizar la plataforma.',
    );
}

export function notifyRejected(userId: string) {
    return createNotification(
        userId, 'rejected',
        '❌ Solicitud Beta no aprobada',
        'Por ahora no podemos darte acceso. Seguimos ampliando plazas — sigue participando.',
    );
}

export function notifySuspended(userId: string) {
    return createNotification(
        userId, 'suspended',
        '⏸️ Participación suspendida',
        'Tu participación en la Beta ha sido suspendida temporalmente. Contacta con el equipo si crees que es un error.',
    );
}

export function notifyRankTop50(userId: string) {
    return createNotification(
        userId, 'rank',
        '🏆 ¡Entraste en el Top 50!',
        'Estás entre los 50 mejores participantes de la Beta. Sigue completando misiones para mantenerte.',
    );
}

export function notifyRankTop10(userId: string) {
    return createNotification(
        userId, 'rank',
        '💎 ¡Entraste en el Top 10!',
        'Estás entre los 10 mejores. El equipo de Quioba te verá fácilmente durante la selección.',
    );
}
