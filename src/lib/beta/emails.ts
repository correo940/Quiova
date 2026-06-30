import 'server-only';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { siteUrl, BETA_SELECTION_END } from './constants';
import { buildWelcomeEmail } from '@/lib/email';

function getTransporter() {
    const user = process.env.GMAIL_USER || 'quioba.web@gmail.com';
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!pass) return null;
    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
    });
}

type EmailType =
    | 'welcome'
    | 'new_referral'
    | 'rank_up'
    | 'approved'
    | 'rejected'
    | 'code_valid'
    | 'achievement';

interface SendArgs {
    type: EmailType;
    to: string;
    subject: string;
    html: string;
    betaUserId?: string | null;
    payload?: Record<string, unknown>;
}

export async function sendBetaEmail({ type, to, subject, html, betaUserId, payload }: SendArgs): Promise<void> {
    const { data: evt } = await supabaseAdmin
        .from('beta_email_events')
        .insert({
            beta_user_id: betaUserId ?? null,
            type,
            to_email: to,
            subject,
            status: 'queued',
            payload: payload ?? {},
        })
        .select('id')
        .single();

    const eventId = evt?.id;

    const transporter = getTransporter();
    if (!transporter) return; // sin credenciales: queda registrado como queued

    const gmailUser = process.env.GMAIL_USER || 'quioba.web@gmail.com';
    try {
        await transporter.sendMail({
            from: `Quioba Beta <${gmailUser}>`,
            to,
            subject,
            html,
        });
        if (eventId) {
            await supabaseAdmin
                .from('beta_email_events')
                .update({ status: 'sent', sent_at: new Date().toISOString() })
                .eq('id', eventId);
        }
    } catch (e: any) {
        if (eventId) {
            await supabaseAdmin
                .from('beta_email_events')
                .update({ status: 'failed', error: String(e?.message || e) })
                .eq('id', eventId);
        }
    }
}

// ---------------------------------------------------------------------------
// Plantilla base
// ---------------------------------------------------------------------------
function shell(title: string, body: string, cta?: { label: string; url: string }): string {
    const button = cta
        ? `<a href="${cta.url}" style="display:inline-block;background:#1a5c2e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-weight:700;margin-top:16px">${cta.label}</a>`
        : '';
    return `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0f172a">
        <div style="font-size:22px;font-weight:800;color:#1a5c2e;margin-bottom:8px">Quioba <span style="color:#0f172a">Beta</span></div>
        <h1 style="font-size:20px;margin:16px 0 8px">${title}</h1>
        <div style="font-size:15px;line-height:1.6;color:#334155">${body}</div>
        ${button}
        <p style="font-size:12px;color:#94a3b8;margin-top:32px">Quioba · Programa Beta privado. Si no te registraste, ignora este correo.</p>
    </div>`;
}

// ---------------------------------------------------------------------------
// Disparadores concretos
// ---------------------------------------------------------------------------

export async function emailWelcome(to: string, nickname: string, refLink: string, betaUserId: string) {
    const dashUrl = `${siteUrl()}/beta/dashboard`;

    // Fetch dynamic data in parallel
    const [userRes, configRes, completedRes, missionsRes] = await Promise.all([
        supabaseAdmin.from('beta_users').select('points, email_verified_at').eq('id', betaUserId).maybeSingle(),
        supabaseAdmin.from('beta_config').select('key, value').in('key', ['selection_end_date', 'capacity']),
        supabaseAdmin.from('beta_mission_completions').select('mission_key').eq('beta_user_id', betaUserId),
        supabaseAdmin.from('beta_missions').select('key, title, points, icon').eq('visible', true)
            .order('featured', { ascending: false }).order('points', { ascending: false }),
    ]);

    const points = (userRes.data?.points as number) ?? 0;
    const emailVerified = !!(userRes.data?.email_verified_at);

    const cfgMap: Record<string, string> = {};
    for (const row of (configRes.data ?? [])) cfgMap[row.key] = String(row.value);
    const selectionEndDate = cfgMap['selection_end_date'] || BETA_SELECTION_END;
    const capacity = Number(cfgMap['capacity'] ?? 50);

    // Rank: users with more points than this user
    const [rankRes, totalRes] = await Promise.all([
        supabaseAdmin.from('beta_users').select('id', { count: 'exact', head: true })
            .gt('points', points)
            .not('status', 'in', '("rechazado","suspendido")'),
        supabaseAdmin.from('beta_users').select('id', { count: 'exact', head: true })
            .not('status', 'in', '("rechazado","suspendido")'),
    ]);
    const rank = (rankRes.count ?? 0) + 1;
    const totalParticipants = totalRes.count ?? 0;

    // Next recommended mission (first uncompleted)
    const completedKeys = new Set((completedRes.data ?? []).map((m: any) => m.mission_key));
    const nextMissionRow = (missionsRes.data ?? []).find((m: any) => !completedKeys.has(m.key));
    const nextMission = nextMissionRow
        ? { title: nextMissionRow.title, points: nextMissionRow.points, url: dashUrl, icon: nextMissionRow.icon ?? '🎯' }
        : null;

    return sendBetaEmail({
        type: 'welcome',
        to,
        betaUserId,
        subject: `🎉 ¡Bienvenido a la Beta Privada de QUIOBA, ${nickname}!`,
        html: buildWelcomeEmail({ nickname, points, rank, totalParticipants, emailVerified, refLink, dashUrl, selectionEndDate, capacity, nextMission }),
    });
}

export function emailNewReferral(to: string, nickname: string, refereeNick: string, dashUrl: string, betaUserId: string) {
    return sendBetaEmail({
        type: 'new_referral',
        to,
        betaUserId,
        subject: '¡Nuevo referido en tu equipo! 🤝',
        html: shell(`¡Buen trabajo, ${nickname}!`, `<b>${refereeNick}</b> se ha unido con tu enlace. Has ganado puntos por ello.`, { label: 'Ver mi progreso', url: dashUrl }),
    });
}

export function emailApproved(to: string, nickname: string, loginUrl: string, betaUserId: string, tempPassword: string) {
    return sendBetaEmail({
        type: 'approved',
        to,
        betaUserId,
        subject: '✅ Has sido seleccionado para Quioba',
        html: shell(
            `¡Enhorabuena ${nickname}!`,
            `El equipo de Quioba te ha seleccionado como Beta Tester. Estos son tus datos de acceso:<br><br>
            <b>Email:</b> ${to}<br>
            <b>Contraseña:</b> <code style="background:#f1f5f9;padding:4px 10px;border-radius:6px;font-size:15px;letter-spacing:1px">${tempPassword}</code><br><br>
            Puedes cambiar tu contraseña desde tu perfil una vez dentro.`,
            { label: 'Iniciar sesión en Quioba', url: loginUrl }
        ),
    });
}

export function emailRejected(to: string, nickname: string, betaUserId: string) {
    return sendBetaEmail({
        type: 'rejected',
        to,
        betaUserId,
        subject: 'Actualización de tu solicitud Beta',
        html: shell(
            `Hola ${nickname}`,
            `Gracias por tu interés en Quioba. Por ahora no podemos darte acceso, pero seguimos ampliando plazas. ¡Sigue participando!`
        ),
    });
}

export function emailCodeValid(to: string, nickname: string, points: number, dashUrl: string, betaUserId: string) {
    return sendBetaEmail({
        type: 'code_valid',
        to,
        betaUserId,
        subject: `🔑 Código canjeado (+${points} pts)`,
        html: shell(`¡${nickname}, código válido!`, `Has sumado <b>${points} puntos</b> con un código secreto.`, { label: 'Ver mi panel', url: dashUrl }),
    });
}

export function emailAchievement(to: string, nickname: string, title: string, icon: string, dashUrl: string, betaUserId: string) {
    return sendBetaEmail({
        type: 'achievement',
        to,
        betaUserId,
        subject: `${icon} Logro desbloqueado: ${title}`,
        html: shell(`${icon} ¡Logro desbloqueado!`, `${nickname}, has conseguido <b>${title}</b>.`, { label: 'Ver mis logros', url: dashUrl }),
    });
}

export { siteUrl };
