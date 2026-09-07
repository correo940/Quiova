'use client';

import React from 'react';
import { CAT_ICONS } from '@/lib/splitsmart/constantes';

/**
 * Pestaña "recurrentes" de SplitSmart. Extraida de page.tsx sin tocar el marcado:
 * lo que antes leia del cierre de la funcion, ahora llega por props.
 */
interface RecurrentesTabProps {
    S: any;
    abrirModalRecurrente: any;
    activeRecTab: any;
    calFechaActual: any;
    eliminarRecurrente: any;
    fmt: any;
    grupo: any;
    handleCalMes: any;
    previsionItems: any;
    renderCalendarioGrid: any;
    selectedCalDate: any;
    setActiveRecTab: any;
    setS: any;
    toggleRecurrente: any;
}

export default function RecurrentesTab({ S, abrirModalRecurrente, activeRecTab, calFechaActual, eliminarRecurrente, fmt, grupo, handleCalMes, previsionItems, renderCalendarioGrid, selectedCalDate, setActiveRecTab, setS, toggleRecurrente }: RecurrentesTabProps) {
    return (
          <div className="card">
            <div className="flex-sb" style={{ marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div className="card-title" style={{ margin: 0 }}>Gastos recurrentes</div>
                <p className="text-sm text-muted">Pagos automáticos periódicos</p>
              </div>
              <div className="flex" style={{ gap: '6px' }}>
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
                <button className="btn primary" onClick={abrirModalRecurrente}><i className="ti ti-plus"></i> Nuevo</button>
              </div>
            </div>

            <div className="inner-tabs">
              <button className={`inner-tab ${activeRecTab === 'lista' ? 'active' : ''}`} onClick={() => setActiveRecTab('lista')}>Lista</button>
              <button className={`inner-tab ${activeRecTab === 'prevision' ? 'active' : ''}`} onClick={() => setActiveRecTab('prevision')}>Previsión</button>
              <button className={`inner-tab ${activeRecTab === 'calendario' ? 'active' : ''}`} onClick={() => setActiveRecTab('calendario')}>Calendario</button>
            </div>

            {activeRecTab === 'lista' && (
              <div>
                {grupo?.recurrentes?.length === 0 ? (
                  <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '16px' }}>Sin gastos recurrentes. Añade uno!</p>
                ) : (
                  grupo?.recurrentes?.map((r: any) => {
                    const diasFaltan = Math.ceil((new Date(r.proximaFecha).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={r.id} className="recurrente-item">
                        <span style={{ fontSize: '18px' }}>{CAT_ICONS[r.cat as keyof typeof CAT_ICONS]}</span>
                        <div className="grow">
                          <p style={{ fontSize: '12px', fontWeight: 500 }}>{r.desc}</p>
                          <p className="text-sm text-muted">{fmt(r.monto)} · {r.freq} · próximo: {r.proximaFecha} {diasFaltan > 0 ? `(${diasFaltan}d)` : ' 🔴'}</p>
                        </div>
                        <div className={`rec-toggle ${r.activo ? 'on' : ''}`} onClick={() => toggleRecurrente(r.id)}></div>
                        <button className="btn sm danger" onClick={() => eliminarRecurrente(r.id)}><i className="ti ti-trash"></i></button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeRecTab === 'prevision' && (
              <div>
                {previsionItems.length === 0 ? (
                  <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '16px' }}>Sin recurrentes activos</p>
                ) : (
                  previsionItems.slice(0, 10).map((r: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: i === 0 ? 'rgba(108,99,255,0.1)' : 'var(--bg3)', border: `1px solid ${i === 0 ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{CAT_ICONS[r.cat as keyof typeof CAT_ICONS]}</span>
                      <div className="grow">
                        <p style={{ fontSize: '12px', fontWeight: 500 }}>{r.desc}</p>
                        <p className="text-sm text-muted">{r.fecha}</p>
                      </div>
                      <span className="text-orange fw">{fmt(r.monto)}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeRecTab === 'calendario' && (
              <div>
                <div className="flex-sb" style={{ marginBottom: '10px' }}>
                  <button className="btn sm" onClick={() => handleCalMes(-1)}><i className="ti ti-chevron-left"></i></button>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    {calFechaActual.toLocaleString('es', { month: 'long', year: 'numeric' })}
                  </span>
                  <button className="btn sm" onClick={() => handleCalMes(1)}><i className="ti ti-chevron-right"></i></button>
                </div>
                <div className="cal-grid">
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d: any) => (
                    <div key={d} className="cal-header">{d}</div>
                  ))}
                  {renderCalendarioGrid()}
                </div>
                {selectedCalDate && (
                  <div style={{ marginTop: '12px' }}>
                    <div className="card-title" style={{ marginBottom: '8px' }}>{selectedCalDate}</div>
                    {grupo.gastos.filter((x: any) => x.fecha === selectedCalDate).length === 0 ? (
                      <p className="text-sm text-muted">Sin gastos este día</p>
                    ) : (
                      grupo.gastos.filter((x: any) => x.fecha === selectedCalDate).map((x: any) => (
                        <div key={x.id} className="flex-sb text-sm" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                          <span>{CAT_ICONS[x.cat as keyof typeof CAT_ICONS]} {x.desc}</span>
                          <span className="text-orange fw">{fmt(x.monto)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
    );
}
