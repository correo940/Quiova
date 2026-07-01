import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { getSala, agenteEnSala, construirPrompt } from '@/app/apps/oficina/vista/salas-data';
import { registrarEncargo } from '@/app/apps/oficina/vista/historial-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

// Carpeta raíz de salida, aislada por sala: <cwd>/oficina-output/<salaId>/
function carpetaSala(salaId: string): string {
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

    const dir = carpetaSala(salaId);
    await fs.mkdir(dir, { recursive: true });
    const antes = await listarArchivos(dir);

    const prompt = construirPrompt(sala, agente, encargo);

    try {
        const { resultado, error } = await ejecutarClaude(prompt, dir);
        if (error) {
            await registrarEncargo({ salaId, agente: nombreAgente, encargo, ok: false, error });
            return NextResponse.json({ ok: false, error });
        }
        const despues = await listarArchivos(dir);
        const archivos = [...despues].filter(f => !antes.has(f));
        await registrarEncargo({ salaId, agente: nombreAgente, encargo, ok: true, resultado, archivos });
        return NextResponse.json({ ok: true, resultado, archivos });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await registrarEncargo({ salaId, agente: nombreAgente, encargo, ok: false, error: msg });
        return NextResponse.json({ ok: false, error: msg });
    }
}

function ejecutarClaude(prompt: string, cwd: string): Promise<{ resultado: string; error?: string }> {
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
        }, TIMEOUT_MS);

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
