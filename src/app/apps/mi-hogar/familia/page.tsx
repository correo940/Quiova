// src/app/apps/mi-hogar/familia/page.tsx
import { FamilyManager } from '@/components/apps/mi-hogar/familia/family-manager';

export default function FamiliaPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto pb-nav">
      <h1 className="text-2xl font-bold mb-4">Gestionar familia</h1>
      <FamilyManager />
    </div>
  );
}
