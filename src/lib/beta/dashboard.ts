import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isVerified, type BetaUser } from './server';

export interface DashboardMission {
    key: string; title: string; description: string; points: number;
    type: string; target_url: string | null; completed: boolean;
}
export interface DashboardAchievement {
    key: string; title: string; description: string; icon: string; unlocked: boolean;
}

export async function buildDashboard(user: BetaUser) {
    const [missionsRes, completionsRes, achRes, unlockRes, refRes, codesRes, historyRes, notifsRes, unreadRes, activeCodesRes] = await Promise.all([
        supabaseAdmin.from('beta_missions').select('id, key, title, description, points, type, target_url').eq('active', true).order('sort_order'),
        supabaseAdmin.from('beta_mission_completions').select('mission_id').eq('beta_user_id', user.id),
        supabaseAdmin.from('beta_achievements').select('id, key, title, description, icon').order('sort_order'),
        supabaseAdmin.from('beta_achievement_unlocks').select('achievement_id').eq('beta_user_id', user.id),
        supabaseAdmin.from('beta_referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', user.id).eq('status', 'validated'),
        supabaseAdmin.from('beta_secret_code_claims').select('id', { count: 'exact', head: true }).eq('beta_user_id', user.id),
        supabaseAdmin.from('beta_points_history').select('delta, reason, created_at').eq('beta_user_id', user.id).order('created_at', { ascending: false }).limit(20),
        // Notificaciones: últimas 30
        supabaseAdmin.from('beta_notifications').select('id, type, title, message, is_read, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
        // Contador de no leídas
        supabaseAdmin.from('beta_notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
        // ¿Hay códigos activos no reclamados por este usuario?
        supabaseAdmin.from('beta_secret_codes').select('id').eq('active', true).not('id', 'in',
            `(SELECT code_id FROM beta_secret_code_claims WHERE beta_user_id = '${user.id}')`
        ).limit(1),
    ]);

    const completed = new Set((completionsRes.data ?? []).map((c: any) => c.mission_id));
    const unlocked = new Set((unlockRes.data ?? []).map((u: any) => u.achievement_id));

    const missions: DashboardMission[] = (missionsRes.data ?? []).map((m: any) => ({
        key: m.key, title: m.title, description: m.description, points: m.points,
        type: m.type, target_url: m.target_url, completed: completed.has(m.id),
    }));
    const achievements: DashboardAchievement[] = (achRes.data ?? []).map((a: any) => ({
        key: a.key, title: a.title, description: a.description, icon: a.icon, unlocked: unlocked.has(a.id),
    }));

    return {
        user: {
            nickname: user.nickname,
            avatar_id: user.avatar_id,
            points: user.points,
            status: user.status,
            referral_code: user.referral_code,
            access_token: user.access_token,
        },
        missions,
        achievements,
        referralsCount: refRes.count ?? 0,
        codesCompleted: codesRes.count ?? 0,
        history: historyRes.data ?? [],
        notifications: (notifsRes.data ?? []) as Array<{
            id: string; type: string; title: string; message: string;
            is_read: boolean; created_at: string;
        }>,
        unreadCount: unreadRes.count ?? 0,
        hasActiveCodes: (activeCodesRes.data?.length ?? 0) > 0,
        emailVerified: isVerified(user),
    };
}
