import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Se llama cada mañana a las 7:00 (hora España) vía vercel.json.
// 1) Trae precios de todo el catálogo de Mercadona (el listado de categorías
//    ya incluye precio, ~180 peticiones).
// 2) Rellena el código de barras (EAN) de los productos nuevos, que el listado
//    de categorías no trae — hace falta consultar cada producto por separado,
//    así que se limita por ejecución y se completa solo en días siguientes.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BASE = 'https://tienda.mercadona.es/api';
const SUPERMERCADO = 'mercadona';
const EAN_BACKFILL_LIMIT = 600;
const CONCURRENCIA = 4;
// Margen bajo maxDuration (60s): a los 45s dejamos de arrancar peticiones nuevas
// para que dé tiempo a guardar lo conseguido y responder antes de que Vercel mate la función.
const TIEMPO_LIMITE_MS = 35_000;

// Sin cabeceras de navegador real, Mercadona devuelve 403 a parte de las
// peticiones (lo detectamos probando en local). Un reintento cubre parte del resto,
// pero incluso así algunas fallan — es su protección anti-bot, no algo que podamos evitar del todo.
async function fetchJson(url: string, intentos = 3): Promise<any> {
    for (let intento = 1; intento <= intentos; intento++) {
        const res = await fetch(url, {
            headers: {
                Accept: 'application/json',
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                Referer: 'https://tienda.mercadona.es/',
            },
        });
        if (res.ok) return res.json();
        if ((res.status === 403 || res.status === 429) && intento < intentos) {
            await new Promise((r) => setTimeout(r, 400 * intento));
            continue;
        }
        throw new Error(`${url} -> ${res.status}`);
    }
}

// Ejecuta `fn` sobre `items` con como mucho `limite` peticiones en vuelo a la vez,
// para no machacar la web de Mercadona ni agotar el tiempo del cron.
async function conPool<T>(items: T[], limite: number, fn: (item: T) => Promise<void>) {
    let siguiente = 0;
    async function worker() {
        while (siguiente < items.length) {
            const item = items[siguiente++];
            await fn(item);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limite, items.length) }, worker));
}

type FilaPrecio = {
    supermercado: string;
    producto_externo_id: string;
    nombre: string;
    precio: number;
    formato: string | null;
    imagen_url: string | null;
    actualizado_en: string;
};

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const empezado = Date.now();
    const quedaTiempo = () => Date.now() - empezado < TIEMPO_LIMITE_MS;

    let subcategoryIds: number[] = [];
    try {
        const top = await fetchJson(`${BASE}/categories/`);
        subcategoryIds = (top.results ?? []).flatMap((c: any) => (c.categories ?? []).map((s: any) => s.id));
    } catch (err) {
        console.error('[precios-mercadona] No se pudo leer el listado de categorías', err);
        return NextResponse.json({ error: 'No se pudo leer categorías de Mercadona' }, { status: 502 });
    }

    const ahora = new Date().toISOString();
    const rows: FilaPrecio[] = [];
    let subcategoriasConError = 0;

    await conPool(subcategoryIds, CONCURRENCIA, async (id) => {
        if (!quedaTiempo()) return;
        try {
            const detail = await fetchJson(`${BASE}/categories/${id}/`);
            for (const group of detail.categories ?? []) {
                for (const p of group.products ?? []) {
                    const precio = parseFloat(p.price_instructions?.bulk_price);
                    if (!p.id || Number.isNaN(precio)) continue;
                    const formato = p.price_instructions?.unit_size
                        ? `${p.price_instructions.unit_size} ${p.price_instructions.size_format ?? ''}`.trim()
                        : (p.packaging ?? null);
                    rows.push({
                        supermercado: SUPERMERCADO,
                        producto_externo_id: String(p.id),
                        nombre: p.display_name ?? p.slug ?? 'Producto Mercadona',
                        precio,
                        formato,
                        imagen_url: p.thumbnail ?? null,
                        actualizado_en: ahora,
                    });
                }
            }
        } catch (err) {
            subcategoriasConError++;
            console.error('[precios-mercadona] Error en subcategoría', id, err);
        }
    });

    // Un mismo producto puede salir en más de una subcategoría (ej. aparece también
    // en un listado de "ofertas"), así que puede repetirse en `rows`. Si dos filas
    // con el mismo id caen en el mismo bloque, el upsert falla ("no puede tocar la
    // misma fila dos veces"), así que nos quedamos con una por producto.
    const rowsUnicas = Array.from(
        new Map(rows.map((r) => [`${r.supermercado}::${r.producto_externo_id}`, r])).values()
    );

    let actualizados = 0;
    const erroresGuardado: string[] = [];
    const CHUNK = 500;
    for (let i = 0; i < rowsUnicas.length; i += CHUNK) {
        const chunk = rowsUnicas.slice(i, i + CHUNK);
        const { error } = await supabaseAdmin
            .from('precios_supermercado')
            .upsert(chunk, { onConflict: 'supermercado,producto_externo_id' });
        if (error) {
            console.error('[precios-mercadona] Error guardando precios', error);
            erroresGuardado.push(error.message);
        } else {
            actualizados += chunk.length;
        }
    }

    // Código de barras de productos nuevos (poco a poco, no todos a la vez).
    const { data: pendientes } = await supabaseAdmin
        .from('precios_supermercado')
        .select('producto_externo_id')
        .eq('supermercado', SUPERMERCADO)
        .is('ean', null)
        .limit(EAN_BACKFILL_LIMIT);

    let eanRellenados = 0;
    await conPool(pendientes ?? [], CONCURRENCIA, async (p) => {
        if (!quedaTiempo()) return;
        try {
            const detail = await fetchJson(`${BASE}/products/${p.producto_externo_id}/`);
            if (detail.ean) {
                const { error } = await supabaseAdmin
                    .from('precios_supermercado')
                    .update({ ean: detail.ean })
                    .eq('supermercado', SUPERMERCADO)
                    .eq('producto_externo_id', p.producto_externo_id);
                if (!error) eanRellenados++;
            }
        } catch (err) {
            console.error('[precios-mercadona] Error leyendo EAN', p.producto_externo_id, err);
        }
    });

    return NextResponse.json({
        ok: true,
        subcategorias: subcategoryIds.length,
        subcategoriasConError,
        productosEncontrados: rowsUnicas.length,
        preciosActualizados: actualizados,
        erroresGuardado,
        eanRellenados,
        eanPendientesRestantes: Math.max((pendientes?.length ?? 0) - eanRellenados, 0),
    });
}
