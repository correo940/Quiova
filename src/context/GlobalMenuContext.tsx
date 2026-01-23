'use client';

import React, { createContext, useContext, useState } from 'react';

interface GlobalMenuContextType {
    isStartMenuOpen: boolean;
    toggleStartMenu: () => void;
    closeStartMenu: () => void;
}

const GlobalMenuContext = createContext<GlobalMenuContextType | undefined>(undefined);

export function GlobalMenuProvider({ children }: { children: React.ReactNode }) {
    const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);

    const toggleStartMenu = () => setIsStartMenuOpen(prev => !prev);
    const closeStartMenu = () => setIsStartMenuOpen(false);

    return (
        <GlobalMenuContext.Provider value={{ isStartMenuOpen, toggleStartMenu, closeStartMenu }}>
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
