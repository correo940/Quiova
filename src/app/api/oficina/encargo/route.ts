import { NextResponse } from 'next/server';
import { getSala, agenteEnSala } from '@/app/apps/oficina/vista/salas-data';
import { ejecutarEncargo } from '@/app/apps/oficina/vista/motor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
    salaId?: string;
    agente?: string;
    encargo?: string;
}

export async function POST(req: Request) {
    let body: Body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: 'Body JSON inválido.' }, { status: 400 });
    }

    const { salaId, agente: nombreAgente, encargo } = body;

    if (!salaId || !nombreAgente || !encargo || !encargo.trim()) {
        return NextResponse.json({ ok: false, error: 'Faltan salaId, agente o encargo.' }, { status: 400 });
    }

    const sala = getSala(salaId);
    if (!sala) {
        return NextResponse.json({ ok: false, error: `Sala desconocida: ${salaId}` }, { status: 400 });
    }

    const agente = agenteEnSala(salaId, nombreAgente);
    if (!agente) {
        return NextResponse.json({ ok: false, error: `El agente "${nombreAgente}" no está en ${sala.nombre}.` }, { status: 400 });
    }

    const resultado = await ejecutarEncargo(salaId, nombreAgente, encargo);
    return NextResponse.json(resultado);
}
