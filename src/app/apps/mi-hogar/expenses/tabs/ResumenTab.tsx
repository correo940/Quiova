'use client';

import React from 'react';
import { liquidar } from '@/lib/splitsmart/balances';
import { CAT_ICONS, DIVISAS } from '@/lib/splitsmart/constantes';

/**
 * Pestaña "dashboard" de SplitSmart. Extraida de page.tsx sin tocar el marcado:
 * lo que antes leia del cierre de la funcion, ahora llega por props.
 */
interface ResumenTabProps {
    deben: any;
    debes: any;
    balance: any;
    gastado: any;
    presTotal: any;
    disponible: any;
    alertas: any;
    S: any;
    abrirEditGrupo: any;
    agendaEvents: any;
    agendaScrollRef: any;
    avColor: any;
    avEl: any;
    eliminarGrupo: any;
    fmt: any;
    grupo: any;
    hoy: any;
    pagarLiquidacion: any;
    setActiveTab: any;
    setIsNuevoGrupoModalOpen: any;
    setS: any;
}

export default function ResumenTab({ deben, debes, balance, gastado, presTotal, disponible, alertas, S, abrirEditGrupo, agendaEvents, agendaScrollRef, avColor, avEl, eliminarGrupo, fmt, grupo, hoy, pagarLiquidacion, setActiveTab, setIsNuevoGrupoModalOpen, setS }: ResumenTabProps) {
    return (
          <div>
            <div className="grid3">
              <div className="stat">
                <div className="stat-label">Te deben</div>
                <div className="stat-value text-green">{fmt(deben)}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Debes</div>
                <div className="stat-value text-red">{fmt(debes)}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Balance</div>
                <div className="stat-value" style={{ color: balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {balance >= 0 ? '+' : ''}{fmt(balance)}
                </div>
              </div>
            </div>
            <div className="grid3" style={{ marginBottom: '14px' }}>
              <div className="stat">
                <div className="stat-label">Gastado</div>
                <div className="stat-value">{fmt(gastado)}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Presupuesto</div>
                <div className="stat-value">{fmt(presTotal)}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Disponible</div>
                <div className="stat-value" style={{ color: disponible >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {fmt(Math.max(disponible, 0))}
                </div>
              </div>
            </div>

            {alertas.length > 0 && (
              <div>
                {alertas.map((al: any, idx: number) => (
                  <div key={idx} className={`alerta ${al.tipo}`}>
                    <strong>{al.grupo}</strong>: {al.texto}
                  </div>
                ))}
              </div>
            )}

            <div className="card">
              <div className="flex-sb" style={{ marginBottom: '12px' }}>
                <div className="card-title" style={{ margin: 0 }}>Mis grupos</div>
                <button className="btn sm success" onClick={() => setIsNuevoGrupoModalOpen(true)}>
                  <i className="ti ti-plus"></i> Nuevo
                </button>
              </div>
              <div>
                {S.grupos.map((g: any, i: number) => {
                  const tot = g.gastos.reduce((sum: number, x: any) => sum + (x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1)), 0);
                  const pct = g.presupuesto.maximo > 0 ? Math.min((tot / g.presupuesto.maximo) * 100, 100) : 0;
                  const est = pct <= 50 ? 'ok' : pct <= 85 ? 'warn' : 'over';

                  return (
                    <div
                      key={g.id}
                      className={`grupo-card ${i === S.grupoIdx ? 'activo' : ''}`}
                      onClick={() => {
                        setS((prev: any) => ({ ...prev, grupoIdx: i }));
                        setActiveTab('grupo');
                      }}
                    >
                      <div className="grupo-header">
                        <div className="grupo-avatar" style={{ background: `${avColor(i)}22`, fontSize: '20px' }}>{g.emoji}</div>
                        <div className="grupo-info">
                          <h3>{g.nombre}</h3>
                          <p>{g.miembros.length} personas · {g.gastos.length} gastos · {fmt(tot)}</p>
                        </div>
                        {g.cerrado && <span className="chip">Cerrado</span>}
                        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto', flexShrink: 0 }}>
                          <button
                            className="btn sm"
                            style={{ padding: '4px 8px', fontSize: '13px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                            onClick={(e) => abrirEditGrupo(i, e)}
                            title="Editar grupo"
                          >✏️</button>
                          <button
                            className="btn sm"
                            style={{ padding: '4px 8px', fontSize: '13px', color: 'var(--red)', borderColor: 'var(--red)' }}
                            onClick={(e) => eliminarGrupo(i, e)}
                            title="Eliminar grupo"
                          >🗑️</button>
                        </div>
                      </div>
                      {g.presupuesto.maximo > 0 && (
                        <div className="budget-wrap" style={{ marginTop: '8px' }}>
                          <div className="budget-labels">
                            <span>{fmt(tot)}</span>
                            <span>{fmt(g.presupuesto.maximo)}</span>
                          </div>
                          <div className="budget-track">
                            <div className={`budget-fill ${est}`} style={{ width: `${pct}%` }}>
                              {pct > 15 ? Math.round(pct) + '%' : ''}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Agenda del Día / Gastos ── */}
            {(() => {
              // Combine general database events with financial events
              const combinedItems: { label: string; sub?: string; color: string; icon: string; fecha?: string }[] = [];

              // 1. Add database events loaded from Supabase (Shifts, ITV, Seguro, Docs, Maintenance)
              agendaEvents.forEach((e: any) => {
                combinedItems.push({
                  label: e.label,
                  sub: e.sub,
                  color: e.color,
                  icon: e.icon,
                  fecha: e.fecha,
                });
              });

              // 2. Add recurring expenses next 30 days
              const today = new Date();
              S.grupos.forEach((g: any) => {
                (g.recurrentes || []).filter((r: any) => r.activo).forEach((r: any) => {
                  const d = new Date(r.proximaFecha);
                  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
                  if (diff >= 0 && diff <= 30) {
                    const label = diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : `En ${diff}d`;
                    combinedItems.push({
                      label: r.desc,
                      sub: `${fmt(r.monto)} · ${label}`,
                      color: '#b87514', // food/recurrent bronze/amber
                      icon: CAT_ICONS[r.cat as keyof typeof CAT_ICONS] || '💸',
                      fecha: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
                    });
                  }
                });

                // 3. Add budget alerts
                const tot = g.gastos.reduce((s: number, x: any) => s + (x.monto / (DIVISAS[x.divisa as keyof typeof DIVISAS]?.r || 1)), 0);
                if (g.presupuesto.maximo > 0) {
                  const pct = (tot / g.presupuesto.maximo) * 100;
                  if (pct >= g.presupuesto.alerta) {
                    combinedItems.push({
                      label: `Límite: ${g.nombre}`,
                      sub: `${Math.round(pct)}% consumido`,
                      color: pct >= 100 ? '#dc2626' : '#ea580c',
                      icon: '⚠️',
                    });
                  }
                }
              });

              const handleScroll = (dir: 'left' | 'right') => {
                if (agendaScrollRef.current) {
                  const scrollAmount = 250;
                  agendaScrollRef.current.scrollBy({
                    left: dir === 'left' ? -scrollAmount : scrollAmount,
                    behavior: 'smooth'
                  });
                }
              };

              return (
                <div style={{ marginTop: '16px', background: 'var(--card-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingLeft: '2px' }}>
                      AGENDA DEL DÍA
                    </div>
                    {combinedItems.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          onClick={() => handleScroll('left')} 
                          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer', color: 'var(--text2)', transition: 'all 0.2s', padding: 0 }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'var(--border)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg2)'}
                        >
                          ◄
                        </button>
                        <button 
                          onClick={() => handleScroll('right')} 
                          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer', color: 'var(--text2)', transition: 'all 0.2s', padding: 0 }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'var(--border)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg2)'}
                        >
                          ►
                        </button>
                      </div>
                    )}
                  </div>

                  {combinedItems.length === 0 ? (
                    <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text3)', background: 'var(--bg2)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                      📭 No hay eventos ni alertas para hoy
                    </div>
                  ) : (
                    <div 
                      ref={agendaScrollRef}
                      style={{
                        display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px',
                        scrollbarWidth: 'thin', msOverflowStyle: 'none', scrollBehavior: 'smooth'
                      }}
                      className="custom-agenda-scrollbar"
                    >
                      {combinedItems.map((item: any, i: number) => (
                        <div key={i} style={{
                          flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '8px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: 600,
                          background: `${item.color}15`, border: `1px solid ${item.color}30`,
                          color: item.color, whiteSpace: 'nowrap', cursor: 'default',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.01)', transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          <span style={{ fontSize: '15px' }}>{item.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '12px', lineHeight: '1.2' }}>{item.label}</div>
                            {item.sub && <div style={{ fontSize: '10px', opacity: 0.8, fontWeight: 500, marginTop: '2px' }}>{item.sub}</div>}
                          </div>
                          {item.fecha && (
                            <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: '4px', fontWeight: 400 }}>· {item.fecha}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="card">
              <div className="card-title">Liquidación pendiente</div>
              <div>
                {S.grupos.flatMap((g: any) => liquidar(g).map((t: any) => ({ ...t, grupo: g }))).length === 0 ? (
                  <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '12px' }}>✅ Todo saldado</p>
                ) : (
                  S.grupos.flatMap((g: any) => liquidar(g).map((t: any) => ({ ...t, grupo: g }))).map((t: any, idx: number) => (
                    <div key={idx} className="liquidacion-item">
                      {avEl(t.grupo.miembros[t.de], t.de)}
                      <span>{t.grupo.miembros[t.de]}</span>
                      <span className="liq-arrow">→</span>
                      {avEl(t.grupo.miembros[t.a], t.a)}
                      <span>{t.grupo.miembros[t.a]}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text3)' }}>({t.grupo.nombre})</span>
                      <span className="liq-monto">{fmt(t.monto)}</span>
                      <button className="btn sm success" onClick={() => pagarLiquidacion(t.grupo.id, t.de, t.a, t.monto)}>Pagar</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
    );
}
