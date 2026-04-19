'use client';
import { useEffect, useRef } from 'react';

interface UseWakeWordOptions {
    onWakeWord: () => void;
    enabled?: boolean;
    paused?: boolean;
}

export function useWakeWord({ onWakeWord, enabled = true, paused = false }: UseWakeWordOptions) {
    const recognitionRef = useRef<any>(null);
    const restartTimerRef = useRef<any>(null);
    const onWakeWordRef = useRef(onWakeWord);

    useEffect(() => {
        onWakeWordRef.current = onWakeWord;
    }, [onWakeWord]);

    useEffect(() => {
        if (!enabled || paused || typeof window === 'undefined') return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const start = () => {
            try {
                const recognition = new SpeechRecognition();
                recognition.lang = 'es-ES';
                recognition.continuous = true;
                recognition.interimResults = true;

                recognition.onresult = (e: any) => {
                    for (let i = e.resultIndex; i < e.results.length; i++) {
                        const transcript = e.results[i][0].transcript.toLowerCase().trim();
                        if (transcript.includes('quioba') || transcript.includes('kioba') || transcript.includes('quiova')) {
                            onWakeWordRef.current();
                        }
                    }
                };

                recognition.onend = () => {
                    // Reiniciar automáticamente tras 1 segundo
                    restartTimerRef.current = setTimeout(start, 1000);
                };

                recognition.onerror = (e: any) => {
                    if (e.error !== 'no-speech') {
                        restartTimerRef.current = setTimeout(start, 2000);
                    } else {
                        restartTimerRef.current = setTimeout(start, 500);
                    }
                };

                recognitionRef.current = recognition;
                recognition.start();
            } catch {
                restartTimerRef.current = setTimeout(start, 2000);
            }
        };

        start();

        return () => {
            clearTimeout(restartTimerRef.current);
            try { recognitionRef.current?.stop(); } catch {}
        };
    }, [enabled, paused]);
}
