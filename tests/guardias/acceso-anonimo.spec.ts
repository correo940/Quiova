import { expect, test } from '@playwright/test';

/**
 * Comprueba contra Supabase que un desconocido con la clave publica (la que
 * viaja dentro de la app, y eso es normal) no puede leer datos ni ficheros.
 * Si alguien reabre una policy por error, esto lo caza.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CLAVE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

test.skip(!URL || !CLAVE, 'Faltan NEXT_PUBLIC_SUPABASE_URL / ANON_KEY en .env.local');

const cabeceras = () => ({ apikey: CLAVE!, Authorization: `Bearer ${CLAVE!}` });

const TABLAS_PRIVADAS = [
    'profiles', 'passwords', 'documents', 'journal_entries', 'expenses',
    'medicines', 'family_messages', 'savings_accounts', 'warranties',
    'contacts', 'fcm_tokens', 'beta_users',
    'splitsmart_grupos', 'splitsmart_miembros', 'splitsmart_gastos', 'splitsmart_chat',
];

for (const tabla of TABLAS_PRIVADAS) {
    test(`un anonimo no lee filas de ${tabla}`, async ({ request }) => {
        const res = await request.get(`${URL}/rest/v1/${tabla}?select=*&limit=5`, { headers: cabeceras() });

        // 200 con lista vacia = RLS filtrando bien. 401/403 = tambien vale.
        if (res.status() === 200) {
            expect(await res.json(), `${tabla} devuelve filas a un anonimo`).toEqual([]);
        } else {
            expect([401, 403, 404]).toContain(res.status());
        }
    });
}

const BUCKETS = [
    'secure-docs', 'journal-media', 'receipts', 'chat-images',
    'chat-audio', 'avatars', 'trip-documents', 'shopping-photos',
];

for (const bucket of BUCKETS) {
    test(`un anonimo no lista los ficheros de ${bucket}`, async ({ request }) => {
        const res = await request.post(`${URL}/storage/v1/object/list/${bucket}`, {
            headers: { ...cabeceras(), 'Content-Type': 'application/json' },
            data: { prefix: '', limit: 5 },
        });

        if (res.status() === 200) {
            expect(await res.json(), `${bucket} deja enumerar ficheros`).toEqual([]);
        } else {
            expect([400, 401, 403]).toContain(res.status());
        }
    });
}

test('un anonimo no puede pedir correos con la funcion get_user_email', async ({ request }) => {
    const res = await request.post(`${URL}/rest/v1/rpc/get_user_email`, {
        headers: { ...cabeceras(), 'Content-Type': 'application/json' },
        data: { user_id: '00000000-0000-0000-0000-000000000000' },
    });

    expect(res.status(), 'get_user_email vuelve a estar abierta a anonimos').toBe(401);
});

test('un anonimo no puede pedir los contadores del panel', async ({ request }) => {
    const res = await request.post(`${URL}/rest/v1/rpc/dashboard_counts`, {
        headers: { ...cabeceras(), 'Content-Type': 'application/json' },
        data: {},
    });

    expect(res.status()).toBe(401);
});

/**
 * splitsmart_chat existio solo en el codigo durante meses: la tabla no estaba
 * en la base y los mensajes se perdian sin error. Este test no vale con
 * "no se puede leer": exige que la tabla EXISTA y ademas filtre.
 */
test('la tabla del chat de gastos existe y ademas filtra', async ({ request }) => {
    const res = await request.get(`${URL}/rest/v1/splitsmart_chat?select=id&limit=1`, {
        headers: cabeceras(),
    });

    // 404 significaria que la tabla volvio a desaparecer, no que este protegida.
    expect(res.status(), 'la tabla splitsmart_chat no existe').not.toBe(404);
    expect(res.status()).toBe(200);
    expect(await res.json(), 'el chat es legible por cualquiera').toEqual([]);
});
