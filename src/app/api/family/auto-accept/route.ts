import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader ?? '' } } }
  );
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'no autenticado' }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: pending, error: findErr } = await admin
    .from('family_members')
    .select('id, family_id')
    .eq('invited_email', user.email)
    .eq('status', 'pending')
    .is('user_id', null)
    .maybeSingle();

  if (findErr || !pending) {
    return NextResponse.json({ error: 'No hay invitación pendiente' }, { status: 404 });
  }

  const { error: updateErr } = await admin
    .from('family_members')
    .update({ user_id: user.id, status: 'active' })
    .eq('id', pending.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, family_id: pending.family_id });
}
