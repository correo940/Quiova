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
        description: String(body.description || body.title || ''),
        points: Number.isFinite(+body.points) ? Math.max(0, parseInt(body.points, 10)) : 10,
        max_claims: (body.max_claims ?? body.max_uses) ? parseInt(body.max_claims ?? body.max_uses, 10) : null,
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

export async function PATCH(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (typeof body.active === 'boolean') updates.active = body.active;
    if (typeof body.description === 'string') updates.description = body.description;
    if (body.max_claims !== undefined) updates.max_claims = body.max_claims ? Number(body.max_claims) : null;

    const { error } = await supabaseAdmin.from('beta_secret_codes').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

    await supabaseAdmin.from('beta_secret_codes').update({ active: false }).eq('id', id);
    await logAdminAction(guard.email, 'deactivate_code', null, { id });
    return NextResponse.json({ ok: true });
}
