import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { assertBetaAdmin, logAdminAction } from '@/lib/beta/admin-guard';
import { auditLog } from '@/lib/beta/audit';
import { emitEvent } from '@/lib/beta/events';
import { evaluateAchievements, clientIp } from '@/lib/beta/server';

export const dynamic = 'force-dynamic';

// GET /api/beta/admin/review?status=pending&limit=50
export async function GET(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));

    const { data, error } = await supabaseAdmin
        .from('beta_mission_reviews')
        .select(`
            id, status, title, description, created_at, reviewed_at, reviewed_by,
            beta_users ( id, nickname, email, avatar_id, points ),
            beta_missions ( id, key, title, points, verification_type )
        `)
        .eq('status', status)
        .order('created_at', { ascending: true })
        .limit(limit);

    if (error) return NextResponse.json({ error: 'Error al cargar revisiones' }, { status: 500 });

    return NextResponse.json({ reviews: data ?? [] });
}

// POST /api/beta/admin/review  { reviewId, action: 'approve' | 'reject' }
export async function POST(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

    const { reviewId, action } = body;
    if (!reviewId || !['approve', 'reject'].includes(action)) {
        return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    // Cargar revisión para tener beta_user_id disponible para logs y achievements
    const { data: review } = await supabaseAdmin
        .from('beta_mission_reviews')
        .select('id, beta_user_id, mission_id, status')
        .eq('id', reviewId)
        .maybeSingle();

    if (!review) return NextResponse.json({ error: 'Revisión no encontrada' }, { status: 404 });

    if (action === 'approve') {
        // RPC atómico: FOR UPDATE + aprobación + completion + puntos en una transacción
        const { data: result, error: rpcErr } = await supabaseAdmin.rpc('beta_approve_mission_review', {
            p_review_id: reviewId,
            p_reviewed_by: guard.email,
        });

        if (rpcErr) {
            console.error('[admin/review] RPC error:', rpcErr);
            return NextResponse.json({ error: 'Error interno al aprobar la revisión' }, { status: 500 });
        }
        if (result === 'not_found') return NextResponse.json({ error: 'Revisión no encontrada' }, { status: 404 });
        if (result === 'not_pending') return NextResponse.json({ error: 'Esta revisión ya fue procesada' }, { status: 400 });

        // Evaluar logros (eventual — no bloquea la respuesta)
        evaluateAchievements(review.beta_user_id).catch(() => {});

        await auditLog({
            adminEmail: guard.email,
            action: 'approve_mission_review',
            targetUserId: review.beta_user_id,
            before: { status: 'pending' },
            after: { status: 'approved' },
            ip: clientIp(req),
            meta: { reviewId },
        });
        emitEvent('MISSION_APPROVED', review.beta_user_id, { reviewId }, guard.email);
    } else {
        const { error: rejErr } = await supabaseAdmin
            .from('beta_mission_reviews')
            .update({ status: 'rejected', reviewed_by: guard.email, reviewed_at: new Date().toISOString() })
            .eq('id', reviewId)
            .eq('status', 'pending');

        if (rejErr) return NextResponse.json({ error: 'Error al rechazar la revisión' }, { status: 500 });

        await auditLog({
            adminEmail: guard.email,
            action: 'reject_mission_review',
            targetUserId: review.beta_user_id,
            before: { status: 'pending' },
            after: { status: 'rejected' },
            ip: clientIp(req),
            meta: { reviewId },
        });
        emitEvent('MISSION_REJECTED', review.beta_user_id, { reviewId }, guard.email);
    }

    return NextResponse.json({ ok: true });
}
