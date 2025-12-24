'use client';

import React, { createContext, useContext, useState } from 'react';

interface JournalContextType {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    selectedDate: Date | undefined;
    setSelectedDate: (date: Date | undefined) => void;
    pendingQuote: string | null;
    addQuote: (text: string) => void;
    clearPendingQuote: () => void;
    width: number;
    setWidth: (width: number) => void;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export function JournalProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [pendingQuote, setPendingQuote] = useState<string | null>(null);
    const [width, setWidth] = useState(33);

    const addQuote = (text: string) => {
        setPendingQuote(text);
        setIsOpen(true);
    };

    const clearPendingQuote = () => {
        setPendingQuote(null);
    };

    return (
        <JournalContext.Provider value={{
            isOpen,
            setIsOpen,
            selectedDate,
            setSelectedDate,
            pendingQuote,
            addQuote,
            clearPendingQuote,
            width,
            setWidth
        }}>
            {children}
        </JournalContext.Provider>
    );
}

export function useJournal() {
    const context = useContext(JournalContext);
    if (context === undefined) {
        throw new Error('useJournal must be used within a JournalProvider');
    }
    return context;
}
