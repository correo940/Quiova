import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { BETA_COOKIE } from '@/lib/beta/constants';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    let body: any;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const { token, password } = body;
    if (!token || !password || password.length < 8) {
        return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    // Validar token
    const { data: rec } = await supabaseAdmin
        .from('beta_recovery_tokens')
        .select('id, beta_user_id, expires_at, used_at')
        .eq('token', token)
        .maybeSingle();

    if (!rec) return NextResponse.json({ error: 'Enlace no válido' }, { status: 400 });
    if (rec.used_at) return NextResponse.json({ error: 'Este enlace ya fue utilizado' }, { status: 400 });
    if (new Date(rec.expires_at) < new Date()) return NextResponse.json({ error: 'El enlace ha caducado' }, { status: 400 });

    // Obtener datos del usuario beta
    const { data: betaUser } = await supabaseAdmin
        .from('beta_users')
        .select('access_token, auth_user_id')
        .eq('id', rec.beta_user_id)
        .maybeSingle();

    if (!betaUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    // Actualizar contraseña en Supabase Auth (si tiene cuenta)
    if (betaUser.auth_user_id) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
            betaUser.auth_user_id,
            { password, email_confirm: true }
        );
        if (error) return NextResponse.json({ error: 'No se pudo actualizar la contraseña' }, { status: 500 });
    }

    // Marcar token como usado
    await supabaseAdmin
        .from('beta_recovery_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', rec.id);

    // Establecer cookie y confirmar
    const res = NextResponse.json({ ok: true });
    res.cookies.set(BETA_COOKIE, betaUser.access_token, {
        httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
        path: '/', maxAge: 60 * 60 * 24 * 365,
    });
    return res;
}
