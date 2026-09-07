import { expect, test } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * El enlace de invitacion da acceso a los gastos de un grupo, asi que quien
 * no tenga sesion no debe poder ni canjearlo ni generarlo.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CLAVE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

test.skip(!URL || !CLAVE, 'Faltan NEXT_PUBLIC_SUPABASE_URL / ANON_KEY en .env.local');

const cabeceras = () => ({ apikey: CLAVE!, Authorization: `Bearer ${CLAVE!}`, 'Content-Type': 'application/json' });

test('un anonimo no puede canjear un enlace de invitacion', async ({ request }) => {
    const res = await request.post(`${URL}/rest/v1/rpc/splitsmart_unirse`, {
        headers: cabeceras(),
        data: { p_codigo: 'LOQUESEA' },
    });
    expect(res.status()).toBe(401);
});

test('un anonimo no puede generar enlaces de invitacion', async ({ request }) => {
    const res = await request.post(`${URL}/rest/v1/rpc/splitsmart_renovar_codigo`, {
        headers: cabeceras(),
        data: { p_grupo: '00000000-0000-0000-0000-000000000000' },
    });
    expect(res.status()).toBe(401);
});

test('un anonimo no puede leer los codigos de invitacion de los grupos', async ({ request }) => {
    const res = await request.get(`${URL}/rest/v1/splitsmart_grupos?select=invite_code&limit=5`, {
        headers: cabeceras(),
    });
    if (res.status() === 200) {
        expect(await res.json()).toEqual([]);
    } else {
        expect([401, 403]).toContain(res.status());
    }
});

test('el enlace apunta a Quioba y no a un dominio ajeno', () => {
    // Antes apuntaba a splitsmart.app, que no es nuestro: invitar no funcionaba.
    const page = readFileSync(
        join(process.cwd(), 'src', 'app', 'apps', 'mi-hogar', 'expenses', 'page.tsx'), 'utf8');

    expect(page).not.toContain('splitsmart.app');
    expect(page).toContain('expenses/unirse?c=');
});

test('la pantalla de unirse manda al login con el parametro que este acepta', () => {
    // El login solo entiende ?redirect= y solo rutas de /apps/mi-hogar.
    const unirse = readFileSync(
        join(process.cwd(), 'src', 'app', 'apps', 'mi-hogar', 'expenses', 'unirse', 'page.tsx'), 'utf8');

    expect(unirse).toContain('login?redirect=');
    expect(unirse).not.toContain('login?next=');
});
