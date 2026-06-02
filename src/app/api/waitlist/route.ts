import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usa service_role para escribir en la tabla waitlist sin auth
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('waitlist')
      .insert({ email: email.toLowerCase().trim(), created_at: new Date().toISOString() });

    // Error de duplicado (ya está en la lista) → OK igualmente
    if (error && !error.message.includes('duplicate')) {
      console.error('Waitlist insert error:', error);
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Waitlist route error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
