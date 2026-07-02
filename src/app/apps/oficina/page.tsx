'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SALAS, type EstadoAgente } from './vista/salas-data';
import EscenaIsometrica from './vista/escena-isometrica';
import { fetchHistorial, tiempoRelativo, type RegistroEncargo } from './vista/historial';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';
const MARINO = '#10233f';
const CIAN = '#22a7c4';

type Seleccion = { salaId: string; agente: string } | null;
type Resultado = {
    ok: boolean;
    resultado?: string;
    archivos?: string[];
    error?: string;
    asignadoA?: { salaId: string; agente: string; motivo: string };
} | null;
type MensajeChat = { role: 'user' | 'assistant'; content: string; ts: number };
type Pestana = 'chat' | 'encargo';

function clave(salaId: string, agente: string) { return `${salaId}:${agente}`; }

export default function OficinaPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [estados, setEstados] = useState<Record<string, EstadoAgente>>(() => {
        const init: Record<string, EstadoAgente> = {};
        for (const sala of SALAS) for (const a of sala.agentes) init[clave(sala.id, a.nombre)] = a.estado;
        return init;
    });
    const [seleccion, setSeleccion] = useState<Seleccion>(null);
    const [encargo, setEncargo] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState<Resultado>(null);
    const [historial, setHistorial] = useState<RegistroEncargo[]>([]);

    // Chat por agente
    const [pestana, setPestana] = useState<Pestana>('chat');
    const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
    const [inputChat, setInputChat] = useState('');
    const [enviandoChat, setEnviandoChat] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Directrices
    const [directrices, setDirectrices] = useState('');
    const [directricesGuardadas, setDirectricesGuardadas] = useState('');
    const [mostrarDirectrices, setMostrarDirectrices] = useState(false);
    const [guardandoDirectrices, setGuardandoDirectrices] = useState(false);

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

    // Cargar chat + directrices al cambiar agente
    useEffect(() => {
        if (!seleccion) return;
        setMensajes([]);
        setInputChat('');
        setMostrarDirectrices(false);
        setPestana('chat');

        fetch(`/api/oficina/chat-agente?salaId=${seleccion.salaId}&agente=${encodeURIComponent(seleccion.agente)}`)
            .then(r => r.json()).then(d => setMensajes(d.historial ?? []));

        fetch(`/api/oficina/directrices?salaId=${seleccion.salaId}&agente=${encodeURIComponent(seleccion.agente)}`)
            .then(r => r.json()).then(d => { setDirectrices(d.texto ?? ''); setDirectricesGuardadas(d.texto ?? ''); });
    }, [seleccion]);

    // Scroll al último mensaje
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes]);

    if (loading || !user || user.email !== ADMIN_EMAIL) return null;

    function seleccionar(salaId: string, agente: string) {
        setSeleccion({ salaId, agente });
        setEncargo('');
        setResultado(null);
    }

    async function enviarMensajeChat() {
        if (!seleccion || !inputChat.trim() || enviandoChat) return;
        const texto = inputChat.trim();
        const tsUser = Date.now();
        setMensajes(prev => [...prev, { role: 'user', content: texto, ts: tsUser }]);
        setInputChat('');
        setEnviandoChat(true);
        try {
            const res = await fetch('/api/oficina/chat-agente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salaId: seleccion.salaId, agente: seleccion.agente, mensaje: texto }),
            });
            const data = await res.json();
            if (data.ok) {
                setMensajes(prev => [...prev, { role: 'assistant', content: data.respuesta, ts: Date.now() }]);
            }
        } finally {
            setEnviandoChat(false);
        }
    }

    async function limpiarChat() {
        if (!seleccion) return;
        await fetch(`/api/oficina/chat-agente?salaId=${seleccion.salaId}&agente=${encodeURIComponent(seleccion.agente)}`, { method: 'DELETE' });
        setMensajes([]);
    }

    async function enviar() {
        if (!seleccion || !encargo.trim() || enviando) return;
        const k = clave(seleccion.salaId, seleccion.agente);
        setEnviando(true);
        setResultado(null);
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

    async function enviarHermes() {
        if (!encargo.trim() || enviando) return;
        const k = clave('recepcion', 'Coordinación');
        setEnviando(true);
        setResultado(null);
        setEstados(prev => ({ ...prev, [k]: 'trabajando' }));
        try {
            const res = await fetch('/api/oficina/coordinar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ encargo }),
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
        } finally {
            setGuardandoDirectrices(false);
        }
    }

    return (
        <div style={{ fontFamily: 'system-ui, sans-serif', color: MARINO }} className="min-h-screen bg-[#f5f9fc]">
            <style>{`@keyframes latido{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.35);opacity:.65}}`}</style>

            <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24 space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">La Oficina</h1>
                        <p className="text-sm mt-1.5" style={{ color: `${MARINO}99` }}>
                            Clica un agente para hablar con él o darle un encargo.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" /> Trabajando
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#9ca3af]" /> Libre
                        </span>
                    </div>
                </header>

                <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
                    {/* Plano isométrico */}
                    <div className="rounded-3xl p-3 md:p-4 bg-white shadow-sm overflow-hidden" style={{ border: `2px solid ${MARINO}22` }}>
                        <EscenaIsometrica estados={estados} seleccion={seleccion} onSeleccionar={seleccionar} />
                    </div>

                    {/* Panel lateral */}
                    <aside className="rounded-3xl bg-white shadow-sm lg:sticky lg:top-4 overflow-hidden" style={{ border: `2px solid ${MARINO}22` }}>
                        {!agenteSel ? (
                            /* ── Recepción ── */
                            <div className="p-4 space-y-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: CIAN }}>Recepción</p>
                                    <p className="text-lg font-black leading-tight">Deja tu encargo</p>
                                    <p className="text-xs mt-0.5" style={{ color: `${MARINO}99` }}>
                                        Hermes lo repartirá al agente adecuado. O clica un agente del plano para hablar con él.
                                    </p>
                                </div>
                                <textarea
                                    value={encargo}
                                    onChange={e => setEncargo(e.target.value)}
                                    disabled={enviando}
                                    rows={4}
                                    placeholder="Escribe el encargo en lenguaje natural…"
                                    className="w-full rounded-xl p-3 text-sm outline-none resize-y disabled:opacity-60"
                                    style={{ border: `1.5px solid ${MARINO}33`, color: MARINO }}
                                />
                                <button
                                    onClick={enviarHermes}
                                    disabled={enviando || !encargo.trim()}
                                    className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-50"
                                    style={{ background: MARINO }}
                                >
                                    {enviando ? 'Repartiendo y trabajando…' : 'Dejar en recepción'}
                                </button>
                                <CajaResultado resultado={resultado} salaId={resultado?.asignadoA?.salaId} />
                            </div>
                        ) : (
                            /* ── Agente seleccionado ── */
                            <div className="flex flex-col" style={{ minHeight: 480 }}>
                                {/* Cabecera del agente */}
                                <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2" style={{ borderBottom: `1px solid ${MARINO}11` }}>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: CIAN }}>{agenteSel.sala.nombre}</p>
                                        <p className="text-lg font-black leading-tight">{agenteSel.agente.nombre}</p>
                                        <p className="text-xs mt-0.5" style={{ color: `${MARINO}88` }}>{agenteSel.agente.rol}</p>
                                    </div>
                                    <button
                                        onClick={() => { setSeleccion(null); setResultado(null); }}
                                        className="text-xs shrink-0 mt-1 px-2 py-1 rounded-lg"
                                        style={{ color: `${MARINO}66`, border: `1px solid ${MARINO}22` }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Pestañas */}
                                <div className="flex" style={{ borderBottom: `1px solid ${MARINO}11` }}>
                                    {(['chat', 'encargo'] as Pestana[]).map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPestana(p)}
                                            className="flex-1 py-2 text-xs font-bold transition-colors"
                                            style={{
                                                color: pestana === p ? MARINO : `${MARINO}66`,
                                                borderBottom: pestana === p ? `2px solid ${CIAN}` : '2px solid transparent',
                                            }}
                                        >
                                            {p === 'chat' ? '💬 Chat' : '⚡ Encargo'}
                                        </button>
                                    ))}
                                </div>

                                {pestana === 'chat' ? (
                                    /* ── Pestaña Chat ── */
                                    <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
                                        {/* Historial */}
                                        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: 360 }}>
                                            {mensajes.length === 0 && (
                                                <p className="text-center text-xs py-8" style={{ color: `${MARINO}66` }}>
                                                    Di hola a {agenteSel.agente.nombre} o pregúntale algo de su área.
                                                </p>
                                            )}
                                            {mensajes.map((m, i) => (
                                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div
                                                        className="rounded-2xl px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap"
                                                        style={{
                                                            background: m.role === 'user' ? MARINO : `${CIAN}18`,
                                                            color: m.role === 'user' ? 'white' : MARINO,
                                                            borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                        }}
                                                    >
                                                        {m.content}
                                                        {/* Botón para pasar al encargo si hay un acuerdo */}
                                                        {m.role === 'assistant' && m.content.includes('✅ Acordado:') && (
                                                            <button
                                                                onClick={() => { setEncargo(m.content.split('✅ Acordado:')[1]?.trim() ?? m.content); setPestana('encargo'); }}
                                                                className="block mt-2 text-[10px] font-bold px-2 py-1 rounded-lg"
                                                                style={{ background: `${CIAN}33`, color: CIAN }}
                                                            >
                                                                → Convertir en encargo
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {enviandoChat && (
                                                <div className="flex justify-start">
                                                    <div className="rounded-2xl px-3 py-2 text-sm" style={{ background: `${CIAN}18`, color: `${MARINO}88` }}>
                                                        {agenteSel.agente.nombre} está escribiendo…
                                                    </div>
                                                </div>
                                            )}
                                            <div ref={chatEndRef} />
                                        </div>

                                        {/* Input */}
                                        <div className="p-3 space-y-2" style={{ borderTop: `1px solid ${MARINO}11` }}>
                                            <div className="flex gap-2">
                                                <textarea
                                                    value={inputChat}
                                                    onChange={e => setInputChat(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensajeChat(); } }}
                                                    disabled={enviandoChat}
                                                    rows={2}
                                                    placeholder={`Escribe a ${agenteSel.agente.nombre}…`}
                                                    className="flex-1 rounded-xl p-2.5 text-sm outline-none resize-none disabled:opacity-60"
                                                    style={{ border: `1.5px solid ${MARINO}33`, color: MARINO }}
                                                />
                                                <button
                                                    onClick={enviarMensajeChat}
                                                    disabled={enviandoChat || !inputChat.trim()}
                                                    className="rounded-xl px-3 text-white font-bold text-sm disabled:opacity-40"
                                                    style={{ background: CIAN }}
                                                >
                                                    →
                                                </button>
                                            </div>
                                            {mensajes.length > 0 && (
                                                <button onClick={limpiarChat} className="text-[10px]" style={{ color: `${MARINO}55` }}>
                                                    Limpiar conversación
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* ── Pestaña Encargo ── */
                                    <div className="p-4 space-y-3">
                                        {/* Directrices */}
                                        <div className="rounded-xl" style={{ border: `1.5px solid ${MARINO}22` }}>
                                            <button
                                                onClick={() => setMostrarDirectrices(v => !v)}
                                                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold"
                                                style={{ color: MARINO }}
                                            >
                                                <span>📌 Directrices de {agenteSel.agente.nombre}</span>
                                                <span style={{ color: `${MARINO}77` }}>{mostrarDirectrices ? '−' : '+'}</span>
                                            </button>
                                            {mostrarDirectrices && (
                                                <div className="px-3 pb-3 space-y-2">
                                                    <p className="text-[11px]" style={{ color: `${MARINO}88` }}>
                                                        Se inyectan en cada encargo que reciba {agenteSel.agente.nombre}.
                                                    </p>
                                                    <textarea
                                                        value={directrices}
                                                        onChange={e => setDirectrices(e.target.value)}
                                                        rows={4}
                                                        placeholder="Ej: vídeos en 9:16, tono cercano, subtítulos en mayúsculas…"
                                                        className="w-full rounded-lg p-2.5 text-xs outline-none resize-y"
                                                        style={{ border: `1.5px solid ${MARINO}33`, color: MARINO }}
                                                    />
                                                    <button
                                                        onClick={guardarDirectricesAgente}
                                                        disabled={guardandoDirectrices || directrices === directricesGuardadas}
                                                        className="w-full rounded-lg py-1.5 text-xs font-bold text-white transition-opacity disabled:opacity-40"
                                                        style={{ background: MARINO }}
                                                    >
                                                        {guardandoDirectrices ? 'Guardando…' : 'Guardar directrices'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <textarea
                                            value={encargo}
                                            onChange={e => setEncargo(e.target.value)}
                                            disabled={enviando}
                                            rows={4}
                                            placeholder="Describe el entregable que necesitas…"
                                            className="w-full rounded-xl p-3 text-sm outline-none resize-y disabled:opacity-60"
                                            style={{ border: `1.5px solid ${MARINO}33`, color: MARINO }}
                                        />
                                        <button
                                            onClick={enviar}
                                            disabled={enviando || !encargo.trim()}
                                            className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-50"
                                            style={{ background: CIAN }}
                                        >
                                            {enviando ? 'Trabajando…' : `Enviar encargo a ${agenteSel.agente.nombre}`}
                                        </button>
                                        <CajaResultado resultado={resultado} salaId={seleccion?.salaId} />
                                    </div>
                                )}
                            </div>
                        )}
                    </aside>
                </div>

                {/* Muro de actividad */}
                <section className="rounded-3xl bg-white shadow-sm p-4 md:p-5" style={{ border: `2px solid ${MARINO}22` }}>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: MARINO }}>Actividad reciente</h2>
                        <span className="text-xs font-semibold" style={{ color: `${MARINO}77` }}>
                            {historial.length} {historial.length === 1 ? 'encargo' : 'encargos'}
                        </span>
                    </div>
                    {historial.length === 0 ? (
                        <p className="text-sm text-center py-6" style={{ color: `${MARINO}77` }}>
                            Aún no hay encargos ejecutados.
                        </p>
                    ) : (
                        <ul className="space-y-2.5">
                            {historial.map(r => <EntradaActividad key={r.id} r={r} />)}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}

function CajaResultado({ resultado, salaId }: { resultado: Resultado; salaId?: string }) {
    if (!resultado) return null;
    return (
        <div
            className="rounded-xl p-3 text-sm whitespace-pre-wrap break-words max-h-80 overflow-auto"
            style={{
                background: resultado.ok ? `${CIAN}0f` : '#fee',
                border: `1px solid ${resultado.ok ? `${CIAN}55` : '#f3b0b0'}`,
                color: MARINO,
            }}
        >
            {resultado.asignadoA && (
                <p className="text-xs font-bold mb-2 pb-2" style={{ borderBottom: `1px solid ${MARINO}22`, color: CIAN }}>
                    Hermes lo asignó a {resultado.asignadoA.agente}
                    {resultado.asignadoA.motivo ? ` — ${resultado.asignadoA.motivo}` : ''}
                </p>
            )}
            {resultado.ok ? (
                <>
                    {resultado.resultado || '(sin texto)'}
                    {resultado.archivos && resultado.archivos.length > 0 && (
                        <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${MARINO}22` }}>
                            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: CIAN }}>Archivos generados</p>
                            <ul className="mt-1 text-xs">
                                {resultado.archivos.map(f => <li key={f}>📄 oficina-output/{salaId}/{f}</li>)}
                            </ul>
                        </div>
                    )}
                </>
            ) : (
                <span style={{ color: '#b91c1c' }}>⚠ {resultado.error}</span>
            )}
        </div>
    );
}

function EntradaActividad({ r }: { r: RegistroEncargo }) {
    const [abierto, setAbierto] = useState(false);
    const sala = SALAS.find(s => s.id === r.salaId);
    return (
        <li className="rounded-xl overflow-hidden" style={{ border: `1px solid ${MARINO}1a` }}>
            <button
                onClick={() => setAbierto(o => !o)}
                className="w-full flex items-start gap-3 p-3 text-left hover:bg-[#f5f9fc] transition-colors"
            >
                <span className="mt-0.5 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.ok ? '#16a34a' : '#dc2626' }} />
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold" style={{ color: MARINO }}>{r.agente}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                            style={{ background: sala?.color ?? '#eee', color: `${MARINO}cc` }}>
                            {sala?.nombre ?? r.salaId}
                        </span>
                        <span className="text-xs" style={{ color: `${MARINO}77` }}>{tiempoRelativo(r.ts)}</span>
                    </span>
                    <span className="block text-sm mt-1 truncate" style={{ color: `${MARINO}cc` }}>{r.encargo}</span>
                </span>
                {r.archivos && r.archivos.length > 0 && (
                    <span className="text-xs font-semibold shrink-0" style={{ color: CIAN }}>📄 {r.archivos.length}</span>
                )}
            </button>
            {abierto && (
                <div className="px-3 pb-3 text-sm whitespace-pre-wrap break-words" style={{ borderTop: `1px solid ${MARINO}14`, color: MARINO }}>
                    <div className="pt-3 max-h-72 overflow-auto">
                        {r.ok ? (r.resultado || '(sin texto)') : <span style={{ color: '#b91c1c' }}>⚠ {r.error}</span>}
                    </div>
                    {r.archivos && r.archivos.length > 0 && (
                        <ul className="mt-2 pt-2 text-xs" style={{ borderTop: `1px solid ${MARINO}14` }}>
                            {r.archivos.map(f => <li key={f}>📄 oficina-output/{r.salaId}/{f}</li>)}
                        </ul>
                    )}
                </div>
            )}
        </li>
    );
}
