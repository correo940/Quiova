import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { notifyAchievement, notifyRankTop50, notifyRankTop10, notifyReferral } from './notifications';
import { emitEvent } from './events';

// ============================================================================
// Helpers de servidor para el programa Beta. Todo usa service_role (omite RLS).
// ============================================================================

export interface BetaUser {
    id: string;
    email: string;
    nickname: string;
    avatar_id: string;
    tiktok: string | null;
    instagram: string | null;
    youtube: string | null;
    follows_socials: boolean;
    points: number;
    status: string;
    referral_code: string;
    referred_by: string | null;
    access_token: string;
    auth_user_id: string | null;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    approved_at: string | null;
}

// ---------------------------------------------------------------------------
// Email verification helpers
// ---------------------------------------------------------------------------

/** Old-flow users (no auth account) are grandfathered. New-flow requires verification. */
export function isVerified(user: BetaUser): boolean {
    if (!user.auth_user_id) return true; // old flow: grandfathered
    return user.email_verified_at !== null;
}

/**
 * Lazy-sync: comprueba en Supabase Auth si el email está confirmado.
 * Si acaba de confirmarse: marca email_verified_at, otorga puntos de registro pendientes
 * y valida el referido pendiente (otorgando puntos al referidor).
 * Devuelve true si el usuario está (ahora) verificado.
 */
export async function syncEmailVerification(user: BetaUser): Promise<boolean> {
    if (!user.auth_user_id) return true; // grandfathered
    if (user.email_verified_at) return true; // ya verificado

    const { data } = await supabaseAdmin.auth.admin.getUserById(user.auth_user_id);
    if (!data?.user?.email_confirmed_at) return false;

    const verifiedAt = data.user.email_confirmed_at;

    // Marcar como verificado en beta_users
    await supabaseAdmin.from('beta_users').update({ email_verified_at: verifiedAt }).eq('id', user.id);

    // Solo la misión de registro se otorga automáticamente (verification_type='automatic').
    // Las misiones sociales (follow_*) son verification_type='declaration' y deben ir
    // por el flujo de revisión — NO se auto-conceden aquí.
    await completeMission(user.id, 'register');

    // Validar referido pendiente y otorgar puntos al referidor
    if (user.referred_by) {
        const { data: ref } = await supabaseAdmin
            .from('beta_referrals')
            .select('id, status')
            .eq('referred_id', user.id)
            .eq('referrer_id', user.referred_by)
            .maybeSingle();

        if (ref && ref.status === 'pending') {
            await supabaseAdmin.from('beta_referrals').update({ status: 'validated' }).eq('id', ref.id);
            const { data: setting } = await supabaseAdmin.from('beta_config').select('value').eq('key', 'points_referral').maybeSingle();
            const pts = Number(setting?.value ?? 10);
            await awardPoints(user.referred_by, pts, 'referral', { referred: user.id });
            await completeMission(user.referred_by, 'invite_friend');
            emitEvent('REFERRAL_VALIDATED', user.id, { referrerId: user.referred_by, pts });
            notifyReferral(user.referred_by, user.nickname).catch(() => {});
        }
    }

    return true;
}

// ---------------------------------------------------------------------------
// Rate limiting en memoria (por instancia). Combinado con restricciones UNIQUE
// en la DB da una protección razonable. Para escala usar Upstash/Redis.
// ---------------------------------------------------------------------------
const rlStore = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = rlStore.get(key);
    if (!entry || now > entry.reset) {
        rlStore.set(key, { count: 1, reset: now + windowMs });
        return true;
    }
    if (entry.count >= max) return false;
    entry.count++;
    return true;
}

export function clientIp(req: Request): string {
    const h = req.headers;
    return (
        h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        h.get('x-real-ip') ||
        'unknown'
    );
}

// ---------------------------------------------------------------------------
// Generación de referral_code único (8 chars alfanuméricos sin ambigüedad).
// ---------------------------------------------------------------------------
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateRefCode(len = 7): string {
    let out = '';
    for (let i = 0; i < len; i++) {
        out += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
    }
    return out;
}

export async function uniqueRefCode(): Promise<string> {
    for (let i = 0; i < 6; i++) {
        const code = generateRefCode();
        const { data } = await supabaseAdmin
            .from('beta_users')
            .select('id')
            .eq('referral_code', code)
            .maybeSingle();
        if (!data) return code;
    }
    return generateRefCode(10); // fallback prácticamente imposible de colisionar
}

// ---------------------------------------------------------------------------
// Lookup de usuario beta
// ---------------------------------------------------------------------------
export async function getBetaUserByToken(token: string | undefined | null): Promise<BetaUser | null> {
    if (!token) return null;
    const { data } = await supabaseAdmin
        .from('beta_users')
        .select('*')
        .eq('access_token', token)
        .maybeSingle();
    return (data as BetaUser) ?? null;
}

// ---------------------------------------------------------------------------
// Otorgar puntos (atómico via RPC) + reevaluar logros.
// ---------------------------------------------------------------------------
export async function awardPoints(
    userId: string,
    delta: number,
    reason: string,
    meta: Record<string, unknown> = {}
): Promise<number> {
    const { data, error } = await supabaseAdmin.rpc('beta_award_points', {
        p_user_id: userId,
        p_delta: delta,
        p_reason: reason,
        p_meta: meta,
    });
    if (error) throw error;
    await evaluateAchievements(userId);
    return data as number;
}

// ---------------------------------------------------------------------------
// Completar misión — atómico vía RPC (completion + puntos en una transacción).
// Devuelve { awarded: true } si se otorgó por primera vez, false si ya existía.
// ---------------------------------------------------------------------------
export async function completeMission(userId: string, missionKey: string): Promise<{ awarded: boolean; points: number }> {
    const { data, error } = await supabaseAdmin.rpc('beta_complete_mission', {
        p_user_id: userId,
        p_mission_key: missionKey,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { awarded: false, points: 0 };
    const result = { awarded: row.awarded as boolean, points: row.points_earned as number };
    if (result.awarded) {
        emitEvent('MISSION_COMPLETED', userId, { missionKey, points: result.points });
    }
    return result;
}

// ---------------------------------------------------------------------------
// Evaluación de logros. Desbloquea los que cumpla el usuario (idempotente).
// ---------------------------------------------------------------------------
export async function evaluateAchievements(userId: string): Promise<void> {
    const [{ data: user }, { data: achievements }, { count: refCount }, { data: rankData }] =
        await Promise.all([
            supabaseAdmin.from('beta_users').select('points').eq('id', userId).maybeSingle(),
            supabaseAdmin.from('beta_achievements').select('*'),
            supabaseAdmin
                .from('beta_referrals')
                .select('id', { count: 'exact', head: true })
                .eq('referrer_id', userId)
                .eq('status', 'validated'),
            supabaseAdmin.rpc('beta_user_rank', { p_user_id: userId }),
        ]);

    if (!user || !achievements) return;
    const rank = typeof rankData === 'number' ? rankData : 9_999_999;
    const referrals = refCount ?? 0;

    const toUnlock: string[] = [];
    for (const a of achievements as any[]) {
        let ok = false;
        if (a.criteria_type === 'points') ok = user.points >= a.criteria_value;
        else if (a.criteria_type === 'referrals') ok = referrals >= a.criteria_value;
        else if (a.criteria_type === 'rank') ok = rank <= a.criteria_value;
        // 'manual' y 'code' se desbloquean explícitamente desde sus flujos
        if (ok) toUnlock.push(a.id);
    }
    if (toUnlock.length === 0) return;

    // Detectar cuáles son NUEVOS (para crear notificaciones solo la primera vez)
    const { data: existing } = await supabaseAdmin
        .from('beta_achievement_unlocks')
        .select('achievement_id')
        .eq('beta_user_id', userId)
        .in('achievement_id', toUnlock);
    const existingSet = new Set((existing ?? []).map((e: any) => e.achievement_id));
    const newlyUnlocked = toUnlock.filter(id => !existingSet.has(id));

    // upsert ignorando duplicados
    await supabaseAdmin
        .from('beta_achievement_unlocks')
        .upsert(
            toUnlock.map(achievement_id => ({ beta_user_id: userId, achievement_id })),
            { onConflict: 'beta_user_id,achievement_id', ignoreDuplicates: true }
        );

    // Notificaciones para los logros nuevos
    for (const achId of newlyUnlocked) {
        const a = (achievements as any[]).find(x => x.id === achId);
        if (!a) continue;
        // Notificaciones de ranking especiales
        if (a.key === 'top_50') { notifyRankTop50(userId).catch(() => {}); continue; }
        if (a.key === 'top_10') { notifyRankTop10(userId).catch(() => {}); continue; }
        notifyAchievement(userId, a.icon, a.title, a.description).catch(() => {});
    }
}

// Desbloqueo explícito de un logro por key (para criterios manual/code).
export async function unlockAchievementByKey(userId: string, key: string): Promise<void> {
    const { data: ach } = await supabaseAdmin
        .from('beta_achievements')
        .select('id')
        .eq('key', key)
        .maybeSingle();
    if (!ach) return;
    await supabaseAdmin
        .from('beta_achievement_unlocks')
        .upsert(
            { beta_user_id: userId, achievement_id: ach.id },
            { onConflict: 'beta_user_id,achievement_id', ignoreDuplicates: true }
        );
}

export async function getUserRank(userId: string): Promise<number> {
    const { data } = await supabaseAdmin.rpc('beta_user_rank', { p_user_id: userId });
    return typeof data === 'number' ? data : 0;
}

// Datos de competición para el dashboard (sin info privada de usuarios).
// Mismo filtro de status que el ranking público y beta_user_rank.
const RANKING_STATUSES = ['pendiente', 'validando', 'aprobado'] as const;
export { RANKING_STATUSES };

export async function getCompetitionData(): Promise<{
    totalParticipants: number;
    leaderPoints: number;
    top10Points: number | null;
    top50Points: number | null;
}> {
    const [countRes, topRes] = await Promise.all([
        supabaseAdmin
            .from('beta_users')
            .select('id', { count: 'exact', head: true })
            .not('status', 'in', '("rechazado","suspendido")')
            .or('auth_user_id.is.null,email_verified_at.not.is.null'),
        supabaseAdmin
            .from('beta_users')
            .select('points')
            .not('status', 'in', '("rechazado","suspendido")')
            .or('auth_user_id.is.null,email_verified_at.not.is.null')
            .order('points', { ascending: false })
            .order('created_at', { ascending: true })
            .range(0, 49),
    ]);
    const pts = (topRes.data ?? []).map((u: any) => u.points as number);
    return {
        totalParticipants: countRes.count ?? 0,
        leaderPoints: pts[0] ?? 0,
        top10Points: pts.length >= 10 ? pts[9] : null,
        top50Points: pts.length >= 50 ? pts[49] : null,
    };
}
