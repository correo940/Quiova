'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import MobileLauncher from '@/components/mobile/mobile-launcher';
import { Capacitor } from '@capacitor/core';
import { useGlobalMenu } from '@/context/GlobalMenuContext';
import BlogContent from '@/components/blog-content';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import LogoLoader from '@/components/ui/logo-loader';

// ── #03 Fallback estático visible sin JS ─────────────────────────────
function StaticHero() {
  return (
    <noscript>
      <div style={{ maxWidth: 800, margin: '80px auto', padding: '0 24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: '#1A4B8C', marginBottom: 16 }}>
          Quioba — Sistema operativo para tu vida personal y familiar
        </h1>
        <p style={{ fontSize: 18, color: '#444', marginBottom: 24 }}>
          Lista de la compra, Mi Economía, Botiquín, Campus escolar, Tareas, Mantenimiento y más de 15 apps conectadas entre sí.
        </p>
        <a href="/login" style={{ background: '#2D7DD2', color: '#fff', padding: '12px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>
          Entrar a Quioba
        </a>
      </div>
    </noscript>
  );
}

// ── #14 Captura de email ──────────────────────────────────────────────
function EmailCapture() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus('ok');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'ok') {
    return (
      <div className="text-center py-3 px-4 bg-green-50 rounded-xl border border-green-200 text-green-700 text-sm font-medium">
        ¡Apuntado! Te avisamos en cuanto esté listo.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 w-full max-w-md mx-auto mt-6">
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="tu@email.com"
        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
      >
        {status === 'loading' ? 'Enviando...' : 'Avísame'}
      </button>
      {status === 'error' && (
        <p className="text-xs text-red-500 mt-1">Error al guardar. Inténtalo de nuevo.</p>
      )}
    </form>
  );
}

function HomeContent() {
  const { user, loading } = useAuth();
  const [isLauncherMode, setIsLauncherMode] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const { setIsLauncherMode: setGlobalLauncherMode } = useGlobalMenu();

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    const isSmallScreen = window.innerWidth < 1024;
    if (isNative || isSmallScreen) {
      setIsLauncherMode(true);
      setGlobalLauncherMode(true);
    }
  }, [setGlobalLauncherMode]);

  // ── #12 parcial: timeout en loading de home ───────────────────────
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading && !timedOut) {
    return (
      <div className="container mx-auto px-4 py-20 min-h-[60vh] flex flex-col items-center justify-center gap-6">
        <LogoLoader size="lg" />
        <p className="text-xl font-medium text-slate-600 animate-pulse">Entrando en Quioba...</p>
      </div>
    );
  }

  if (timedOut) {
    return (
      <div className="container mx-auto px-4 py-20 min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center">
        <p className="text-lg text-slate-600">Tardando más de lo esperado.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (isLauncherMode && user) {
    return <MobileLauncher user={user} onLaunchDesktop={() => setIsLauncherMode(false)} />;
  }

  return (
    <>
      {/* ── #03 Contenido siempre visible (sin JS → noscript; con JS → normal) */}
      <StaticHero />

      {/* Bloque de captura de email solo para usuarios no autenticados */}
      {!user && (
        <div className="container mx-auto px-4 pt-8 pb-2 text-center">
          <p className="text-slate-500 text-sm mb-1">¿Quieres acceso anticipado?</p>
          <EmailCapture />
        </div>
      )}

      <BlogContent />
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-20 text-center text-slate-500">
        Cargando Quioba...
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
