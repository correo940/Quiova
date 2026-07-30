// src/app/api/family/members/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function client(req: NextRequest) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: req.headers.get('authorization') ?? '' } } }
  );
}

export async function GET(req: NextRequest) {
  const supabase = client(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no autenticado' }, { status: 401 });

  const { data: family } = await supabase.from('families').select('id').eq('owner_id', user.id).single();
  if (!family) return NextResponse.json({ members: [] });

  const { data: members, error } = await supabase
    .from('family_members')
    .select('id, invited_email, nickname, status, created_at')
    .eq('family_id', family.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ members });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const supabase = client(req);
  const { error } = await supabase.from('family_members').update({ status: 'removed' }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
