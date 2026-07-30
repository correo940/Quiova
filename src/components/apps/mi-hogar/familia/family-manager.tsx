// src/components/apps/mi-hogar/familia/family-manager.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PermissionMatrix } from './permission-matrix';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { PermissionLevel } from '@/lib/family/app-registry';

type Member = { id: string; invited_email: string; nickname: string | null; status: string };

export function FamilyManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [levels, setLevels] = useState<Record<string, PermissionLevel>>({});

  const loadMembers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/family/members', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const json = await res.json();
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
      setEmail('');
      await loadMembers();
    } finally {
      setInviting(false);
    }
  };

  const selectMember = async (memberId: string) => {
    setSelected(memberId);
    const { data } = await supabase
      .from('family_app_permissions')
      .select('app_slug, level')
      .eq('member_id', memberId);
    const map: Record<string, PermissionLevel> = {};
    (data ?? []).forEach((row) => { map[row.app_slug] = row.level as PermissionLevel; });
    setLevels(map);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@ejemplo.com"
          type="email"
          disabled={inviting}
        />
        <button
          onClick={invite}
          disabled={inviting}
          className="px-3 py-1 rounded bg-[#1a5c2e] text-white disabled:opacity-50"
        >
          Invitar
        </button>
      </div>
      <ul className="space-y-1">
        {members.map((m) => (
          <li key={m.id}>
            <button onClick={() => selectMember(m.id)} className="underline">
              {m.nickname ?? m.invited_email} ({m.status})
            </button>
          </li>
        ))}
      </ul>
      {selected && familyId && (
        <PermissionMatrix memberId={selected} familyId={familyId} initialLevels={levels} />
      )}
    </div>
  );
}
