// ─── Brand ───────────────────────────────────────────────────────────────────
const LOGO   = 'https://www.quioba.com/images/logo.png';
const GREEN  = '#1a5c2e';
const FF     = 'font-family:system-ui,-apple-system,sans-serif';
const SOCIAL = {
    tiktok:    'https://www.tiktok.com/@quioba',
    instagram: 'https://www.instagram.com/quioba.web/',
    youtube:   'https://www.youtube.com/@Quioba',
};

// ─── Shell ───────────────────────────────────────────────────────────────────

export function Wrap(rows: string): string {
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

// ─── Header / Footer ─────────────────────────────────────────────────────────

export function Header(): string {
    return `
  <tr>
    <td bgcolor="${GREEN}" style="background-color:${GREEN};padding:28px 32px 22px;text-align:center">
      <img src="${LOGO}" alt="QUIOBA" width="64" height="64"
        style="display:block;margin:0 auto 10px;border-radius:50%;border:3px solid rgba(255,255,255,0.25);object-fit:contain">
      <div style="color:#ffffff;font-size:24px;font-weight:900;letter-spacing:3px;${FF}">QUIOBA</div>
      <div style="color:#86efac;font-size:10px;font-weight:700;letter-spacing:5px;text-transform:uppercase;margin-top:4px;${FF}">PROGRAMA BETA</div>
    </td>
  </tr>`;
}

export function Footer(): string {
    return `
  <tr>
    <td bgcolor="#f9fafb" style="background-color:#f9fafb;border-top:1px solid #e5e7eb">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td class="em-fcol" valign="top" width="50%" style="padding:22px 18px 20px 24px;border-right:1px solid #e5e7eb">
            <div style="font-size:20px;margin-bottom:8px">❤️</div>
            <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:6px;${FF}">Gracias por ayudarnos a construir QUIOBA.</div>
            <div style="font-size:12px;color:#6b7280;line-height:1.65;${FF}">Cada sugerencia, cada bug y cada idea contribuirán a crear una mejor plataforma para todos.</div>
          </td>
          <td class="em-fcol" valign="middle" width="50%" style="padding:22px 24px 20px 18px;text-align:center">
            <div style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:12px;${FF}">Síguenos y no te pierdas nada:</div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="padding:0 3px"><a href="${SOCIAL.tiktok}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:11px;font-weight:800;padding:8px 12px;border-radius:20px;${FF}">🎵 TikTok</a></td>
                <td style="padding:0 3px"><a href="${SOCIAL.instagram}" style="display:inline-block;background:#c13584;color:#fff;text-decoration:none;font-size:11px;font-weight:800;padding:8px 12px;border-radius:20px;${FF}">📷 Instagram</a></td>
                <td style="padding:0 3px"><a href="${SOCIAL.youtube}" style="display:inline-block;background:#ff0000;color:#fff;text-decoration:none;font-size:11px;font-weight:800;padding:8px 12px;border-radius:20px;${FF}">▶️ YouTube</a></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td bgcolor="#f3f4f6" style="background-color:#f3f4f6;padding:14px 24px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:11px;color:#9ca3af;${FF}">QUIOBA · Programa Beta Privado<br>Si no te registraste, ignora este correo.</p>
    </td>
  </tr>`;
}

// ─── Common blocks ────────────────────────────────────────────────────────────

export function Button(text: string, url: string): string {
    return `
  <tr>
    <td bgcolor="#ffffff" style="background-color:#ffffff;padding:4px 24px 36px;text-align:center">
      <a href="${url}" style="display:inline-block;background-color:${GREEN};color:#ffffff;text-decoration:none;font-size:15px;font-weight:900;padding:18px 44px;border-radius:10px;letter-spacing:1.5px;text-transform:uppercase;${FF}">${text}</a>
    </td>
  </tr>`;
}

export function HelpBlock(): string {
    return `
  <tr>
    <td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 24px 28px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0">
        <tr>
          <td style="padding:18px 22px">
            <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:4px;${FF}">¿Necesitas ayuda? 💬</div>
            <div style="font-size:13px;color:#64748b;line-height:1.6;${FF}">Responde directamente a este correo. Leemos personalmente todos los mensajes durante la Beta.</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

// ─── Composed blocks ──────────────────────────────────────────────────────────

export interface MissionCardData {
    title:  string;
    points: number;
    url:    string;
    icon?:  string;
}

export function MissionCard({ title, points, url, icon = '🎯' }: MissionCardData): string {
    return `
  <tr>
    <td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 24px 28px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="border:1.5px solid #d1fae5;border-radius:12px;background:#f0fdf4;overflow:hidden">
        <tr>
          <td style="padding:18px 20px">
            <div style="font-size:10px;font-weight:800;color:${GREEN};letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;${FF}">🎯 TU SIGUIENTE MISIÓN RECOMENDADA</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="middle">
                  <div style="font-size:20px;margin-bottom:4px">${icon}</div>
                  <div style="font-size:15px;font-weight:800;color:#0f172a;${FF}">${title}</div>
                  <div style="font-size:13px;color:${GREEN};font-weight:700;margin-top:4px;${FF}">+${points} puntos</div>
                </td>
                <td valign="middle" align="right" width="120">
                  <a href="${url}" style="display:inline-block;background:${GREEN};color:#fff;text-decoration:none;font-size:12px;font-weight:800;padding:10px 18px;border-radius:8px;${FF}">Ver misión →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

// ─── Step helper (used by Timeline) ──────────────────────────────────────────

export function Step(num: number, icon: string, line1: string, line2: string): string {
    return `<td class="em-step" valign="top" style="text-align:center;padding:0 4px;width:18%">
      <div style="width:32px;height:32px;background:${GREEN};border-radius:50%;color:#fff;font-size:13px;font-weight:900;line-height:32px;text-align:center;margin:0 auto 10px;${FF}">${num}</div>
      <div style="font-size:28px;margin-bottom:8px">${icon}</div>
      <div style="font-size:11px;color:#374151;font-weight:600;line-height:1.45;${FF}">${line1}<br>${line2}</div>
    </td>`;
}

// Re-export brand constant for templates that need it
export { GREEN };
