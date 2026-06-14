import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { siteUrl } from '@/lib/beta/constants';
import { rateLimit, clientIp } from '@/lib/beta/server';
import { sendBetaEmail } from '@/lib/beta/emails';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const ip = clientIp(req);
    // Máximo 3 intentos por IP cada 15 min (anti-spam)
    if (!rateLimit(`beta_recover:${ip}`, 3, 15 * 60 * 1000)) {
        return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
    }

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

    const email = (typeof body.email === 'string' ? body.email : '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
        return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    // Buscar usuario beta
    const { data: betaUser } = await supabaseAdmin
        .from('beta_users')
        .select('id, nickname, access_token')
        .ilike('email', email)
        .maybeSingle();

    // Respuesta genérica para no confirmar si el email existe (seguridad)
    if (!betaUser) {
        return NextResponse.json({ ok: true, hint: 'not_found' });
    }

    // Invalidar tokens anteriores no usados de este usuario
    await supabaseAdmin
        .from('beta_recovery_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('beta_user_id', betaUser.id)
        .is('used_at', null);

    // Crear token nuevo con TTL de 24 h
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: rec } = await supabaseAdmin
        .from('beta_recovery_tokens')
        .insert({ beta_user_id: betaUser.id, expires_at: expiresAt })
        .select('token')
        .single();

    if (!rec) {
        return NextResponse.json({ error: 'No se pudo generar el enlace' }, { status: 500 });
    }

    const recoveryLink = `${siteUrl()}/api/beta/recover/${rec.token}`;

    // Intentar enviar email (no bloquea si RESEND no está configurado)
    sendBetaEmail({
        type: 'welcome',
        to: email,
        betaUserId: betaUser.id,
        subject: '🔑 Recupera tu acceso a la Beta de Quioba',
        html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="color:#15803d">Recuperar acceso Beta</h2>
            <p>Hola <strong>${betaUser.nickname}</strong>,</p>
            <p>Usa el siguiente enlace para recuperar tu acceso. Válido durante 24 horas.</p>
            <a href="${recoveryLink}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-weight:700;margin:16px 0">
                Recuperar mi acceso
            </a>
            <p style="color:#94a3b8;font-size:12px">Si no solicitaste esto, ignora este mensaje.</p>
        </div>`,
    }).catch(() => {});

    // Devolver el enlace SIEMPRE (el sistema no depende de email)
    return NextResponse.json({
        ok: true,
        link: recoveryLink,
        expiresAt,
        hint: 'found',
    });
}
