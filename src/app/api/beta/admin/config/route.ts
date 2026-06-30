import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { assertBetaAdmin, logAdminAction } from '@/lib/beta/admin-guard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const [configRes, eventsRes] = await Promise.all([
        supabaseAdmin.from('beta_config').select('key, value, label, description, category').order('category').order('key'),
        supabaseAdmin.from('beta_events').select('id, title, event_date, icon, sort_order, active').order('sort_order'),
    ]);

    return NextResponse.json({
        config: configRes.data ?? [],
        events: eventsRes.data ?? [],
    });
}

export async function POST(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

    const { action } = body;

    // ── Actualizar config keys
    if (action === 'update_config' || !action) {
        const updates = body.updates as Record<string, unknown> | undefined;
        if (!updates || typeof updates !== 'object') {
            return NextResponse.json({ error: 'Falta updates' }, { status: 400 });
        }
        for (const [key, rawValue] of Object.entries(updates)) {
            await supabaseAdmin.from('beta_config')
                .update({ value: rawValue })
                .eq('key', key);
        }
        await logAdminAction(guard.email, 'update_config', null, { keys: Object.keys(updates) });
        return NextResponse.json({ ok: true });
    }

    // ── Upsert evento
    if (action === 'upsert_event') {
        const { id, title, event_date, icon, sort_order, active } = body;
        if (!title || !event_date) return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
        const row = { title, event_date, icon: icon || '📅', sort_order: sort_order ?? 0, active: active !== false };
        const { data, error } = id
            ? await supabaseAdmin.from('beta_events').update(row).eq('id', id).select('*').single()
            : await supabaseAdmin.from('beta_events').insert(row).select('*').single();
        if (error) return NextResponse.json({ error: 'No se pudo guardar el evento' }, { status: 500 });
        await logAdminAction(guard.email, id ? 'update_event' : 'create_event', null, { title });
        return NextResponse.json({ ok: true, event: data });
    }

    // ── Eliminar evento
    if (action === 'delete_event') {
        const { id } = body;
        if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });
        await supabaseAdmin.from('beta_events').delete().eq('id', id);
        await logAdminAction(guard.email, 'delete_event', null, { id });
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
}
