import { NextResponse } from 'next/server';
import { leerHistorial } from '@/app/apps/oficina/vista/historial-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Devuelve el historial de encargos, más reciente primero.
export async function GET() {
    const registros = await leerHistorial();
    return NextResponse.json([...registros].reverse());
}
