import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { BETA_COOKIE } from '@/lib/beta/constants';
import { rateLimit, clientIp } from '@/lib/beta/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const ip = clientIp(req);
    if (!rateLimit(`beta_login:${ip}`, 10, 15 * 60 * 1000)) {
        return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
    }

    let body: any;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const email = (typeof body.email === 'string' ? body.email : '').trim().toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
        return NextResponse.json({ error: 'Email y contraseña son obligatorios' }, { status: 400 });
    }

    // Verificar credenciales con Supabase Auth (cliente sin storage para server-side)
    const supabaseAnon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
        return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
    }

    // Buscar el perfil beta por auth_user_id
    const { data: betaUser } = await supabaseAdmin
        .from('beta_users')
        .select('access_token, status')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle();

    if (!betaUser) {
        return NextResponse.json({ error: 'Esta cuenta no está registrada en el programa Beta.' }, { status: 404 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(BETA_COOKIE, betaUser.access_token, {
        httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
        path: '/', maxAge: 60 * 60 * 24 * 365,
    });
    return res;
}
