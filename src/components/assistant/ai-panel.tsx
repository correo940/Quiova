'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAi } from '@/context/AiContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { toast } from 'sonner';
import { useWakeWord } from '@/hooks/use-wake-word';

function AiReply({ content }: { content: string }) {
    try {
        const parsed = JSON.parse(content);
        if (parsed.type === 'list' && Array.isArray(parsed.items)) {
            return (
                <div>
                    <div className="flex items-center gap-1.5 mb-2 font-semibold text-sm">
                        <span>{parsed.icon}</span>
                        <span>{parsed.title}</span>
                    </div>
                    <ul className="space-y-1">
                        {parsed.items.map((item: { icon: string; text: string }, i: number) => (
                            <li key={i} className="flex items-center gap-2 justify-between bg-white dark:bg-zinc-800 rounded-xl px-3 py-2 shadow-sm border border-slate-100 dark:border-zinc-700">
                                <span className="shrink-0">{item.icon}</span>
                                {(() => {
                                    const match = item.text.match(/^(.*?)\s*(x\d+)$/);
                                    if (match) {
                                        return (
                                            <>
                                                <span className="text-sm text-slate-700 dark:text-slate-200 flex-1">{match[1]}</span>
                                                <span className="text-[10px] font-semibold bg-slate-100 dark:bg-zinc-700 text-slate-400 px-2 py-0.5 rounded-full shrink-0">{match[2]}</span>
                                            </>
                                        );
                                    }
                                    return <span className="text-sm text-slate-700 dark:text-slate-200 flex-1">{item.text}</span>;
                                })()}
                            </li>
                        ))}
                    </ul>
                </div>
            );
        }
        if (parsed.type === 'text') {
            return <p className="text-sm">{parsed.content}</p>;
        }
    } catch {
        // fallback texto plano
    }
    return <p className="text-sm">{content}</p>;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

function QuiobaEyes() {
    return (
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-emerald-50">
            <img src="/images/quioba-avatar.png" alt="IA de Quioba" className="w-full h-full object-contain" />
        </div>
    );
}

// Emite un pitido agradable y futurista al reconocer la palabra
function playWakeBeep() {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    } catch {
        // Ignorar si el navegador bloquea el audio
    }
}

export default function AiPanel() {
    const { isOpen, setIsOpen, width, isWakeWordEnabled } = useAi();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [listening, setListening] = useState(false);
    const [voiceMode, setVoiceMode] = useState(false); // toggle texto/voz
    const [speaking, setSpeaking] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // ── Enviar mensaje (acepta texto directo o usa el input) ──────────
    const sendMessageWithText = async (text: string) => {
        if (!text.trim() || loading) return;
        const userMsg = text.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, { role: 'user', content: userMsg }],
                    userId: user?.id,
                }),
            });

            const data = await response.json();
            const reply = data.reply;
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

            // Leer en voz alta si voiceMode está activo
            if (voiceMode) {
                try {
                    const parsed = JSON.parse(reply);
                    if (parsed.type === 'text') speak(parsed.content);
                    else if (parsed.type === 'list') speak(`Tu ${parsed.title} tiene ${parsed.items.length} elementos.`);
                } catch {
                    speak(reply);
                }
            }
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: JSON.stringify({ type: 'text', content: 'Error al conectar. Inténtalo de nuevo.' }) }]);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = () => sendMessageWithText(input);

    // ── Micrófono ─────────────────────────────────────────────────────
    const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Tu navegador no soporta reconocimiento de voz');
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onstart = () => setListening(true);
        recognition.onend = () => setListening(false);
        recognition.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript;
            sendMessageWithText(transcript);
        };
        recognition.onerror = () => {
            setListening(false);
        };
        recognition.start();
    };

    // Wake word — escuchar "Quioba" continuamente
    const handleWakeWord = () => {
        playWakeBeep(); // <--- Emite pitido de confirmación

        setVoiceMode(true);
        if (!isOpen) {
            setIsOpen(true);
            setTimeout(() => startListening(), 800);
        } else {
            // Ya está abierto, solo reactivamos el dictado
            startListening();
        }
    };

    useWakeWord({
        onWakeWord: handleWakeWord,
        enabled: isWakeWordEnabled,
        paused: listening || speaking,  // Solo pausa si ya te está escuchando o si ella misma está hablando
    });

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Síntesis de voz ───────────────────────────────────────────────
    const speak = (text: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;
        utterance.pitch = 1.1;

        // Buscar la voz española más natural disponible
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.name.includes('Monica') || v.name.includes('Paulina') || v.name.includes('Jorge'));
        const spanish = preferred || voices.find(v => v.lang === 'es-ES') || voices.find(v => v.lang.startsWith('es'));
        if (spanish) utterance.voice = spanish;

        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        window.speechSynthesis?.cancel();
        setSpeaking(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    style={{ width: `${width}%` }}
                    className="fixed top-0 right-0 h-full bg-background border-l border-border shadow-2xl z-[60] flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 shrink-0">
                        <div className="flex items-center gap-2">
                            <QuiobaEyes />
                            <div>
                                <h2 className="font-bold text-base leading-tight">IA de Quioba</h2>
                                <p className="text-[10px] text-muted-foreground">Tu asistente personal</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Toggle texto/voz */}
                            <button
                                onClick={() => {
                                    setVoiceMode(v => !v);
                                    if (speaking) stopSpeaking();
                                }}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${voiceMode
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                    : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                                    }`}
                                title={voiceMode ? 'Modo voz activo — pulsa para desactivar' : 'Activar respuestas por voz'}
                            >
                                {voiceMode ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                                {voiceMode ? 'Voz' : 'Texto'}
                            </button>
                            {/* Parar voz */}
                            {speaking && (
                                <button
                                    onClick={stopSpeaking}
                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors"
                                    title="Parar voz"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                        <rect x="6" y="6" width="12" height="12" rx="2" />
                                    </svg>
                                </button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Mensajes */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-4">
                                <QuiobaEyes />
                                <p className="text-sm max-w-[200px]">¡Hola! Soy la IA de Quioba. ¿En qué te ayudo hoy?</p>
                                {voiceMode && (
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">🔊 Modo voz activo — te responderé en voz alta</p>
                                )}
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${msg.role === 'user'
                                    ? 'bg-emerald-500 text-white rounded-br-sm'
                                    : 'bg-muted text-foreground rounded-bl-sm'
                                    }`}>
                                    {msg.role === 'assistant' ? (
                                        <AiReply content={msg.content} />
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Pensando...</span>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-border shrink-0">
                        {/* Indicador modo voz */}
                        {listening && (
                            <div className="flex items-center justify-center gap-2 mb-2 text-xs text-red-500 font-medium animate-pulse">
                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                                Escuchando... habla ahora
                            </div>
                        )}
                        <div className="flex gap-2 items-center bg-muted rounded-2xl px-3 py-2">
                            <input
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                placeholder={listening ? 'Escuchando...' : 'Escríbeme algo...'}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                disabled={loading || listening}
                            />
                            {/* Micrófono */}
                            <button
                                onClick={startListening}
                                disabled={loading || listening}
                                className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors shrink-0 ${listening
                                    ? 'bg-red-500 animate-pulse text-white'
                                    : 'bg-slate-200 hover:bg-slate-300 dark:bg-zinc-700 dark:text-zinc-300'
                                    }`}
                                title="Hablar"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                    <line x1="12" y1="19" x2="12" y2="23" />
                                    <line x1="8" y1="23" x2="16" y2="23" />
                                </svg>
                            </button>
                            {/* Enviar */}
                            <button
                                onClick={sendMessage}
                                disabled={loading || !input.trim() || listening}
                                className="w-7 h-7 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 rounded-full transition-colors shrink-0"
                            >
                                <Send className="w-3.5 h-3.5 text-white" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
