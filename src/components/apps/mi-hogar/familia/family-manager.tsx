// src/components/apps/mi-hogar/familia/family-manager.tsx
'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PermissionMatrix } from './permission-matrix';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import type { PermissionLevel } from '@/lib/family/app-registry';

type Member = { id: string; invited_email: string; nickname: string | null; status: string };

export function FamilyManager() {
  const searchParams = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [levels, setLevels] = useState<Record<string, PermissionLevel>>({});
  const [acceptedCode, setAcceptedCode] = useState(false);

  const loadMembers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/family/members', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error ?? 'No se pudo cargar la familia');
      return;
    }
    setMembers(json.members ?? []);
  };

  useEffect(() => {
    loadMembers();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('families').select('id').eq('owner_id', user.id).single();
      setFamilyId(data?.id ?? null);
    });
  }, []);

  useEffect(() => {
    const code = searchParams?.get('code');
    if (!code || acceptedCode) return;
    setAcceptedCode(true);
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Inicia sesión para aceptar la invitación'); return; }
      const res = await fetch('/api/family/accept', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json?.error ?? 'No se pudo aceptar la invitación'); return; }
      toast.success('¡Te has unido a la familia!');
      window.history.replaceState({}, '', '/apps/mi-hogar/familia');
    })();
  }, [searchParams, acceptedCode]);

  const invite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? 'No se pudo enviar la invitación');
        return;
      }
      if (json.emailSent === false) {
        toast.warning(json.emailError ?? 'La invitación se creó pero no se pudo enviar el correo');
      } else {
        toast.success(`Invitación enviada a ${email.trim()}`);
      }
      setEmail('');
      await loadMembers();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error de red al invitar');
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`¿Eliminar a ${memberEmail} de la familia?`)) return;
    const { error } = await supabase.from('family_members').delete().eq('id', memberId);
    if (error) { toast.error(error.message); return; }
    toast.success(`${memberEmail} eliminado`);
    if (selected === memberId) { setSelected(null); setLevels({}); }
    await loadMembers();
  };

  const selectMember = async (memberId: string) => {
    const { data, error } = await supabase
      .from('family_app_permissions')
      .select('app_slug, level')
      .eq('member_id', memberId);
    if (error) {
      toast.error(error.message ?? 'No se pudieron cargar los permisos');
      setSelected(memberId);
      setLevels({});
      return;
    }
    const map: Record<string, PermissionLevel> = {};
    (data ?? []).forEach((row) => { map[row.app_slug] = row.level as PermissionLevel; });
    setSelected(memberId);
    setLevels(map);
  };

  const selectedMember = members.find((m) => m.id === selected);

  return (
    <div className="space-y-6">
      {/* ── Sección 1: Invitar ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Invitar miembro</CardTitle>
          <CardDescription>
            Envía una invitación por email. Si no tiene cuenta, se le creará una automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              type="email"
              disabled={inviting}
              onKeyDown={(e) => e.key === 'Enter' && invite()}
            />
            <button
              onClick={invite}
              disabled={inviting}
              className="px-4 py-2 rounded-md bg-[#1a5c2e] text-white text-sm font-medium hover:bg-[#1e7a3a] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {inviting ? 'Enviando...' : 'Invitar'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── Sección 2: Miembros ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Miembros de la familia</CardTitle>
          <CardDescription>
            {members.length === 0
              ? 'Aún no hay miembros. Invita a alguien para empezar.'
              : 'Selecciona un miembro para gestionar sus permisos.'}
          </CardDescription>
        </CardHeader>
        {members.length > 0 && (
          <CardContent>
            <div className="divide-y">
              {members.map((m) => {
                const isSelected = selected === m.id;
                const displayName = m.nickname ?? m.invited_email;
                const initial = displayName.charAt(0).toUpperCase();
                return (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer rounded-md px-2 -mx-2 transition-colors ${
                      isSelected ? 'bg-[#1a5c2e]/10' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => selectMember(m.id)}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                      isSelected ? 'bg-[#1a5c2e] text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      {m.nickname && (
                        <p className="text-xs text-muted-foreground truncate">{m.invited_email}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      m.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {m.status === 'active' ? 'Activo' : 'Pendiente'}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeMember(m.id, displayName); }}
                      className="text-xs text-red-500 hover:text-red-700 shrink-0 px-1"
                    >
                      Eliminar
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Sección 3: Permisos (solo si hay miembro seleccionado) ── */}
      {selected && familyId && selectedMember && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              Permisos de {selectedMember.nickname ?? selectedMember.invited_email}
            </CardTitle>
            <CardDescription>
              Controla a qué apps puede acceder este miembro: sin acceso, solo ver, o acceso total.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PermissionMatrix key={selected} memberId={selected} familyId={familyId} initialLevels={levels} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
