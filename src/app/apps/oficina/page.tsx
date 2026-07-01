'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { SALAS, type EstadoAgente } from './vista/salas-data';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

// ── Paleta ───────────────────────────────────────────────────────────────────
const MARINO = '#10233f';
const CIAN = '#22a7c4';

type Seleccion = { salaId: string; agente: string } | null;
type Resultado = { ok: boolean; resultado?: string; archivos?: string[]; error?: string } | null;

function clave(salaId: string, agente: string) {
    return `${salaId}:${agente}`;
}

export default function OficinaPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    // Estado por agente (override local del estado inicial de SALAS)
    const [estados, setEstados] = useState<Record<string, EstadoAgente>>(() => {
        const init: Record<string, EstadoAgente> = {};
        for (const sala of SALAS) for (const a of sala.agentes) init[clave(sala.id, a.nombre)] = a.estado;
        return init;
    });
    const [seleccion, setSeleccion] = useState<Seleccion>(null);
    const [encargo, setEncargo] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState<Resultado>(null);

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    const agenteSel = useMemo(() => {
        if (!seleccion) return null;
        const sala = SALAS.find(s => s.id === seleccion.salaId);
        const agente = sala?.agentes.find(a => a.nombre === seleccion.agente);
        return sala && agente ? { sala, agente } : null;
    }, [seleccion]);

    if (loading || !user || user.email !== ADMIN_EMAIL) return null;

    function seleccionar(salaId: string, agente: string) {
        setSeleccion({ salaId, agente });
        setEncargo('');
        setResultado(null);
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
            const data: Resultado = await res.json();
            setResultado(data);
        } catch (e) {
            setResultado({ ok: false, error: e instanceof Error ? e.message : 'Error de red' });
        } finally {
            setEstados(prev => ({ ...prev, [k]: 'libre' }));
            setEnviando(false);
        }
    }

    return (
        <div style={{ fontFamily: 'system-ui, sans-serif', color: MARINO }} className="min-h-screen bg-[#f5f9fc]">
            <style>{`@keyframes latido{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.35);opacity:.65}}`}</style>

            <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24 space-y-6">
                {/* ── Cabecera ── */}
                <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">La Oficina</h1>
                        <p className="text-sm mt-1.5" style={{ color: `${MARINO}99` }}>
                            Tu equipo de agentes. Elige uno y dale un encargo.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" /> Trabajando
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#9ca3af]" /> Libre
                        </span>
                    </div>
                </header>

                <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
                    {/* ── Plano ── */}
                    <div
                        className="rounded-3xl p-3 md:p-4 bg-white shadow-sm"
                        style={{ border: `2px solid ${MARINO}22` }}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {SALAS.map(sala => (
                                <section
                                    key={sala.id}
                                    className="rounded-2xl p-3 flex flex-col gap-3"
                                    style={{ background: sala.color, border: `1px solid ${MARINO}14` }}
                                >
                                    <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: `${MARINO}cc` }}>
                                        {sala.nombre}
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        {sala.agentes.map(a => {
                                            const est = estados[clave(sala.id, a.nombre)];
                                            const activo = seleccion?.salaId === sala.id && seleccion?.agente === a.nombre;
                                            return (
                                                <button
                                                    key={a.nombre}
                                                    onClick={() => seleccionar(sala.id, a.nombre)}
                                                    className="flex flex-col items-center gap-1.5 group"
                                                    title={a.rol}
                                                >
                                                    <span className="relative">
                                                        <span
                                                            className="block w-12 h-12 rounded-full transition-transform group-hover:scale-105"
                                                            style={{
                                                                background: 'white',
                                                                border: `2.5px solid ${activo ? CIAN : `${MARINO}55`}`,
                                                                boxShadow: activo ? `0 0 0 3px ${CIAN}33` : '0 1px 2px rgba(0,0,0,.06)',
                                                            }}
                                                        />
                                                        <span
                                                            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                                                            style={{
                                                                background: est === 'trabajando' ? '#16a34a' : '#9ca3af',
                                                                animation: est === 'trabajando' ? 'latido 1.6s ease-in-out infinite' : undefined,
                                                            }}
                                                        />
                                                    </span>
                                                    <span className="text-xs font-semibold" style={{ color: MARINO }}>{a.nombre}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>

                    {/* ── Panel de encargo ── */}
                    <aside className="rounded-3xl bg-white shadow-sm p-4 lg:sticky lg:top-4" style={{ border: `2px solid ${MARINO}22` }}>
                        {!agenteSel ? (
                            <p className="text-sm text-center py-8" style={{ color: `${MARINO}88` }}>
                                Selecciona un agente para asignarle un encargo.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: CIAN }}>
                                        {agenteSel.sala.nombre}
                                    </p>
                                    <p className="text-lg font-black leading-tight">{agenteSel.agente.nombre}</p>
                                    <p className="text-xs mt-0.5" style={{ color: `${MARINO}99` }}>{agenteSel.agente.rol}</p>
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
                                    onClick={enviar}
                                    disabled={enviando || !encargo.trim()}
                                    className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-50"
                                    style={{ background: CIAN }}
                                >
                                    {enviando ? 'Trabajando…' : 'Enviar encargo'}
                                </button>

                                {resultado && (
                                    <div
                                        className="rounded-xl p-3 text-sm whitespace-pre-wrap break-words max-h-80 overflow-auto"
                                        style={{
                                            background: resultado.ok ? `${CIAN}0f` : '#fee',
                                            border: `1px solid ${resultado.ok ? `${CIAN}55` : '#f3b0b0'}`,
                                            color: MARINO,
                                        }}
                                    >
                                        {resultado.ok ? (
                                            <>
                                                {resultado.resultado || '(sin texto)'}
                                                {resultado.archivos && resultado.archivos.length > 0 && (
                                                    <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${MARINO}22` }}>
                                                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: CIAN }}>
                                                            Archivos generados
                                                        </p>
                                                        <ul className="mt-1 text-xs">
                                                            {resultado.archivos.map(f => (
                                                                <li key={f}>📄 oficina-output/{seleccion?.salaId}/{f}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <span style={{ color: '#b91c1c' }}>⚠ {resultado.error}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}
