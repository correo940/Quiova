import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { data, error } = await supabaseAdmin
        .from('beta_users')
        .select('id, nickname, avatar_id, approved_at, created_at')
        .eq('status', 'aprobado')
        .not('approved_at', 'is', null)
        .order('approved_at', { ascending: true })
        .limit(200);

    if (error) return NextResponse.json({ error: 'Error al cargar Hall of Fame' }, { status: 500 });

    return NextResponse.json({ founders: data ?? [] });
}
