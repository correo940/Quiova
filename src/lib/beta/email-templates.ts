import 'server-only';

// ─── Brand ───────────────────────────────────────────────────────────────────
const LOGO    = 'https://www.quioba.com/images/logo.png';
const GREEN   = '#1a5c2e';
const SOCIAL  = {
    tiktok:    'https://www.tiktok.com/@quioba',
    instagram: 'https://www.instagram.com/quioba.web/',
    youtube:   'https://www.youtube.com/@Quioba',
};

// ─── Data types ──────────────────────────────────────────────────────────────
export interface WelcomeEmailData {
    nickname:          string;
    points:            number;
    rank:              number;
    totalParticipants: number;
    emailVerified:     boolean;
    refLink:           string;
    dashUrl:           string;
    selectionEndDate:  string; // ISO
    capacity:          number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fDateShort(iso: string): string {
    try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }); }
    catch { return iso; }
}
function fYear(iso: string): string {
    try { return new Date(iso).getFullYear().toString(); } catch { return ''; }
}

// ─── Reusable blocks ─────────────────────────────────────────────────────────

export function emailHeader(): string {
    return `
  <!-- HEADER -->
  <tr>
    <td bgcolor="${GREEN}" style="background-color:${GREEN};padding:28px 32px 22px;text-align:center">
      <img src="${LOGO}" alt="QUIOBA" width="64" height="64"
        style="display:block;margin:0 auto 10px;border-radius:50%;border:3px solid rgba(255,255,255,0.25);object-fit:contain">
      <div style="color:#ffffff;font-size:24px;font-weight:900;letter-spacing:3px;font-family:system-ui,-apple-system,sans-serif">QUIOBA</div>
      <div style="color:#86efac;font-size:10px;font-weight:700;letter-spacing:5px;text-transform:uppercase;margin-top:4px;font-family:system-ui,-apple-system,sans-serif">PROGRAMA BETA</div>
    </td>
  </tr>`;
}

export function emailFooter(): string {
    return `
  <!-- FOOTER -->
  <tr>
    <td bgcolor="#f9fafb" style="background-color:#f9fafb;border-top:1px solid #e5e7eb">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="top" width="50%" style="padding:22px 18px 20px 24px;border-right:1px solid #e5e7eb">
            <div style="font-size:20px;margin-bottom:8px">❤️</div>
            <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:6px;font-family:system-ui,-apple-system,sans-serif">Gracias por ayudarnos a construir QUIOBA.</div>
            <div style="font-size:12px;color:#6b7280;line-height:1.65;font-family:system-ui,-apple-system,sans-serif">Cada sugerencia, cada bug y cada idea contribuirán a crear una mejor plataforma para todos.</div>
          </td>
          <td valign="middle" width="50%" style="padding:22px 24px 20px 18px;text-align:center">
            <div style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:12px;font-family:system-ui,-apple-system,sans-serif">Síguenos y no te pierdas nada:</div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="padding:0 3px">
                  <a href="${SOCIAL.tiktok}" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;font-size:11px;font-weight:800;padding:8px 12px;border-radius:20px;font-family:system-ui,-apple-system,sans-serif">🎵 TikTok</a>
                </td>
                <td style="padding:0 3px">
                  <a href="${SOCIAL.instagram}" style="display:inline-block;background:#c13584;color:#ffffff;text-decoration:none;font-size:11px;font-weight:800;padding:8px 12px;border-radius:20px;font-family:system-ui,-apple-system,sans-serif">📷 Instagram</a>
                </td>
                <td style="padding:0 3px">
                  <a href="${SOCIAL.youtube}" style="display:inline-block;background:#ff0000;color:#ffffff;text-decoration:none;font-size:11px;font-weight:800;padding:8px 12px;border-radius:20px;font-family:system-ui,-apple-system,sans-serif">▶️ YouTube</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- LEGAL -->
  <tr>
    <td bgcolor="#f3f4f6" style="background-color:#f3f4f6;padding:14px 24px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:11px;color:#9ca3af;font-family:system-ui,-apple-system,sans-serif">
        QUIOBA · Programa Beta Privado<br>
        Si no te registraste, ignora este correo.
      </p>
    </td>
  </tr>`;
}

export function emailButton(text: string, url: string): string {
    return `
  <tr>
    <td bgcolor="#ffffff" style="background-color:#ffffff;padding:4px 24px 36px;text-align:center">
      <a href="${url}" style="display:inline-block;background-color:${GREEN};color:#ffffff;text-decoration:none;font-size:15px;font-weight:900;padding:18px 44px;border-radius:10px;letter-spacing:1.5px;text-transform:uppercase;font-family:system-ui,-apple-system,sans-serif">${text}</a>
    </td>
  </tr>`;
}

export function emailWrap(rows: string): string {
    return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>QUIOBA Beta</title>
<style>
  body { margin:0; padding:0; }
  @media only screen and (max-width:600px) {
    .em-container { width:100% !important; }
    .em-stat { display:block !important; width:100% !important; border-right:none !important; border-bottom:1px solid #e5e7eb !important; box-sizing:border-box !important; }
    .em-action { display:block !important; width:100% !important; border-right:none !important; border-bottom:1px solid #e5e7eb !important; box-sizing:border-box !important; }
    .em-step { display:block !important; width:auto !important; padding:10px 8px !important; }
    .em-arrow { display:none !important; }
    .em-fcol { display:block !important; width:100% !important; border-right:none !important; border-bottom:1px solid #e5e7eb !important; box-sizing:border-box !important; }
    h1 { font-size:22px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6" style="background-color:#f3f4f6;padding:24px 12px">
<tr><td align="center">
<table role="presentation" class="em-container" width="600" cellpadding="0" cellspacing="0" border="0"
  style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.09)">
${rows}
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Welcome email ────────────────────────────────────────────────────────────

export function buildWelcomeEmail(d: WelcomeEmailData): string {
    const closingDate = fDateShort(d.selectionEndDate);
    const closingYear = fYear(d.selectionEndDate);
    const verifiedText  = d.emailVerified ? '✅ Verificado'           : '⚠️ Pendiente';
    const verifiedColor = d.emailVerified ? GREEN                     : '#b87514';
    const rankMain = d.rank > 0 ? `#${d.rank}` : '—';
    const rankSub  = d.totalParticipants > 0 ? `de ${d.totalParticipants}` : '';

    const rows = `
  ${emailHeader()}

  <!-- HERO -->
  <tr>
    <td bgcolor="#ffffff" style="background-color:#ffffff;padding:40px 40px 28px;text-align:center">
      <div style="font-size:44px;margin:0 0 14px">🎉</div>
      <h1 style="margin:0 0 14px;font-size:26px;font-weight:900;color:#0f172a;line-height:1.25;font-family:system-ui,-apple-system,sans-serif">
        ¡Ya formas parte de la<br>Beta Privada de QUIOBA!
      </h1>
      <p style="margin:0 auto;font-size:15px;color:#6b7280;line-height:1.65;max-width:420px;font-family:system-ui,-apple-system,sans-serif">
        Gracias por unirte. A partir de ahora podrás ayudarnos a construir QUIOBA y tendrás acceso prioritario al lanzamiento.
      </p>
    </td>
  </tr>

  <!-- STATUS CARD -->
  <tr>
    <td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 24px 28px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="border:1.5px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <tr>
          <td colspan="5" bgcolor="#f9fafb" style="background-color:#f9fafb;padding:12px 20px;border-bottom:1px solid #e5e7eb">
            <span style="font-size:10px;font-weight:800;color:#6b7280;letter-spacing:2.5px;text-transform:uppercase;font-family:system-ui,-apple-system,sans-serif">TU ESTADO ACTUAL</span>
          </td>
        </tr>
        <tr>
          <td class="em-stat" valign="top" width="20%" style="padding:18px 12px;text-align:center;border-right:1px solid #f0f0f0">
            <div style="font-size:24px;margin-bottom:6px">✅</div>
            <div style="font-size:10px;color:#9ca3af;margin-bottom:5px;font-family:system-ui,-apple-system,sans-serif">Estado</div>
            <div style="font-size:11px;font-weight:800;color:${GREEN};line-height:1.35;font-family:system-ui,-apple-system,sans-serif">Beta Tester<br>registrado</div>
          </td>
          <td class="em-stat" valign="top" width="20%" style="padding:18px 12px;text-align:center;border-right:1px solid #f0f0f0">
            <div style="font-size:24px;margin-bottom:6px">⭐</div>
            <div style="font-size:10px;color:#9ca3af;margin-bottom:5px;font-family:system-ui,-apple-system,sans-serif">Puntos iniciales</div>
            <div style="font-size:24px;font-weight:900;color:#0f172a;line-height:1;font-family:system-ui,-apple-system,sans-serif">${d.points}</div>
            <div style="font-size:10px;color:#9ca3af;margin-top:3px;font-family:system-ui,-apple-system,sans-serif">puntos</div>
          </td>
          <td class="em-stat" valign="top" width="20%" style="padding:18px 12px;text-align:center;border-right:1px solid #f0f0f0">
            <div style="font-size:24px;margin-bottom:6px">📊</div>
            <div style="font-size:10px;color:#9ca3af;margin-bottom:5px;font-family:system-ui,-apple-system,sans-serif">Posición actual</div>
            <div style="font-size:20px;font-weight:900;color:#0f172a;line-height:1;font-family:system-ui,-apple-system,sans-serif">${rankMain}</div>
            <div style="font-size:10px;color:#9ca3af;margin-top:3px;font-family:system-ui,-apple-system,sans-serif">${rankSub}</div>
          </td>
          <td class="em-stat" valign="top" width="20%" style="padding:18px 12px;text-align:center;border-right:1px solid #f0f0f0">
            <div style="font-size:24px;margin-bottom:6px">✉️</div>
            <div style="font-size:10px;color:#9ca3af;margin-bottom:5px;font-family:system-ui,-apple-system,sans-serif">Email</div>
            <div style="font-size:11px;font-weight:800;color:${verifiedColor};font-family:system-ui,-apple-system,sans-serif">${verifiedText}</div>
          </td>
          <td class="em-stat" valign="top" width="20%" style="padding:18px 12px;text-align:center">
            <div style="font-size:24px;margin-bottom:6px">📅</div>
            <div style="font-size:10px;color:#9ca3af;margin-bottom:5px;font-family:system-ui,-apple-system,sans-serif">Cierre de selección</div>
            <div style="font-size:14px;font-weight:900;color:#0f172a;line-height:1.25;font-family:system-ui,-apple-system,sans-serif">${closingDate}</div>
            <div style="font-size:10px;color:#9ca3af;margin-top:3px;font-family:system-ui,-apple-system,sans-serif">de ${closingYear}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- WHAT CAN YOU DO -->
  <tr>
    <td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 24px 28px">
      <div style="font-size:10px;font-weight:800;color:#6b7280;letter-spacing:2.5px;text-transform:uppercase;text-align:center;margin-bottom:16px;font-family:system-ui,-apple-system,sans-serif">¿QUÉ PUEDES HACER AHORA?</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="border:1.5px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <tr>
          <td class="em-action" valign="top" width="33%" style="padding:20px 16px;text-align:center;border-right:1px solid #e5e7eb">
            <div style="font-size:28px;width:52px;height:52px;background:#f0fdf4;border-radius:12px;margin:0 auto 12px;line-height:52px;text-align:center">🎯</div>
            <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:6px;font-family:system-ui,-apple-system,sans-serif">Completa misiones</div>
            <div style="font-size:12px;color:#6b7280;line-height:1.55;font-family:system-ui,-apple-system,sans-serif">Gana puntos realizando acciones dentro del programa Beta.</div>
          </td>
          <td class="em-action" valign="top" width="33%" style="padding:20px 16px;text-align:center;border-right:1px solid #e5e7eb">
            <div style="font-size:28px;width:52px;height:52px;background:#fffbeb;border-radius:12px;margin:0 auto 12px;line-height:52px;text-align:center">🏆</div>
            <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:6px;font-family:system-ui,-apple-system,sans-serif">Escala posiciones</div>
            <div style="font-size:12px;color:#6b7280;line-height:1.55;font-family:system-ui,-apple-system,sans-serif">Cuanto mayor sea tu posición, más posibilidades tendrás de obtener acceso prioritario.</div>
          </td>
          <td class="em-action" valign="top" width="33%" style="padding:20px 16px;text-align:center">
            <div style="font-size:28px;width:52px;height:52px;background:#f0fdf4;border-radius:12px;margin:0 auto 12px;line-height:52px;text-align:center">👥</div>
            <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:6px;font-family:system-ui,-apple-system,sans-serif">Invita a tus amigos</div>
            <div style="font-size:12px;color:#6b7280;line-height:1.55;font-family:system-ui,-apple-system,sans-serif">Cada amigo que se registre y verifique su correo suma puntos para ti.</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- REFERRAL LINK -->
  <tr>
    <td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 24px 28px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="border:1.5px solid #d1fae5;border-radius:12px;background-color:#f0fdf4;overflow:hidden">
        <tr>
          <td style="padding:18px 20px 14px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="middle" width="48" style="padding-right:14px">
                  <div style="width:48px;height:48px;background:${GREEN};border-radius:10px;line-height:48px;text-align:center;font-size:22px">🎁</div>
                </td>
                <td valign="middle">
                  <div style="font-size:10px;font-weight:800;color:${GREEN};letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;font-family:system-ui,-apple-system,sans-serif">TU ENLACE DE INVITACIÓN</div>
                  <div style="font-size:12px;color:#4b7a5a;font-family:system-ui,-apple-system,sans-serif">Comparte tu enlace y suma puntos extra por cada amigo que se una.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 20px 20px">
            <div style="background:#ffffff;border:1.5px solid #d1fae5;border-radius:8px;padding:12px 16px;font-family:'Courier New',Courier,monospace;font-size:12px;color:${GREEN};word-break:break-all;font-weight:700">${d.refLink}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- CTA -->
  ${emailButton('🚀 ACCEDER A MI PANEL BETA', d.dashUrl)}

  <!-- STEPS -->
  <tr>
    <td bgcolor="#f9fafb" style="background-color:#f9fafb;padding:28px 16px">
      <div style="font-size:10px;font-weight:800;color:#6b7280;letter-spacing:2.5px;text-transform:uppercase;text-align:center;margin-bottom:20px;font-family:system-ui,-apple-system,sans-serif">¿QUÉ OCURRE AHORA?</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          ${step(1,'📋','Completa misiones','y gana puntos.')}
          <td class="em-arrow" valign="middle" style="text-align:center;color:#d1d5db;font-size:20px;padding-bottom:20px">›</td>
          ${step(2,'📊','Suma puntos','y mejora tu posición.')}
          <td class="em-arrow" valign="middle" style="text-align:center;color:#d1d5db;font-size:20px;padding-bottom:20px">›</td>
          ${step(3,'👁️','Nosotros revisaremos','a los mejores Beta Testers.')}
          <td class="em-arrow" valign="middle" style="text-align:center;color:#d1d5db;font-size:20px;padding-bottom:20px">›</td>
          ${step(4,'✉️','Recibirás una invitación','cuando llegue tu turno.')}
          <td class="em-arrow" valign="middle" style="text-align:center;color:#d1d5db;font-size:20px;padding-bottom:20px">›</td>
          ${step(5,'🎉','Acceso prioritario','al lanzamiento.')}
        </tr>
      </table>
    </td>
  </tr>

  <!-- STATS ROW -->
  <tr>
    <td bgcolor="#ffffff" style="background-color:#ffffff;padding:24px 24px 28px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="border:1.5px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <tr>
          <td class="em-stat" valign="middle" width="33%" style="padding:20px 16px;text-align:center;border-right:1px solid #e5e7eb">
            <div style="font-size:28px;margin-bottom:4px">👥</div>
            <div style="font-size:28px;font-weight:900;color:#0f172a;line-height:1;font-family:system-ui,-apple-system,sans-serif">${d.totalParticipants}</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:5px;font-weight:600;font-family:system-ui,-apple-system,sans-serif">Participantes</div>
          </td>
          <td class="em-stat" valign="middle" width="33%" style="padding:20px 16px;text-align:center;border-right:1px solid #e5e7eb">
            <div style="font-size:28px;margin-bottom:4px">🏆</div>
            <div style="font-size:28px;font-weight:900;color:#0f172a;line-height:1;font-family:system-ui,-apple-system,sans-serif">${d.capacity}</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:5px;font-weight:600;font-family:system-ui,-apple-system,sans-serif">Plazas disponibles</div>
          </td>
          <td class="em-stat" valign="middle" width="33%" style="padding:20px 16px;text-align:center">
            <div style="font-size:28px;margin-bottom:4px">📅</div>
            <div style="font-size:18px;font-weight:900;color:#0f172a;line-height:1.2;font-family:system-ui,-apple-system,sans-serif">${closingDate}</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:5px;font-weight:600;font-family:system-ui,-apple-system,sans-serif">Cierre de selección</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  ${emailFooter()}`;

    return emailWrap(rows);
}

function step(num: number, icon: string, line1: string, line2: string): string {
    return `<td class="em-step" valign="top" style="text-align:center;padding:0 4px;width:18%">
      <div style="width:32px;height:32px;background:${GREEN};border-radius:50%;color:#fff;font-size:13px;font-weight:900;line-height:32px;text-align:center;margin:0 auto 10px;font-family:system-ui,-apple-system,sans-serif">${num}</div>
      <div style="font-size:28px;margin-bottom:8px">${icon}</div>
      <div style="font-size:11px;color:#374151;font-weight:600;line-height:1.45;font-family:system-ui,-apple-system,sans-serif">${line1}<br>${line2}</div>
    </td>`;
}
