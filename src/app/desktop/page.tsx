'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LogoLoader from '@/components/ui/logo-loader';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import HomeDashboard from '@/components/dashboard/home-dashboard';

// ── #12 Timeout de 10s con mensaje de error ───────────────────────────
export default function DesktopPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading && !timedOut) {
    return (
      <div className="container mx-auto px-4 py-20 min-h-[60vh] flex flex-col items-center justify-center gap-6">
        <LogoLoader size="lg" />
        <p className="text-xl font-medium text-slate-600 animate-pulse">Cargando tu panel...</p>
      </div>
    );
  }

  if (timedOut) {
    return (
      <div className="container mx-auto px-4 py-20 min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center">
        <p className="text-lg font-medium text-slate-700">No se pudo cargar el panel.</p>
        <p className="text-sm text-slate-500">Comprueba tu conexión e inténtalo de nuevo.</p>
        <div className="flex gap-3">
          <button
            onClick={() => { setTimedOut(false); window.location.reload(); }}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <HomeDashboard />;
}
