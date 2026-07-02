import { NextResponse } from 'next/server';
import { leerTablon, crearItemTablon, marcarItemTablon } from '@/app/apps/oficina/vista/tablon-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    const items = await leerTablon();
    return NextResponse.json({ ok: true, items });
}

interface PostBody { texto?: string; departamento?: string; }

export async function POST(req: Request) {
    let body: PostBody;
    try { body = await req.json(); } catch {
        return NextResponse.json({ ok: false, error: 'Body JSON inválido.' }, { status: 400 });
    }
    if (!body.texto?.trim()) return NextResponse.json({ ok: false, error: 'Falta texto.' }, { status: 400 });
    await crearItemTablon(body.texto.trim(), body.departamento?.trim() || 'general');
    return NextResponse.json({ ok: true });
}

interface PatchBody { id?: string; estado?: 'pendiente' | 'hecho'; }

export async function PATCH(req: Request) {
    let body: PatchBody;
    try { body = await req.json(); } catch {
        return NextResponse.json({ ok: false, error: 'Body JSON inválido.' }, { status: 400 });
    }
    if (!body.id || !body.estado) return NextResponse.json({ ok: false, error: 'Faltan id o estado.' }, { status: 400 });
    await marcarItemTablon(body.id, body.estado);
    return NextResponse.json({ ok: true });
}
