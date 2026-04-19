'use client';

import React, { createContext, useContext, useState } from 'react';

interface AiContextType {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    width: number;
    setWidth: (width: number) => void;
}

const AiContext = createContext<AiContextType | undefined>(undefined);

export function AiProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [width, setWidth] = useState(33);

    return (
        <AiContext.Provider value={{
            isOpen,
            setIsOpen,
            width,
            setWidth
        }}>
            {children}
        </AiContext.Provider>
    );
}

export function useAi() {
    const context = useContext(AiContext);
    if (context === undefined) {
        throw new Error('useAi must be used within an AiProvider');
    }
    return context;
}
