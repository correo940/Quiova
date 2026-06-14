import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { BETA_COOKIE, siteUrl } from '@/lib/beta/constants';

export const dynamic = 'force-dynamic';

// GET /api/beta/recover/[token]
// Valida el token, establece la cookie beta_token y redirige al dashboard.
export async function GET(
    req: NextRequest,
    { params }: { params: { token: string } }
) {
    const { token } = params;

    const { data: rec } = await supabaseAdmin
        .from('beta_recovery_tokens')
        .select('id, beta_user_id, expires_at, used_at')
        .eq('token', token)
        .maybeSingle();

    const base = `${siteUrl()}/beta/recuperar`;

    if (!rec)                         return NextResponse.redirect(`${base}?error=invalid`);
    if (rec.used_at)                  return NextResponse.redirect(`${base}?error=used`);
    if (new Date(rec.expires_at) < new Date()) return NextResponse.redirect(`${base}?error=expired`);

    // Obtener el access_token del usuario beta
    const { data: betaUser } = await supabaseAdmin
        .from('beta_users')
        .select('access_token')
        .eq('id', rec.beta_user_id)
        .maybeSingle();

    if (!betaUser) return NextResponse.redirect(`${base}?error=invalid`);

    // Marcar token como usado
    await supabaseAdmin
        .from('beta_recovery_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', rec.id);

    // Establecer cookie httpOnly y redirigir al dashboard
    const res = NextResponse.redirect(new URL('/beta/dashboard', req.url));
    res.cookies.set(BETA_COOKIE, betaUser.access_token, {
        httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
        path: '/', maxAge: 60 * 60 * 24 * 365,
    });
    return res;
}
