import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/require-user';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Por debajo de esto, el nombre encontrado en el catálogo ya no se parece lo
// bastante al producto del usuario como para mostrarlo como si fuera el mismo.
const SIMILITUD_MINIMA = 0.25;
// Para un nombre genérico ("pan", "leche") Mercadona tiene varias opciones
// distintas: se muestran varias, no solo la más parecida, para poder elegir.
const MAX_OPCIONES_POR_SUPER = 10;

export type ResultadoPrecio = {
    supermercado: string;
    nombre: string;
    precio: number;
    formato: string | null;
    imagen_url: string | null;
    ean: string | null;
    coincidenciaExacta: boolean;
};

export async function GET(req: NextRequest) {
    const auth = await requireUser(req);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const ean = searchParams.get('ean')?.trim();
    const nombre = searchParams.get('nombre')?.trim();

    if (!ean && !nombre) {
        return NextResponse.json({ error: 'Falta ean o nombre' }, { status: 400 });
    }

    if (ean) {
        const { data, error } = await supabaseAdmin
            .from('precios_supermercado')
            .select('supermercado, nombre, precio, formato, imagen_url, ean')
            .eq('ean', ean);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (data?.length) {
            const resultados: ResultadoPrecio[] = data.map((d) => ({ ...d, coincidenciaExacta: true }));
            return NextResponse.json({ resultados });
        }
        // Sin match por código de barras (aún no le llegó el turno al bot, o es
        // un producto que no vende Mercadona): probamos por nombre si lo hay.
    }

    if (!nombre) {
        return NextResponse.json({ resultados: [] satisfies ResultadoPrecio[] });
    }

    // Primero la palabra exacta ("pan" -> "Pan Viena", "Barra de pan"; nunca
    // "Patata", que solo se parece en el sonido). Si con eso no llegamos al
    // máximo, se rellena con parecido de texto (para "macarrones" -> "Macarrón",
    // donde no hay ninguna palabra que coincida literalmente) sin repetir productos.
    const { data: exactos, error: errorExactos } = await supabaseAdmin.rpc('buscar_precios_contiene', {
        termino: nombre,
        limite: 40,
    });
    if (errorExactos) return NextResponse.json({ error: errorExactos.message }, { status: 500 });

    let candidatos: any[] = exactos ?? [];
    if (candidatos.length < MAX_OPCIONES_POR_SUPER) {
        const { data: parecidos, error: errorParecidos } = await supabaseAdmin.rpc('buscar_precios_similar', {
            termino: nombre,
            limite: 40,
        });
        if (errorParecidos) return NextResponse.json({ error: errorParecidos.message }, { status: 500 });
        const yaIncluidos = new Set(candidatos.map((c) => c.id));
        for (const c of parecidos ?? []) {
            if (c.sim < SIMILITUD_MINIMA || yaIncluidos.has(c.id)) continue;
            candidatos.push(c);
        }
    }

    // Varias opciones por supermercado (un nombre genérico como "pan" tiene
    // varios productos distintos en Mercadona), hasta un máximo.
    const contadorPorSuper = new Map<string, number>();
    const resultados: ResultadoPrecio[] = [];
    for (const c of candidatos ?? []) {
        const usadas = contadorPorSuper.get(c.supermercado) ?? 0;
        if (usadas >= MAX_OPCIONES_POR_SUPER) continue;
        contadorPorSuper.set(c.supermercado, usadas + 1);
        resultados.push({
            supermercado: c.supermercado,
            nombre: c.nombre,
            precio: Number(c.precio),
            formato: c.formato,
            imagen_url: c.imagen_url,
            ean: c.ean,
            coincidenciaExacta: false,
        });
    }

    return NextResponse.json({ resultados });
}
