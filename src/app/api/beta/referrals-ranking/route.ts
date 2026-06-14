import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { BETA_COOKIE } from '@/lib/beta/constants';
import { getBetaUserByToken } from '@/lib/beta/server';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;
const MAX_RANK = 100;

export async function GET(req: NextRequest) {
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const [rowsRes, countRes] = await Promise.all([
        supabaseAdmin.rpc('beta_referrals_ranking', {
            p_offset: offset,
            p_limit: Math.min(PAGE_SIZE, MAX_RANK - offset),
        }),
        supabaseAdmin.rpc('beta_referrals_ranking_count'),
    ]);

    const total = (countRes.data as number | null) ?? 0;
    const totalPages = Math.max(1, Math.ceil(Math.min(total, MAX_RANK) / PAGE_SIZE));

    // Datos del usuario autenticado (opcional, sin fallar si no hay sesión)
    const token = req.nextUrl.searchParams.get('t') || cookies().get(BETA_COOKIE)?.value;
    let myData: { rank: number; referralCount: number; referralPoints: number } | null = null;
    if (token) {
        const user = await getBetaUserByToken(token);
        if (user) {
            const [rankRes, countMine] = await Promise.all([
                supabaseAdmin.rpc('beta_user_referral_rank', { p_user_id: user.id }),
                supabaseAdmin
                    .from('beta_referrals')
                    .select('id', { count: 'exact', head: true })
                    .eq('referrer_id', user.id)
                    .eq('status', 'validated'),
            ]);
            const myCount = countMine.count ?? 0;
            const { data: setting } = await supabaseAdmin
                .from('beta_settings').select('value').eq('key', 'referral').maybeSingle();
            const ptsPerRef = setting?.value ?? 10;
            myData = {
                rank: (rankRes.data as number | null) ?? 0,
                referralCount: myCount,
                referralPoints: myCount * ptsPerRef,
            };
        }
    }

    return NextResponse.json({
        rows: rowsRes.data ?? [],
        page,
        totalPages,
        total,
        me: myData,
    });
}
