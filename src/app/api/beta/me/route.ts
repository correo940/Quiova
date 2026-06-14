import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BETA_COOKIE } from '@/lib/beta/constants';
import { getBetaUserByToken, getUserRank, syncEmailVerification, isVerified } from '@/lib/beta/server';
import { buildDashboard } from '@/lib/beta/dashboard';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('t') || cookies().get(BETA_COOKIE)?.value;
    const user = await getBetaUserByToken(token);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // Sincronizar verificación de email (lazy, no-op si ya verificado o sin auth_user_id)
    const emailVerified = await syncEmailVerification(user);

    // Modo ligero: datos básicos + unreadCount + totalParticipants.
    // Usado por el header y la tarjeta resumen de /beta.
    if (req.nextUrl.searchParams.has('light')) {
        const [rank, unreadRes, countRes] = await Promise.all([
            getUserRank(user.id),
            supabaseAdmin
                .from('beta_notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false),
            supabaseAdmin
                .from('beta_users')
                .select('id', { count: 'exact', head: true })
                .not('status', 'in', '("rechazado","suspendido")')
                .or('auth_user_id.is.null,email_verified_at.not.is.null'),
        ]);
        return NextResponse.json({
            user: {
                nickname:      user.nickname,
                avatar_id:     user.avatar_id,
                points:        user.points,
                status:        user.status,
                access_token:  user.access_token,
                email_verified: emailVerified,
            },
            rank,
            unreadCount:       unreadRes.count ?? 0,
            totalParticipants: countRes.count ?? 0,
        });
    }

    // Modo completo: para el dashboard
    const data = await buildDashboard(user);
    const rank = await getUserRank(user.id);
    return NextResponse.json({ ...data, rank, emailVerified, email: user.email });
}
