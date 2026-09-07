'use client';

import React from 'react';

/**
 * Pestaña "invitar" de SplitSmart. Extraida de page.tsx sin tocar el marcado:
 * lo que antes leia del cierre de la funcion, ahora llega por props.
 */
interface InvitarTabProps {
    S: any;
    activeInvTab: any;
    avEl: any;
    añadirMiembro: any;
    grupo: any;
    inviteUrl: any;
    nuevoMiembroNombre: any;
    qrCodeApiUrl: any;
    revocarEnlace: any;
    revocarInvitacion: any;
    setActiveInvTab: any;
    setNuevoMiembroNombre: any;
    setS: any;
}

export default function InvitarTab({ S, activeInvTab, avEl, añadirMiembro, grupo, inviteUrl, nuevoMiembroNombre, qrCodeApiUrl, revocarEnlace, revocarInvitacion, setActiveInvTab, setNuevoMiembroNombre, setS }: InvitarTabProps) {
    return (
          <div className="card">
            <div className="flex-sb" style={{ marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div className="card-title" style={{ margin: 0 }}>Invitar al grupo</div>
                <p className="text-sm text-muted">Comparte enlace o QR</p>
              </div>
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
            </div>

            <div className="inner-tabs">
              <button className={`inner-tab ${activeInvTab === 'enlace' ? 'active' : ''}`} onClick={() => setActiveInvTab('enlace')}>Enlace / QR</button>
              <button className={`inner-tab ${activeInvTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveInvTab('historial')}>Invitados</button>
              <button className={`inner-tab ${activeInvTab === 'miembros-inv' ? 'active' : ''}`} onClick={() => setActiveInvTab('miembros-inv')}>Miembros</button>
            </div>

            {activeInvTab === 'enlace' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div id="qr-canvas" style={{ display: 'inline-block', marginBottom: '12px' }}>
                  <img src={qrCodeApiUrl} alt="QR Code" style={{ width: '160px', height: '160px' }} />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '8px', wordBreak: 'break-all' }}>{inviteUrl}</p>
                  <div className="btn-row" style={{ justifyContent: 'center' }}>
                    <button className="btn primary" onClick={() => {
                      navigator.clipboard?.writeText(inviteUrl);
                      alert('✅ Enlace copiado!');
                    }}><i className="ti ti-copy"></i> Copiar enlace</button>
                    <button className="btn" onClick={() => alert(`Comparte este enlace: ${inviteUrl}`)}><i className="ti ti-share-2"></i> Compartir</button>
                    <button className="btn" onClick={() => window.open(qrCodeApiUrl)}><i className="ti ti-download"></i> QR</button>
                  </div>
                </div>
                <p className="text-sm text-muted" style={{ marginTop: '10px' }}>
                  ⚠️ Cualquiera con el enlace puede unirse. <button className="btn sm danger" onClick={revocarEnlace} style={{ display: 'inline-flex' }}>Revocar</button>
                </p>
              </div>
            )}

            {activeInvTab === 'historial' && (
              <div>
                {grupo.invitaciones.map((inv: any) => (
                  <div key={inv.email} className="invite-item">
                    <div className="grow">
                      <p style={{ fontSize: '12px', fontWeight: 500 }}>{inv.email}</p>
                      <p className="text-sm text-muted">{inv.fecha}</p>
                    </div>
                    <span className={`inv-estado ${inv.estado}`}>{inv.estado}</span>
                    {inv.estado === 'pendiente' && (
                      <button className="btn sm" onClick={() => alert(`📬 Recordatorio enviado a ${inv.email}`)}>Recordatorio</button>
                    )}
                    <button className="btn sm danger" onClick={() => revocarInvitacion(inv.email)}><i className="ti ti-x"></i></button>
                  </div>
                ))}
              </div>
            )}

            {activeInvTab === 'miembros-inv' && (
              <div>
                {grupo.miembros.map((m: any, i: number) => {
                  const inv = grupo.invitaciones.find((x: any) => x.email.split('@')[0] === m.toLowerCase());
                  const estado = m === 'Tú' ? 'aceptado' : (inv?.estado || 'aceptado');

                  return (
                    <div key={m} className="flex-sb" style={{ padding: '10px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', marginBottom: '6px' }}>
                      <div className="flex">
                        {avEl(m, i)}
                        <span style={{ fontSize: '13px', fontWeight: 500, marginLeft: '8px' }}>{m}</span>
                      </div>
                      <span className={`inv-estado ${estado}`}>{estado}</span>
                    </div>
                  );
                })}
                <div className="divider"></div>
                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label>Añadir miembro manualmente</label>
                  <div className="flex" style={{ gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Nombre..."
                      value={nuevoMiembroNombre}
                      onChange={(e: any) => setNuevoMiembroNombre(e.target.value)}
                    />
                    <button className="btn primary" onClick={añadirMiembro}><i className="ti ti-plus"></i></button>
                  </div>
                </div>
              </div>
            )}
          </div>
    );
}
