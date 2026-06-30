import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BETA_COOKIE } from '@/lib/beta/constants';
import { getBetaUserByToken, rateLimit, clientIp, isVerified } from '@/lib/beta/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const ip = clientIp(req);
    if (!rateLimit(`beta_mission:${ip}`, 30, 10 * 60 * 1000)) {
        return NextResponse.json({ error: 'Demasiados intentos.' }, { status: 429 });
    }

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

    const token = body.token || cookies().get(BETA_COOKIE)?.value;
    const key = typeof body.key === 'string' ? body.key.trim() : '';
    if (!key) return NextResponse.json({ error: 'Falta la clave de misión' }, { status: 400 });

    const user = await getBetaUserByToken(token);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!isVerified(user)) return NextResponse.json({ error: 'Debes verificar tu email para completar misiones.' }, { status: 403 });

    // Cargar misión con verification_type
    const { data: mission } = await supabaseAdmin
        .from('beta_missions')
        .select('id, key, points, active, verification_type')
        .eq('key', key)
        .maybeSingle();

    if (!mission || !mission.active) return NextResponse.json({ error: 'Misión no encontrada' }, { status: 404 });

    if (mission.verification_type === 'automatic') {
        return NextResponse.json({ error: 'Esta misión se completa automáticamente' }, { status: 400 });
    }

    // Comprobar si ya tiene una revisión activa (pending o approved) o ya completó la misión
    const { data: existingCompletion } = await supabaseAdmin
        .from('beta_mission_completions')
        .select('id')
        .eq('beta_user_id', user.id)
        .eq('mission_id', mission.id)
        .maybeSingle();

    if (existingCompletion) {
        return NextResponse.json({ error: 'Ya completaste esta misión' }, { status: 400 });
    }

    const { data: existingReview } = await supabaseAdmin
        .from('beta_mission_reviews')
        .select('id, status')
        .eq('beta_user_id', user.id)
        .eq('mission_id', mission.id)
        .in('status', ['pending', 'approved'])
        .maybeSingle();

    if (existingReview) {
        return NextResponse.json({ ok: true, pending: true, status: existingReview.status });
    }

    // ── DECLARATIVA ──────────────────────────────────────────────────────────
    if (mission.verification_type === 'declaration') {
        await supabaseAdmin.from('beta_mission_reviews').insert({
            beta_user_id: user.id,
            mission_id: mission.id,
            status: 'pending',
            description: `Declaración de misión: ${key}`,
        });
        return NextResponse.json({ ok: true, pending: true });
    }

    // ── MANUAL ────────────────────────────────────────────────────────────────
    if (mission.verification_type === 'manual') {
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        const description = typeof body.description === 'string' ? body.description.trim() : '';
        if (!title || !description) {
            return NextResponse.json({ error: 'Se requiere título y descripción' }, { status: 400 });
        }

        // Permitir reenvío si la anterior fue rechazada
        await supabaseAdmin.from('beta_mission_reviews').insert({
            beta_user_id: user.id,
            mission_id: mission.id,
            status: 'pending',
            title,
            description,
        });
        return NextResponse.json({ ok: true, pending: true });
    }

    return NextResponse.json({ error: 'Tipo de misión desconocido' }, { status: 400 });
}
