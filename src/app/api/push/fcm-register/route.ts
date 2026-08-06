import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedSupabaseUser } from '@/lib/server-request-auth';

export async function POST(req: Request) {
    const user = await getAuthenticatedSupabaseUser(req);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const { token, platform } = body || {};
    if (!token) return NextResponse.json({ error: 'token requerido' }, { status: 400 });

    const { error } = await supabaseAdmin.from('fcm_tokens').upsert(
        { user_id: user.id, token, platform: platform || 'android' },
        { onConflict: 'token' }
    );

    if (error) {
        console.error('[fcm] Error guardando token:', error);
        return NextResponse.json({ error: 'Error guardando token' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
