import MiHogarDashboard from '@/components/apps/mi-hogar/dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Mi Hogar | Quiova',
    description: 'Gestión integral del hogar',
};

export default function MiHogarPage() {
    return <MiHogarDashboard />;
}
