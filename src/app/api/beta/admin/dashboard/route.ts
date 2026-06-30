import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { assertBetaAdmin } from '@/lib/beta/admin-guard';
import { getBetaAvatar } from '@/lib/beta/avatars';
import { eventLabel, eventIcon } from '@/lib/beta/events';

export const dynamic = 'force-dynamic';

function daysAgo(n: number) { return new Date(Date.now() - n * 86_400_000).toISOString(); }
function isoToDay(iso: string) { return iso.slice(0, 10); }
function lastNDays(n: number): string[] {
    const days: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
        days.push(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
    }
    return days;
}
const SHORT_DAY = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
function dayLabel(iso: string) { return SHORT_DAY[new Date(iso + 'T12:00:00Z').getDay()]; }

export async function GET(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const seven = daysAgo(7);

    const [
        totalRes, weekRes, configRes, pendingReviewsRes,
        unverifiedRes, activityLogRes, referralsRes, topPointsRes,
        eventsRes, regChartRes, completionChartRes, referralChartRes, codeChartRes,
        top50Res,
    ] = await Promise.all([
        supabaseAdmin.from('beta_users').select('id', { count: 'exact', head: true })
            .not('status', 'in', '("rechazado","suspendido")'),
        supabaseAdmin.from('beta_users').select('id', { count: 'exact', head: true })
            .gte('created_at', seven),
        supabaseAdmin.from('beta_config').select('key, value'),
        supabaseAdmin.from('beta_mission_reviews')
            .select('id, created_at, title, description, beta_users(id, nickname, avatar_id, points), beta_missions(id, key, title, type, verification_type)')
            .eq('status', 'pending').order('created_at', { ascending: true }).limit(50),
        supabaseAdmin.from('beta_users').select('id', { count: 'exact', head: true })
            .not('auth_user_id', 'is', null).is('email_verified_at', null)
            .not('status', 'in', '("rechazado","suspendido")'),
        // Activity feed from event store
        supabaseAdmin.from('beta_activity_log')
            .select('id, event_type, created_at, metadata, beta_users(id, nickname, avatar_id)')
            .order('created_at', { ascending: false }).limit(30),
        supabaseAdmin.from('beta_referrals')
            .select('referrer_id, beta_users!beta_referrals_referrer_id_fkey(id, nickname, avatar_id, points)')
            .eq('status', 'validated'),
        supabaseAdmin.from('beta_users')
            .select('id, nickname, avatar_id, points')
            .not('status', 'in', '("rechazado","suspendido")')
            .or('auth_user_id.is.null,email_verified_at.not.is.null')
            .order('points', { ascending: false }).order('created_at', { ascending: true }).limit(5),
        supabaseAdmin.from('beta_events')
            .select('id, title, event_date, icon').eq('active', true)
            .gte('event_date', new Date().toISOString())
            .order('event_date', { ascending: true }).limit(5),
        supabaseAdmin.from('beta_users').select('created_at').gte('created_at', seven),
        supabaseAdmin.from('beta_mission_completions').select('created_at').gte('created_at', seven),
        supabaseAdmin.from('beta_referrals').select('created_at').eq('status', 'validated').gte('created_at', seven),
        supabaseAdmin.from('beta_secret_code_claims').select('created_at').gte('created_at', seven),
        // Read top-N from config
        supabaseAdmin.from('beta_users').select('points')
            .not('status', 'in', '("rechazado","suspendido")')
            .or('auth_user_id.is.null,email_verified_at.not.is.null')
            .order('points', { ascending: false }).order('created_at', { ascending: true })
            .range(0, 99), // fetch up to 100; config decides actual cutoff
    ]);

    // Config map — all values from DB, no hardcoded fallbacks
    const cfg = Object.fromEntries((configRes.data ?? []).map((c: any) => [c.key, c.value]));
    const capacity = Number(cfg.capacity ?? 50);
    const rankingTopN = Number(cfg.ranking_top_n ?? 50);

    // Reviews by type
    const reviews = (pendingReviewsRes.data ?? []) as any[];
    const reviewCounts = {
        total: reviews.length,
        bugs: reviews.filter(r => r.beta_missions?.type === 'bug').length,
        ideas: reviews.filter(r => r.beta_missions?.verification_type === 'manual' && r.beta_missions?.type !== 'bug').length,
        declarative: reviews.filter(r => r.beta_missions?.verification_type === 'declaration').length,
    };

    // Selection state — uses rankingTopN from config
    const top50Points = (top50Res.data ?? []).slice(0, rankingTopN);
    const inTop = top50Points.length;
    const totalParticipants = totalRes.count ?? 0;
    const outTop = Math.max(0, totalParticipants - inTop);

    // Activity feed from event store
    // Falls back to points_history format if event store is empty (migration period)
    let activityFeed: { id: string; message: string; icon: string; avatar: string; time: string }[];

    const logRows = (activityLogRes.data ?? []) as any[];
    if (logRows.length > 0) {
        activityFeed = logRows.map((r: any) => ({
            id: r.id,
            message: eventLabel(r.event_type, r.beta_users?.nickname),
            icon: eventIcon(r.event_type),
            avatar: getBetaAvatar(r.beta_users?.avatar_id ?? '').emoji,
            time: r.created_at,
        }));
    } else {
        // Fallback during migration: use points history
        const { data: histRows } = await supabaseAdmin.from('beta_points_history')
            .select('id, reason, delta, created_at, beta_users(id, nickname, avatar_id)')
            .order('created_at', { ascending: false }).limit(25);
        const legacyMsg = (reason: string, n: string) => {
            const m: Record<string, string> = {
                'secret_code': `${n} ha encontrado un código secreto`, 'referral': `${n} ha invitado a un amigo`,
                'admin_adjust': `Puntos ajustados para ${n}`, 'mission:register': `${n} se ha registrado`,
            };
            return m[reason] ?? `${n} ha completado una misión`;
        };
        activityFeed = (histRows ?? []).map((r: any) => ({
            id: r.id, message: legacyMsg(r.reason, r.beta_users?.nickname ?? 'Alguien'),
            icon: r.reason.includes('code') ? '🔑' : r.reason.includes('referral') ? '👥' : r.reason.includes('register') ? '🎉' : '⭐',
            avatar: getBetaAvatar(r.beta_users?.avatar_id ?? '').emoji, time: r.created_at,
        }));
    }

    // Top referrers (aggregated)
    const refCountMap = new Map<string, { count: number; user: any }>();
    for (const r of (referralsRes.data ?? []) as any[]) {
        const id = r.referrer_id;
        const ex = refCountMap.get(id);
        if (ex) ex.count++; else refCountMap.set(id, { count: 1, user: r.beta_users });
    }
    const topReferrers = [...refCountMap.values()]
        .sort((a, b) => b.count - a.count).slice(0, 5)
        .map(({ count, user }) => ({
            id: user?.id, nickname: user?.nickname ?? '?',
            avatar: getBetaAvatar(user?.avatar_id ?? '').emoji,
            points: user?.points ?? 0, referrals: count,
        }));

    const topByPoints = (topPointsRes.data ?? []).map((u: any, i: number) => ({
        rank: i + 1, id: u.id, nickname: u.nickname,
        avatar: getBetaAvatar(u.avatar_id).emoji, points: u.points,
    }));

    // Charts
    const days7 = lastNDays(7);
    function countByDay(rows: any[]): Record<string, number> {
        const m: Record<string, number> = {};
        for (const r of rows) { const d = isoToDay(r.created_at); m[d] = (m[d] ?? 0) + 1; }
        return m;
    }
    const regMap = countByDay(regChartRes.data ?? []);
    const compMap = countByDay(completionChartRes.data ?? []);
    const refMap = countByDay(referralChartRes.data ?? []);
    const codeMap = countByDay(codeChartRes.data ?? []);
    const registrationsChart = days7.map(d => ({ label: dayLabel(d), value: regMap[d] ?? 0 }));
    const activityChart = days7.map(d => ({
        label: dayLabel(d), missions: compMap[d] ?? 0,
        referrals: refMap[d] ?? 0, codes: codeMap[d] ?? 0, registrations: regMap[d] ?? 0,
    }));

    const reviewsPreview = reviews.slice(0, 5).map((r: any) => ({
        id: r.id, nickname: r.beta_users?.nickname ?? '?',
        avatar: getBetaAvatar(r.beta_users?.avatar_id ?? '').emoji,
        points: r.beta_users?.points ?? 0, missionTitle: r.beta_missions?.title ?? '?',
        missionType: r.beta_missions?.type ?? 'custom',
        verificationType: r.beta_missions?.verification_type ?? 'manual',
        title: r.title, description: r.description, createdAt: r.created_at,
    }));

    return NextResponse.json({
        stats: {
            totalParticipants, newThisWeek: weekRes.count ?? 0,
            capacity, rankingTopN, inTop,
            pendingReviews: reviewCounts, unverifiedEmails: unverifiedRes.count ?? 0,
        },
        selectionState: { inTop, outTop, total: totalParticipants },
        activityFeed, topReferrers, topByPoints,
        upcomingEvents: (eventsRes.data ?? []).map((e: any) => ({ id: e.id, title: e.title, date: e.event_date, icon: e.icon })),
        registrationsChart, activityChart, reviewsPreview,
    });
}
