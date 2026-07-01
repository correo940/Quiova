'use client';

import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { SALAS, type EstadoAgente } from './vista/salas-data';
import EscenaIsometrica from './vista/escena-isometrica';
import { fetchHistorial, tiempoRelativo, type RegistroEncargo } from './vista/historial';

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
    const [historial, setHistorial] = useState<RegistroEncargo[]>([]);

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    useEffect(() => {
        fetchHistorial().then(setHistorial);
    }, []);

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
            fetchHistorial().then(setHistorial);
        }
    }

    return (
        <div style={{ fontFamily: 'system-ui, sans-serif', color: MARINO }} className="min-h-screen bg-[#f5f9fc]">
            <style>{`@keyframes latido{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.35);opacity:.65}}`}</style>

            <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24 space-y-6">
                {/* ── Cabecera ── */}
                <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">La Oficina</h1>
                        <p className="text-sm mt-1.5" style={{ color: `${MARINO}99` }}>
                            Tu equipo de agentes. Elige uno y dale un encargo.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" /> Trabajando
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#9ca3af]" /> Libre
                        </span>
                        <span className="inline-flex items-center gap-1.5" style={{ color: `${MARINO}99` }}>
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: CIAN }} /> Coordinación
                        </span>
                        <span className="inline-flex items-center gap-1.5" style={{ color: `${MARINO}99` }}>
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: MARINO }} /> Manager
                        </span>
                        <span className="inline-flex items-center gap-1.5" style={{ color: `${MARINO}99` }}>
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#2f8f9d' }} /> Especialista
                        </span>
                    </div>
                </header>

                <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
                    {/* ── Plano isométrico ── */}
                    <div
                        className="rounded-3xl p-3 md:p-4 bg-white shadow-sm overflow-hidden"
                        style={{ border: `2px solid ${MARINO}22` }}
                    >
                        <EscenaIsometrica
                            estados={estados}
                            seleccion={seleccion}
                            onSeleccionar={seleccionar}
                        />
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

                {/* ── Muro de actividad ── */}
                <section className="rounded-3xl bg-white shadow-sm p-4 md:p-5" style={{ border: `2px solid ${MARINO}22` }}>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: MARINO }}>
                            Actividad reciente
                        </h2>
                        <span className="text-xs font-semibold" style={{ color: `${MARINO}77` }}>
                            {historial.length} {historial.length === 1 ? 'encargo' : 'encargos'}
                        </span>
                    </div>
                    {historial.length === 0 ? (
                        <p className="text-sm text-center py-6" style={{ color: `${MARINO}77` }}>
                            Aún no hay encargos. Asigna uno a un agente y aparecerá aquí.
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

// ── Entrada del muro de actividad ─────────────────────────────────────────────
function EntradaActividad({ r }: { r: RegistroEncargo }) {
    const [abierto, setAbierto] = useState(false);
    const sala = SALAS.find(s => s.id === r.salaId);
    return (
        <li className="rounded-xl overflow-hidden" style={{ border: `1px solid ${MARINO}1a` }}>
            <button
                onClick={() => setAbierto(o => !o)}
                className="w-full flex items-start gap-3 p-3 text-left hover:bg-[#f5f9fc] transition-colors"
            >
                <span className="mt-0.5 w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: r.ok ? '#16a34a' : '#dc2626' }} />
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
                    <span className="text-xs font-semibold shrink-0" style={{ color: CIAN }}>
                        📄 {r.archivos.length}
                    </span>
                )}
            </button>
            {abierto && (
                <div className="px-3 pb-3 text-sm whitespace-pre-wrap break-words"
                    style={{ borderTop: `1px solid ${MARINO}14`, color: MARINO }}>
                    <div className="pt-3 max-h-72 overflow-auto">
                        {r.ok ? (r.resultado || '(sin texto)') : (
                            <span style={{ color: '#b91c1c' }}>⚠ {r.error}</span>
                        )}
                    </div>
                    {r.archivos && r.archivos.length > 0 && (
                        <ul className="mt-2 pt-2 text-xs" style={{ borderTop: `1px solid ${MARINO}14` }}>
                            {r.archivos.map(f => (
                                <li key={f}>📄 oficina-output/{r.salaId}/{f}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </li>
    );
}
