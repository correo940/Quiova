// Reinicia a diario el router Vodafone Sercomm FG824CD entrando a su web como una persona.
// Corre en CasaOS (docker, imagen node:22-alpine + chromium). Variables: ROUTER_URL, ROUTER_USER,
// ROUTER_PASS, HORA ("04:00"), PRUEBA=1 (no reinicia), AHORA=1 (ejecuta una vez ya).
const { chromium } = require('playwright-core');
const fs = require('fs');

const URL = process.env.ROUTER_URL || 'http://192.168.0.1';
const USER = process.env.ROUTER_USER || 'vodafone';
const PASS = process.env.ROUTER_PASS;
const PRUEBA = process.env.PRUEBA === '1';
const OUT = process.env.OUT || '/datos';
const log = (m) => console.log(new Date().toLocaleString('es-ES'), m);

async function visible(loc) {
  for (const el of await loc.all()) if (await el.isVisible().catch(() => false)) return el;
  return null;
}

async function routerCaido(page) {
  try { await page.request.get(URL, { timeout: 4000 }); return false; } catch { return true; }
}

async function reiniciar() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser', args: ['--no-sandbox'] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  page.on('dialog', (d) => { log('Confirmación: ' + d.message()); d.accept(); });
  const foto = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true }).catch(() => {});
  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    const pass = await visible(page.locator('input[type=password]'));
    if (!pass) throw new Error('No encuentro la casilla de contraseña');
    const user = await visible(page.locator('input[type=text], input:not([type])'));
    if (user) await user.fill(USER);
    await pass.fill(PASS);
    const entrar = await visible(page.locator('input[type=submit], button, input[type=button], a').filter({ hasText: /entrar|acceder|iniciar|login|aceptar/i }))
      || await visible(page.locator('input[type=submit], button[type=submit]'));
    if (entrar) await entrar.click(); else await pass.press('Enter');
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await foto('1-despues-de-entrar');
    if (await visible(page.locator('input[type=password]'))) {
      const txt = (await page.locator('body').innerText()).slice(0, 300);
      throw new Error('No me deja entrar. La página dice: ' + txt.replace(/\s+/g, ' '));
    }
    log('Dentro del router');

    // Guarda los textos de menús y botones para poder ajustar el script si hace falta.
    const textos = await page.locator('a, button, input[type=button], input[type=submit], li').allInnerTexts();
    fs.writeFileSync(`${OUT}/menu.txt`, [...new Set(textos.map((t) => t.trim()).filter(Boolean))].join('\n'));

    const botonReinicio = () => visible(page.getByText(/^\s*(reiniciar|reinicio|restart|reboot)/i));
    let boton = await botonReinicio();
    for (const menu of [/estado y soporte/i, /modo experto/i, /sistema/i, /mantenimiento/i, /configuraci/i]) {
      if (boton) break;
      const m = await visible(page.getByText(menu));
      if (m) { await m.click().catch(() => {}); await page.waitForTimeout(2000); boton = await botonReinicio(); }
    }
    await foto('2-antes-de-reiniciar');
    if (!boton) throw new Error('Entré, pero no encuentro el botón de reiniciar. Mira menu.txt y 2-antes-de-reiniciar.png');
    if (PRUEBA) { log('PRUEBA: botón encontrado ("' + (await boton.innerText()) + '"). No reinicio.'); return; }

    // «Reiniciar» del menú solo abre la página de reinicio; el botón de verdad está dentro.
    await boton.click();
    await page.waitForTimeout(3000);
    await foto('3-pagina-reiniciar');
    const botones = page.locator('button, input[type=button], input[type=submit], [role=button], a[class*=btn i], a[class*=button i]');
    const reiniciarOConfirmar = /reiniciar|restart|reboot|aceptar|^\s*s[ií]\s*$|^\s*ok\s*$|confirmar/i;
    for (let paso = 1; paso <= 3; paso++) {
      const vistos = [];
      let ultimo = null;
      for (const b of await botones.all()) {
        if (!(await b.isVisible().catch(() => false))) continue;
        const txt = ((await b.innerText().catch(() => '')) || (await b.inputValue().catch(() => '')) || '').trim();
        vistos.push(txt);
        if (reiniciarOConfirmar.test(txt)) ultimo = { b, txt };
      }
      log(`Paso ${paso}. Botones en pantalla: ${vistos.filter(Boolean).join(' | ') || '(ninguno)'}`);
      if (!ultimo) break;
      log(`Pulso «${ultimo.txt}»`);
      await ultimo.b.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(3000);
      await foto(`4-paso-${paso}`);
      if (await routerCaido(page)) break;
    }
    for (let s = 0; s < 18; s++) {
      if (await routerCaido(page)) { log('REINICIO CONFIRMADO: el router ha dejado de responder'); return; }
      await page.waitForTimeout(5000);
    }
    log('ERROR: pulsé los botones pero el router sigue respondiendo. Mira las fotos 3-… y 4-…');
  } catch (e) {
    await foto('error');
    log('ERROR: ' + e.message);
  } finally {
    await browser.close();
  }
}

function msHasta(hora) {
  const [h, m] = hora.split(':').map(Number);
  const t = new Date(); t.setHours(h, m, 0, 0);
  if (t <= new Date()) t.setDate(t.getDate() + 1);
  return t - new Date();
}

async function bucle() {
  const hora = process.env.HORA || '04:00';
  if (PRUEBA) await reiniciar();
  for (;;) {
    const ms = msHasta(hora);
    log(`Próximo reinicio a las ${hora} (dentro de ${Math.round(ms / 60000)} min)`);
    await new Promise((r) => setTimeout(r, ms));
    await reiniciar();
    await new Promise((r) => setTimeout(r, 61000));
  }
}

if (!PASS) { log('Falta ROUTER_PASS'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
process.env.AHORA === '1' ? reiniciar() : bucle();
