'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SALAS, type EstadoAgente } from './vista/salas-data';
import { fetchHistorial, tiempoRelativo, type RegistroEncargo } from './vista/historial';
import { ArrowLeft, Settings2, Send, ChevronDown, ChevronUp, Zap } from 'lucide-react';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

// ─── Config visual por agente ─────────────────────────────────────────────────

const A_CFG: Record<string, { emoji: string; accent: string; bg: string }> = {
    'Coordinación': { emoji: '👩‍💼', accent: '#1a5c2e', bg: '#e8f5ec' },
    'Bruno':        { emoji: '👨‍💻', accent: '#1e3a5f', bg: '#eef2f9' },
    'Max':          { emoji: '🧑‍🔧', accent: '#2d4a7a', bg: '#dde8f7' },
    'Dana':         { emoji: '✍️',   accent: '#92400e', bg: '#fef3c7' },
    'Rita':         { emoji: '📊',   accent: '#5b21b6', bg: '#f5f3ff' },
    'Sara':         { emoji: '⚡',   accent: '#0e7490', bg: '#ecfeff' },
};

const D_CFG: Record<string, { emoji: string; accent: string }> = {
    'recepcion':      { emoji: '🏛️', accent: '#1a5c2e' },
    'desarrollo':     { emoji: '💻', accent: '#1e3a5f' },
    'contenido':      { emoji: '🎬', accent: '#92400e' },
    'datos':          { emoji: '📊', accent: '#5b21b6' },
    'automatizacion': { emoji: '⚡', accent: '#0e7490' },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type MensajeChat = { role: 'user' | 'assistant'; content: string; ts: number };
type Resultado = {
    ok: boolean; resultado?: string; archivos?: string[]; error?: string;
    asignadoA?: { salaId: string; agente: string; motivo: string };
} | null;
type Pestana = 'chat' | 'encargo';

function clave(salaId: string, agente: string) { return `${salaId}:${agente}`; }

function saludo() {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
}

function fechaHoy() {
    return new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OficinaPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [estados, setEstados] = useState<Record<string, EstadoAgente>>(() => {
        const init: Record<string, EstadoAgente> = {};
        for (const sala of SALAS) for (const a of sala.agentes) init[clave(sala.id, a.nombre)] = a.estado;
        return init;
    });

    const [seleccion, setSeleccion] = useState<{ salaId: string; agente: string } | null>(null);
    const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
    const [inputChat, setInputChat] = useState('');
    const [enviandoChat, setEnviandoChat] = useState(false);
    const [pestana, setPestana] = useState<Pestana>('chat');
    const [encargo, setEncargo] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState<Resultado>(null);
    const [directrices, setDirectrices] = useState('');
    const [directricesGuardadas, setDirectricesGuardadas] = useState('');
    const [mostrarDirectrices, setMostrarDirectrices] = useState(false);
    const [guardandoDirectrices, setGuardandoDirectrices] = useState(false);
    const [historial, setHistorial] = useState<RegistroEncargo[]>([]);
    const [mostrarActividad, setMostrarActividad] = useState(false);
    const [selectorDesarrollo, setSelectorDesarrollo] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    useEffect(() => { fetchHistorial().then(setHistorial); }, []);

    const agenteSel = useMemo(() => {
        if (!seleccion) return null;
        const sala = SALAS.find(s => s.id === seleccion.salaId);
        const agente = sala?.agentes.find(a => a.nombre === seleccion.agente);
        return sala && agente ? { sala, agente } : null;
    }, [seleccion]);

    useEffect(() => {
        if (!seleccion) return;
        setMensajes([]); setInputChat(''); setMostrarDirectrices(false); setPestana('chat');
        fetch(`/api/oficina/chat-agente?salaId=${seleccion.salaId}&agente=${encodeURIComponent(seleccion.agente)}`)
            .then(r => r.json()).then(d => setMensajes(d.historial ?? []));
        fetch(`/api/oficina/directrices?salaId=${seleccion.salaId}&agente=${encodeURIComponent(seleccion.agente)}`)
            .then(r => r.json()).then(d => { setDirectrices(d.texto ?? ''); setDirectricesGuardadas(d.texto ?? ''); });
    }, [seleccion]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes]);

    if (loading || !user || user.email !== ADMIN_EMAIL) return null;

    function abrirAgente(salaId: string, agente: string) {
        setSeleccion({ salaId, agente });
        setEncargo(''); setResultado(null);
    }

    function volverLobby() {
        setSeleccion(null);
        setResultado(null);
        setMostrarDirectrices(false);
        setSelectorDesarrollo(false);
    }

    async function enviarChat() {
        if (!seleccion || !inputChat.trim() || enviandoChat) return;
        const texto = inputChat.trim();
        setMensajes(prev => [...prev, { role: 'user', content: texto, ts: Date.now() }]);
        setInputChat('');
        setEnviandoChat(true);
        try {
            const res = await fetch('/api/oficina/chat-agente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salaId: seleccion.salaId, agente: seleccion.agente, mensaje: texto }),
            });
            const data = await res.json();
            if (data.ok) setMensajes(prev => [...prev, { role: 'assistant', content: data.respuesta, ts: Date.now() }]);
        } finally { setEnviandoChat(false); }
    }

    async function limpiarChat() {
        if (!seleccion) return;
        await fetch(`/api/oficina/chat-agente?salaId=${seleccion.salaId}&agente=${encodeURIComponent(seleccion.agente)}`, { method: 'DELETE' });
        setMensajes([]);
    }

    async function enviarEncargo() {
        if (!seleccion || !encargo.trim() || enviando) return;
        const k = clave(seleccion.salaId, seleccion.agente);
        setEnviando(true); setResultado(null);
        setEstados(prev => ({ ...prev, [k]: 'trabajando' }));
        try {
            const res = await fetch('/api/oficina/encargo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salaId: seleccion.salaId, agente: seleccion.agente, encargo }),
            });
            setResultado(await res.json());
        } catch (e) {
            setResultado({ ok: false, error: e instanceof Error ? e.message : 'Error de red' });
        } finally {
            setEstados(prev => ({ ...prev, [k]: 'libre' }));
            setEnviando(false);
            fetchHistorial().then(setHistorial);
        }
    }

    async function guardarDirectricesAgente() {
        if (!seleccion || guardandoDirectrices) return;
        setGuardandoDirectrices(true);
        try {
            await fetch('/api/oficina/directrices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salaId: seleccion.salaId, agente: seleccion.agente, texto: directrices }),
            });
            setDirectricesGuardadas(directrices);
        } finally { setGuardandoDirectrices(false); }
    }

    // ── LOBBY ─────────────────────────────────────────────────────────────────

    if (!seleccion) {
        const salaRecepcion = SALAS.find(s => s.id === 'recepcion')!;
        const coordAgente = salaRecepcion.agentes[0];
        const coordCfg = A_CFG[coordAgente.nombre];
        const salasDepto = SALAS.filter(s => s.id !== 'recepcion');

        return (
            <div className="min-h-screen bg-[#f4f6f4]">
                <div className="max-w-xl mx-auto px-4 py-7 space-y-5">

                    {/* Cabecera */}
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-black tracking-tight text-[#10233f]">La Oficina</h1>
                        <p className="text-sm text-[#10233f66] capitalize">{saludo()}, don Juan · {fechaHoy()}</p>
                    </div>

                    {/* Coordinación — tarjeta hero */}
                    <button
                        onClick={() => abrirAgente(salaRecepcion.id, coordAgente.nombre)}
                        className="w-full text-left rounded-3xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                        style={{ background: `linear-gradient(135deg, ${coordCfg.accent} 0%, #133f21 100%)` }}
                    >
                        <div className="p-5 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-4xl shrink-0 border border-white/20">
                                {coordCfg.emoji}
                            </div>
                            <div className="flex-1 min-w-0 text-white">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Coordinación · Quioba</p>
                                <p className="text-xl font-black leading-none">{coordAgente.nombre}</p>
                                <p className="text-sm opacity-70 mt-1 leading-snug">Tablón del día, planificación y coordinación de encargos</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white/80 shrink-0">
                                <ArrowLeft className="w-4 h-4 rotate-180" />
                            </div>
                        </div>
                        <div className="h-1 bg-white/10">
                            <div className="h-full w-2/3 bg-white/20 rounded-full" />
                        </div>
                    </button>

                    {/* Grid de departamentos */}
                    <div className="grid grid-cols-2 gap-3">
                        {salasDepto.map(sala => {
                            const dCfg = D_CFG[sala.id] ?? { emoji: '🏢', accent: '#666' };
                            const tieneMultiple = sala.agentes.length > 1;

                            return (
                                <button
                                    key={sala.id}
                                    onClick={() => tieneMultiple ? setSelectorDesarrollo(true) : abrirAgente(sala.id, sala.agentes[0].nombre)}
                                    className="text-left bg-white rounded-2xl p-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all border border-slate-100"
                                >
                                    {/* Barra de color superior */}
                                    <div className="h-0.5 w-full rounded-full mb-4" style={{ background: `linear-gradient(90deg, ${dCfg.accent}, ${dCfg.accent}44)` }} />

                                    {sala.agentes.map((agente, idx) => {
                                        const aCfg = A_CFG[agente.nombre] ?? { emoji: '👤', accent: dCfg.accent, bg: '#f5f5f5' };
                                        const trabaja = estados[clave(sala.id, agente.nombre)] === 'trabajando';
                                        return (
                                            <div key={agente.nombre} className={idx > 0 ? 'mt-3 pt-3 border-t border-slate-50' : ''}>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: aCfg.bg }}>
                                                        {aCfg.emoji}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-sm font-black text-[#10233f] leading-none">{agente.nombre}</span>
                                                            <span
                                                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                                                style={{ background: trabaja ? '#16a34a' : '#d1d5db' }}
                                                            />
                                                        </div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: dCfg.accent }}>{sala.nombre}</p>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-[#10233f66] mt-2 leading-relaxed line-clamp-2">{agente.rol}</p>
                                            </div>
                                        );
                                    })}
                                </button>
                            );
                        })}
                    </div>

                    {/* Actividad reciente — colapsable */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <button
                            onClick={() => setMostrarActividad(v => !v)}
                            className="w-full flex items-center justify-between px-4 py-3"
                        >
                            <span className="text-xs font-black text-[#10233f] uppercase tracking-wide">
                                Actividad · {historial.length} encargos
                            </span>
                            {mostrarActividad
                                ? <ChevronUp className="w-3.5 h-3.5 text-[#10233f55]" />
                                : <ChevronDown className="w-3.5 h-3.5 text-[#10233f55]" />
                            }
                        </button>
                        {mostrarActividad && (
                            <div className="px-3 pb-3 space-y-1.5 border-t border-slate-50">
                                {historial.length === 0
                                    ? <p className="text-xs text-center py-4 text-[#10233f44]">Sin encargos ejecutados aún.</p>
                                    : historial.slice(0, 8).map(r => <EntradaActividad key={r.id} r={r} />)
                                }
                            </div>
                        )}
                    </div>
                </div>

                {/* Overlay selector Desarrollo */}
                {selectorDesarrollo && (
                    <div
                        className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
                        onClick={() => setSelectorDesarrollo(false)}
                    >
                        <div
                            className="bg-white rounded-3xl p-5 w-full max-w-xs"
                            onClick={e => e.stopPropagation()}
                        >
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: D_CFG['desarrollo'].accent }}>💻 Desarrollo</p>
                            <p className="text-sm font-black text-[#10233f] mb-4">¿Con quién quieres hablar?</p>
                            {SALAS.find(s => s.id === 'desarrollo')?.agentes.map(a => {
                                const cfg = A_CFG[a.nombre] ?? { emoji: '👤', accent: '#1e3a5f', bg: '#eef2f9' };
                                return (
                                    <button
                                        key={a.nombre}
                                        onClick={() => { setSelectorDesarrollo(false); abrirAgente('desarrollo', a.nombre); }}
                                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors mb-2 last:mb-0"
                                    >
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: cfg.bg }}>
                                            {cfg.emoji}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-[#10233f] text-sm">{a.nombre}</p>
                                            <p className="text-xs text-[#10233f66] leading-snug">{a.rol}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── WORKSPACE ──────────────────────────────────────────────────────────────

    const { sala, agente } = agenteSel!;
    const aCfg = A_CFG[agente.nombre] ?? { emoji: '👤', accent: '#1a5c2e', bg: '#e8f5ec' };
    const dCfg = D_CFG[sala.id] ?? { emoji: '🏢', accent: '#666' };
    const trabaja = estados[clave(sala.id, agente.nombre)] === 'trabajando';

    return (
        <div className="flex flex-col bg-[#f4f6f4]" style={{ minHeight: 'calc(100vh - 56px)' }}>

            {/* Barra superior workspace */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-3 py-2.5 flex items-center gap-2.5 shrink-0">
                <button
                    onClick={volverLobby}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors shrink-0"
                >
                    <ArrowLeft className="w-4 h-4 text-[#10233f]" />
                </button>

                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: aCfg.bg }}>
                    {aCfg.emoji}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <p className="font-black text-[#10233f] text-sm leading-none">{agente.nombre}</p>
                        <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: trabaja ? '#16a34a' : '#d1d5db' }}
                        />
                        {trabaja && <span className="text-[10px] text-green-600 font-bold">Trabajando…</span>}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: dCfg.accent }}>
                        {dCfg.emoji} {sala.nombre}
                    </p>
                </div>

                {/* Tabs Chat / Encargo */}
                <div className="flex items-center bg-slate-100 rounded-xl p-0.5 shrink-0">
                    <button
                        onClick={() => setPestana('chat')}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-[10px] transition-colors ${pestana === 'chat' ? 'bg-white text-[#10233f] shadow-sm' : 'text-[#10233f66]'}`}
                    >
                        Chat
                    </button>
                    <button
                        onClick={() => setPestana('encargo')}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-[10px] transition-colors flex items-center gap-1 ${pestana === 'encargo' ? 'bg-white text-[#10233f] shadow-sm' : 'text-[#10233f66]'}`}
                    >
                        <Zap className="w-3 h-3" /> Encargo
                    </button>
                </div>

                <button
                    onClick={() => setMostrarDirectrices(v => !v)}
                    title="Directrices"
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors shrink-0"
                >
                    <Settings2 className="w-4 h-4 text-[#10233f55]" />
                </button>
            </div>

            {/* Panel Directrices (slide derecha) */}
            {mostrarDirectrices && (
                <div className="fixed inset-0 z-50 flex" onClick={() => setMostrarDirectrices(false)}>
                    <div className="flex-1" />
                    <div className="bg-white w-80 shadow-2xl flex flex-col overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <p className="font-black text-[#10233f] text-sm">📌 Directrices de {agente.nombre}</p>
                            <button onClick={() => setMostrarDirectrices(false)} className="text-[#10233f44] hover:text-[#10233f] text-lg leading-none">✕</button>
                        </div>
                        <div className="p-5 flex-1 space-y-3">
                            <p className="text-xs text-[#10233f66] leading-relaxed">
                                Se inyectan automáticamente en cada encargo que recibe {agente.nombre}. Escribe su forma de trabajar, formato preferido, tono, etc.
                            </p>
                            <textarea
                                value={directrices}
                                onChange={e => setDirectrices(e.target.value)}
                                rows={10}
                                placeholder={`Ej: vídeos en 9:16, tono cercano, subtítulos en mayúsculas…`}
                                className="w-full rounded-xl p-3 text-sm border border-slate-200 outline-none resize-none focus:border-slate-400 text-[#10233f]"
                            />
                            <button
                                onClick={guardarDirectricesAgente}
                                disabled={guardandoDirectrices || directrices === directricesGuardadas}
                                className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-40"
                                style={{ background: aCfg.accent }}
                            >
                                {guardandoDirectrices ? 'Guardando…' : directrices === directricesGuardadas ? 'Guardado ✓' : 'Guardar directrices'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Pestaña Chat ── */}
            {pestana === 'chat' && (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: '55vh' }}>
                        {mensajes.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                                <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-5xl shadow-sm" style={{ background: aCfg.bg }}>
                                    {aCfg.emoji}
                                </div>
                                <div>
                                    <p className="font-black text-[#10233f]">{agente.nombre}</p>
                                    <p className="text-xs text-[#10233f55] mt-1 max-w-xs leading-relaxed">{agente.rol}</p>
                                </div>
                            </div>
                        )}

                        {mensajes.map((m, i) => (
                            <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {m.role === 'assistant' && (
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0 mb-0.5" style={{ background: aCfg.bg }}>
                                        {aCfg.emoji}
                                    </div>
                                )}
                                <div
                                    className="text-sm max-w-[78%] whitespace-pre-wrap leading-relaxed px-3.5 py-2.5"
                                    style={{
                                        background: m.role === 'user' ? '#10233f' : 'white',
                                        color: m.role === 'user' ? 'white' : '#10233f',
                                        borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                        boxShadow: m.role === 'assistant' ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
                                    }}
                                >
                                    {m.content}
                                    {m.role === 'assistant' && m.content.includes('✅ Acordado:') && (
                                        <button
                                            onClick={() => { setEncargo(m.content.split('✅ Acordado:')[1]?.trim() ?? m.content); setPestana('encargo'); }}
                                            className="flex items-center gap-1.5 mt-2 text-[11px] font-bold px-2.5 py-1 rounded-lg"
                                            style={{ background: `${aCfg.accent}18`, color: aCfg.accent }}
                                        >
                                            <Zap className="w-3 h-3" /> Convertir en encargo
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {enviandoChat && (
                            <div className="flex items-end gap-2 justify-start">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: aCfg.bg }}>
                                    {aCfg.emoji}
                                </div>
                                <div className="text-sm px-3.5 py-2.5 bg-white shadow-sm text-[#10233f66]" style={{ borderRadius: '18px 18px 18px 4px' }}>
                                    <span className="animate-pulse">{agente.nombre} está escribiendo…</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input chat */}
                    <div className="sticky bottom-0 bg-white border-t border-slate-100 px-3 py-3 shrink-0">
                        <div className="flex gap-2 items-end">
                            <textarea
                                value={inputChat}
                                onChange={e => setInputChat(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarChat(); } }}
                                disabled={enviandoChat}
                                rows={1}
                                placeholder={`Escribe a ${agente.nombre}…`}
                                className="flex-1 rounded-2xl px-4 py-2.5 text-sm border border-slate-200 outline-none resize-none focus:border-slate-300 text-[#10233f] disabled:opacity-60"
                                style={{ minHeight: 42, maxHeight: 120 }}
                            />
                            <button
                                onClick={enviarChat}
                                disabled={enviandoChat || !inputChat.trim()}
                                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white disabled:opacity-40 transition-opacity shrink-0"
                                style={{ background: aCfg.accent }}
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        {mensajes.length > 0 && (
                            <button onClick={limpiarChat} className="text-[10px] mt-1.5 ml-1 text-[#10233f33] hover:text-[#10233f66] transition-colors">
                                Limpiar conversación
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* ── Pestaña Encargo ── */}
            {pestana === 'encargo' && (
                <div className="flex-1 p-4 space-y-4">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                        <p className="text-xs font-black text-[#10233f] uppercase tracking-wide mb-1">⚡ Encargo a {agente.nombre}</p>
                        <p className="text-xs text-[#10233f66] leading-relaxed">
                            {agente.nombre} ejecutará esto con Claude Code. Describe el entregable con detalle.
                        </p>
                    </div>

                    <textarea
                        value={encargo}
                        onChange={e => setEncargo(e.target.value)}
                        disabled={enviando}
                        rows={7}
                        placeholder="Describe el entregable que necesitas…"
                        className="w-full rounded-2xl p-4 text-sm border border-slate-200 bg-white outline-none resize-y focus:border-slate-300 text-[#10233f] disabled:opacity-60 shadow-sm"
                    />

                    <button
                        onClick={enviarEncargo}
                        disabled={enviando || !encargo.trim()}
                        className="w-full rounded-2xl py-3 text-sm font-bold text-white transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: aCfg.accent }}
                    >
                        {enviando ? <><span className="animate-pulse">⚡</span> Trabajando…</> : `Enviar encargo a ${agente.nombre}`}
                    </button>

                    {resultado && (
                        <div
                            className="rounded-2xl p-4 text-sm whitespace-pre-wrap break-words max-h-80 overflow-auto"
                            style={{
                                background: resultado.ok ? '#f0fdf4' : '#fef2f2',
                                border: `1px solid ${resultado.ok ? '#bbf7d0' : '#fecaca'}`,
                                color: '#10233f',
                            }}
                        >
                            {resultado.asignadoA && (
                                <p className="text-xs font-bold mb-2 pb-2 border-b border-slate-100" style={{ color: aCfg.accent }}>
                                    Hermes lo asignó a {resultado.asignadoA.agente}
                                    {resultado.asignadoA.motivo ? ` — ${resultado.asignadoA.motivo}` : ''}
                                </p>
                            )}
                            {resultado.ok
                                ? resultado.resultado || '(sin texto)'
                                : <span className="text-red-600">⚠ {resultado.error}</span>
                            }
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Entrada de actividad ─────────────────────────────────────────────────────

function EntradaActividad({ r }: { r: RegistroEncargo }) {
    const [abierto, setAbierto] = useState(false);
    return (
        <div className="rounded-xl overflow-hidden border border-slate-100">
            <button
                onClick={() => setAbierto(o => !o)}
                className="w-full flex items-center gap-2.5 p-2.5 text-left hover:bg-slate-50 transition-colors"
            >
                <span className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ background: r.ok ? '#16a34a' : '#dc2626' }} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#10233f]">{r.agente}</span>
                        <span className="text-[10px] text-[#10233f44]">{tiempoRelativo(r.ts)}</span>
                    </div>
                    <span className="block text-xs text-[#10233f77] truncate">{r.encargo}</span>
                </div>
            </button>
            {abierto && (
                <div className="px-3 pb-3 pt-2 text-xs text-[#10233f] whitespace-pre-wrap border-t border-slate-50 max-h-44 overflow-auto">
                    {r.ok ? r.resultado || '(sin texto)' : <span className="text-red-600">⚠ {r.error}</span>}
                </div>
            )}
        </div>
    );
}
