import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';

// ─── Event types ──────────────────────────────────────────────────────────────
export type BetaEventType =
    | 'USER_REGISTERED'
    | 'EMAIL_VERIFIED'
    | 'MISSION_COMPLETED'
    | 'MISSION_SUBMITTED'
    | 'MISSION_APPROVED'
    | 'MISSION_REJECTED'
    | 'BUG_SUBMITTED'
    | 'IDEA_SUBMITTED'
    | 'REFERRAL_REGISTERED'
    | 'REFERRAL_VALIDATED'
    | 'SECRET_CODE_REDEEMED'
    | 'POINTS_GRANTED'
    | 'POINTS_ADJUSTED'
    | 'ACHIEVEMENT_UNLOCKED'
    | 'USER_APPROVED'
    | 'USER_REJECTED'
    | 'USER_SUSPENDED'
    | 'USER_REINSTATED'
    | 'ADMIN_ACTION'
    | 'NOTIFICATION_SENT'
    | 'CONFIG_UPDATED'
    | 'MISSION_CREATED'
    | 'MISSION_UPDATED'
    | 'MISSION_DELETED'
    | 'CODE_CREATED'
    | 'CODE_DELETED';

export interface BetaEventMeta {
    [key: string]: unknown;
}

// Emite un evento al event store (beta_activity_log).
// Fire-and-forget: los errores nunca bloquean el flujo principal.
export function emitEvent(
    eventType: BetaEventType,
    userId: string | null,
    meta: BetaEventMeta = {},
    adminEmail?: string,
): void {
    supabaseAdmin
        .from('beta_activity_log')
        .insert({
            event_type: eventType,
            user_id: userId ?? null,
            admin_email: adminEmail ?? null,
            metadata: meta,
        })
        .then(({ error }) => {
            if (error) console.error('[beta/events] emitEvent error:', eventType, error.message);
        });
}

// Versión await para cuando necesitas asegurarte de que se guardó.
export async function emitEventAsync(
    eventType: BetaEventType,
    userId: string | null,
    meta: BetaEventMeta = {},
    adminEmail?: string,
): Promise<void> {
    const { error } = await supabaseAdmin
        .from('beta_activity_log')
        .insert({
            event_type: eventType,
            user_id: userId ?? null,
            admin_email: adminEmail ?? null,
            metadata: meta,
        });
    if (error) console.error('[beta/events] emitEventAsync error:', eventType, error.message);
}

// Humaniza el event_type para mostrar en el feed del dashboard.
export function eventLabel(eventType: string, nickname?: string): string {
    const n = nickname ?? 'Alguien';
    const map: Record<string, string> = {
        USER_REGISTERED:       `${n} se ha registrado`,
        EMAIL_VERIFIED:        `${n} verificó su email`,
        MISSION_COMPLETED:     `${n} completó una misión`,
        MISSION_SUBMITTED:     `${n} envió una misión para revisión`,
        MISSION_APPROVED:      `Misión aprobada para ${n}`,
        MISSION_REJECTED:      `Misión rechazada para ${n}`,
        BUG_SUBMITTED:         `${n} reportó un bug`,
        IDEA_SUBMITTED:        `${n} envió una idea`,
        REFERRAL_REGISTERED:   `${n} registró a un amigo`,
        REFERRAL_VALIDATED:    `${n} validó una invitación`,
        SECRET_CODE_REDEEMED:  `${n} canjeó un código secreto`,
        POINTS_GRANTED:        `${n} recibió puntos`,
        POINTS_ADJUSTED:       `Puntos ajustados para ${n}`,
        ACHIEVEMENT_UNLOCKED:  `${n} desbloqueó un logro`,
        USER_APPROVED:         `${n} fue aprobado`,
        USER_REJECTED:         `${n} fue rechazado`,
        USER_SUSPENDED:        `${n} fue suspendido`,
        USER_REINSTATED:       `${n} fue reactivado`,
        ADMIN_ACTION:          `Acción administrativa sobre ${n}`,
        NOTIFICATION_SENT:     'Notificación enviada',
        CONFIG_UPDATED:        'Configuración actualizada',
        MISSION_CREATED:       'Nueva misión creada',
        MISSION_UPDATED:       'Misión actualizada',
        MISSION_DELETED:       'Misión eliminada',
        CODE_CREATED:          'Código secreto creado',
        CODE_DELETED:          'Código secreto eliminado',
    };
    return map[eventType] ?? eventType;
}

export function eventIcon(eventType: string): string {
    const map: Record<string, string> = {
        USER_REGISTERED:       '🎉',
        EMAIL_VERIFIED:        '✅',
        MISSION_COMPLETED:     '🎯',
        MISSION_SUBMITTED:     '📋',
        MISSION_APPROVED:      '✅',
        MISSION_REJECTED:      '❌',
        BUG_SUBMITTED:         '🐛',
        IDEA_SUBMITTED:        '💡',
        REFERRAL_REGISTERED:   '👥',
        REFERRAL_VALIDATED:    '👥',
        SECRET_CODE_REDEEMED:  '🔑',
        POINTS_GRANTED:        '⭐',
        POINTS_ADJUSTED:       '⚙️',
        ACHIEVEMENT_UNLOCKED:  '🏅',
        USER_APPROVED:         '🚀',
        USER_REJECTED:         '🚫',
        USER_SUSPENDED:        '⏸️',
        USER_REINSTATED:       '▶️',
        ADMIN_ACTION:          '⚙️',
        NOTIFICATION_SENT:     '🔔',
        CONFIG_UPDATED:        '⚙️',
        MISSION_CREATED:       '➕',
        MISSION_UPDATED:       '✏️',
        MISSION_DELETED:       '🗑️',
        CODE_CREATED:          '🔑',
        CODE_DELETED:          '🗑️',
    };
    return map[eventType] ?? '📌';
}
