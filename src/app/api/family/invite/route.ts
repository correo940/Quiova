// src/app/api/family/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateInviteCode } from '@/lib/family/invite-code';

export async function POST(req: NextRequest) {
  let email: unknown;
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 });
  }
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email requerido' }, { status: 400 });
  }

  const authHeader = req.headers.get('authorization');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader ?? '' } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no autenticado' }, { status: 401 });

  const { data: family } = await supabase
    .from('families')
    .select('id')
    .eq('owner_id', user.id)
    .single();
  if (!family) return NextResponse.json({ error: 'familia no encontrada' }, { status: 404 });

  const invite_code = generateInviteCode();
  const { data: member, error } = await supabase
    .from('family_members')
    .insert({ family_id: family.id, invited_email: email, invite_code, status: 'pending' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ member });
}
