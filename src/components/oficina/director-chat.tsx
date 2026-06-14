'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';

interface Mensaje {
    role: 'user' | 'assistant';
    content: string;
    ts: number;
    registrar?: string; // contenido extraído de /registrar, sin el prefijo
}

interface DirectorChatProps {
    directorId: string;
    directorNombre: string;
    accentColor: string;
    contexto: Record<string, unknown>;
    placeholder?: string;
    onRegistrar?: (contenido: string) => void;
}

const STORAGE_PREFIX = 'quioba_chat_';

function loadHistory(directorId: string): Mensaje[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_PREFIX + directorId);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveHistory(directorId: string, msgs: Mensaje[]) {
    localStorage.setItem(STORAGE_PREFIX + directorId, JSON.stringify(msgs.slice(-40)));
}

export default function DirectorChat({
    directorId,
    directorNombre,
    accentColor,
    contexto,
    placeholder = '¿Qué necesitas?',
    onRegistrar,
}: DirectorChatProps) {
    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const [input, setInput] = useState('');
    const [cargando, setCargando] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setMensajes(loadHistory(directorId));
    }, [directorId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mensajes, cargando]);

    const send = useCallback(async () => {
        const texto = input.trim();
        if (!texto || cargando) return;

        // Comando /registrar — no va al AI, muestra tarjeta de registro
        if (texto.startsWith('/registrar')) {
            const contenido = texto.slice('/registrar'.length).trim();
            const userMsg: Mensaje = {
                role: 'user',
                content: texto,
                ts: Date.now(),
                registrar: contenido || '(sin contenido)',
            };
            const next = [...mensajes, userMsg];
            setMensajes(next);
            saveHistory(directorId, next);
            setInput('');
            return;
        }

        const userMsg: Mensaje = { role: 'user', content: texto, ts: Date.now() };
        const next = [...mensajes, userMsg];
        setMensajes(next);
        setInput('');
        setCargando(true);

        try {
            const res = await fetch('/api/oficina/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    directorId,
                    message: texto,
                    // Excluir mensajes /registrar del historial enviado al AI
                    history: mensajes.filter(m => !m.registrar).slice(-12),
                    contexto,
                }),
            });
            const data = await res.json();
            const assistantMsg: Mensaje = { role: 'assistant', content: data.reply, ts: Date.now() };
            const withReply = [...next, assistantMsg];
            setMensajes(withReply);
            saveHistory(directorId, withReply);
        } catch {
            const errMsg: Mensaje = { role: 'assistant', content: 'Error de conexión. Inténtalo de nuevo.', ts: Date.now() };
            const withErr = [...next, errMsg];
            setMensajes(withErr);
            saveHistory(directorId, withErr);
        } finally {
            setCargando(false);
            inputRef.current?.focus();
        }
    }, [input, cargando, mensajes, directorId, contexto]);

    const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Historial */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
                {mensajes.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10 gap-3">
                        <div className={`w-12 h-12 rounded-2xl ${accentColor} opacity-20 flex items-center justify-center`} />
                        <p className="text-sm text-muted-foreground font-medium">
                            Despacho de {directorNombre}
                        </p>
                        <p className="text-xs text-muted-foreground/60 max-w-xs leading-relaxed">
                            Empieza la conversación. Para registrar trabajo escribe <span className="font-mono bg-muted px-1 rounded">/registrar</span> seguido de tu orden.
                        </p>
                    </div>
                )}

                {mensajes.map((m, i) => (
                    m.registrar !== undefined ? (
                        /* Tarjeta /registrar */
                        <div key={i} className="flex justify-end">
                            <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-indigo-500/30 bg-indigo-500/5 overflow-hidden">
                                <div className="px-3 py-2 border-b border-indigo-500/20 flex items-center gap-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                        /registrar
                                    </span>
                                </div>
                                <div className="px-4 py-3 space-y-3">
                                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{m.registrar}</p>
                                    {onRegistrar && i === mensajes.length - 1 && (
                                        <button
                                            onClick={() => onRegistrar(m.registrar!)}
                                            className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Generar estructura
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Mensaje normal */
                        <div
                            key={i}
                            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {m.role === 'assistant' && (
                                <div className={`w-7 h-7 rounded-xl ${accentColor} flex-shrink-0 flex items-center justify-center text-white text-xs font-black mt-0.5`}>
                                    {directorNombre.charAt(0)}
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                    m.role === 'user'
                                        ? 'bg-foreground text-background rounded-tr-sm'
                                        : 'bg-muted/60 border border-border/40 text-foreground rounded-tl-sm'
                                }`}
                            >
                                <p className="whitespace-pre-wrap">{m.content}</p>
                            </div>
                        </div>
                    )
                ))}

                {cargando && (
                    <div className="flex gap-3 justify-start">
                        <div className={`w-7 h-7 rounded-xl ${accentColor} flex-shrink-0 flex items-center justify-center text-white text-xs font-black`}>
                            {directorNombre.charAt(0)}
                        </div>
                        <div className="bg-muted/60 border border-border/40 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Revisando datos...</span>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border/40 px-4 py-3 flex gap-2 items-end">
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={placeholder}
                    rows={1}
                    className="flex-1 resize-none bg-muted/40 border border-border/50 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-border transition-colors leading-relaxed"
                    style={{ minHeight: '42px', maxHeight: '120px' }}
                    onInput={e => {
                        const t = e.currentTarget;
                        t.style.height = 'auto';
                        t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                    }}
                />
                <button
                    onClick={send}
                    disabled={!input.trim() || cargando}
                    className={`w-10 h-10 rounded-xl ${accentColor} text-white flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-opacity hover:opacity-90 active:scale-95`}
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
