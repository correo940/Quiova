'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAi } from '@/context/AiContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Volume2, VolumeX, BookOpen, Trash2, Plus } from 'lucide-react';
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

interface KnowledgeItem {
    id: string;
    title: string;
    content: string;
    created_at: string;
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

// ── Modal de Conocimiento ─────────────────────────────────────────────────
function KnowledgeModal({ userId, onClose }: { userId: string; onClose: () => void }) {
    const [items, setItems] = useState<KnowledgeItem[]>([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/ai-knowledge?userId=${userId}`)
            .then(r => r.json())
            .then(d => { setItems(d.knowledge || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [userId]);

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) return toast.error("Llena ambos campos");
        setSaving(true);
        try {
            const res = await fetch('/api/ai-knowledge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, title, content })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setItems([data.knowledge, ...items]);
            setTitle('');
            setContent('');
            toast.success("Conocimiento añadido");
        } catch {
            toast.error("Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await fetch(`/api/ai-knowledge?id=${id}&userId=${userId}`, { method: 'DELETE' });
            setItems(items.filter(i => i.id !== id));
            toast.success("Conocimiento eliminado");
        } catch {
            toast.error("Error al eliminar");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Base de Conocimiento</h3>
                            <p className="text-[10px] text-muted-foreground">Enseña datos a Quioba</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="w-4 h-4" /></Button>
                </div>
                <div className="p-4 overflow-y-auto space-y-4">
                    <div className="space-y-3 bg-muted/50 p-3 rounded-xl">
                        <h4 className="text-xs font-semibold">Añadir nuevo dato</h4>
                        <input
                            placeholder="Título (ej: Mi número de socio)"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full text-sm rounded-lg px-3 py-2 border border-border bg-background"
                        />
                        <textarea
                            placeholder="Contenido (ej: 48923-A)"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full text-sm rounded-lg px-3 py-2 border border-border bg-background min-h-[80px]"
                        />
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                            Guardar Conocimiento
                        </Button>
                    </div>

                    <div>
                        <h4 className="text-xs font-semibold mb-2">Conocimiento Guardado</h4>
                        {loading ? (
                            <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                        ) : items.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">No le has enseñado nada interesante aún.</p>
                        ) : (
                            <div className="space-y-2">
                                {items.map(item => (
                                    <div key={item.id} className="bg-background border border-border rounded-xl p-3 flex flex-col gap-1 relative group">
                                        <h5 className="text-sm font-semibold pr-6">{item.title}</h5>
                                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.content}</p>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function AiPanel() {
    const { isOpen, setIsOpen, width, isWakeWordEnabled, pendingPrompt, setPendingPrompt } = useAi();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [listening, setListening] = useState(false);
    const [voiceMode, setVoiceMode] = useState(false); // toggle texto/voz
    const [speaking, setSpeaking] = useState(false);
    const [waitingForMic, setWaitingForMic] = useState(false);
    const [showKnowledge, setShowKnowledge] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const voiceModeRef = useRef(voiceMode);
    useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

    const isOpenRef = useRef(isOpen);
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    const listeningRef = useRef(listening);
    useEffect(() => { listeningRef.current = listening; }, [listening]);

    const loadingRef = useRef(loading);
    useEffect(() => { loadingRef.current = loading; }, [loading]);

    const messagesRef = useRef(messages);
    useEffect(() => { messagesRef.current = messages; }, [messages]);

    const cancelRef = useRef(false);

    // ── Pre-rellenar prompt desde contexto ─────────────────────────────
    useEffect(() => {
        if (pendingPrompt && isOpen) {
            // Mandamos el texto al instante
            sendMessageWithText(pendingPrompt);
            setPendingPrompt(null);
        }
    }, [pendingPrompt, isOpen]);

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
                    messages: [...messagesRef.current, { role: 'user', content: userMsg }],
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

    const startListening = () => {
        if (listeningRef.current || !isOpenRef.current) {
            setWaitingForMic(false);
            return;
        }
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Tu navegador no soporta reconocimiento de voz');
            setWaitingForMic(false);
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onstart = () => {
            setListening(true);
            setWaitingForMic(false);
        };
        recognition.onend = () => {
            setListening(false);
            setWaitingForMic(false);
        };
        recognition.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript;
            sendMessageWithText(transcript);
        };
        recognition.onerror = () => {
            setListening(false);
            setWaitingForMic(false);
        };
        try {
            recognition.start();
        } catch (e) {
            setListening(false);
            setWaitingForMic(false);
        }
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
        paused: listening || speaking || waitingForMic,  // Solo pausa si ya te está escuchando o si ella misma está hablando
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

        // Solución técnica: guardar la referencia globalmente evita que el garbage collector la destruya en Chrome
        (window as any).__quiobaVoiceUtterance = utterance;

        cancelRef.current = false;
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => {
            setSpeaking(false);

            if (!voiceModeRef.current || !isOpenRef.current || cancelRef.current) {
                toast.error(`Debug 1: voice=${voiceModeRef.current}, open=${isOpenRef.current}, cancel=${cancelRef.current}`);
            }

            if (voiceModeRef.current && isOpenRef.current && !cancelRef.current) {
                setWaitingForMic(true);
                setTimeout(() => {
                    if (listeningRef.current || loadingRef.current) {
                        toast.error(`Debug 2: listening=${listeningRef.current}, loading=${loadingRef.current}`);
                        setWaitingForMic(false);
                    } else {
                        toast("🎤 Te toca, dime...", { position: 'top-center' });
                        startListening();
                    }
                }, 1000); // 1000ms delay to ensure Chrome TTS audio hardware releases the microphone
            }
        };
        window.speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        cancelRef.current = true;
        window.speechSynthesis?.cancel();
        setSpeaking(false);
        setWaitingForMic(false);
    };

    return (
        <>
            {/* Modal de Conocimiento (Z-index superior) */}
            <AnimatePresence>
                {showKnowledge && user?.id && (
                    <KnowledgeModal userId={user.id} onClose={() => setShowKnowledge(false)} />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Overlay para oscurecer la parte superior en móvil y poder cerrar al pulsar fuera */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-[55] md:hidden backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: '100%' }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={{ '--ai-desktop-width': `${width}%` } as React.CSSProperties}
                            className="fixed bottom-0 left-0 right-0 h-[60vh] md:h-full md:top-0 md:bottom-auto md:left-auto md:w-[var(--ai-desktop-width)] bg-background border-t md:border-t-0 md:border-l border-border shadow-2xl z-[60] flex flex-col rounded-t-[2rem] md:rounded-none overflow-hidden"
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
                                    <button
                                        onClick={() => setShowKnowledge(true)}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                        title="Enseñar a Quioba"
                                    >
                                        <BookOpen className="w-3 h-3" />
                                        Enseñar
                                    </button>
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
                                    <button
                                        onClick={() => {
                                            if (confirm('¿Empezar nueva conversación?')) {
                                                setMessages([]);
                                                if (speaking) stopSpeaking();
                                            }
                                        }}
                                        className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 dark:bg-zinc-800 dark:text-zinc-400 transition-colors"
                                        title="Nueva conversación"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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
                    </>
                )}
            </AnimatePresence>

            {/* Modal de Conocimiento */}
            <AnimatePresence>
                {showKnowledge && user?.id && (
                    <KnowledgeModal userId={user.id} onClose={() => setShowKnowledge(false)} />
                )}
            </AnimatePresence>
        </>
    );
}

