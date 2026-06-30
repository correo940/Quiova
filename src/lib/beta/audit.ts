import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type AdminRole = 'admin' | 'moderator' | 'reviewer' | 'support';

export interface AuditEntry {
    adminEmail: string;
    action: string;
    targetUserId?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    ip?: string;
    meta?: Record<string, unknown>;
}

// Registra una acción administrativa con valores antes/después.
// Escribe en beta_audit_log (no en beta_admin_actions).
export async function auditLog(entry: AuditEntry): Promise<void> {
    const { error } = await supabaseAdmin.from('beta_audit_log').insert({
        admin_email:    entry.adminEmail,
        action:         entry.action,
        target_user_id: entry.targetUserId ?? null,
        before_value:   entry.before ?? null,
        after_value:    entry.after ?? null,
        ip:             entry.ip ?? null,
        metadata:       entry.meta ?? {},
    });
    if (error) console.error('[beta/audit] auditLog error:', entry.action, error.message);
}

// Versión fire-and-forget (para rutas donde no queremos bloquear la respuesta).
export function auditLogAsync(entry: AuditEntry): void {
    auditLog(entry).catch(e => console.error('[beta/audit] auditLogAsync error:', e));
}

// Obtiene el rol de un admin desde la tabla beta_admin_roles.
// Devuelve null si no está registrado.
export async function getAdminRole(email: string): Promise<AdminRole | null> {
    const { data } = await supabaseAdmin
        .from('beta_admin_roles')
        .select('role')
        .eq('email', email.toLowerCase())
        .maybeSingle();
    return (data?.role as AdminRole) ?? null;
}

// Verifica que el email tenga al menos el rol requerido.
const ROLE_WEIGHT: Record<AdminRole, number> = {
    admin:     100,
    moderator:  50,
    reviewer:   30,
    support:    10,
};

export function roleHasPermission(role: AdminRole, required: AdminRole): boolean {
    return ROLE_WEIGHT[role] >= ROLE_WEIGHT[required];
}
