// ─── Motor de ejecución (solo servidor) ──────────────────────────────────────
// Ejecuta prompts con el CLI de Claude Code usando la cuenta local del usuario.
// Compartido por /api/oficina/encargo (directo) y /api/oficina/coordinar (Hermes).

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { getSala, agenteEnSala, construirPrompt } from './salas-data';
import { registrarEncargo } from './historial-store';
import { leerDirectrices } from './directrices-store';

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos por encargo

// Carpeta raíz de salida, aislada por sala: <cwd>/oficina-output/<salaId>/
export function carpetaSala(salaId: string): string {
    return path.join(process.cwd(), 'oficina-output', salaId);
}

async function listarArchivos(dir: string): Promise<Set<string>> {
    try {
        const entradas = await fs.readdir(dir, { withFileTypes: true });
        return new Set(entradas.filter(e => e.isFile()).map(e => e.name));
    } catch {
        return new Set();
    }
}

export function ejecutarClaude(
    prompt: string,
    cwd: string,
    timeoutMs = TIMEOUT_MS,
): Promise<{ resultado: string; error?: string }> {
    return new Promise((resolve) => {
        // shell:true → en Windows resuelve claude.cmd; en Unix usa el binario del PATH.
        // El prompt va por stdin (no como argumento) para evitar problemas de
        // escapado con texto multilínea al pasar por el shell.
        // Usar la cuenta local de Claude Code: quitamos ANTHROPIC_BASE_URL para
        // que `claude` no se redirija a un proxy inyectado en el entorno y hable
        // con la sesión del usuario. No tocamos API_KEY/AUTH_TOKEN por si son su
        // método de login legítimo.
        const env = { ...process.env };
        delete env.ANTHROPIC_BASE_URL;

        const proc = spawn(
            'claude',
            ['-p', '--dangerously-skip-permissions', '--output-format', 'text'],
            { cwd, shell: true, env },
        );
        proc.stdin.write(prompt);
        proc.stdin.end();

        let stdout = '';
        let stderr = '';
        let terminado = false;

        const timer = setTimeout(() => {
            if (terminado) return;
            terminado = true;
            proc.kill('SIGKILL');
            resolve({ resultado: '', error: 'El encargo superó el tiempo máximo (5 min).' });
        }, timeoutMs);

        proc.stdout.on('data', d => { stdout += d.toString(); });
        proc.stderr.on('data', d => { stderr += d.toString(); });

        proc.on('error', (err) => {
            if (terminado) return;
            terminado = true;
            clearTimeout(timer);
            const msg = (err as NodeJS.ErrnoException).code === 'ENOENT'
                ? 'El CLI de Claude Code no está instalado o no está en el PATH.'
                : err.message;
            resolve({ resultado: '', error: msg });
        });

        proc.on('close', (code) => {
            if (terminado) return;
            terminado = true;
            clearTimeout(timer);
            if (code === 0) {
                resolve({ resultado: stdout.trim() });
            } else {
                const detalle = stderr.trim() || stdout.trim() || `(sin salida)`;
                resolve({ resultado: '', error: `Claude Code terminó con código ${code}: ${detalle.slice(0, 800)}` });
            }
        });
    });
}

export interface ResultadoEncargo {
    ok: boolean;
    resultado?: string;
    archivos?: string[];
    error?: string;
}

/**
 * Flujo completo de un encargo a un agente concreto: valida, ejecuta en la
 * carpeta aislada de su sala, calcula archivos nuevos y lo registra en el
 * historial. Devuelve el mismo contrato que la API.
 */
export async function ejecutarEncargo(
    salaId: string,
    nombreAgente: string,
    encargo: string,
): Promise<ResultadoEncargo> {
    const sala = getSala(salaId);
    if (!sala) return { ok: false, error: `Sala desconocida: ${salaId}` };

    const agente = agenteEnSala(salaId, nombreAgente);
    if (!agente) return { ok: false, error: `El agente "${nombreAgente}" no está en ${sala.nombre}.` };

    const dir = carpetaSala(salaId);
    await fs.mkdir(dir, { recursive: true });
    const antes = await listarArchivos(dir);

    const directrices = await leerDirectrices(salaId, nombreAgente);
    const prompt = construirPrompt(sala, agente, encargo, directrices);
    const { resultado, error } = await ejecutarClaude(prompt, dir);

    if (error) {
        await registrarEncargo({ salaId, agente: nombreAgente, encargo, ok: false, error });
        return { ok: false, error };
    }

    const despues = await listarArchivos(dir);
    const archivos = [...despues].filter(f => !antes.has(f));
    await registrarEncargo({ salaId, agente: nombreAgente, encargo, ok: true, resultado, archivos });
    return { ok: true, resultado, archivos };
}
