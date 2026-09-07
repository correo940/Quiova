'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Igual que en page.tsx: el mapa solo puede cargarse en el navegador.
const MapComponent = dynamic(() => import('../MapComponent'), {
    ssr: false,
    loading: () => (
        <div style={{ height: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '12px' }}>
            Cargando mapa...
        </div>
    ),
});
import { CAT_COLORS, CAT_ICONS } from '@/lib/splitsmart/constantes';

/**
 * Pestaña "mapa" de SplitSmart. Extraida de page.tsx sin tocar el marcado:
 * lo que antes leia del cierre de la funcion, ahora llega por props.
 */
interface MapaTabProps {
    S: any;
    abrirEditGasto: any;
    eliminarGasto: any;
    fmt: any;
    gastosConUbicacion: any;
    grupo: any;
    parseUbicacion: any;
    porUbicacion: any;
    setIsGastoModalOpen: any;
    setS: any;
}

export default function MapaTab({ S, abrirEditGasto, eliminarGasto, fmt, gastosConUbicacion, grupo, parseUbicacion, porUbicacion, setIsGastoModalOpen, setS }: MapaTabProps) {
    return (
          <div>
            {/* Header */}
            <div className="card" style={{ marginBottom: '12px' }}>
              <div className="flex-sb" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div className="card-title" style={{ margin: 0 }}>🗺️ Mapa de gastos — {grupo.nombre}</div>
                  <p className="text-sm text-muted" style={{ marginTop: '3px' }}>
                    Asigna ubicación al crear un gasto para verlo aquí
                  </p>
                </div>
                <div className="flex" style={{ gap: '6px', flexWrap: 'wrap' }}>
                  <select className="btn" style={{ padding: '6px 10px' }} value={S.grupoIdx} onChange={(e: any) => setS((prev: any) => ({ ...prev, grupoIdx: parseInt(e.target.value) }))}>
                    {S.grupos.map((g: any, i: number) => <option key={g.id} value={i}>{g.emoji} {g.nombre}</option>)}
                  </select>
                  <button className="btn sm primary" onClick={() => { setIsGastoModalOpen(true); }}>
                    <i className="ti ti-plus"></i> Añadir gasto
                  </button>
                </div>
              </div>
            </div>

            {gastosConUbicacion.length === 0 ? (
              /* Estado vacío */
              <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: '52px', marginBottom: '14px' }}>🗺️</div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>Sin gastos con ubicación</h3>
                <p className="text-sm text-muted" style={{ maxWidth: '320px', margin: '0 auto 20px auto', lineHeight: 1.6 }}>
                  Al añadir un gasto, selecciona una ubicación en el campo <strong>"Ubicación (para mapa)"</strong> y aparecerá aquí como un marcador.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {['✈️ Viajes', '🏖️ Vacaciones', '🍽️ Restaurantes', '🚕 Transporte'].map((t: any) => (
                    <span key={t} className="chip" style={{ fontSize: '12px' }}>{t}</span>
                  ))}
                </div>
                <button className="btn primary" onClick={() => setIsGastoModalOpen(true)}>
                  <i className="ti ti-plus"></i> Añadir primer gasto con ubicación
                </button>
              </div>
            ) : (
              <>
                {/* Estadísticas globales */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  <div className="stat card" style={{ padding: '14px', textAlign: 'center' }}>
                    <div className="stat-label">Ciudades</div>
                    <div className="stat-value" style={{ fontSize: '22px' }}>{Object.keys(porUbicacion).length}</div>
                  </div>
                  <div className="stat card" style={{ padding: '14px', textAlign: 'center' }}>
                    <div className="stat-label">Gastos</div>
                    <div className="stat-value" style={{ fontSize: '22px' }}>{gastosConUbicacion.length}</div>
                  </div>
                  <div className="stat card" style={{ padding: '14px', textAlign: 'center' }}>
                    <div className="stat-label">Total viaje</div>
                    <div className="stat-value text-orange" style={{ fontSize: '20px' }}>{fmt(gastosConUbicacion.reduce((s: number, x: any) => s + x.monto, 0))}</div>
                  </div>
                </div>

                {/* Mapa */}
                <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '12px' }}>
                  <MapComponent porUbicacion={porUbicacion} parseUbicacion={parseUbicacion} catColors={CAT_COLORS} catIcons={CAT_ICONS} />
                  <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>Categorías:</span>
                    {[...new Set(gastosConUbicacion.map((x: any) => x.cat))].map((c: any) => (
                      <span key={c} className="chip" style={{ fontSize: '11px', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: CAT_COLORS[c as keyof typeof CAT_COLORS], display: 'inline-block' }}></span>
                        {CAT_ICONS[c as keyof typeof CAT_ICONS]} {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tarjetas por ciudad */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                  {Object.entries(porUbicacion).map(([ub, gastos]: any) => {
                    const ubInfo = parseUbicacion(ub);
                    const tot = gastos.reduce((s: number, x: any) => s + x.monto, 0);
                    const porCat: Record<string, number> = {};
                    gastos.forEach((x: any) => { porCat[x.cat] = (porCat[x.cat] || 0) + x.monto; });
                    const topCat = Object.entries(porCat).sort((a: any, b: any) => b[1] - a[1])[0];
                    const topColor = CAT_COLORS[topCat[0] as keyof typeof CAT_COLORS] || '#3B6D11';
                    return (
                      <div key={ub} className="card" style={{ padding: '14px', borderTop: `3px solid ${topColor}` }}>
                        <div className="flex-sb" style={{ marginBottom: '10px' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{ubInfo?.nombre || ub}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{gastos.length} gasto{gastos.length !== 1 ? 's' : ''}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: '16px', color: topColor }}>{fmt(tot)}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{CAT_ICONS[topCat[0] as keyof typeof CAT_ICONS] || '📌'} {topCat[0]}</div>
                          </div>
                        </div>
                        {/* Barra de categorías */}
                        <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', gap: '1px', marginBottom: '10px' }}>
                          {Object.entries(porCat).map(([cat, v]: any) => (
                            <div key={cat} style={{ flex: v, background: CAT_COLORS[cat as keyof typeof CAT_COLORS] || '#ccc', minWidth: '4px' }} title={`${cat}: ${fmt(v)}`} />
                          ))}
                        </div>
                        {/* Lista de gastos */}
                        {gastos.map((x: any) => (
                          <div key={x.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <span style={{ color: 'var(--text2)', fontSize: '12px', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {CAT_ICONS[x.cat as keyof typeof CAT_ICONS] || '📌'} {x.desc}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                              <span style={{ fontWeight: 600, fontSize: '12px', color: CAT_COLORS[x.cat as keyof typeof CAT_COLORS] || 'var(--text)' }}>{fmt(x.monto)}</span>
                              <button
                                onClick={(e) => abrirEditGasto(x, e)}
                                title="Editar gasto"
                                style={{ background: 'none', border: '1px solid var(--accent)', borderRadius: '5px', color: 'var(--accent)', cursor: 'pointer', fontSize: '11px', padding: '1px 6px', lineHeight: 1.5 }}
                              >✏️</button>
                              <button
                                onClick={() => eliminarGasto(x.id)}
                                title="Eliminar gasto"
                                style={{ background: 'none', border: '1px solid var(--red)', borderRadius: '5px', color: 'var(--red)', cursor: 'pointer', fontSize: '11px', padding: '1px 6px', lineHeight: 1.5 }}
                              >🗑️</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
    );
}
