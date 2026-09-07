'use client';

import React from 'react';
import { liquidar } from '@/lib/splitsmart/balances';
import { CAT_COLORS, CAT_ICONS, DIVISAS, EMOJIS } from '@/lib/splitsmart/constantes';

/**
 * Pestaña "grupo" de SplitSmart. Extraida de page.tsx sin tocar el marcado:
 * lo que antes leia del cierre de la funcion, ahora llega por props.
 */
interface GrupoTabProps {
    S: any;
    abrirModalGasto: any;
    activeGTab: any;
    addReaccion: any;
    avColor: any;
    avEl: any;
    eliminarGasto: any;
    filtroCat: any;
    fmt: any;
    fmtBase: any;
    grupo: any;
    openPickerId: any;
    registrarPago: any;
    setActiveGTab: any;
    setFiltroCat: any;
    setOpenPickerId: any;
    setS: any;
    toggleReaccion: any;
}

export default function GrupoTab({ S, abrirModalGasto, activeGTab, addReaccion, avColor, avEl, eliminarGasto, filtroCat, fmt, fmtBase, grupo, openPickerId, registrarPago, setActiveGTab, setFiltroCat, setOpenPickerId, setS, toggleReaccion }: GrupoTabProps) {
    return (
          <div>
            <div className="card">
              <div className="flex-sb" style={{ marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700 }}>{grupo.emoji} {grupo.nombre}</h2>
                  <p className="text-sm text-muted">
                    {grupo.miembros.length} personas · {grupo.gastos.length} gastos · {fmt(grupo.gastos.reduce((s: number, x: any) => s + (x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1)), 0))}
                  </p>
                </div>
                <div className="flex" style={{ gap: '6px', flexWrap: 'wrap' }}>
                  <select
                    className="btn"
                    style={{ padding: '6px 10px' }}
                    value={S.grupoIdx}
                    onChange={(e: any) => setS((prev: any) => ({ ...prev, grupoIdx: parseInt(e.target.value) }))}
                  >
                    {S.grupos.map((g: any, i: number) => (
                      <option key={g.id} value={i}>{g.emoji} {g.nombre}</option>
                    ))}
                  </select>
                  <button className="btn primary" onClick={abrirModalGasto}><i className="ti ti-plus"></i> Nuevo gasto</button>
                </div>
              </div>

              <div className="inner-tabs">
                <button className={`inner-tab ${activeGTab === 'gastos' ? 'active' : ''}`} onClick={() => setActiveGTab('gastos')}>Gastos</button>
                <button className={`inner-tab ${activeGTab === 'saldar' ? 'active' : ''}`} onClick={() => setActiveGTab('saldar')}>Saldar</button>
                <button className={`inner-tab ${activeGTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveGTab('stats')}>Stats</button>
                <button className={`inner-tab ${activeGTab === 'miembros' ? 'active' : ''}`} onClick={() => setActiveGTab('miembros')}>Miembros</button>
              </div>

              {/* Gastos Tab */}
              {activeGTab === 'gastos' && (
                <div>
                  <div className="flex" style={{ marginBottom: '10px', gap: '6px', flexWrap: 'wrap' }}>
                    <select
                      className="btn"
                      style={{ padding: '6px 10px', fontSize: '11px' }}
                      value={filtroCat}
                      onChange={(e: any) => setFiltroCat(e.target.value)}
                    >
                      <option value="">Todas las categorías</option>
                      <option value="comida">🍽 Comida</option>
                      <option value="transporte">🚕 Transporte</option>
                      <option value="alojamiento">🏨 Alojamiento</option>
                      <option value="ocio">🎉 Ocio</option>
                      <option value="otros">📌 Otros</option>
                    </select>
                    <div className="divisa-selector" style={{ margin: 0 }}>
                      {Object.keys(DIVISAS).map((d: any) => (
                        <button
                          key={d}
                          className={`divisa-btn ${d === S.divisaBase ? 'active' : ''}`}
                          onClick={() => setS((prev: any) => ({ ...prev, divisaBase: d }))}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    {grupo.gastos.filter((x: any) => !filtroCat || x.cat === filtroCat).length === 0 ? (
                      <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '16px' }}>Sin gastos. Añade el primero!</p>
                    ) : (
                      grupo.gastos.filter((x: any) => !filtroCat || x.cat === filtroCat).map((x: any) => (
                        <div key={x.id} className="gasto-item" style={{ position: 'relative' }}>
                          <span style={{ fontSize: '18px' }}>{CAT_ICONS[x.cat as keyof typeof CAT_ICONS] || '📌'}</span>
                          <div className="gasto-desc">
                            <h4>{x.desc}</h4>
                            <p>{x.fecha} · {grupo.miembros[x.pagador]} · <span className="chip cat" style={{ fontSize: '9px' }}>{x.divisa}</span></p>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px', alignItems: 'center' }}>
                              {Object.entries(x.reacciones || {}).map(([emoji, users]: any) => (
                                <button
                                  key={emoji}
                                  className={`reaction-btn ${users.includes('Tú') ? 'mine' : ''}`}
                                  onClick={() => toggleReaccion(x.id, emoji)}
                                >
                                  {emoji}<span className="reaction-count">{users.length}</span>
                                </button>
                              ))}
                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <button className="reaction-btn" onClick={() => setOpenPickerId(openPickerId === x.id ? null : x.id)}>➕</button>
                                <div className={`emoji-picker ${openPickerId === x.id ? 'open' : ''}`}>
                                  <div className="emoji-grid">
                                    {EMOJIS.map((e: any) => (
                                      <div key={e} className="emoji-opt" onClick={() => addReaccion(x.id, e)}>{e}</div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                            <div className="gasto-monto">{fmtBase(x.monto, x.divisa)}</div>
                            <button
                              onClick={() => eliminarGasto(x.id)}
                              style={{ background: 'none', border: '1px solid var(--red)', borderRadius: '6px', color: 'var(--red)', cursor: 'pointer', fontSize: '11px', padding: '2px 7px', opacity: 0.7 }}
                              title="Eliminar gasto"
                            >🗑️</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Saldar Tab */}
              {activeGTab === 'saldar' && (
                <div>
                  {liquidar(grupo).length === 0 ? (
                    <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '16px' }}>✅ Nada que saldar</p>
                  ) : (
                    liquidar(grupo).map((t: any, idx: number) => (
                      <div key={idx} className="liquidacion-item">
                        {avEl(grupo.miembros[t.de], t.de)}
                        <div className="grow">
                          <strong>{grupo.miembros[t.de]}</strong> le debe <strong>{fmt(t.monto)}</strong> a <strong>{grupo.miembros[t.a]}</strong>
                        </div>
                        <button className="btn sm primary" onClick={() => registrarPago(t.de, t.a, t.monto)}>Pagar</button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Stats Tab */}
              {activeGTab === 'stats' && (
                <div>
                  {(() => {
                    const tot = grupo.gastos.reduce((s: number, x: any) => s + (x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1)), 0);
                    const porCat = {} as any;
                    const porPagador = new Array(grupo.miembros.length).fill(0);
                    grupo.gastos.forEach((x: any) => {
                      const base = x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1);
                      porCat[x.cat] = (porCat[x.cat] || 0) + base;
                      porPagador[x.pagador] += base;
                    });
                    const maxCat = Math.max(...Object.values(porCat) as number[]) || 1;
                    const maxPag = Math.max(...porPagador) || 1;

                    return (
                      <div>
                        <div className="grid2" style={{ marginBottom: '12px' }}>
                          <div className="stat">
                            <div className="stat-label">Total</div>
                            <div className="stat-value" style={{ fontSize: '18px' }}>{fmt(tot)}</div>
                          </div>
                          <div className="stat">
                            <div className="stat-label">Promedio/persona</div>
                            <div className="stat-value" style={{ fontSize: '18px' }}>{fmt(tot / grupo.miembros.length)}</div>
                          </div>
                        </div>
                        <div className="card-title">Por categoría</div>
                        {Object.entries(porCat).map(([cat, v]: any) => (
                          <div key={cat} className="chart-row">
                            <span style={{ width: '80px', fontSize: '11px', color: 'var(--text2)' }}>
                              {CAT_ICONS[cat as keyof typeof CAT_ICONS]} {cat}
                            </span>
                            <div style={{ flex: 1, height: '14px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${(v / maxCat) * 100}%`, height: '100%', background: CAT_COLORS[cat as keyof typeof CAT_COLORS], borderRadius: '4px' }}></div>
                            </div>
                            <span style={{ width: '55px', textAlign: 'right', fontSize: '11px', fontWeight: 600 }}>{fmt(v)}</span>
                          </div>
                        ))}
                        <div className="card-title" style={{ marginTop: '14px' }}>Por persona</div>
                        {grupo.miembros.map((m: any, i: number) => (
                          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                            {avEl(m, i)}
                            <span style={{ width: '60px', fontSize: '11px' }}>{m}</span>
                            <div style={{ flex: 1, height: '14px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${(porPagador[i] / maxPag) * 100}%`, height: '100%', background: avColor(i), borderRadius: '4px' }}></div>
                            </div>
                            <span style={{ width: '55px', textAlign: 'right', fontSize: '11px', fontWeight: 600 }}>{fmt(porPagador[i])}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Miembros Tab */}
              {activeGTab === 'miembros' && (
                <div>
                  {grupo.miembros.map((m: any, i: number) => {
                    const tot = grupo.gastos.filter((x: any) => x.pagador === i).reduce((sum: number, x: any) => sum + x.monto, 0);
                    return (
                      <div key={m} className="flex-sb" style={{ padding: '10px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
                        <div className="flex" style={{ gap: '10px' }}>
                          {avEl(m, i)}
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 500 }}>{m}</p>
                            <p className="text-sm text-muted">Pagó: {fmt(tot)}</p>
                          </div>
                        </div>
                        <span className="chip" style={{ background: 'rgba(29,185,116,0.1)', color: 'var(--green)', borderColor: 'var(--green)' }}>Miembro</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
    );
}
