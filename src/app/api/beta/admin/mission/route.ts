import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { assertBetaAdmin, logAdminAction } from '@/lib/beta/admin-guard';

export const dynamic = 'force-dynamic';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

export async function GET(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { data } = await supabaseAdmin
        .from('beta_missions')
        .select('*')
        .order('sort_order')
        .order('created_at');

    return NextResponse.json({ missions: data ?? [] });
}

export async function DELETE(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (!key) return NextResponse.json({ error: 'Falta key' }, { status: 400 });

    const { error } = await supabaseAdmin.from('beta_missions').delete().eq('key', key);
    if (error) return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 });
    await logAdminAction(guard.email, 'delete_mission', null, { key });
    return NextResponse.json({ ok: true });
}

// Crea o actualiza una misión.
export async function POST(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

    const title = String(body.title || '').trim();
    if (!title) return NextResponse.json({ error: 'Falta el título' }, { status: 400 });

    const key = String(body.key || slug(title));
    const num = (v: unknown, def = 0) => Number.isFinite(+Number(v)) ? parseInt(String(v), 10) : def;
    const row = {
        key,
        title,
        description: String(body.description || ''),
        points: Math.max(0, num(body.points)),
        type: ['register', 'social', 'referral', 'code', 'bug', 'share', 'custom'].includes(body.type) ? body.type : 'custom',
        verification_type: ['automatic', 'declaration', 'manual'].includes(body.verification_type) ? body.verification_type : 'automatic',
        target_url: body.target_url || null,
        active: body.active !== false,
        visible: body.visible !== false,
        featured: body.featured === true,
        sort_order: num(body.sort_order, 99),
        repeatable: body.repeatable === true,
        cooldown_hours: Math.max(0, num(body.cooldown_hours)),
        max_per_user: Math.max(1, num(body.max_per_user, 1)),
        required_rank: body.required_rank != null && body.required_rank !== '' ? num(body.required_rank) : null,
        required_points: body.required_points != null && body.required_points !== '' ? num(body.required_points) : null,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        badge: body.badge || null,
        color: body.color || null,
        icon: body.icon || null,
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
