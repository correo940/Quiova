import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { BETA_COOKIE, siteUrl } from '@/lib/beta/constants';
import {
    getBetaUserByToken, awardPoints, completeMission, unlockAchievementByKey, rateLimit, clientIp, isVerified,
} from '@/lib/beta/server';
import { emailCodeValid } from '@/lib/beta/emails';
import { notifyCodeClaimed } from '@/lib/beta/notifications';

export const dynamic = 'force-dynamic';

const ERROR_MSGS: Record<string, string> = {
    invalid:        'Código inválido o inactivo',
    not_started:    'Este código todavía no está activo',
    expired:        'Este código ha caducado',
    max_uses:       'Este código ha alcanzado el límite de usos',
    already_claimed:'Ya canjeaste este código anteriormente',
};

export async function POST(req: NextRequest) {
    const ip = clientIp(req);
    if (!rateLimit(`beta_code:${ip}`, 15, 10 * 60 * 1000)) {
        return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
    }

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

    const token = body.token || cookies().get(BETA_COOKIE)?.value;
    const code = (typeof body.code === 'string' ? body.code : '').trim().toUpperCase();
    if (!code) return NextResponse.json({ error: 'Introduce un código' }, { status: 400 });

    const user = await getBetaUserByToken(token);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!isVerified(user)) return NextResponse.json({ error: 'Debes verificar tu email antes de canjear códigos.' }, { status: 403 });

    // Buscar el código (solo para obtener su ID; la validación real es atómica en el RPC)
    const { data: secret } = await supabaseAdmin
        .from('beta_secret_codes')
        .select('id, points')
        .eq('code', code)
        .maybeSingle();

    if (!secret) return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 400 });

    // Canje atómico — evita race conditions en max_uses y doble canje simultáneo
    const { data: result, error: rpcErr } = await supabaseAdmin.rpc('beta_claim_secret_code', {
        p_code_id: secret.id,
        p_user_id: user.id,
    });

    if (rpcErr) {
        console.error('[beta/code] RPC error:', rpcErr);
        return NextResponse.json({ error: 'Error interno al canjear el código' }, { status: 500 });
    }

    if (!result?.ok) {
        const errKey = result?.error as string | undefined;
        const status = errKey === 'already_claimed' ? 409 : 400;
        return NextResponse.json({ error: ERROR_MSGS[errKey ?? ''] ?? 'Código inválido' }, { status });
    }

    const points = (result.points as number) ?? secret.points;

    // Asignar puntos, completar misión, desbloquear logro
    const total = await awardPoints(user.id, points, 'secret_code', { code });
    await completeMission(user.id, 'secret_code');
    await unlockAchievementByKey(user.id, 'bug_hunter'); // no-op si no aplica

    notifyCodeClaimed(user.id, points, code).catch(() => {});
    emailCodeValid(
        user.email, user.nickname, points,
        `${siteUrl()}/beta/dashboard?t=${user.access_token}`,
        user.id,
    ).catch(() => {});

    return NextResponse.json({ ok: true, points, total });
}
