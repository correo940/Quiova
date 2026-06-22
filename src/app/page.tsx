'use client';

import React, { useState, useEffect, Suspense } from 'react';
import SmartHome from '@/components/mobile/smart-home';
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
    return <SmartHome user={user} />;
  }

  return (
    <>
      {/* ── #03 Contenido siempre visible (sin JS → noscript; con JS → normal) */}
      <StaticHero />

      {/* CTA Beta — usuarios no autenticados */}
      {!user && (
        <div className="container mx-auto px-4 pt-6 pb-2 text-center">
          <a
            href="/beta"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-md shadow-emerald-200 transition-all active:scale-95"
          >
            ✨ Únete al programa Beta — consigue acceso anticipado
          </a>
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
