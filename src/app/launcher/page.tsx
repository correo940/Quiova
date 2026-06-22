'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import MobileLauncher from '@/components/mobile/mobile-launcher';
import { Capacitor } from '@capacitor/core';
import { useGlobalMenu } from '@/context/GlobalMenuContext';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import LogoLoader from '@/components/ui/logo-loader';

function LauncherContent() {
    const { user, loading } = useAuth();
    const [isLauncherMode, setIsLauncherMode] = useState(false);
    const { setIsLauncherMode: setGlobalLauncherMode } = useGlobalMenu();
    const router = useRouter();

    useEffect(() => {
        const isNative = Capacitor.isNativePlatform();
        const isSmallScreen = window.innerWidth < 1024;
        if (isNative || isSmallScreen) {
            setIsLauncherMode(true);
            setGlobalLauncherMode(true);
        } else {
            router.replace('/desktop');
        }
    }, [setGlobalLauncherMode, router]);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-20 min-h-[60vh] flex flex-col items-center justify-center gap-6">
                <LogoLoader size="lg" />
                <p className="text-xl font-medium text-slate-600 animate-pulse">Cargando...</p>
            </div>
        );
    }

    if (!user || !isLauncherMode) return null;

    return (
        <MobileLauncher
            user={user}
            onLaunchDesktop={() => router.push('/desktop')}
        />
    );
}

export default function LauncherPage() {
    return (
        <Suspense fallback={
            <div className="container mx-auto px-4 py-20 text-center text-slate-500">
                Cargando...
            </div>
        }>
            <LauncherContent />
        </Suspense>
    );
}
