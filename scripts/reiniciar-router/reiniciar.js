// Reinicia a diario el router Vodafone Sercomm FG824CD entrando a su web como una persona.
// Corre en CasaOS (docker, imagen node:22-alpine + chromium). Variables: ROUTER_URL, ROUTER_USER,
// ROUTER_PASS, HORA ("07:10"), PUERTO (8765, panel con botón), PRUEBA=1 (no reinicia), AHORA=1 (ejecuta una vez ya).
const { chromium } = require('playwright-core');
const fs = require('fs');
const http = require('http');

const URL = process.env.ROUTER_URL || 'http://192.168.0.1';
const USER = process.env.ROUTER_USER || 'vodafone';
const PASS = process.env.ROUTER_PASS;
const PRUEBA = process.env.PRUEBA === '1';
const OUT = process.env.OUT || '/datos';
const HORA = process.env.HORA || '07:10';
const historial = [];
const log = (m) => {
  const linea = new Date().toLocaleString('es-ES') + ' ' + m;
  console.log(linea);
  historial.push(linea);
  if (historial.length > 30) historial.shift();
};
let ocupado = false;

async function visible(loc) {
  for (const el of await loc.all()) if (await el.isVisible().catch(() => false)) return el;
  return null;
}

// Un fallo suelto no basta (el router a veces tarda): tiene que dejar de responder tres veces seguidas.
async function responde() {
  try { await fetch(URL, { signal: AbortSignal.timeout(8000) }); return true; } catch { return false; }
}
async function routerCaido() {
  for (let i = 0; i < 3; i++) {
    if (await responde()) return false;
    await new Promise((r) => setTimeout(r, 5000));
  }
  return true;
}

async function reiniciar() {
  if (ocupado) return log('Ya hay un reinicio en marcha');
  ocupado = true;
  try { await reiniciarRouter(); } finally { ocupado = false; }
}

async function reiniciarRouter() {
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
    const esReiniciar = /reiniciar|restart|reboot/i;
    // Si ya hay ventana de confirmación, se pulsa esa; si no, el botón de reiniciar.
    const esConfirmar = /aplicar|aceptar|^\s*s[ií]\s*$|^\s*ok\s*$|confirmar|apply/i;
    for (let paso = 1; paso <= 3; paso++) {
      const vistos = [];
      let ultimo = null, confirmar = null;
      for (const b of await botones.all()) {
        if (!(await b.isVisible().catch(() => false))) continue;
        const txt = ((await b.innerText().catch(() => '')) || (await b.inputValue().catch(() => '')) || '').trim();
        vistos.push(txt);
        if (esReiniciar.test(txt)) ultimo = { b, txt };
        if (esConfirmar.test(txt)) confirmar = { b, txt };
      }
      log(`Paso ${paso}. Botones en pantalla: ${vistos.filter(Boolean).join(' | ') || '(ninguno)'}`);
      if (confirmar) ultimo = confirmar;
      if (!ultimo) break;
      log(`Pulso «${ultimo.txt}»`);
      await ultimo.b.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(3000);
      await foto(`4-paso-${paso}`);
      if (await routerCaido()) break;
    }
    let caido = false;
    for (let s = 0; s < 6 && !(caido = await routerCaido()); s++) await page.waitForTimeout(5000);
    if (!caido) { log('ERROR: pulsé los botones pero el router sigue respondiendo. Mira las fotos 3-… y 4-…'); return; }
    log('El router ha dejado de responder. Espero a que vuelva…');
    for (let s = 0; s < 60; s++) {
      if (await responde()) { log('REINICIO CONFIRMADO: el router se apagó y ha vuelto'); return; }
      await new Promise((r) => setTimeout(r, 5000));
    }
    log('AVISO: el router se apagó pero no ha vuelto en 5 minutos');
  } catch (e) {
    await foto('error');
    log('ERROR: ' + e.message);
  } finally {
    await browser.close();
  }
}

// Mira la hora real cada 20 s en vez de programar una espera larga: si el PC se suspende,
// esa espera se congela y el reinicio llegaría a destiempo. Margen de 10 min por si despierta tarde.
async function bucle() {
  const [h, m] = HORA.split(':').map(Number);
  const objetivo = h * 60 + m;
  if (PRUEBA) await reiniciar();
  log(`Reiniciaré cada día a las ${HORA}`);
  let ultimoDia = '';
  for (;;) {
    const ahora = new Date();
    const min = ahora.getHours() * 60 + ahora.getMinutes();
    const dia = ahora.toDateString();
    if (min >= objetivo && min < objetivo + 10 && dia !== ultimoDia) {
      ultimoDia = dia;
      await reiniciar();
    }
    await new Promise((r) => setTimeout(r, 20000));
  }
}

// Página con un botón para reiniciar cuando se quiera (desde casa o por Tailscale).
function panel() {
  const puerto = Number(process.env.PUERTO || 8765);
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/reiniciar') {
      if (!ocupado) { log('Reinicio pedido desde el panel'); reiniciar(); }
      res.writeHead(303, { Location: '/' });
      return res.end();
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>Router</title>
${ocupado ? '<meta http-equiv=refresh content=5>' : ''}
<body style="font-family:system-ui;max-width:32rem;margin:2rem auto;padding:0 1rem">
<h1>Router</h1>
<form method=post action=/reiniciar onsubmit="return confirm('¿Reiniciar el router ahora? Internet se cortará unos 2 minutos.')">
<button ${ocupado ? 'disabled' : ''} style="font-size:1.4rem;padding:1rem;width:100%">${ocupado ? 'Reiniciando…' : 'Reiniciar router'}</button></form>
<p>Reinicio automático cada día a las ${HORA}.</p>
<pre style="white-space:pre-wrap;font-size:.8rem">${esc(historial.slice().reverse().join('\n'))}</pre>`);
  }).listen(puerto, () => log(`Panel en el puerto ${puerto}`));
}

if (!PASS) { log('Falta ROUTER_PASS'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
if (process.env.AHORA === '1') reiniciar();
else { panel(); bucle(); }
