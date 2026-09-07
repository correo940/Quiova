import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Las rutas que llaman a un proveedor de IA gastan dinero real. Si alguna se
 * queda sin comprobar la sesion, cualquiera puede usar el backend como proxy
 * gratuito. Este test recorre las rutas y avisa antes de desplegar.
 */

const API_DIR = join(process.cwd(), 'src', 'app', 'api');

// Cobrar dinero: Groq, Gemini, OpenRouter, PlantNet, OCR.space, XTTS via Gradio
const PROVEEDORES_DE_PAGO = /groq|generativelanguage|openrouter|plantnet|ocr\.space|gradio/i;

// Formas validas de exigir identidad. Ojo: tiene que ser una llamada real,
// no basta con importarla. Por eso se exige el parentesis y se descartan
// antes las lineas de import (ahi aparece el nombre sin llamarse a nada).
const TIENE_GUARDIA = /(requireUser|requireAdmin|assertBetaAdmin|getServerSession|getAuthenticatedSupabaseUser)\s*\(|TELEGRAM_WEBHOOK_SECRET/;

function cuerpoSinImports(codigo: string): string {
    return codigo
        .split('\n')
        .filter((linea) => !/^\s*import\b/.test(linea))
        .join('\n');
}

function rutasApi(dir: string): string[] {
    const encontradas: string[] = [];
    for (const entrada of readdirSync(dir)) {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) encontradas.push(...rutasApi(ruta));
        else if (entrada === 'route.ts') encontradas.push(ruta);
    }
    return encontradas;
}

test('ninguna ruta que gaste IA queda sin comprobar la sesion', () => {
    const desprotegidas = rutasApi(API_DIR).filter((ruta) => {
        const codigo = readFileSync(ruta, 'utf8');
        return PROVEEDORES_DE_PAGO.test(codigo) && !TIENE_GUARDIA.test(cuerpoSinImports(codigo));
    });

    const legibles = desprotegidas.map((r) => r.replace(API_DIR, '').replace(/\\/g, '/'));
    expect(legibles, `Rutas de IA sin candado:\n  ${legibles.join('\n  ')}`).toEqual([]);
});

test('el webhook de Telegram comprueba el secreto', () => {
    const codigo = readFileSync(join(API_DIR, 'telegram', 'webhook', 'route.ts'), 'utf8');
    // No puede usar requireUser: lo llama Telegram, no una persona.
    expect(codigo).toContain('x-telegram-bot-api-secret-token');
});

test('las rutas del panel de administracion exigen ser el administrador', () => {
    const dir = join(API_DIR, 'admin');
    const sinComprobar = readdirSync(dir).filter((sub) => {
        const ruta = join(dir, sub, 'route.ts');
        try {
            return !/requireAdmin\s*\(/.test(cuerpoSinImports(readFileSync(ruta, 'utf8')));
        } catch {
            return false;
        }
    });

    expect(sinComprobar, `Rutas de /api/admin sin requireAdmin: ${sinComprobar.join(', ')}`).toEqual([]);
});
