import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/require-user';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Por debajo de esto, el nombre encontrado en el catálogo ya no se parece lo
// bastante al producto del usuario como para mostrarlo como si fuera el mismo.
const SIMILITUD_MINIMA = 0.15;

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

    const { data: candidatos, error } = await supabaseAdmin.rpc('buscar_precios_similar', {
        termino: nombre,
        limite: 30,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Nos quedamos con el mejor resultado por supermercado (ahora solo hay Mercadona).
    const mejorSimPorSuper = new Map<string, number>();
    const mejorPorSuper = new Map<string, ResultadoPrecio>();
    for (const c of candidatos ?? []) {
        if (c.sim < SIMILITUD_MINIMA) continue;
        if ((mejorSimPorSuper.get(c.supermercado) ?? -1) >= c.sim) continue;
        mejorSimPorSuper.set(c.supermercado, c.sim);
        mejorPorSuper.set(c.supermercado, {
            supermercado: c.supermercado,
            nombre: c.nombre,
            precio: Number(c.precio),
            formato: c.formato,
            imagen_url: c.imagen_url,
            ean: c.ean,
            coincidenciaExacta: false,
        });
    }

    return NextResponse.json({ resultados: Array.from(mejorPorSuper.values()) });
}
