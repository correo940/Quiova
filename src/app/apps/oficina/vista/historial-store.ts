// ─── Store en disco del historial (solo servidor) ────────────────────────────
// Guarda cada encargo en oficina-output/historial.json, junto a los entregables.

import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { RegistroEncargo } from './historial';

const MAX_REGISTROS = 200;

function rutaHistorial(): string {
    return path.join(process.cwd(), 'oficina-output', 'historial.json');
}

export async function leerHistorial(): Promise<RegistroEncargo[]> {
    try {
        const txt = await fs.readFile(rutaHistorial(), 'utf8');
        const data = JSON.parse(txt);
        return Array.isArray(data) ? (data as RegistroEncargo[]) : [];
    } catch {
        return [];
    }
}

export async function registrarEncargo(
    r: Omit<RegistroEncargo, 'id' | 'ts'>,
): Promise<RegistroEncargo> {
    const registro: RegistroEncargo = { id: randomUUID(), ts: Date.now(), ...r };
    const actual = await leerHistorial();
    actual.push(registro);
    // Nos quedamos con los últimos MAX_REGISTROS
    const recortado = actual.slice(-MAX_REGISTROS);
    await fs.mkdir(path.dirname(rutaHistorial()), { recursive: true });
    await fs.writeFile(rutaHistorial(), JSON.stringify(recortado, null, 2), 'utf8');
    return registro;
}
