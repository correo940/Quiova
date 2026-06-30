import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { assertBetaAdmin } from '@/lib/beta/admin-guard';

export const dynamic = 'force-dynamic';

function isoToDay(iso: string) { return iso.slice(0, 10); }

function lastNDays(n: number) {
    const days: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86_400_000);
        days.push(d.toISOString().slice(0, 10));
    }
    return days;
}

function daysAgo(n: number) {
    return new Date(Date.now() - n * 86_400_000).toISOString();
}

function formatDay(iso: string) {
    const d = new Date(iso + 'T12:00:00Z');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export async function GET(req: NextRequest) {
    const guard = await assertBetaAdmin(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(req.url);
    const days = Math.min(90, parseInt(searchParams.get('days') || '30', 10));
    const since = daysAgo(days);

    const [regRes, completionRes, referralRes, codeRes, statusRes, missionTopRes] = await Promise.all([
        supabaseAdmin.from('beta_users').select('created_at').gte('created_at', since),
        supabaseAdmin.from('beta_mission_completions').select('created_at').gte('created_at', since),
        supabaseAdmin.from('beta_referrals').select('created_at').eq('status', 'validated').gte('created_at', since),
        supabaseAdmin.from('beta_secret_code_claims').select('created_at').gte('created_at', since),
        supabaseAdmin.from('beta_users').select('status'),
        // Top misiones completadas
        supabaseAdmin.from('beta_mission_completions')
            .select('mission_id, beta_missions(key, title)')
            .gte('created_at', since),
    ]);

    const daysArr = lastNDays(days);

    function countByDay(rows: any[]): Record<string, number> {
        const m: Record<string, number> = {};
        for (const r of rows) { const d = isoToDay(r.created_at); m[d] = (m[d] ?? 0) + 1; }
        return m;
    }

    const regMap = countByDay(regRes.data ?? []);
    const compMap = countByDay(completionRes.data ?? []);
    const refMap = countByDay(referralRes.data ?? []);
    const codeMap = countByDay(codeRes.data ?? []);

    const timeline = daysArr.map(d => ({
        date: d,
        label: formatDay(d),
        registrations: regMap[d] ?? 0,
        missions: compMap[d] ?? 0,
        referrals: refMap[d] ?? 0,
        codes: codeMap[d] ?? 0,
    }));

    // Status breakdown
    const statusCount: Record<string, number> = {};
    for (const u of (statusRes.data ?? []) as any[]) {
        statusCount[u.status] = (statusCount[u.status] ?? 0) + 1;
    }

    // Top missions
    const missionCount: Record<string, { key: string; title: string; count: number }> = {};
    for (const c of (missionTopRes.data ?? []) as any[]) {
        const key = c.beta_missions?.key ?? 'unknown';
        const title = c.beta_missions?.title ?? key;
        if (!missionCount[key]) missionCount[key] = { key, title, count: 0 };
        missionCount[key].count++;
    }
    const topMissions = Object.values(missionCount).sort((a, b) => b.count - a.count).slice(0, 8);

    // Totals
    const totals = {
        registrations: (regRes.data ?? []).length,
        missions: (completionRes.data ?? []).length,
        referrals: (referralRes.data ?? []).length,
        codes: (codeRes.data ?? []).length,
    };

    return NextResponse.json({ timeline, statusCount, topMissions, totals, days });
}
