import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { assertBetaAdmin, logAdminAction } from '@/lib/beta/admin-guard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { data } = await supabaseAdmin.from('beta_secret_codes').select('*').order('created_at', { ascending: false });
    return NextResponse.json({ codes: data ?? [] });
}

// Crea o actualiza un código secreto.
export async function POST(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

    const code = String(body.code || '').trim().toUpperCase();
    if (!code) return NextResponse.json({ error: 'Falta el código' }, { status: 400 });

    const row = {
        code,
        title: String(body.title || ''),
        points: Number.isFinite(+body.points) ? Math.max(0, parseInt(body.points, 10)) : 10,
        starts_at: body.starts_at || null,
        ends_at: body.ends_at || null,
        max_uses: body.max_uses ? parseInt(body.max_uses, 10) : null,
        active: body.active !== false,
    };

    const { data, error } = await supabaseAdmin
        .from('beta_secret_codes')
        .upsert(row, { onConflict: 'code' })
        .select('*')
        .single();
    if (error) return NextResponse.json({ error: 'No se pudo guardar el código' }, { status: 500 });

    await logAdminAction(guard.email, 'upsert_code', null, { code });
    return NextResponse.json({ ok: true, code: data });
}
