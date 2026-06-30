import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isValidAvatarId } from '@/lib/beta/avatars';
import { BETA_COOKIE, siteUrl } from '@/lib/beta/constants';
import {
    rateLimit, clientIp, uniqueRefCode, completeMission, awardPoints, unlockAchievementByKey,
} from '@/lib/beta/server';
import { emitEvent } from '@/lib/beta/events';
import { emailWelcome, emailNewReferral } from '@/lib/beta/emails';
import { notifyReferral } from '@/lib/beta/notifications';

export const dynamic = 'force-dynamic';

const NICK_RE = /^[a-zA-Z0-9_.]{3,20}$/;
const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const handle = (v: unknown) => clean(v).replace(/^@/, '').slice(0, 60) || null;

export async function POST(req: NextRequest) {
    const ip = clientIp(req);
    if (!rateLimit(`beta_register:${ip}`, 5, 60 * 60 * 1000)) {
        return NextResponse.json({ error: 'Demasiados intentos. Inténtalo más tarde.' }, { status: 429 });
    }

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

    const email = clean(body.email).toLowerCase();
    const nickname = clean(body.nickname);
    const avatarId = clean(body.avatarId);
    const tiktok = handle(body.tiktok);
    const instagram = handle(body.instagram);
    const youtube = handle(body.youtube);
    const followsSocials = body.followsSocials === true;
    const ref = clean(body.ref).toUpperCase() || null;
    const password = typeof body.password === 'string' && body.password.length >= 6 ? body.password : null;
    // authUserId puede venir del cliente (flujo legacy) o lo creamos nosotros desde el backend
    let authUserId = typeof body.authUserId === 'string' && body.authUserId ? body.authUserId : null;

    // ---- Validaciones de servidor ----
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    if (!NICK_RE.test(nickname)) return NextResponse.json({ error: 'Nickname inválido (3-20 letras, números, _ o .)' }, { status: 400 });
    if (!isValidAvatarId(avatarId)) return NextResponse.json({ error: 'Avatar inválido' }, { status: 400 });

    // ---- Duplicados ----
    const { data: dupe } = await supabaseAdmin
        .from('beta_users')
        .select('id, email, nickname')
        .or(`email.eq.${email},nickname.ilike.${nickname}`)
        .limit(1)
        .maybeSingle();
    if (dupe) {
        const which = dupe.email === email ? 'Este email ya está registrado' : 'Este nickname ya está en uso';
        return NextResponse.json({ error: which }, { status: 409 });
    }

    // ---- Referido (anti-fraude) ----
    // Condiciones para validar un referido:
    //   1. El referral_code debe existir.
    //   2. El referidor no puede tener el mismo email que el nuevo usuario (auto-referido por email).
    //   3. El referidor no puede estar rechazado ni suspendido (no cuenta para el ranking, no debe ganar puntos).
    let referrerId: string | null = null;
    if (ref) {
        const { data: referrer } = await supabaseAdmin
            .from('beta_users')
            .select('id, email, status')
            .eq('referral_code', ref)
            .maybeSingle();
        const referrerValid =
            referrer &&
            referrer.email !== email &&
            !['rechazado', 'suspendido'].includes(referrer.status);
        if (referrerValid) referrerId = referrer.id;
    }

    // ---- Crear cuenta Supabase Auth en el backend (sin email de confirmación) ----
    if (!authUserId && password) {
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });
        if (authErr || !authUser.user) {
            if (authErr?.message?.toLowerCase().includes('already registered') || authErr?.message?.toLowerCase().includes('already been registered')) {
                // Puede que exista en auth pero no en beta_users (registro anterior interrumpido)
                const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
                const found = existing?.users?.find(u => u.email === email);
                if (found) {
                    authUserId = found.id;
                } else {
                    return NextResponse.json({ error: 'Este email ya está registrado' }, { status: 409 });
                }
            } else {
                return NextResponse.json({ error: 'No se pudo crear la cuenta' }, { status: 500 });
            }
        } else {
            authUserId = authUser.user.id;
        }
    }

    const referralCode = await uniqueRefCode();

    // ---- Crear usuario ----
    const { data: user, error: insErr } = await supabaseAdmin
        .from('beta_users')
        .insert({
            email, nickname, avatar_id: avatarId, tiktok, instagram, youtube,
            follows_socials: followsSocials, referral_code: referralCode,
            referred_by: referrerId, ip, user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
            ...(authUserId ? { auth_user_id: authUserId, status: 'aprobado', approved_at: new Date().toISOString() } : {}),
        })
        .select('*')
        .single();

    if (insErr || !user) {
        if (insErr?.code === '23505') return NextResponse.json({ error: 'Email o nickname ya registrado' }, { status: 409 });
        return NextResponse.json({ error: 'No se pudo completar el registro' }, { status: 500 });
    }

    emitEvent('USER_REGISTERED', user.id, { nickname, ref: referrerId ? ref : null, via: authUserId ? 'auth' : 'legacy' });

    const refLink = `${siteUrl()}/beta?ref=${referralCode}`;

    if (authUserId) {
        // Flujo nuevo (con auth): referido pendiente hasta verificación de email.
        if (referrerId) {
            await supabaseAdmin.from('beta_referrals').insert({
                referrer_id: referrerId, referred_id: user.id, status: 'pending',
            });
        }
        await Promise.race([
            emailWelcome(email, nickname, refLink, user.id),
            new Promise<void>(r => setTimeout(r, 12000)),
        ]).catch((e) => console.error('[emailWelcome]', e));
    } else {
        // Flujo antiguo: misión de registro inmediata, referido validado al instante.
        await completeMission(user.id, 'register');
        await unlockAchievementByKey(user.id, 'first_signup');
        if (referrerId) {
            const { error: refErr } = await supabaseAdmin
                .from('beta_referrals')
                .insert({ referrer_id: referrerId, referred_id: user.id, status: 'validated' });
            if (!refErr) {
                const { data: setting } = await supabaseAdmin.from('beta_config').select('value').eq('key', 'points_referral').maybeSingle();
                const pts = Number(setting?.value ?? 10);
                await awardPoints(referrerId, pts, 'referral', { referred: user.id });
                await completeMission(referrerId, 'invite_friend');
                const { data: referrer } = await supabaseAdmin.from('beta_users').select('email, nickname, access_token').eq('id', referrerId).maybeSingle();
                if (referrer) {
                    notifyReferral(referrerId, nickname).catch(() => {});
                    emailNewReferral(referrer.email, referrer.nickname, nickname, `${siteUrl()}/beta/dashboard?t=${referrer.access_token}`, referrerId).catch(() => {});
                }
            }
        }
        await Promise.race([
            emailWelcome(email, nickname, refLink, user.id),
            new Promise<void>(r => setTimeout(r, 12000)),
        ]).catch((e) => console.error('[emailWelcome]', e));
    }

    const res = NextResponse.json({
        ok: true,
        token: user.access_token,
        referralCode,
        refLink,
    });
    res.cookies.set(BETA_COOKIE, user.access_token, {
        httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
        path: '/', maxAge: 60 * 60 * 24 * 365,
    });
    return res;
}
