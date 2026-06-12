'use client';

import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';

export interface PlatformInfo {
    isWeb: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    isMobile: boolean;
    platform: 'web' | 'ios' | 'android';
}

/**
 * Hook para detectar la plataforma actual usando Capacitor
 * Usa tanto la plataforma como la disponibilidad de plugins nativos
 * @returns Información sobre la plataforma actual
 */
export function usePlatform(): PlatformInfo {
    const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
        isWeb: true,
        isIOS: false,
        isAndroid: false,
        isMobile: false,
        platform: 'web',
    });

    useEffect(() => {
        const checkPlatform = () => {
            const currentPlatform = Capacitor.getPlatform();
            const isNative = Capacitor.isNativePlatform();

            const hasNativeContext = typeof (window as any).Capacitor !== 'undefined' &&
                (currentPlatform === 'ios' || currentPlatform === 'android');
            const isSmallScreen = window.innerWidth < 1024;

            setPlatformInfo({
                isWeb: !hasNativeContext,
                isIOS: currentPlatform === 'ios' && hasNativeContext,
                isAndroid: currentPlatform === 'android' && hasNativeContext,
                isMobile: hasNativeContext || isNative || isSmallScreen,
                platform: currentPlatform as 'web' | 'ios' | 'android',
            });
        };

        checkPlatform();
        window.addEventListener('resize', checkPlatform);
        return () => window.removeEventListener('resize', checkPlatform);
    }, []);

    return platformInfo;
}
