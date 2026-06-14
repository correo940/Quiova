import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { assertBetaAdmin } from '@/lib/beta/admin-guard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const sp = req.nextUrl.searchParams;
    const status = sp.get('status');
    const search = sp.get('q')?.trim();
    const format = sp.get('format');

    let query = supabaseAdmin
        .from('beta_users')
        .select('id, email, nickname, avatar_id, points, status, referral_code, tiktok, instagram, youtube, follows_socials, referred_by, created_at, approved_at')
        .order('points', { ascending: false })
        .order('created_at', { ascending: true });

    if (status) query = query.eq('status', status);
    if (search) query = query.or(`email.ilike.%${search}%,nickname.ilike.%${search}%`);

    const { data, error } = await query.limit(format === 'csv' ? 100000 : 500);
    if (error) return NextResponse.json({ error: 'Error al cargar usuarios' }, { status: 500 });

    if (format === 'csv') {
        const headers = ['email', 'nickname', 'points', 'status', 'referral_code', 'tiktok', 'instagram', 'youtube', 'created_at'];
        const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const lines = [headers.join(',')];
        for (const u of data ?? []) lines.push(headers.map(h => esc((u as any)[h])).join(','));
        return new NextResponse(lines.join('\n'), {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="beta_users_${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    }

    // Conteos por estado para el panel
    const { data: counts } = await supabaseAdmin.from('beta_users').select('status');
    const byStatus: Record<string, number> = {};
    for (const r of counts ?? []) byStatus[(r as any).status] = (byStatus[(r as any).status] ?? 0) + 1;

    return NextResponse.json({ users: data ?? [], byStatus, total: counts?.length ?? 0 });
}
