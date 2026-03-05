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
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const router = useRouter();
  const { isLauncherMode, setIsLauncherMode } = useGlobalMenu();

  // Initialize display mode based on platform/screen size
  useEffect(() => {
    const checkDisplayMode = () => {
      const isNative = Capacitor.isNativePlatform();
      const isSmallScreen = window.innerWidth < 768;

      // If we are on mobile/small screen, we should be in launcher mode
      if (isNative || isSmallScreen) {
        setIsLauncherMode(true);
      }
    };

    checkDisplayMode();
    // Add a small delay to allow context to stabilize before finishing loading
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, [setIsLauncherMode]);

  // Handle Supabase Auth Session
  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        setUser(session?.user ?? null);
        setIsAuthChecking(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setIsAuthChecking(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Redirect to login ONLY if we are sure we need it and are in launcher mode
  useEffect(() => {
    if (!isAuthChecking && !loading && isLauncherMode && !user) {
      router.push('/login');
    }
  }, [isLauncherMode, user, isAuthChecking, loading, router]);

  // Loading state (Branded)
  if (isAuthChecking || (loading && !isLauncherMode)) {
    return (
      <div className="container mx-auto px-4 py-20 min-h-[60vh] flex flex-col items-center justify-center gap-6">
        <LogoLoader size="lg" />
        <p className="text-xl font-medium text-slate-600 animate-pulse">Entrando en Quioba...</p>
      </div>
    );
  }

  // Mobile Launcher View
  if (isLauncherMode && user) {
    return <MobileLauncher onLaunchDesktop={() => setIsLauncherMode(false)} />;
  }

  // Desktop Dashboard View
  if (user) {
    return <HomeDashboard />;
  }

  // Guest/Web View (Blog Content)
  return <BlogContent />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-20 text-center">Cargando...</div>}>
      <HomeContent />
    </Suspense>
  );
}
