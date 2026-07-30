// src/components/apps/mi-hogar/familia/permission-matrix.tsx
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FAMILY_APP_REGISTRY, PermissionLevel } from '@/lib/family/app-registry';

type Props = {
  memberId: string;
  familyId: string;
  initialLevels: Record<string, PermissionLevel>;
};

export function PermissionMatrix({ memberId, familyId, initialLevels }: Props) {
  const [levels, setLevels] = useState<Record<string, PermissionLevel>>(initialLevels);
  const [saving, setSaving] = useState<string | null>(null);

  const setLevel = async (appSlug: string, level: PermissionLevel) => {
    setSaving(appSlug);
    const previous = levels[appSlug];
    setLevels((prev) => ({ ...prev, [appSlug]: level }));
    const { error } = await supabase.from('family_app_permissions').upsert(
      { family_id: familyId, member_id: memberId, app_slug: appSlug, level },
      { onConflict: 'member_id,app_slug' }
    );
    if (error) {
      // Revertir en UI si el guardado falló
      setLevels((prev) => ({ ...prev, [appSlug]: previous ?? 'none' }));
    }
    setSaving(null);
  };

  const categories = Array.from(new Set(FAMILY_APP_REGISTRY.map((a) => a.category)));

  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <div key={cat}>
          <h3 className="font-semibold mb-2">{cat}</h3>
          <table className="w-full text-sm">
            <tbody>
              {FAMILY_APP_REGISTRY.filter((a) => a.category === cat).map((app) => (
                <tr key={app.slug} className="border-b">
                  <td className="py-2">{app.label}</td>
                  {(['none', 'view', 'full'] as const).map((lvl) => (
                    <td key={lvl}>
                      <label className="flex items-center gap-1 px-2">
                        <input
                          type="radio"
                          name={`${memberId}-${app.slug}`}
                          checked={(levels[app.slug] ?? 'none') === lvl}
                          disabled={saving === app.slug}
                          onChange={() => setLevel(app.slug, lvl)}
                        />
                        {lvl === 'none' ? 'Nada' : lvl === 'view' ? 'Solo ver' : 'Total'}
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
