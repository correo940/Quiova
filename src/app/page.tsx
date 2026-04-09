'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import HomeDashboard from '@/components/dashboard/home-dashboard';
import { supabase } from '@/lib/supabase';
import MobileLauncher from '@/components/mobile/mobile-launcher';
import { Capacitor } from '@capacitor/core';
import { useGlobalMenu } from '@/context/GlobalMenuContext';
import BlogContent from '@/components/blog-content';
import { getValidatedSession } from '@/lib/supabase-session';
import { ensureCompatibleBrowserStorage } from '@/lib/browser-storage-version';

import LogoLoader from '@/components/ui/logo-loader';

function HomeContent() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isRedirectingToLogin, setIsRedirectingToLogin] = useState(false);
  const router = useRouter();
  const { isLauncherMode, setIsLauncherMode } = useGlobalMenu();

  // Initialize display mode based on platform/screen size
  useEffect(() => {
    const checkDisplayMode = () => {
      const isNative = Capacitor.isNativePlatform();
      const isSmallScreen = window.innerWidth < 768;

      if (isNative || isSmallScreen) {
        setIsLauncherMode(true);
      }
    };

    checkDisplayMode();
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, [setIsLauncherMode]);

  // Handle Supabase Auth Session â€” with error handling so it never gets stuck
  useEffect(() => {
    let mounted = true;

    const resolveAuthSafely = async () => {
      ensureCompatibleBrowserStorage();
      try {
        const sessionResult = await Promise.race([
          getValidatedSession(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
        ]);

        if (!mounted) return;

        if (sessionResult && typeof sessionResult === 'object' && 'user' in sessionResult && sessionResult.user) {
          // Validate the session is actually alive (not a stale localStorage ghost)
          try {
            const { error } = await Promise.race([
              supabase.auth.getUser(),
              new Promise<{ data: null; error: Error }>((resolve) =>
                setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 3000)
              ),
            ]);
            if (error) {
              console.warn('Home: cached session invalid, clearing', error.message);
              await supabase.auth.signOut({ scope: 'local' });
              if (mounted) setUser(null);
              return;
            }
          } catch {
            console.warn('Home: session validation failed, clearing');
            await supabase.auth.signOut({ scope: 'local' });
            if (mounted) setUser(null);
            return;
          }
          setUser(sessionResult.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Home: Error getting session', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsAuthChecking(false);
        }
      }
    };

    resolveAuthSafely();

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
      setIsRedirectingToLogin(true);
      router.replace('/login');
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

  if (isRedirectingToLogin) {
    return (
      <div className="container mx-auto px-4 py-20 min-h-[60vh] flex flex-col items-center justify-center gap-6">
        <LogoLoader size="lg" />
        <p className="text-xl font-medium text-slate-600 animate-pulse">Abriendo acceso seguro...</p>
      </div>
    );
  }

  // Mobile Launcher View
  if (isLauncherMode && user) {
    return <MobileLauncher user={user} onLaunchDesktop={() => setIsLauncherMode(false)} />;
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

