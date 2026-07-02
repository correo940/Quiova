import { NextResponse } from 'next/server';
import { getSala, agenteEnSala } from '@/app/apps/oficina/vista/salas-data';
import { leerDirectrices, guardarDirectrices } from '@/app/apps/oficina/vista/directrices-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const salaId = searchParams.get('salaId');
    const agente = searchParams.get('agente');
    if (!salaId || !agente) {
        return NextResponse.json({ ok: false, error: 'Faltan salaId o agente.' }, { status: 400 });
    }
    if (!getSala(salaId) || !agenteEnSala(salaId, agente)) {
        return NextResponse.json({ ok: false, error: 'Agente desconocido.' }, { status: 400 });
    }
    const texto = await leerDirectrices(salaId, agente);
    return NextResponse.json({ ok: true, texto });
}

interface Body {
    salaId?: string;
    agente?: string;
    texto?: string;
}

export async function POST(req: Request) {
    let body: Body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: 'Body JSON inválido.' }, { status: 400 });
    }
    const { salaId, agente, texto } = body;
    if (!salaId || !agente || texto === undefined) {
        return NextResponse.json({ ok: false, error: 'Faltan salaId, agente o texto.' }, { status: 400 });
    }
    if (!getSala(salaId) || !agenteEnSala(salaId, agente)) {
        return NextResponse.json({ ok: false, error: 'Agente desconocido.' }, { status: 400 });
    }
    await guardarDirectrices(salaId, agente, texto);
    return NextResponse.json({ ok: true });
}
