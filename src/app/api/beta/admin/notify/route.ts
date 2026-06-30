import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { assertBetaAdmin, logAdminAction } from '@/lib/beta/admin-guard';
import type { NotificationType } from '@/lib/beta/constants';

export const dynamic = 'force-dynamic';

// GET: historial de notificaciones admin enviadas (últimas 100)
export async function GET(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    // Mostrar notificaciones de tipo 'info' o 'announcement' enviadas por admin
    const { data } = await supabaseAdmin
        .from('beta_notifications')
        .select('id, type, title, message, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(100);

    return NextResponse.json({ notifications: data ?? [] });
}

// POST: enviar notificación a un grupo de usuarios
export async function POST(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

    const title = String(body.title || '').trim();
    const message = String(body.message || '').trim();
    const type: NotificationType = body.type || 'info';
    const target: string = body.target || 'all';
    const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];

    if (!title || !message) return NextResponse.json({ error: 'Falta título o mensaje' }, { status: 400 });

    // Determinar destinatarios
    let targetUserIds: string[] = [];

    if (target === 'specific') {
        if (userIds.length === 0) return NextResponse.json({ error: 'No se especificaron usuarios' }, { status: 400 });
        targetUserIds = userIds;
    } else {
        let query = supabaseAdmin.from('beta_users')
            .select('id, points, auth_user_id, email_verified_at')
            .not('status', 'in', '("rechazado","suspendido")');

        if (target === 'unverified') {
            query = query.not('auth_user_id', 'is', null).is('email_verified_at', null);
        }

        const { data: users } = await query;
        const allUsers = (users ?? []) as any[];

        const { data: cfgRow } = await supabaseAdmin.from('beta_config').select('value').eq('key', 'ranking_top_n').maybeSingle();
        const topN = Number(cfgRow?.value ?? 50);

        if (target === 'top50') {
            const sorted = allUsers.sort((a: any, b: any) => b.points - a.points);
            targetUserIds = sorted.slice(0, topN).map((u: any) => u.id);
        } else if (target === 'out_top50') {
            const sorted = allUsers.sort((a: any, b: any) => b.points - a.points);
            targetUserIds = sorted.slice(topN).map((u: any) => u.id);
        } else {
            targetUserIds = allUsers.map((u: any) => u.id);
        }
    }

    if (targetUserIds.length === 0) {
        return NextResponse.json({ ok: true, sent: 0, message: 'No hay usuarios para este grupo' });
    }

    // Insertar en batches — queue_status='sent' porque se insertan directamente (sin cola)
    const BATCH = 500;
    let sent = 0;
    for (let i = 0; i < targetUserIds.length; i += BATCH) {
        const batch = targetUserIds.slice(i, i + BATCH).map(userId => ({
            user_id: userId, type, title, message,
            queue_status: 'sent',
            metadata: { admin: guard.email, target },
        }));
        const { error } = await supabaseAdmin.from('beta_notifications').insert(batch);
        if (!error) sent += batch.length;
    }

    await logAdminAction(guard.email, 'send_notification', null, {
        target, title, sent, type,
    });

    return NextResponse.json({ ok: true, sent });
}
