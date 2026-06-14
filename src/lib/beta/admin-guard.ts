import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SUPER_ADMIN_EMAIL } from './constants';

// Verifica que la petición venga del administrador autorizado.
// El cliente envía el JWT de Supabase en el header Authorization: Bearer <token>.
export async function assertBetaAdmin(req: Request): Promise<{ ok: true; email: string } | { ok: false; status: number; error: string }> {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return { ok: false, status: 401, error: 'No autenticado' };

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return { ok: false, status: 401, error: 'Sesión inválida' };

    const email = data.user.email?.toLowerCase();
    if (!email || email !== SUPER_ADMIN_EMAIL.toLowerCase()) {
        return { ok: false, status: 403, error: 'No autorizado' };
    }
    return { ok: true, email };
}

export async function logAdminAction(adminEmail: string, action: string, targetUserId: string | null, meta: Record<string, unknown> = {}) {
    await supabaseAdmin.from('beta_admin_actions').insert({
        admin_email: adminEmail,
        action,
        target_user_id: targetUserId,
        meta,
    });
}
