import { NextResponse } from 'next/server';
import { SALAS } from '@/app/apps/oficina/vista/salas-data';
import { ejecutarClaude, ejecutarEncargo, carpetaSala } from '@/app/apps/oficina/vista/motor';
import { promises as fs } from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIMEOUT_SELECCION_MS = 90 * 1000; // la elección es una llamada corta

// Candidatos a recibir trabajo: todos menos la propia coordinación.
function plantilla() {
    return SALAS.flatMap(sala =>
        sala.agentes
            .filter(a => a.tipo !== 'coordinacion')
            .map(a => ({ salaId: sala.id, sala: sala.nombre, agente: a.nombre, rol: a.rol })),
    );
}

function promptSeleccion(encargo: string): string {
    const lista = plantilla()
        .map(c => `- salaId: "${c.salaId}", agente: "${c.agente}" (${c.sala}): ${c.rol}`)
        .join('\n');
    return [
        'Eres Hermes, el coordinador de una oficina de agentes de IA.',
        'Tu única tarea ahora es decidir qué agente debe ejecutar el encargo.',
        'Plantilla disponible:',
        lista,
        '',
        `Encargo: ${encargo}`,
        '',
        'Responde SOLO con un JSON en una línea, sin nada más, con esta forma exacta:',
        '{"salaId":"...","agente":"...","motivo":"una frase corta en español"}',
    ].join('\n');
}

interface Seleccion { salaId: string; agente: string; motivo: string }

function parsearSeleccion(texto: string): Seleccion | null {
    const m = texto.match(/\{[\s\S]*?\}/);
    if (!m) return null;
    try {
        const obj = JSON.parse(m[0]);
        if (typeof obj.salaId !== 'string' || typeof obj.agente !== 'string') return null;
        const valido = plantilla().some(c => c.salaId === obj.salaId && c.agente === obj.agente);
        if (!valido) return null;
        return { salaId: obj.salaId, agente: obj.agente, motivo: String(obj.motivo ?? '') };
    } catch {
        return null;
    }
}

export async function POST(req: Request) {
    let body: { encargo?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: 'Body JSON inválido.' }, { status: 400 });
    }

    const encargo = body.encargo?.trim();
    if (!encargo) {
        return NextResponse.json({ ok: false, error: 'Falta el encargo.' }, { status: 400 });
    }

    // 1) Hermes decide (llamada corta, en la carpeta de recepción)
    const dirRecepcion = carpetaSala('recepcion');
    await fs.mkdir(dirRecepcion, { recursive: true });
    const eleccion = await ejecutarClaude(promptSeleccion(encargo), dirRecepcion, TIMEOUT_SELECCION_MS);

    if (eleccion.error) {
        return NextResponse.json({ ok: false, error: `Hermes no pudo repartir el encargo: ${eleccion.error}` });
    }

    // 2) Si la elección no se entiende, lo ejecuta Coordinación como respaldo
    const sel = parsearSeleccion(eleccion.resultado)
        ?? { salaId: 'recepcion', agente: 'Coordinación', motivo: 'Reparto no concluyente; lo atiende Coordinación.' };

    // 3) El agente elegido ejecuta el encargo (se registra en el historial)
    const resultado = await ejecutarEncargo(sel.salaId, sel.agente, encargo);

    return NextResponse.json({
        ...resultado,
        asignadoA: { salaId: sel.salaId, agente: sel.agente, motivo: sel.motivo },
    });
}
