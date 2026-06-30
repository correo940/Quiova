import { Button, GREEN, MissionCard, MissionCardData, Step } from '../components';
import { BetaLayout } from '../layouts';

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
    nextMission?:      MissionCardData | null;
}

function fDateShort(iso: string): string {
    try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }); }
    catch { return iso; }
}
function fYear(iso: string): string {
    try { return new Date(iso).getFullYear().toString(); } catch { return ''; }
}

export function buildWelcomeEmail(d: WelcomeEmailData): string {
    const closingDate   = fDateShort(d.selectionEndDate);
    const closingYear   = fYear(d.selectionEndDate);
    const verifiedText  = d.emailVerified ? '✅ Verificado' : '⚠️ Pendiente';
    const verifiedColor = d.emailVerified ? GREEN : '#b87514';
    const rankMain      = d.rank > 0 ? `#${d.rank}` : '—';
    const rankSub       = d.totalParticipants > 0 ? `de ${d.totalParticipants}` : '';

    const hero = `
  <!-- HERO -->
  <tr>
    <td bgcolor="#ffffff" style="background-color:#ffffff;padding:40px 40px 28px;text-align:center">
      <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#0f172a;line-height:1.25;font-family:system-ui,-apple-system,sans-serif">
        ¡Hola, ${d.nickname}! 👋
      </h1>
      <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.65;font-family:system-ui,-apple-system,sans-serif">
        Ya formas parte del Programa Beta de QUIOBA.
      </p>
      ${d.rank > 0 ? `
      <div style="display:inline-block;background:#f0fdf4;border:1.5px solid #d1fae5;border-radius:12px;padding:14px 28px">
        <div style="font-size:11px;color:#6b7280;font-family:system-ui,-apple-system,sans-serif">Ahora mismo ocupas la posición</div>
        <div style="font-size:32px;font-weight:900;color:${GREEN};line-height:1.1;margin:4px 0;font-family:system-ui,-apple-system,sans-serif">#${d.rank}</div>
        <div style="font-size:13px;color:#6b7280;font-family:system-ui,-apple-system,sans-serif">de ${d.totalParticipants} participantes</div>
      </div>` : `
      <div style="font-size:15px;color:${GREEN};font-weight:700;font-family:system-ui,-apple-system,sans-serif">🎉 ¡Eres de los primeros en unirte!</div>`}
    </td>
  </tr>`;

    const statusCard = `
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
  </tr>`;

    const actionCards = `
  <!-- ACTION CARDS -->
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
  </tr>`;

    const referralBox = `
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
  </tr>`;

    const stepsBlock = `
  <!-- STEPS -->
  <tr>
    <td bgcolor="#f9fafb" style="background-color:#f9fafb;padding:28px 16px">
      <div style="font-size:10px;font-weight:800;color:#6b7280;letter-spacing:2.5px;text-transform:uppercase;text-align:center;margin-bottom:20px;font-family:system-ui,-apple-system,sans-serif">¿QUÉ OCURRE AHORA?</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          ${Step(1,'📋','Completa misiones','y gana puntos.')}
          <td class="em-arrow" valign="middle" style="text-align:center;color:#d1d5db;font-size:20px;padding-bottom:20px">›</td>
          ${Step(2,'📊','Suma puntos','y mejora tu posición.')}
          <td class="em-arrow" valign="middle" style="text-align:center;color:#d1d5db;font-size:20px;padding-bottom:20px">›</td>
          ${Step(3,'👁️','Nosotros revisaremos','a los mejores Beta Testers.')}
          <td class="em-arrow" valign="middle" style="text-align:center;color:#d1d5db;font-size:20px;padding-bottom:20px">›</td>
          ${Step(4,'✉️','Recibirás una invitación','cuando llegue tu turno.')}
          <td class="em-arrow" valign="middle" style="text-align:center;color:#d1d5db;font-size:20px;padding-bottom:20px">›</td>
          ${Step(5,'🎉','Acceso prioritario','al lanzamiento.')}
        </tr>
      </table>
    </td>
  </tr>`;

    const statsBottom = `
  <!-- STATS -->
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
  </tr>`;

    const content = `
    ${hero}
    ${statusCard}
    ${actionCards}
    ${referralBox}
    ${d.nextMission ? MissionCard(d.nextMission) : ''}
    ${Button('🚀 ACCEDER A MI PANEL BETA', d.dashUrl)}
    ${stepsBlock}
    ${statsBottom}
  `;

    return BetaLayout(content);
}
