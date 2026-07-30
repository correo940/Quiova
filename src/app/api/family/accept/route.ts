// src/app/api/family/accept/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: 'code requerido' }, { status: 400 });

  const authHeader = req.headers.get('authorization');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader ?? '' } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no autenticado' }, { status: 401 });

  // Requiere permiso: family_members_owner_rw solo deja escribir al dueño,
  // así que la asignación de user_id/status se hace via RPC security definer.
  const { data, error } = await supabase.rpc('accept_family_invite', { p_code: code });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ result: data });
}
