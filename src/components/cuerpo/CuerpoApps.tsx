'use client';

import Link from 'next/link';

function IconPill() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
      <path d="m8.5 8.5 7 7"/>
    </svg>
  );
}
function IconSun() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  );
}
function IconHeart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}
function IconTimer() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6v6l4 2"/>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 2v2M2 12h2M22 12h-2"/>
    </svg>
  );
}
function IconCalendarCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <path d="m9 16 2 2 4-4"/>
    </svg>
  );
}
function IconMind() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
    </svg>
  );
}

const APPS = [
  {
    Icon: IconPill,
    name: 'Botiquín',
    desc: 'Gestiona la medicación y el botiquín de tu familia.',
    href: '/beta',
    photoBg: 'linear-gradient(160deg, #fdfaf6 0%, #faecd6 100%)',
  },
  {
    Icon: IconSun,
    name: 'Ciclos Circadianos',
    desc: 'Entiende qué le pasa a tu cuerpo a cada hora del día.',
    href: '/articles/ciclos-circadianos',
    photoBg: 'linear-gradient(160deg, #f0f6ff 0%, #d8e9ff 100%)',
  },
  {
    Icon: IconHeart,
    name: 'Mi Salud',
    desc: 'Tu historial, resultados y revisiones en un solo lugar.',
    href: '/beta',
    photoBg: 'linear-gradient(160deg, #f0fdf6 0%, #c8f0dc 100%)',
  },
  {
    Icon: IconTimer,
    name: 'Pausas Activas',
    desc: 'Pequeños descansos durante el día para cuidar tu bienestar.',
    href: '/beta',
    photoBg: 'linear-gradient(160deg, #fdf4ff 0%, #e8d4f8 100%)',
  },
  {
    Icon: IconCalendarCheck,
    name: 'Agenda Salud',
    desc: 'Organiza tus citas médicas y haz seguimiento de revisiones.',
    href: '/beta',
    photoBg: 'linear-gradient(160deg, #fff7ed 0%, #fed7a8 100%)',
  },
  {
    Icon: IconMind,
    name: 'Meditación',
    desc: 'Un espacio para la calma y la atención plena cada día.',
    href: '/beta',
    photoBg: 'linear-gradient(160deg, #f0fdf4 0%, #9ee8c0 100%)',
  },
];

export function CuerpoApps() {
  return (
    <>
      <style>{`
        .cr-section {
          background: #f8fafc;
          padding: 5.5rem 2.5rem 6rem;
        }
        .cr-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        .cr-head {
          text-align: center;
          margin-bottom: 3.25rem;
        }
        .cr-eyebrow {
          font-size: 0.67rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #94a3b8;
          margin: 0 0 0.75rem;
        }
        .cr-head h2 {
          font-size: clamp(1.75rem, 3vw, 2.25rem);
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0 0 0.625rem;
          line-height: 1.2;
        }
        .cr-head p {
          font-size: 1rem;
          color: #64748b;
          margin: 0;
        }
        .cr-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .cr-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid rgba(0,0,0,0.04);
          box-shadow: 0 4px 24px rgba(0,0,0,0.055);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 400px;
          transition: box-shadow 260ms ease, transform 260ms ease;
        }
        .cr-card:hover {
          box-shadow: 0 14px 44px rgba(0,0,0,0.1);
          transform: translateY(-4px);
        }
        .cr-photo {
          flex: 1;
        }
        .cr-body {
          flex: 0 0 auto;
          padding: 1.25rem 1.375rem 1.375rem;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          background: #ffffff;
        }
        .cr-top-row {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }
        .cr-icon-circle {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #16a34a;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cr-text {
          flex: 1;
          min-width: 0;
        }
        .cr-name {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.2rem;
          letter-spacing: -0.01em;
          line-height: 1.25;
        }
        .cr-desc {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
          line-height: 1.45;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cr-btn {
          display: block;
          text-align: center;
          padding: 0.6rem 1rem;
          border-radius: 100px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #16a34a;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 200ms, border-color 200ms;
        }
        .cr-btn:hover {
          background: #dcfce7;
          border-color: #86efac;
        }
        @media (max-width: 960px) {
          .cr-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .cr-section { padding: 4rem 1.5rem 5rem; }
          .cr-grid { grid-template-columns: 1fr; }
          .cr-card { height: 360px; }
        }
      `}</style>

      <section className="cr-section">
        <div className="cr-inner">
          <div className="cr-head">
            <p className="cr-eyebrow">Herramientas</p>
            <h2>Aplicaciones relacionadas</h2>
            <p>Herramientas interactivas para aplicar lo que aprendes en QUIOBA Cuerpo.</p>
          </div>
          <div className="cr-grid">
            {APPS.map(({ Icon, name, desc, href, photoBg }) => (
              <div key={name} className="cr-card">
                <div className="cr-photo" style={{ background: photoBg }} />
                <div className="cr-body">
                  <div className="cr-top-row">
                    <div className="cr-icon-circle"><Icon /></div>
                    <div className="cr-text">
                      <h3 className="cr-name">{name}</h3>
                      <p className="cr-desc">{desc}</p>
                    </div>
                  </div>
                  <Link href={href} className="cr-btn">Abrir aplicación →</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
