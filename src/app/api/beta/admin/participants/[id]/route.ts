import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { assertBetaAdmin } from '@/lib/beta/admin-guard';
import { getBetaAvatar } from '@/lib/beta/avatars';
import { historyReasonLabel } from '@/lib/beta/constants';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { id } = params;
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

    const [userRes, historyRes, completionsRes, reviewsRes, referralsGivenRes, referralReceivedRes, notifsRes, activityRes, auditRes, notesRes] = await Promise.all([
        supabaseAdmin.from('beta_users').select('*').eq('id', id).maybeSingle(),
        supabaseAdmin.from('beta_points_history')
            .select('id, delta, reason, meta, created_at')
            .eq('beta_user_id', id)
            .order('created_at', { ascending: false }).limit(50),
        supabaseAdmin.from('beta_mission_completions')
            .select('id, created_at, beta_missions(key, title, points, type)')
            .eq('beta_user_id', id)
            .order('created_at', { ascending: false }),
        supabaseAdmin.from('beta_mission_reviews')
            .select('id, status, title, description, created_at, reviewed_at, reviewed_by, beta_missions(key, title, type, verification_type)')
            .eq('beta_user_id', id)
            .order('created_at', { ascending: false }).limit(30),
        supabaseAdmin.from('beta_referrals')
            .select('id, created_at, status, beta_users!beta_referrals_referred_id_fkey(id, nickname, avatar_id, points)')
            .eq('referrer_id', id)
            .order('created_at', { ascending: false }),
        supabaseAdmin.from('beta_referrals')
            .select('id, created_at, status, beta_users!beta_referrals_referrer_id_fkey(id, nickname, avatar_id)')
            .eq('referred_id', id).maybeSingle(),
        supabaseAdmin.from('beta_notifications')
            .select('id, type, title, message, is_read, created_at')
            .eq('user_id', id)
            .order('created_at', { ascending: false }).limit(30),
        supabaseAdmin.from('beta_activity_log')
            .select('id, event_type, created_at, metadata')
            .eq('user_id', id)
            .order('created_at', { ascending: false }).limit(50),
        supabaseAdmin.from('beta_audit_log')
            .select('id, action, admin_email, before_value, after_value, ip, created_at')
            .eq('target_user_id', id)
            .order('created_at', { ascending: false }).limit(30),
        supabaseAdmin.from('beta_participant_notes')
            .select('id, content, admin_email, created_at')
            .eq('beta_user_id', id)
            .order('created_at', { ascending: false }),
    ]);

    if (!userRes.data) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const user = userRes.data as any;

    const { data: rankData } = await supabaseAdmin.rpc('beta_user_rank', { p_user_id: id });

    return NextResponse.json({
        user: {
            ...user,
            avatar: getBetaAvatar(user.avatar_id).emoji,
            rank: typeof rankData === 'number' ? rankData : null,
        },
        history: (historyRes.data ?? []).map((h: any) => ({ ...h, label: historyReasonLabel(h.reason) })),
        completions: completionsRes.data ?? [],
        reviews: reviewsRes.data ?? [],
        referralsGiven: referralsGivenRes.data ?? [],
        referredBy: (referralReceivedRes.data as any)?.beta_users ?? null,
        notifications: notifsRes.data ?? [],
        activity: activityRes.data ?? [],
        auditLog: auditRes.data ?? [],
        notes: notesRes.data ?? [],
    });
}
