import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { assertBetaAdmin, logAdminAction } from '@/lib/beta/admin-guard';

export const dynamic = 'force-dynamic';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

// Crea o actualiza una misión.
export async function POST(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

    const title = String(body.title || '').trim();
    if (!title) return NextResponse.json({ error: 'Falta el título' }, { status: 400 });

    const key = String(body.key || slug(title));
    const row = {
        key,
        title,
        description: String(body.description || ''),
        points: Number.isFinite(+body.points) ? Math.max(0, parseInt(body.points, 10)) : 0,
        type: ['register', 'social', 'referral', 'code', 'bug', 'share', 'custom'].includes(body.type) ? body.type : 'custom',
        target_url: body.target_url || null,
        active: body.active !== false,
        sort_order: Number.isFinite(+body.sort_order) ? parseInt(body.sort_order, 10) : 99,
    };

    const { data, error } = await supabaseAdmin
        .from('beta_missions')
        .upsert(row, { onConflict: 'key' })
        .select('*')
        .single();
    if (error) return NextResponse.json({ error: 'No se pudo guardar la misión' }, { status: 500 });

    await logAdminAction(guard.email, 'upsert_mission', null, { key });
    return NextResponse.json({ ok: true, mission: data });
}
