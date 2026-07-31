// src/app/api/family/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateInviteCode } from '@/lib/family/invite-code';
import nodemailer from 'nodemailer';

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

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

  // Comprobar si el email ya tiene cuenta; si no, crear una con contraseña temporal
  let tempPassword: string | null = null;
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const exists = existingUsers?.users?.some((u) => u.email === email);
  if (!exists) {
    tempPassword = generateTempPassword();
    const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });
    if (createErr) return NextResponse.json({ error: `No se pudo crear cuenta: ${createErr.message}` }, { status: 400 });
  }

  const invite_code = generateInviteCode();
  const { data: member, error } = await supabase
    .from('family_members')
    .insert({ family_id: family.id, invited_email: email, invite_code, status: 'pending' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Enviar email de invitación via Gmail
  const gmailUser = process.env.GMAIL_USER || 'quioba.web@gmail.com';
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailPass && member) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quioba.com';
    const acceptUrl = `${siteUrl}/apps/mi-hogar/familia?code=${invite_code}`;
    const credentialsBlock = tempPassword
      ? `<p style="font-size:15px;color:#334155;margin-top:12px">Se ha creado una cuenta para ti:</p>
         <p style="font-size:15px;color:#334155"><b>Email:</b> ${email}</p>
         <p style="font-size:15px;color:#334155"><b>Contraseña:</b> <code style="background:#f1f5f9;padding:4px 10px;border-radius:6px;font-weight:bold">${tempPassword}</code></p>
         <p style="font-size:13px;color:#64748b">Puedes cambiar tu contraseña desde tu perfil una vez dentro.</p>`
      : '';
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });
    transporter.sendMail({
      from: `Quioba <${gmailUser}>`,
      to: email,
      subject: 'Te han invitado a una familia en Quioba',
      html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0f172a">
        <div style="font-size:22px;font-weight:800;color:#1a5c2e;margin-bottom:16px">Quioba</div>
        <h1 style="font-size:20px;margin:0 0 12px">¡Te han invitado a un plan familiar!</h1>
        <p style="font-size:15px;line-height:1.6;color:#334155">Alguien quiere compartir su hogar digital contigo en Quioba. Inicia sesión y haz clic en el botón para aceptar.</p>
        ${credentialsBlock}
        <p style="font-size:15px;color:#334155;margin-top:12px">Tu código de invitación: <code style="background:#f1f5f9;padding:4px 10px;border-radius:6px;font-weight:bold">${invite_code}</code></p>
        <a href="${acceptUrl}" style="display:inline-block;background:#1a5c2e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-weight:700;margin-top:16px">Aceptar invitación</a>
        <p style="font-size:12px;color:#94a3b8;margin-top:32px">Si no conoces a quien te invitó, ignora este correo.</p>
      </div>`,
    }).catch(() => {});
  }

  return NextResponse.json({ member });
}
