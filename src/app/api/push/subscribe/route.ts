import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedSupabaseUser } from '@/lib/server-request-auth';

export async function POST(req: Request) {
    const user = await getAuthenticatedSupabaseUser(req);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const subscription = body?.subscription;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('push_subscriptions').upsert(
        {
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
        },
        { onConflict: 'endpoint' }
    );

    if (error) {
        console.error('[push] Error guardando suscripción:', error);
        return NextResponse.json({ error: 'Error guardando suscripción' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
    const user = await getAuthenticatedSupabaseUser(req);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const endpoint = body?.endpoint;
    if (!endpoint) return NextResponse.json({ error: 'endpoint requerido' }, { status: 400 });

    await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint);
    return NextResponse.json({ ok: true });
}
