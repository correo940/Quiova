// Comprueba cada mañana si el portátil viejo invernó y despertó a su hora.
// Corre en CasaOS, dentro de la misma máquina que hiberna — así que este contenedor
// también se para cuando ella hiberna y se reinicia solo cuando despierta. Por eso no
// hace falta un bucle esperando toda la noche: al arrancar (justo tras el despertar)
// espera un poco a que la red esté lista y mira el registro de sucesos de Windows por SSH.
// Variables: WIN_HOST, WIN_USER (remoto), WIN_PASS, HORA_INVERNAR ("23:00"),
// HORA_DESPERTAR ("07:00"), PUERTO (8766, panel), MARGEN_MIN (15), PRUEBA=1 (comprueba ya).
const { execFile } = require('child_process');
const fs = require('fs');
const http = require('http');

const HOST = process.env.WIN_HOST;
const USER = process.env.WIN_USER || 'remoto';
const PASS = process.env.WIN_PASS;
const OUT = process.env.OUT || '/datos';
const HORA_INVERNAR = process.env.HORA_INVERNAR || '23:00';
const HORA_DESPERTAR = process.env.HORA_DESPERTAR || '07:00';
const MARGEN_MIN = Number(process.env.MARGEN_MIN || 15);
const PRUEBA = process.env.PRUEBA === '1';

const historial = [];
const log = (m) => {
  const linea = new Date().toLocaleString('es-ES') + ' ' + m;
  console.log(linea);
  historial.push(linea);
  if (historial.length > 60) historial.shift();
};
let ultimoEstado = 'Sin comprobar todavía';
let ocupado = false;

function minutosDelDia(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// SSH une con espacios los argumentos sueltos sin protegerlos, así que cmd.exe interpreta
// las barras "|" del script antes de que lleguen a PowerShell. Se manda codificado en base64
// (-EncodedCommand) para que viaje como un solo bloque sin caracteres que nadie interprete.
function ssh(comandoPowershell) {
  const codificado = Buffer.from(comandoPowershell, 'utf16le').toString('base64');
  return new Promise((resolve, reject) => {
    execFile('sshpass', [
      '-p', PASS,
      'ssh', '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10',
      `${USER}@${HOST}`,
      'powershell', '-NoProfile', '-EncodedCommand', codificado,
    ], { timeout: 20000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error((stderr || err.message).toString()));
      resolve(stdout.toString());
    });
  });
}

// Un evento suelto no basta: coge el más reciente de cada tipo y compara con la hora esperada.
function evaluar(lista, horaEsperada, etiqueta) {
  if (!lista.length) return `${etiqueta}: NO ENCONTRADO en las últimas horas`;
  const ultima = lista.sort((a, b) => b - a)[0];
  const minReal = ultima.getHours() * 60 + ultima.getMinutes();
  const diff = Math.abs(minReal - minutosDelDia(horaEsperada));
  const hora = ultima.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return diff <= MARGEN_MIN
    ? `${etiqueta}: OK a las ${hora}`
    : `${etiqueta}: RETRASO, ocurrió a las ${hora} (esperado ${horaEsperada})`;
}

async function comprobar() {
  if (ocupado) return;
  ocupado = true;
  try {
    log('Comprobando...');
    const salida = await ssh(
      "Get-WinEvent -FilterHashtable @{LogName='System'; Id=1,42; StartTime=(Get-Date).AddHours(-20)} | Select-Object TimeCreated,Id | ConvertTo-Json -Compress"
    );
    let eventos = salida.trim() ? JSON.parse(salida) : [];
    if (!Array.isArray(eventos)) eventos = [eventos];
    const dormidas = eventos.filter((e) => e.Id === 42).map((e) => new Date(e.TimeCreated));
    const despertares = eventos.filter((e) => e.Id === 1).map((e) => new Date(e.TimeCreated));

    ultimoEstado = `${evaluar(dormidas, HORA_INVERNAR, 'Invernar')} · ${evaluar(despertares, HORA_DESPERTAR, 'Despertar')}`;
    log(ultimoEstado);
  } catch (e) {
    ultimoEstado = 'ERROR: no consigo conectar (sigue invernado o sin red) — ' + e.message.replace(/\s+/g, ' ').trim();
    log(ultimoEstado);
  } finally {
    ocupado = false;
  }
}

// Página con el último estado, un botón para comprobar cuando se quiera, e historial.
function panel() {
  const puerto = Number(process.env.PUERTO || 8766);
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/comprobar') {
      if (!ocupado) comprobar();
      res.writeHead(303, { Location: '/' });
      return res.end();
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>Invernar</title>
${ocupado ? '<meta http-equiv=refresh content=5>' : ''}
<body style="font-family:system-ui;max-width:32rem;margin:2rem auto;padding:0 1rem">
<h1>Portátil viejo</h1>
<p style="font-size:1.1rem">${esc(ultimoEstado)}</p>
<form method=post action=/comprobar>
<button ${ocupado ? 'disabled' : ''} style="font-size:1.4rem;padding:1rem;width:100%">${ocupado ? 'Comprobando…' : 'Comprobar ahora'}</button></form>
<p>Debería invernar a las ${HORA_INVERNAR} y despertar a las ${HORA_DESPERTAR}.</p>
<pre style="white-space:pre-wrap;font-size:.8rem">${esc(historial.slice().reverse().join('\n'))}</pre>`);
  }).listen(puerto, () => log(`Panel en el puerto ${puerto}`));
}

if (!PASS || !HOST) { log('Falta WIN_HOST o WIN_PASS'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
panel();
setTimeout(comprobar, PRUEBA ? 1000 : 90000); // margen para que la red esté lista al arrancar
