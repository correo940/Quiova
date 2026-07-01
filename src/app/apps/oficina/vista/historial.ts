// ─── Historial de encargos ───────────────────────────────────────────────────
// Un registro por cada encargo ejecutado. Se guarda en disco
// (oficina-output/historial.json) desde el servidor puente.

export interface RegistroEncargo {
    id: string;
    ts: number;          // epoch ms
    salaId: string;
    agente: string;
    encargo: string;
    ok: boolean;
    resultado?: string;
    archivos?: string[];
    error?: string;
}

/** Lee el historial desde el endpoint (más reciente primero). */
export async function fetchHistorial(): Promise<RegistroEncargo[]> {
    try {
        const r = await fetch('/api/oficina/historial', { cache: 'no-store' });
        if (!r.ok) return [];
        return (await r.json()) as RegistroEncargo[];
    } catch {
        return [];
    }
}

/** "hace 3 min", "hace 2 h", "ayer"… — formato relativo corto en español. */
export function tiempoRelativo(ts: number, ahora = Date.now()): string {
    const s = Math.max(0, Math.round((ahora - ts) / 1000));
    if (s < 60) return 'ahora mismo';
    const m = Math.round(s / 60);
    if (m < 60) return `hace ${m} min`;
    const h = Math.round(m / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.round(h / 24);
    return d === 1 ? 'ayer' : `hace ${d} días`;
}
