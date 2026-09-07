'use client';

import React from 'react';
import { QUICK_REPLIES } from '@/lib/splitsmart/constantes';

/**
 * Pestaña de chat de SplitSmart. Extraida de page.tsx sin cambiar nada:
 * mismo marcado y mismo comportamiento, solo que ahora recibe lo que necesita
 * por props en vez de leerlo del cierre de una funcion de 3.700 lineas.
 */
interface ChatTabProps {
    grupo: any;
    grupos: any[];
    grupoIdx: number;
    onCambiarGrupo: (indice: number) => void;
    yoChat: string;
    setYoChat: (nombre: string) => void;
    chatInput: string;
    setChatInput: (texto: string) => void;
    enviarMensaje: () => void;
    toggleMsgReaccion: (mensajeId: any, emoji: string) => void;
}

export default function ChatTab({
    grupo, grupos, grupoIdx, onCambiarGrupo,
    yoChat, setYoChat, chatInput, setChatInput,
    enviarMensaje, toggleMsgReaccion,
}: ChatTabProps) {
    return (
        <div className="card">
            <div className="flex-sb" style={{ marginBottom: '12px' }}>
                <div>
                    <div className="card-title" style={{ margin: 0 }}>💬 {grupo.nombre}</div>
                    <p className="text-sm text-muted">Mensajes en tiempo real</p>
                </div>
                <div className="flex" style={{ gap: '6px' }}>
                    <select
                        className="btn"
                        style={{ padding: '6px 10px' }}
                        value={grupoIdx}
                        onChange={(e: any) => onCambiarGrupo(parseInt(e.target.value))}
                    >
                        {grupos.map((g: any, i: number) => (
                            <option key={g.id} value={i}>{g.emoji} {g.nombre}</option>
                        ))}
                    </select>
                    <select
                        className="btn"
                        style={{ padding: '6px 10px' }}
                        value={yoChat}
                        onChange={(e: any) => setYoChat(e.target.value)}
                    >
                        {grupo.miembros.map((m: any) => (
                            <option key={m} value={m}>Como: {m}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="chat-messages">
                {grupo.chat.map((m: any) => {
                    const tipo = m.tipo === 'sistema' ? 'sistema' : m.autor === yoChat ? 'mine' : 'otros';
                    return (
                        <div key={m.id} className={`msg ${tipo}`}>
                            {tipo !== 'mine' && tipo !== 'sistema' && (
                                <span className="text-sm text-muted" style={{ marginBottom: '3px' }}>{m.autor}</span>
                            )}
                            <div className="bubble">{m.texto}</div>
                            {Object.keys(m.reacciones || {}).length > 0 && (
                                <div className="msg-reactions">
                                    {Object.entries(m.reacciones || {}).map(([emoji, users]: any) => (
                                        <button
                                            key={emoji}
                                            className={`reaction-btn ${users.includes(yoChat) ? 'mine' : ''}`}
                                            onClick={() => toggleMsgReaccion(m.id, emoji)}
                                            style={{ fontSize: '10px', padding: '2px 6px' }}
                                        >
                                            {emoji} {users.length}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <span className="msg-meta">{m.fecha}</span>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {QUICK_REPLIES.map((qr: any) => (
                        <button
                            key={qr}
                            className="btn sm"
                            onClick={() => {
                                setChatInput(qr);
                            }}
                        >
                            {qr}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                <input
                    type="text"
                    placeholder="Escribe un mensaje..."
                    style={{ flex: 1 }}
                    value={chatInput}
                    onChange={(e: any) => setChatInput(e.target.value)}
                    onKeyDown={(e: any) => {
                        if (e.key === 'Enter') enviarMensaje();
                    }}
                />
                <button className="btn primary" onClick={enviarMensaje}><i className="ti ti-send"></i></button>
            </div>
        </div>
    );
}
