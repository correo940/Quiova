import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BETA_COOKIE } from '@/lib/beta/constants';
import { getBetaUserByToken, completeMission, unlockAchievementByKey, rateLimit, clientIp, isVerified } from '@/lib/beta/server';

export const dynamic = 'force-dynamic';

// Misiones autodeclarables por el usuario (seguir redes, compartir, reportar bug).
// Las de referido/código/registro se otorgan en sus propios flujos.
const SELF_DECLARABLE = new Set([
    'follow_tiktok', 'follow_instagram', 'follow_youtube', 'share_content', 'report_bug',
]);

export async function POST(req: NextRequest) {
    const ip = clientIp(req);
    if (!rateLimit(`beta_mission:${ip}`, 30, 10 * 60 * 1000)) {
        return NextResponse.json({ error: 'Demasiados intentos.' }, { status: 429 });
    }

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

    const token = body.token || cookies().get(BETA_COOKIE)?.value;
    const key = typeof body.key === 'string' ? body.key : '';
    if (!SELF_DECLARABLE.has(key)) return NextResponse.json({ error: 'Misión no válida' }, { status: 400 });

    const user = await getBetaUserByToken(token);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!isVerified(user)) return NextResponse.json({ error: 'Debes verificar tu email para completar misiones.' }, { status: 403 });

    const { awarded, points } = await completeMission(user.id, key);
    if (awarded && key === 'report_bug') await unlockAchievementByKey(user.id, 'bug_hunter');

    return NextResponse.json({ ok: true, awarded, points });
}
