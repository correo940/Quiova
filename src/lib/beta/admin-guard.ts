import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SUPER_ADMIN_EMAIL } from './constants';
import type { AdminRole } from './audit';

export type { AdminRole };

export interface AdminGuardOk {
    ok: true;
    email: string;
    role: AdminRole;
}
export interface AdminGuardFail {
    ok: false;
    status: number;
    error: string;
}
export type AdminGuardResult = AdminGuardOk | AdminGuardFail;

// Verifica que la petición venga de un admin autorizado.
// Valida JWT → obtiene email → busca rol en beta_admin_roles.
// Si el email es SUPER_ADMIN_EMAIL y no tiene fila en beta_admin_roles, trata como 'admin'.
export async function assertBetaAdmin(req: Request, requiredRole: AdminRole = 'support'): Promise<AdminGuardResult> {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return { ok: false, status: 401, error: 'No autenticado' };

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return { ok: false, status: 401, error: 'Sesión inválida' };

    const email = data.user.email?.toLowerCase() ?? '';
    if (!email) return { ok: false, status: 403, error: 'No autorizado' };

    // Check role from DB
    const { data: roleRow } = await supabaseAdmin
        .from('beta_admin_roles')
        .select('role')
        .eq('email', email)
        .maybeSingle();

    // SUPER_ADMIN_EMAIL is always admin even if not in table
    const role: AdminRole = (roleRow?.role as AdminRole) ??
        (email === SUPER_ADMIN_EMAIL.toLowerCase() ? 'admin' : null as unknown as AdminRole);

    if (!role) return { ok: false, status: 403, error: 'No autorizado' };

    const ROLE_WEIGHT: Record<AdminRole, number> = { admin: 100, moderator: 50, reviewer: 30, support: 10 };
    if (ROLE_WEIGHT[role] < ROLE_WEIGHT[requiredRole]) {
        return { ok: false, status: 403, error: `Se requiere rol '${requiredRole}'` };
    }

    return { ok: true, email, role };
}

// Legacy alias — mantiene compatibilidad sin romper el código existente.
export async function logAdminAction(
    adminEmail: string,
    action: string,
    targetUserId: string | null,
    meta: Record<string, unknown> = {},
): Promise<void> {
    // Escribe en ambas tablas durante la transición
    await supabaseAdmin.from('beta_audit_log').insert({
        admin_email:    adminEmail,
        action,
        target_user_id: targetUserId,
        metadata:       meta,
    });
}
