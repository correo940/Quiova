import 'server-only';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { siteUrl } from './constants';

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM || 'Quioba Beta <beta@quioba.com>';
const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

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

// Envía vía Resend y registra SIEMPRE el evento en beta_email_events.
// Si no hay RESEND_API_KEY configurada, el evento queda 'queued' (no se pierde).
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

    if (!resend) return; // sin proveedor: queda registrado como queued

    try {
        const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
        if (error) throw new Error(error.message);
        if (eventId) {
            await supabaseAdmin
                .from('beta_email_events')
                .update({ status: 'sent', provider_id: data?.id ?? null, sent_at: new Date().toISOString() })
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
        ? `<a href="${cta.url}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-weight:700;margin-top:16px">${cta.label}</a>`
        : '';
    return `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0f172a">
        <div style="font-size:22px;font-weight:800;color:#15803d;margin-bottom:8px">Quioba <span style="color:#0f172a">Beta</span></div>
        <h1 style="font-size:20px;margin:16px 0 8px">${title}</h1>
        <div style="font-size:15px;line-height:1.6;color:#334155">${body}</div>
        ${button}
        <p style="font-size:12px;color:#94a3b8;margin-top:32px">Quioba · Programa Beta privado. Si no te registraste, ignora este correo.</p>
    </div>`;
}

// ---------------------------------------------------------------------------
// Disparadores concretos
// ---------------------------------------------------------------------------
export function emailWelcome(to: string, nickname: string, refLink: string, betaUserId: string) {
    return sendBetaEmail({
        type: 'welcome',
        to,
        betaUserId,
        subject: '¡Bienvenido a la Beta de Quioba! 🚀',
        html: shell(
            `¡Hola ${nickname}! 🎉`,
            `Ya formas parte del programa Beta de Quioba. Gana puntos completando misiones, sube en el ranking e invita amigos con tu enlace:<br><br><code style="background:#f1f5f9;padding:6px 10px;border-radius:8px;display:inline-block">${refLink}</code>`,
            { label: 'Ir a mi panel', url: refLink.replace('/beta?ref=', '/beta/dashboard?ref=') }
        ),
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
