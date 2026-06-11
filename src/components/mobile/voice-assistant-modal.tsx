'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Mic, MicOff, Send, Loader2, Volume2, VolumeX,
    CheckSquare, ShoppingBag, Sparkles, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    actionResult?: { type: string; success: boolean; title?: string; name?: string } | null;
}

interface Props {
    open: boolean;
    onClose: () => void;
    userName?: string;
}

const SUGGESTIONS = [
    'A qué hora tengo el médico',
    'Añade leche a la compra',
    'Qué tareas tengo hoy',
    'Pon en tareas llamar al banco mañana',
];

export default function VoiceAssistantModal({ open, onClose, userName }: Props) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [listening, setListening] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [token, setToken] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Get auth token once
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setToken(data.session?.access_token ?? null);
        });
    }, []);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 400);
        }
    }, [open]);

    // Cleanup on close
    useEffect(() => {
        if (!open) {
            recognitionRef.current?.stop();
            setListening(false);
            audioRef.current?.pause();
            audioRef.current = null;
            window.speechSynthesis?.cancel();
        }
    }, [open]);

    const speakFallback = (text: string) => {
        if (typeof window === 'undefined') return;
        window.speechSynthesis?.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.05;
        const voices = window.speechSynthesis.getVoices();
        const spanish = voices.find(v => v.lang.startsWith('es'));
        if (spanish) utterance.voice = spanish;
        window.speechSynthesis.speak(utterance);
    };

    const speak = useCallback(async (text: string) => {
        if (!ttsEnabled) return;

        // Detener audio previo
        audioRef.current?.pause();
        audioRef.current = null;
        window.speechSynthesis?.cancel();

        // Eliminar emojis y markdown para TTS
        const clean = text
            .replace(/[^\p{L}\p{N}\s.,;:!?¿¡'-]/gu, '')
            .replace(/\*+/g, '')
            .trim()
            .slice(0, 500);

        if (!clean) return;

        try {
            const res = await fetch('/api/tts-google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: clean }),
            });

            if (!res.ok) {
                // 422 = ambas APIs fallaron → usar Web Speech
                speakFallback(clean);
                return;
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => URL.revokeObjectURL(url);
            await audio.play();
        } catch {
            speakFallback(clean);
        }
    }, [ttsEnabled]);

    const sendMessage = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || loading || !token) return;

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: trimmed,
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));

            const res = await fetch('/api/asistente-voz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ message: trimmed, history }),
            });

            const data = await res.json();
            const replyText = data.message || 'No pude procesar eso.';

            const assistantMsg: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: replyText,
                actionResult: data.actionResult ?? null,
            };
            setMessages(prev => [...prev, assistantMsg]);
            speak(replyText);
        } catch {
            const errMsg: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'Error de conexión. Inténtalo de nuevo.',
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [loading, token, messages, speak]);

    const startVoice = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) {
            alert('Tu navegador no soporta reconocimiento de voz');
            return;
        }
        if (listening) {
            recognitionRef.current?.stop();
            return;
        }

        window.speechSynthesis?.cancel();
        const rec = new SR();
        recognitionRef.current = rec;
        rec.lang = 'es-ES';
        rec.continuous = false;
        rec.interimResults = false;
        rec.onstart = () => setListening(true);
        rec.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript;
            setListening(false);
            sendMessage(transcript);
        };
        rec.onerror = () => setListening(false);
        rec.onend = () => setListening(false);
        rec.start();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const actionIcon = (type: string) =>
        type === 'ADD_TASK' ? <CheckSquare className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />;

    const actionLabel = (ar: Message['actionResult']) => {
        if (!ar) return null;
        if (ar.type === 'ADD_TASK') return `Tarea creada: ${ar.title}`;
        if (ar.type === 'ADD_SHOPPING') return `Añadido a la compra: ${ar.name}`;
        return null;
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[300] bg-slate-900/50 backdrop-blur-sm flex flex-col justify-end"
                    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
                >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="bg-white rounded-t-[32px] w-full flex flex-col shadow-2xl"
                        style={{ maxHeight: '88vh' }}
                    >
                        {/* Handle */}
                        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 flex-shrink-0">
                            <div className="bg-violet-50 p-2 rounded-xl">
                                <Sparkles className="w-5 h-5 text-violet-600" />
                            </div>
                            <div className="flex-1">
                                <h2 className="font-bold text-slate-900 text-base leading-tight">
                                    Quioba IA
                                </h2>
                                <p className="text-xs text-slate-400">Habla o escribe lo que necesitas</p>
                            </div>
                            <button
                                onClick={() => setTtsEnabled(v => !v)}
                                className={`p-2 rounded-full transition-colors ${ttsEnabled ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'}`}
                                title={ttsEnabled ? 'Desactivar voz' : 'Activar voz'}
                            >
                                {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full bg-slate-100 text-slate-500"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
                        >
                            {messages.length === 0 && (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Sparkles className="w-8 h-8 text-violet-500" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700 mb-1">
                                        Hola{userName ? `, ${userName}` : ''}
                                    </p>
                                    <p className="text-xs text-slate-400 mb-5">
                                        Puedo añadir tareas, productos a la lista o responder tus preguntas.
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {SUGGESTIONS.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => sendMessage(s)}
                                                className="text-left text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 font-medium px-4 py-2.5 rounded-2xl transition-colors active:scale-95"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
                                >
                                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                        <div
                                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                                msg.role === 'user'
                                                    ? 'bg-violet-600 text-white rounded-tr-sm'
                                                    : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                                            }`}
                                        >
                                            {msg.content}
                                        </div>
                                        {msg.actionResult?.success && (
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                                                msg.actionResult.type === 'ADD_TASK'
                                                    ? 'bg-violet-50 text-violet-600'
                                                    : 'bg-green-50 text-green-600'
                                            }`}>
                                                {actionIcon(msg.actionResult.type)}
                                                {actionLabel(msg.actionResult)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                                        <div className="flex gap-1 items-center">
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input bar */}
                        <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 pb-safe flex-shrink-0"
                            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
                        >
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={listening ? 'Escuchando...' : 'Escribe o usa el micrófono...'}
                                disabled={loading || listening}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all disabled:opacity-50"
                            />

                            <button
                                onClick={startVoice}
                                disabled={loading}
                                className={`p-3 rounded-2xl flex-shrink-0 transition-all active:scale-90 ${
                                    listening
                                        ? 'bg-red-500 text-white animate-pulse'
                                        : 'bg-violet-100 text-violet-600 hover:bg-violet-200'
                                }`}
                            >
                                {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>

                            <button
                                onClick={() => sendMessage(input)}
                                disabled={!input.trim() || loading}
                                className="p-3 rounded-2xl bg-violet-600 text-white flex-shrink-0 disabled:opacity-40 transition-all active:scale-90"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
