import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { assertBetaAdmin } from '@/lib/beta/admin-guard';
import { auditLog } from '@/lib/beta/audit';
import { emitEvent } from '@/lib/beta/events';
import { siteUrl } from '@/lib/beta/constants';
import { awardPoints, unlockAchievementByKey, clientIp } from '@/lib/beta/server';
import { emailApproved, emailRejected } from '@/lib/beta/emails';
import { notifyApproved, notifyRejected, notifySuspended } from '@/lib/beta/notifications';

function generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    const bytes = randomBytes(12);
    return Array.from(bytes, b => chars[b % chars.length]).join('');
}

export const dynamic = 'force-dynamic';

const STATUS_OPS: Record<string, string> = {
    approve:  'aprobado',
    reject:   'rechazado',
    suspend:  'suspendido',
    validate: 'validando',
    reset:    'pendiente',
};

export async function POST(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

    const op = String(body.op || '');
    const userId = String(body.userId || '');
    const note = typeof body.note === 'string' ? body.note : null;
    const ip = clientIp(req);

    if (!userId) return NextResponse.json({ error: 'Falta userId' }, { status: 400 });

    const { data: user } = await supabaseAdmin.from('beta_users').select('*').eq('id', userId).maybeSingle();
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    // ── Ajuste manual de puntos ─────────────────────────────────────────────
    if (op === 'adjust_points') {
        const delta = parseInt(body.delta, 10);
        if (!Number.isFinite(delta) || delta === 0) return NextResponse.json({ error: 'Delta inválido' }, { status: 400 });

        const total = await awardPoints(userId, delta, 'admin_adjust', { admin: guard.email, note });

        await auditLog({
            adminEmail: guard.email,
            action: 'adjust_points',
            targetUserId: userId,
            before: { points: user.points },
            after: { points: total },
            ip,
            meta: { delta, note },
        });
        emitEvent('POINTS_ADJUSTED', userId, { delta, note, admin: guard.email }, guard.email);

        return NextResponse.json({ ok: true, total });
    }

    // ── Cambios de estado ───────────────────────────────────────────────────
    const newStatus = STATUS_OPS[op];
    if (!newStatus) return NextResponse.json({ error: 'Operación no válida' }, { status: 400 });

    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'aprobado') update.approved_at = new Date().toISOString();

    if (op === 'approve') {
        const tempPassword = generateTempPassword();
        let authUserId: string | undefined;

        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: user.email,
            password: tempPassword,
            email_confirm: true,
        });

        if (!createErr && created?.user) {
            authUserId = created.user.id;
        } else {
            const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
            const existing = list?.users?.find((u: any) => u.email === user.email);
            if (existing) {
                await supabaseAdmin.auth.admin.updateUserById(existing.id, { password: tempPassword });
                authUserId = existing.id;
            }
        }

        if (authUserId) update.auth_user_id = authUserId;
        unlockAchievementByKey(userId, 'founder_beta').catch(() => {});
        notifyApproved(userId).catch(() => {});
        emailApproved(user.email, user.nickname, `${siteUrl()}/login`, user.id, tempPassword).catch(() => {});
    }
    if (op === 'reject') {
        notifyRejected(userId).catch(() => {});
        emailRejected(user.email, user.nickname, user.id).catch(() => {});
    }
    if (op === 'suspend') {
        notifySuspended(userId).catch(() => {});
    }

    await supabaseAdmin.from('beta_users').update(update).eq('id', userId);

    // Audit log con valores antes/después
    await auditLog({
        adminEmail: guard.email,
        action: op,
        targetUserId: userId,
        before: { status: user.status },
        after: { status: newStatus },
        ip,
        meta: { note },
    });

    // Event store
    const eventMap: Record<string, 'USER_APPROVED' | 'USER_REJECTED' | 'USER_SUSPENDED' | 'USER_REINSTATED' | 'ADMIN_ACTION'> = {
        approve:  'USER_APPROVED',
        reject:   'USER_REJECTED',
        suspend:  'USER_SUSPENDED',
        validate: 'ADMIN_ACTION',
        reset:    'USER_REINSTATED',
    };
    emitEvent(eventMap[op] ?? 'ADMIN_ACTION', userId, { from: user.status, to: newStatus, note }, guard.email);

    // Mantener beta_approval_logs para compatibilidad
    supabaseAdmin.from('beta_approval_logs').insert({
        beta_user_id: userId, from_status: user.status, to_status: newStatus,
        admin_email: guard.email, note,
    }).then(() => {});

    return NextResponse.json({ ok: true, status: newStatus });
}
