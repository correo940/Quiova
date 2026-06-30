import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { BETA_COOKIE } from '@/lib/beta/constants';
import { getBetaUserByToken } from '@/lib/beta/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const token = req.cookies.get(BETA_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const user = await getBetaUserByToken(token);
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    if (user.email_verified_at) return NextResponse.json({ ok: true, alreadyVerified: true });

    // Confirmar en Supabase Auth si tiene cuenta vinculada
    if (user.auth_user_id) {
        await supabaseAdmin.auth.admin.updateUserById(user.auth_user_id, { email_confirm: true });
    }

    // Marcar como verificado en beta_users
    await supabaseAdmin
        .from('beta_users')
        .update({ email_verified_at: new Date().toISOString() })
        .eq('id', user.id);

    return NextResponse.json({ ok: true });
}
