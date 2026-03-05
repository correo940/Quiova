'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import HomeDashboard from '@/components/dashboard/home-dashboard';
import { supabase } from '@/lib/supabase';
import MobileLauncher from '@/components/mobile/mobile-launcher';
import { Capacitor } from '@capacitor/core';
import { useGlobalMenu } from '@/context/GlobalMenuContext';
import BlogContent from '@/components/blog-content';

import LogoLoader from '@/components/ui/logo-loader';

function HomeContent() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { isLauncherMode, setIsLauncherMode } = useGlobalMenu();

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    const isSmallScreen = window.innerWidth < 768;
    if (isNative || isSmallScreen) {
      setIsLauncherMode(true);
      setLoading(false);
    }
  }, [setIsLauncherMode]);

  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthChecking(false);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthChecking(false);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthChecking && isLauncherMode && !user) {
      router.push('/login');
    }
  }, [isLauncherMode, user, isAuthChecking, router]);

  if (isAuthChecking || (loading && !isLauncherMode && !user)) {
    return (
      <div className="container mx-auto px-4 py-20 min-h-[60vh] flex flex-col items-center justify-center gap-6">
        <LogoLoader size="lg" />
        <p className="text-xl font-medium text-slate-600 animate-pulse">Entrando en Quioba...</p>
      </div>
    );
  }

  if (isLauncherMode && user) {
    return <MobileLauncher onLaunchDesktop={() => setIsLauncherMode(false)} />;
  }

  if (user) {
    return <HomeDashboard />;
  }

  // Si no hay usuario y no es launcher (web guest), mostramos el blog minimalista
  return <BlogContent />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-20 text-center">Cargando...</div>}>
      <HomeContent />
    </Suspense>
  );
}
