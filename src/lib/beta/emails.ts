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
// eslint-disable-next-line no-unused-vars
function _welcomeTemplateLegacy(nickname: string, refLink: string, dashUrl: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f0;padding:32px 16px">
<tr><td align="center">
<table width="100%" style="max-width:520px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

  <!-- HEADER -->
  <tr>
    <td style="background:#1a5c2e;padding:28px 32px 22px;text-align:center">
      <img src="https://www.quioba.com/images/logo.png" alt="Quioba" width="120" style="display:block;margin:0 auto 8px;max-width:120px">
      <div style="font-size:11px;font-weight:700;color:#86efac;letter-spacing:3px;text-transform:uppercase">Programa Beta</div>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style="background:#ffffff;padding:32px">

      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a">¡Hola, ${nickname}! 👋</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569">
        Ya eres parte del programa Beta privado de Quioba. Eres de los primeros en probar la app — tu opinión y participación dan forma a lo que construimos.
      </p>

      <!-- STEPS -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        <tr>
          <td style="background:#f0fdf4;border-radius:12px;padding:16px 18px;border-left:4px solid #1a5c2e">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:22px;width:36px;vertical-align:top">🎯</td>
                <td style="padding-left:10px">
                  <div style="font-weight:700;color:#0f172a;font-size:14px">Completa misiones</div>
                  <div style="color:#64748b;font-size:13px;margin-top:2px">Gana puntos y sube en el ranking de Beta Testers.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:10px"></td></tr>
        <tr>
          <td style="background:#f0fdf4;border-radius:12px;padding:16px 18px;border-left:4px solid #1a5c2e">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:22px;width:36px;vertical-align:top">🏆</td>
                <td style="padding-left:10px">
                  <div style="font-weight:700;color:#0f172a;font-size:14px">Escala el ranking</div>
                  <div style="color:#64748b;font-size:13px;margin-top:2px">Los mejores Beta Testers tendrán ventajas en el lanzamiento.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:10px"></td></tr>
        <tr>
          <td style="background:#f0fdf4;border-radius:12px;padding:16px 18px;border-left:4px solid #1a5c2e">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:22px;width:36px;vertical-align:top">👥</td>
                <td style="padding-left:10px">
                  <div style="font-weight:700;color:#0f172a;font-size:14px">Invita amigos</div>
                  <div style="color:#64748b;font-size:13px;margin-top:2px">Cada amigo que se una con tu enlace te da puntos extra.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- REFERRAL LINK -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin-bottom:24px">
        <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Tu enlace de invitación</div>
        <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:10px 14px;font-family:monospace;font-size:13px;color:#1a5c2e;word-break:break-all">${refLink}</div>
      </div>

      <!-- CTA -->
      <div style="text-align:center">
        <a href="${dashUrl}" style="display:inline-block;background:#1a5c2e;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:9999px;font-weight:800;font-size:15px;letter-spacing:0.2px">
          Ir a mi panel →
        </a>
      </div>

    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#f8fafc;padding:20px 32px 24px;text-align:center;border-top:1px solid #e2e8f0">
      <!-- Redes sociales -->
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 14px">
        <tr>
          <td style="padding:0 5px">
            <a href="https://www.tiktok.com/@quioba" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;padding:7px 14px;border-radius:20px">TikTok</a>
          </td>
          <td style="padding:0 5px">
            <a href="https://www.instagram.com/quioba.web/" style="display:inline-block;background:#c13584;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;padding:7px 14px;border-radius:20px">Instagram</a>
          </td>
          <td style="padding:0 5px">
            <a href="https://www.youtube.com/@Quioba" style="display:inline-block;background:#ff0000;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;padding:7px 14px;border-radius:20px">YouTube</a>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:11px;color:#94a3b8">
        Quioba · Programa Beta privado.<br>
        Si no te registraste, ignora este correo.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

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
