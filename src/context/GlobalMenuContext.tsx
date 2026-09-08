'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface GlobalMenuContextType {
    isStartMenuOpen: boolean;
    toggleStartMenu: () => void;
    closeStartMenu: () => void;
    isLauncherMode: boolean;
    setIsLauncherMode: (value: boolean) => void;
    homeMode: 'classic' | 'smart';
    setHomeMode: (mode: 'classic' | 'smart') => void;
}

const GlobalMenuContext = createContext<GlobalMenuContextType | undefined>(undefined);

export function GlobalMenuProvider({ children }: { children: React.ReactNode }) {
    const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
    const [isLauncherMode, setIsLauncherMode] = useState(false);
    const [homeMode, setHomeModeState] = useState<'classic' | 'smart'>('classic');

    useEffect(() => {
        try {
            const saved = localStorage.getItem('quioba_home_mode');
            if (saved === 'smart') setHomeModeState('smart');
        } catch {}
    }, []);

    // La app nativa (APK/iOS) siempre usa el layout de launcher: nunca el Header de escritorio,
    // independientemente de la ruta, para evitar que sus iconos se amontonen sobre la cabecera móvil.
    useEffect(() => {
        if (Capacitor.isNativePlatform() || window.innerWidth < 1024) {
            setIsLauncherMode(true);
        }
    }, []);

    const setHomeMode = (mode: 'classic' | 'smart') => {
        setHomeModeState(mode);
        try { localStorage.setItem('quioba_home_mode', mode); } catch {}
    };

    const toggleStartMenu = () => setIsStartMenuOpen(prev => !prev);
    const closeStartMenu = () => setIsStartMenuOpen(false);

    return (
        <GlobalMenuContext.Provider value={{
            isStartMenuOpen,
            toggleStartMenu,
            closeStartMenu,
            isLauncherMode,
            setIsLauncherMode,
            homeMode,
            setHomeMode,
        }}>
            {children}
        </GlobalMenuContext.Provider>
    );
}

export function useGlobalMenu() {
    const context = useContext(GlobalMenuContext);
    if (context === undefined) {
        throw new Error('useGlobalMenu must be used within a GlobalMenuProvider');
    }
    return context;
}
