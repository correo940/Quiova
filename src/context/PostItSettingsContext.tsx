'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type PostItColors = {
    overdue: string;
    tomorrow: string;
    upcoming: string; // < 1 week
    future: string;   // > 1 week
};

type PostItSettings = {
    isVisible: boolean;
    colors: PostItColors;
    snoozeDuration: number; // in minutes
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'top-center' | 'bottom-center';
    opacity: number;
    layout: 'vertical' | 'horizontal';
    setIsVisible: (visible: boolean) => void;
    setColors: (colors: PostItColors) => void;
    setSnoozeDuration: (duration: number) => void;
    setPosition: (position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'top-center' | 'bottom-center') => void;
    setOpacity: (opacity: number) => void;
    setLayout: (layout: 'vertical' | 'horizontal') => void;
};

const defaultColors: PostItColors = {
    overdue: 'bg-red-200 dark:bg-red-300',
    tomorrow: 'bg-green-200 dark:bg-green-300',
    upcoming: 'bg-blue-200 dark:bg-blue-300',
    future: 'bg-[#fef3c7] dark:bg-[#fcd34d]',
};

const PostItSettingsContext = createContext<PostItSettings | undefined>(undefined);

export function PostItSettingsProvider({ children }: { children: React.ReactNode }) {
    const [isVisible, setIsVisible] = useState(true);
    const [colors, setColors] = useState<PostItColors>(defaultColors);
    const [snoozeDuration, setSnoozeDuration] = useState(3);
    const [position, setPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'top-center' | 'bottom-center'>('top-left');
    const [opacity, setOpacity] = useState(0.8);
    const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');

    // Load from localStorage on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem('postItSettings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                if (parsed.isVisible !== undefined) setIsVisible(parsed.isVisible);
                if (parsed.colors) setColors({ ...defaultColors, ...parsed.colors });
                if (parsed.snoozeDuration) setSnoozeDuration(parsed.snoozeDuration);
                if (parsed.position) setPosition(parsed.position);
                if (parsed.opacity !== undefined) setOpacity(parsed.opacity);
                if (parsed.layout) setLayout(parsed.layout);
            } catch (e) {
                console.error('Failed to parse post-it settings', e);
            }
        }
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        const settings = { isVisible, colors, snoozeDuration, position, opacity, layout };
        localStorage.setItem('postItSettings', JSON.stringify(settings));
    }, [isVisible, colors, snoozeDuration, position, opacity, layout]);

    return (
        <PostItSettingsContext.Provider value={{
            isVisible,
            colors,
            snoozeDuration,
            position,
            opacity,
            layout,
            setIsVisible,
            setColors,
            setSnoozeDuration,
            setPosition,
            setOpacity,
            setLayout
        }}>
            {children}
        </PostItSettingsContext.Provider>
    );
}

export function usePostItSettings() {
    const context = useContext(PostItSettingsContext);
    if (context === undefined) {
        throw new Error('usePostItSettings must be used within a PostItSettingsProvider');
    }
    return context;
}
