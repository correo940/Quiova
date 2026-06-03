import type { Metadata } from 'next';

import CampusDashboard from '@/components/apps/el-campus/campus-dashboard';

export const metadata: Metadata = {
  title: 'El Campus | Quioba',
  description: 'Centro académico para alumnos, familias y universidad.',
};

export default function ElCampusPage() {
  return <CampusDashboard />;
}
