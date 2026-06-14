import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { BETA_COOKIE } from '@/lib/beta/constants';
import { getBetaUserByToken } from '@/lib/beta/server';

export const dynamic = 'force-dynamic';

// GET — últimas 30 notificaciones + unread count
export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('t') || cookies().get(BETA_COOKIE)?.value;
    const user = await getBetaUserByToken(token);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const [listRes, countRes] = await Promise.all([
        supabaseAdmin
            .from('beta_notifications')
            .select('id, type, title, message, is_read, created_at, metadata')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(30),
        supabaseAdmin
            .from('beta_notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false),
    ]);

    return NextResponse.json({
        notifications: listRes.data ?? [],
        unreadCount: countRes.count ?? 0,
    });
}

// PATCH — marcar como leída(s)
// body: { ids: string[] }  — ids específicos
// body: { all: true }      — todas
export async function PATCH(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('t') || cookies().get(BETA_COOKIE)?.value;
    const user = await getBetaUserByToken(token);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    let body: any;
    try { body = await req.json(); } catch { body = {}; }

    if (body.all === true) {
        await supabaseAdmin
            .from('beta_notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
        await supabaseAdmin
            .from('beta_notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .in('id', body.ids);
    }

    return NextResponse.json({ ok: true });
}
