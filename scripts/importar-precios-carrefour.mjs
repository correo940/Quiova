// Carrefour bloquea las peticiones normales de servidor (código) con Cloudflare,
// y también bloquea las tareas programadas en la nube de Claude (esas ni
// siquiera consiguen salir a internet, por política de esa nube). Lo único que
// ha funcionado hasta ahora: pedir las páginas desde dentro de un navegador de
// verdad, usando la herramienta "Browser" de una sesión de Claude Code
// interactiva (de escritorio o móvil). Por eso esto no es un cron automático:
// alguien tiene que pedirlo ("actualiza los precios de Carrefour") desde una
// sesión con esa herramienta, y esta base de datos es compartida — con
// hacerlo una vez, queda actualizado para todos los usuarios de Quioba.
//
// PASO 1 — en el navegador (Browser pane), pegar y ejecutar esto con
// javascript_tool, con una pestaña de carrefour.es ya abierta:
//
//   function extraerEstado(html) {
//     const idx = html.indexOf('window.__INITIAL_STATE__');
//     const igual = html.indexOf('=', idx);
//     let inicio = igual + 1;
//     while (html[inicio] === ' ') inicio++;
//     let profundidad = 0, enTexto = false, escape = false, i = inicio;
//     for (; i < html.length; i++) {
//       const c = html[i];
//       if (enTexto) { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === '"') enTexto = false; continue; }
//       if (c === '"') { enTexto = true; continue; }
//       if (c === '{') profundidad++;
//       else if (c === '}') { profundidad--; if (profundidad === 0) { i++; break; } }
//     }
//     try { return JSON.parse(html.slice(inicio, i)); } catch { return null; }
//   }
//   const CATEGORIAS = [
//     { slug: 'frescos', id: 'cat20002' },
//     { slug: 'la-despensa', id: 'cat20001' },
//     { slug: 'bebidas', id: 'cat20003' },
//     { slug: 'congelados', id: 'cat21449123' },
//     // Añadir si hace falta: drogueria-y-limpieza/cat20005,
//     // cuidado-personal-e-higiene/cat20004, bebe/cat20006, mascotas/cat20007,
//     // parafarmacia/cat20008 (probados el 13-sep-2026, ~1000 productos cada una).
//   ];
//   window.__cfProductos = [];
//   const totales = {};
//   for (const cat of CATEGORIAS) {
//     const res = await fetch(`https://www.carrefour.es/supermercado/${cat.slug}/${cat.id}/c`, { headers: { Accept: 'text/html' } });
//     const estado = extraerEstado(await res.text());
//     const r = estado?.productCardList?.results;
//     totales[cat.slug] = r?.pagination?.total_results || 0;
//     for (const it of r?.items || []) if (it.product_id && it.price) window.__cfProductos.push({ id: String(it.product_id), nombre: it.name, precio: it.price, ean: it.ean13 || null, img: it.images?.desktop || null });
//   }
//   window.__cfTotales = totales;
//   const tareas = [];
//   for (const cat of CATEGORIAS) for (let offset = 24; offset < totales[cat.slug]; offset += 24) tareas.push(`https://www.carrefour.es/supermercado/${cat.slug}/${cat.id}/c?offset=${offset}`);
//   let siguiente = 0;
//   async function worker() {
//     while (siguiente < tareas.length) {
//       const url = tareas[siguiente++];
//       try {
//         const estado = extraerEstado(await (await fetch(url, { headers: { Accept: 'text/html' } })).text());
//         for (const it of estado?.productCardList?.results?.items || []) if (it.product_id && it.price) window.__cfProductos.push({ id: String(it.product_id), nombre: it.name, precio: it.price, ean: it.ean13 || null, img: it.images?.desktop || null });
//       } catch {}
//     }
//   }
//   await Promise.all(Array.from({ length: 6 }, worker));
//   ({ productos: window.__cfProductos.length });
//
// PASO 2 — sacar los datos del navegador en trozos (p. ej. de 1000 en 1000)
// con javascript_tool: JSON.stringify(window.__cfProductos.slice(0, 1000))
// — repetir avanzando el slice hasta cubrir el total. Cada resultado grande
// se guarda solo automáticamente en un fichero .txt; anotar esas rutas.
//
// PASO 3 — desde esta carpeta del proyecto, ejecutar:
//   node scripts/importar-precios-carrefour.mjs ruta1.txt ruta2.txt ...
// Acepta tanto el .txt que guarda la herramienta (con el envoltorio
// [{"type":"text","text":"..."}]) como un JSON plano [{...}, ...].

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = Object.fromEntries(
    envText.split('\n').filter((l) => l.includes('=')).map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

function parsearPrecio(texto) {
    if (!texto) return NaN;
    return parseFloat(String(texto).replace(/[^\d,.-]/g, '').replace(',', '.'));
}

// El .txt que guarda la herramienta cuando el resultado es grande envuelve el
// texto en [{"type":"text","text":"..."}], y a veces el propio "text" es el
// JSON del array pero re-codificado como string (comillas escapadas) con
// basura añadida al final ("(captured at origin ...)"). Esta función
// reconoce ambos casos.
function extraerArray(contenidoFichero) {
    let datos;
    try {
        datos = JSON.parse(contenidoFichero);
    } catch {
        throw new Error('El fichero no es JSON válido');
    }
    if (Array.isArray(datos) && datos.length && datos[0]?.id !== undefined) {
        return datos; // ya es el array de productos, directo
    }
    if (Array.isArray(datos) && datos[0]?.type === 'text') {
        let texto = datos[0].text;
        let i = 0;
        while (texto[i] !== '"') i++;
        let fin = i + 1;
        let escape = false;
        for (; fin < texto.length; fin++) {
            const c = texto[fin];
            if (escape) { escape = false; continue; }
            if (c === '\\') { escape = true; continue; }
            if (c === '"') { fin++; break; }
        }
        const comoString = JSON.parse(texto.slice(i, fin));
        return JSON.parse(comoString);
    }
    throw new Error('Formato de fichero no reconocido');
}

const ficheros = process.argv.slice(2);
if (!ficheros.length) {
    console.error('Uso: node scripts/importar-precios-carrefour.mjs fichero1.txt [fichero2.txt ...]');
    process.exit(1);
}

let productos = [];
for (const fichero of ficheros) {
    productos = productos.concat(extraerArray(fs.readFileSync(fichero, 'utf8')));
}
console.log('Productos leídos:', productos.length);

const ahora = new Date().toISOString();
const vistos = new Set();
const filas = [];
for (const p of productos) {
    const precio = parsearPrecio(p.precio);
    if (!p.id || Number.isNaN(precio) || vistos.has(p.id)) continue;
    vistos.add(p.id);
    filas.push({
        supermercado: 'carrefour',
        producto_externo_id: p.id,
        nombre: p.nombre || 'Producto Carrefour',
        precio,
        formato: null,
        ean: p.ean || null,
        imagen_url: p.img || null,
        actualizado_en: ahora,
    });
}
console.log('Filas únicas a guardar:', filas.length);

const inicio = Date.now();
let guardados = 0;
const CHUNK = 500;
for (let i = 0; i < filas.length; i += CHUNK) {
    const chunk = filas.slice(i, i + CHUNK);
    const { error } = await supabaseAdmin
        .from('precios_supermercado')
        .upsert(chunk, { onConflict: 'supermercado,producto_externo_id' });
    if (error) console.error('Error en bloque', i, error.message);
    else guardados += chunk.length;
}

console.log(`Guardados: ${guardados} en ${Date.now() - inicio}ms`);
