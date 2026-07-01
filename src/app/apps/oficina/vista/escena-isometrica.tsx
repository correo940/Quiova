'use client';

import { iso, p, suelo, muro, caja, TILE_H } from './iso';
import { SALAS, type EstadoAgente, type TipoAgente, type Sala } from './salas-data';

// ─── Paleta ──────────────────────────────────────────────────────────────────
const MARINO = '#10233f';
const CIAN = '#22a7c4';
const PIEL = '#f0c9a4';
const MADERA_TOP = '#d8b483';
const MADERA_DER = '#b98d5f';
const MADERA_FRE = '#a97f52';

// Color de camisa por tipo (dentro de la paleta, sin morado)
const CAMISA: Record<TipoAgente, string> = {
    coordinacion: CIAN,
    manager: MARINO,
    especialista: '#2f8f9d',
};

// ─── Layout de salas (en celdas) ─────────────────────────────────────────────
// Cada sala: origen (gx,gy) + tamaño (w,h). Editable sin tocar el dibujo.
interface Layout { gx: number; gy: number; w: number; h: number }
const LAYOUT: Record<string, Layout> = {
    desarrollo: { gx: 0, gy: 0, w: 6, h: 5 },
    contenido: { gx: 8, gy: 0, w: 6, h: 5 },
    datos: { gx: 0, gy: 7, w: 6, h: 5 },
    automatizacion: { gx: 8, gy: 7, w: 6, h: 5 },
    recepcion: { gx: 4, gy: 14, w: 6, h: 4 },
};
const ALTO_MURO = 26;

// Posiciones relativas de los agentes dentro de su sala (celda de su escritorio).
function celdaAgente(l: Layout, idx: number, total: number): [number, number] {
    const sep = total > 1 ? (l.w - 2) / (total - 1) : 0;
    const gx = l.gx + 1 + (total > 1 ? idx * sep : (l.w - 2) / 2);
    const gy = l.gy + l.h - 2.2;
    return [gx, gy];
}

interface Props {
    estados: Record<string, EstadoAgente>;
    seleccion: { salaId: string; agente: string } | null;
    onSeleccionar: (salaId: string, agente: string) => void;
}

function clave(salaId: string, agente: string) {
    return `${salaId}:${agente}`;
}

// Aclara/oscurece un hex mezclándolo con blanco/negro.
function tinte(hex: string, factor: number): string {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const mix = (c: number) => factor >= 0
        ? Math.round(c + (255 - c) * factor)
        : Math.round(c * (1 + factor));
    return `#${[mix(r), mix(g), mix(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

export default function EscenaIsometrica({ estados, seleccion, onSeleccionar }: Props) {
    // Salas ordenadas de atrás hacia delante (painter's algorithm).
    const salasOrdenadas = [...SALAS].sort((a, b) => {
        const la = LAYOUT[a.id], lb = LAYOUT[b.id];
        return (la.gx + la.gy) - (lb.gx + lb.gy);
    });

    return (
        <svg
            viewBox="-680 -120 1280 780"
            className="w-full h-auto select-none"
            style={{ maxHeight: '84vh' }}
        >
            <defs>
                <filter id="sombraSuave" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor={MARINO} floodOpacity="0.12" />
                </filter>
            </defs>

            {/* Suelo del edificio (pasillos entre salas) */}
            <polygon points={suelo(-1, -1, 16, 20)} fill="#eef3f7" stroke={`${MARINO}18`} strokeWidth={1} />

            {salasOrdenadas.map(sala => (
                <SalaIso
                    key={sala.id}
                    sala={sala}
                    layout={LAYOUT[sala.id]}
                    estados={estados}
                    seleccion={seleccion}
                    onSeleccionar={onSeleccionar}
                />
            ))}
        </svg>
    );
}

function SalaIso({ sala, layout, estados, seleccion, onSeleccionar }: {
    sala: Sala; layout: Layout;
    estados: Props['estados']; seleccion: Props['seleccion']; onSeleccionar: Props['onSeleccionar'];
}) {
    const { gx, gy, w, h } = layout;
    const muroColor = tinte(sala.color, -0.28);
    const [etx, ety] = iso(gx + 0.2, gy + 0.2);

    return (
        <g>
            {/* Suelo de la sala */}
            <polygon points={suelo(gx, gy, w, h)} fill={sala.color} stroke={`${MARINO}22`} strokeWidth={1} />

            {/* Muros traseros (norte y oeste), bajos */}
            <polygon points={muro(gx, gy, gx + w, gy, ALTO_MURO)} fill={muroColor} />
            <polygon points={muro(gx, gy, gx, gy + h, ALTO_MURO)} fill={tinte(sala.color, -0.4)} />

            {/* Etiqueta de la sala, sobre el muro norte */}
            <text x={etx} y={ety - ALTO_MURO - 8} textAnchor="start"
                fontSize={13} fontWeight={800} fill={MARINO}
                stroke="white" strokeWidth={3.5} paintOrder="stroke"
                style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: 0.5 }}>
                {sala.nombre.toUpperCase()}
            </text>

            {/* Planta decorativa en la esquina trasera */}
            <Planta gx={gx + w - 0.6} gy={gy + 0.6} />

            {/* Agentes con su escritorio */}
            {sala.agentes.map((a, i) => {
                const [agx, agy] = celdaAgente(layout, i, sala.agentes.length);
                return (
                    <PuestoAgente
                        key={a.nombre}
                        gx={agx} gy={agy}
                        nombre={a.nombre} tipo={a.tipo}
                        estado={estados[clave(sala.id, a.nombre)]}
                        activo={seleccion?.salaId === sala.id && seleccion?.agente === a.nombre}
                        onClick={() => onSeleccionar(sala.id, a.nombre)}
                    />
                );
            })}
        </g>
    );
}

function PuestoAgente({ gx, gy, nombre, tipo, estado, activo, onClick }: {
    gx: number; gy: number; nombre: string; tipo: TipoAgente;
    estado: EstadoAgente; activo: boolean; onClick: () => void;
}) {
    const mesa = caja(gx, gy, 1.8, 0.9, 12);
    // Punto donde se sienta el personaje (delante de la mesa)
    const [sx, sy] = iso(gx + 0.9, gy + 1.5);
    const trabajando = estado === 'trabajando';

    const silla = caja(gx + 0.55, gy + 0.2, 0.7, 0.7, 10);
    const [mx, my] = iso(gx + 0.9, gy + 0.4);

    return (
        <g onClick={onClick} style={{ cursor: 'pointer' }}>
            {/* Escritorio (madera) — se dibuja ANTES que el personaje */}
            <polygon points={mesa.frente} fill={MADERA_FRE} />
            <polygon points={mesa.derecha} fill={MADERA_DER} />
            <polygon points={mesa.top} fill={MADERA_TOP} stroke={tinte(MADERA_TOP, -0.15)} strokeWidth={0.5} />
            {/* monitor sobre la mesa */}
            <g transform={`translate(${mx}, ${my - 12})`}>
                <rect x={-9} y={-11} width={18} height={12} rx={1.5}
                    fill={MARINO} stroke={tinte(MARINO, 0.2)} strokeWidth={1} />
                <rect x={-7} y={-9} width={14} height={8} rx={1}
                    fill={trabajando ? CIAN : tinte(CIAN, -0.3)} opacity={trabajando ? 0.9 : 0.5} />
            </g>

            {/* Silla (detrás del personaje) */}
            <polygon points={silla.derecha} fill={tinte(MARINO, 0.05)} />
            <polygon points={silla.frente} fill={tinte(MARINO, 0.15)} />
            <polygon points={silla.top} fill={tinte(MARINO, 0.3)} />

            {/* Personaje (delante de la mesa) */}
            <g transform={`translate(${sx}, ${sy}) scale(1.25)`}>
                {/* aro de selección */}
                {activo && <ellipse cx={0} cy={4} rx={18} ry={8} fill="none" stroke={CIAN} strokeWidth={2.5} />}
                {/* sombra */}
                <ellipse cx={0} cy={5} rx={14} ry={5.5} fill={MARINO} opacity={0.14} />
                {/* cuerpo */}
                <path d="M-11,4 Q-11,-15 0,-15 Q11,-15 11,4 Z" fill={CAMISA[tipo]} />
                {/* cabeza */}
                <circle cx={0} cy={-21} r={7.5} fill={PIEL} stroke={tinte(PIEL, -0.25)} strokeWidth={1} />
                {/* punto de estado */}
                <circle cx={0} cy={-35} r={3.5} fill={trabajando ? '#16a34a' : '#9ca3af'}
                    stroke="white" strokeWidth={1.5}>
                    {trabajando && (
                        <animate attributeName="r" values="3.5;5;3.5" dur="1.6s" repeatCount="indefinite" />
                    )}
                </circle>
            </g>

            {/* Nombre */}
            <text x={sx} y={sy + 26} textAnchor="middle" fontSize={12} fontWeight={800} fill={MARINO}
                stroke="white" strokeWidth={3} paintOrder="stroke"
                style={{ fontFamily: 'system-ui, sans-serif' }}>
                {nombre}
            </text>
        </g>
    );
}

function Planta({ gx, gy }: { gx: number; gy: number }) {
    const [x, y] = iso(gx, gy);
    const maceta = caja(gx - 0.25, gy - 0.25, 0.5, 0.5, 8);
    return (
        <g>
            <polygon points={maceta.frente} fill="#9a6a44" />
            <polygon points={maceta.derecha} fill="#b07c52" />
            <polygon points={maceta.top} fill="#c68e60" />
            <circle cx={x} cy={y - 18} r={9} fill="#3f9d5a" />
            <circle cx={x - 6} cy={y - 12} r={7} fill="#4bb56a" />
            <circle cx={x + 6} cy={y - 13} r={7} fill="#358a4d" />
        </g>
    );
}
