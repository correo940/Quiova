'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useAi } from '@/context/AiContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';

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

export default function AiPanel() {
    const { isOpen, setIsOpen, width } = useAi();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'system',
                            content: `Eres la IA de Quioba, un asistente personal amigable y directo que ayuda al usuario a gestionar su vida diaria: tareas, finanzas, compras, turnos de trabajo y planificaciÃ³n. Responde siempre en espaÃ±ol, de forma concisa y Ãºtil. No menciones que eres Llama ni ningÃºn modelo externo â€” eres la IA de Quioba.`
                        },
                        ...messages.map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: userMsg }
                    ],
                    max_tokens: 500,
                }),
            });

            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content || 'Lo siento, no pude procesar tu mensaje.';
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Error al conectar con la IA. IntÃ©ntalo de nuevo.' }]);
        } finally {
            setLoading(false);
        }
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
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Mensajes */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-4">
                                <QuiobaEyes />
                                <p className="text-sm max-w-[200px]">Â¡Hola! Soy la IA de Quioba. Â¿En quÃ© te ayudo hoy?</p>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                                    msg.role === 'user'
                                        ? 'bg-emerald-500 text-white rounded-br-sm'
                                        : 'bg-muted text-foreground rounded-bl-sm'
                                }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-border shrink-0">
                        <div className="flex gap-2 items-center bg-muted rounded-2xl px-3 py-2">
                            <input
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                placeholder="EscrÃ­beme algo..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                disabled={loading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={loading || !input.trim()}
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

