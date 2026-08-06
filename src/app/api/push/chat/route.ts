import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedSupabaseUser } from '@/lib/server-request-auth';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:soporte@quioba.com',
        vapidPublicKey,
        vapidPrivateKey
    );
}

export async function POST(req: Request) {
    const user = await getAuthenticatedSupabaseUser(req);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    if (!vapidPublicKey || !vapidPrivateKey) {
        return NextResponse.json({ error: 'VAPID no configurado' }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    const { roomId, roomName, messagePreview } = body || {};
    if (!roomId) return NextResponse.json({ error: 'roomId requerido' }, { status: 400 });

    const { data: members } = await supabaseAdmin
        .from('chat_room_members')
        .select('user_id')
        .eq('room_id', roomId);

    if (!members?.length) return NextResponse.json({ ok: true, sent: 0 });

    const senderProfile = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

    const senderName = senderProfile.data?.full_name || 'Alguien';
    const preview = messagePreview
        ? (messagePreview.length > 80 ? messagePreview.slice(0, 80) + '…' : messagePreview)
        : 'Nuevo mensaje';

    const recipientIds = members
        .map(m => m.user_id)
        .filter(id => id !== user.id);

    if (recipientIds.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    const { data: subs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*')
        .in('user_id', recipientIds);

    if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 });

    const payload = JSON.stringify({
        title: roomName ? `💬 ${roomName}` : `💬 ${senderName}`,
        body: `${senderName}: ${preview}`,
        url: `/apps/mi-hogar/chat/${roomId}`,
        type: 'chat',
        tag: `chat_${roomId}`,
    });

    let sent = 0;
    await Promise.all(
        subs.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    payload,
                    { urgency: 'high', TTL: 86400 }
                );
                sent++;
            } catch (err: any) {
                if (err?.statusCode === 404 || err?.statusCode === 410) {
                    await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                }
            }
        })
    );

    return NextResponse.json({ ok: true, sent });
}
