import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { assertBetaAdmin } from '@/lib/beta/admin-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { id } = params;
    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

    const content = String(body.content ?? '').trim();
    if (!content) return NextResponse.json({ error: 'La nota no puede estar vacía' }, { status: 400 });

    const { data, error } = await supabaseAdmin.from('beta_participant_notes').insert({
        beta_user_id: id,
        admin_email: guard.email,
        content,
    }).select('id, content, admin_email, created_at').single();

    if (error) return NextResponse.json({ error: 'No se pudo guardar la nota' }, { status: 500 });
    return NextResponse.json({ ok: true, note: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get('noteId');
    if (!noteId) return NextResponse.json({ error: 'Falta noteId' }, { status: 400 });

    const { error } = await supabaseAdmin.from('beta_participant_notes')
        .delete().eq('id', noteId).eq('beta_user_id', params.id);

    if (error) return NextResponse.json({ error: 'No se pudo eliminar la nota' }, { status: 500 });
    return NextResponse.json({ ok: true });
}
