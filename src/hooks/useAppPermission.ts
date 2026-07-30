import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { FamilyAppSlug } from '@/lib/family/app-registry';

type Level = 'owner' | 'none' | 'view' | 'full';

export function useAppPermission(appSlug: FamilyAppSlug) {
  const [level, setLevel] = useState<Level>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) { setLevel('none'); setLoading(false); } return; }

      // Comprobar membresia activa PRIMERO: todo perfil posee ademas su propia
      // familia solitaria (backfill de Task 1), asi que comprobar esa familia
      // propia antes dejaria inalcanzable la rama de miembro para cualquier
      // usuario que ademas sea miembro activo de otra familia.
      const { data: membership } = await supabase
        .from('family_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (membership) {
        const { data: perm } = await supabase
          .from('family_app_permissions')
          .select('level')
          .eq('member_id', membership.id)
          .eq('app_slug', appSlug)
          .maybeSingle();
        if (active) { setLevel((perm?.level as Level) ?? 'none'); setLoading(false); }
        return;
      }

      const { data: ownFamily } = await supabase.from('families').select('id').eq('owner_id', user.id).single();
      if (active) { setLevel(ownFamily ? 'owner' : 'none'); setLoading(false); }
    })();
    return () => { active = false; };
  }, [appSlug]);

  return { level, loading };
}
