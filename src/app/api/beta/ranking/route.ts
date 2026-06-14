import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;
const MAX_RANK = 100;

// Campos públicos seguros: avatar, nickname, puntos, posición, estado.
// No se exponen: email, redes sociales, referred_by, access_token, ip.
export async function GET(req: NextRequest) {
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1);
    const from = (page - 1) * PAGE_SIZE;

    // Solo usuarios verificados (auth_user_id IS NULL = flujo antiguo, grandfathered)
    const { count: total } = await supabaseAdmin
        .from('beta_users')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', '("rechazado","suspendido")')
        .or('auth_user_id.is.null,email_verified_at.not.is.null');

    const actualTotal = Math.min(total ?? 0, MAX_RANK);

    if (from >= actualTotal) {
        return NextResponse.json({
            rows: [],
            page,
            totalPages: Math.max(1, Math.ceil(actualTotal / PAGE_SIZE)),
            total: total ?? 0,
        });
    }

    const to = Math.min(from + PAGE_SIZE, actualTotal) - 1;

    const { data, error } = await supabaseAdmin
        .from('beta_users')
        .select('nickname, avatar_id, points, status')
        .not('status', 'in', '("rechazado","suspendido")')
        .or('auth_user_id.is.null,email_verified_at.not.is.null')
        .order('points', { ascending: false })
        .order('created_at', { ascending: true })
        .range(from, to);

    if (error) return NextResponse.json({ error: 'Error al cargar ranking' }, { status: 500 });

    const rows = (data ?? []).map((u, i) => ({
        rank: from + i + 1,
        nickname: u.nickname,
        avatar_id: u.avatar_id,
        points: u.points,
        status: u.status,
    }));

    return NextResponse.json({
        rows,
        page,
        totalPages: Math.max(1, Math.ceil(actualTotal / PAGE_SIZE)),
        total: total ?? 0,
    });
}
