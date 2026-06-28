'use client';

import Image from 'next/image';
import Link from 'next/link';

function IconBook() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <path d="m9 16 2 2 4-4"/>
    </svg>
  );
}

const MAIN_CARDS = [
  {
    Icon: IconBook,
    title: 'Aprende',
    desc: 'Descubre artículos, guías y explicaciones sencillas basadas en evidencia científica para cuidar tu salud.',
    cta: 'Explorar artículos',
    href: '/articles',
    photoBg: '',
    photo: '/images/cuerpo-aprende.png',
  },
  {
    Icon: IconActivity,
    title: 'Ponlo en práctica',
    desc: 'Simuladores, herramientas interactivas y experiencias diseñadas para ayudarte a comprender mejor tu cuerpo.',
    cta: 'Explorar herramientas',
    href: '/beta',
    photoBg: '',
    photo: '/images/cuerpo-practica.png',
  },
  {
    Icon: IconCalendar,
    title: 'Organiza tu salud',
    desc: 'Guarda tus revisiones, citas, resultados, medicación y hábitos en un único lugar y haz seguimiento de tu progreso.',
    cta: 'Abrir organizador',
    href: '/beta',
    photoBg: '',
    photo: '/images/cuerpo-organiza.png',
  },
];

const STEPS = [
  {
    n: 1,
    title: 'Aprende',
    desc: 'Entiende tu cuerpo con artículos claros y basados en evidencia científica.',
    photoBg: '',
    photo: '/images/cuerpo-aprende.png',
  },
  {
    n: 2,
    title: 'Ponlo en práctica',
    desc: 'Utiliza herramientas y simuladores para aplicar lo que aprendes en tu día a día.',
    photoBg: '',
    photo: '/images/cuerpo-practica.png',
  },
  {
    n: 3,
    title: 'Organiza',
    desc: 'Guarda tu información, crea rutinas y haz seguimiento de tu salud.',
    photoBg: '',
    photo: '/images/cuerpo-organiza.png',
  },
  {
    n: 4,
    title: 'Mejora tus hábitos',
    desc: 'Convierte el conocimiento y la organización en hábitos saludables y sostenibles.',
    photoBg: '',
    photo: '/images/cuerpo-habitos.png',
  },
];

export function CuerpoFeatures() {
  return (
    <>
      <style>{`
        .cff {
          background: #ffffff;
          padding: 5.5rem 2.5rem 6rem;
        }
        .cff-inner {
          max-width: 1280px;
          margin: 0 auto;
        }

        /* ── Section header ── */
        .cff-head {
          text-align: center;
          margin-bottom: 3rem;
        }
        .cff-head h2 {
          font-size: clamp(1.75rem, 3vw, 2.25rem);
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0 0 0.625rem;
          line-height: 1.2;
        }
        .cff-head p {
          font-size: 1rem;
          color: #64748b;
          margin: 0;
        }
        .cff-green { color: #16a34a; }

        /* ── Three main cards ── */
        .cff-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          margin-bottom: 5rem;
        }
        .cff-card {
          background: #ffffff;
          border: 1px solid #e8edf2;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.055);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 480px;
          transition: box-shadow 250ms ease, transform 250ms ease;
        }
        .cff-card:hover {
          box-shadow: 0 12px 36px rgba(0,0,0,0.1);
          transform: translateY(-3px);
        }
        .cff-card:hover .cff-photo-inner {
          transform: scale(1.04);
        }
        .cff-card-body {
          padding: 1.5rem 1.5rem 1rem;
          flex: 0 0 auto;
        }
        .cff-icon-circle {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #16a34a;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }
        .cff-card-title {
          font-size: 1.1875rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.5rem;
          letter-spacing: -0.01em;
        }
        .cff-card-desc {
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.6;
          margin: 0;
        }
        .cff-photo-wrap {
          flex: 1;
          overflow: hidden;
          position: relative;
        }
        .cff-photo-inner {
          width: 100%;
          height: 100%;
          transition: transform 300ms ease;
        }
        .cff-card-btn {
          position: absolute;
          bottom: 1rem;
          left: 1rem;
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 100px;
          padding: 0.5625rem 1.125rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #0f172a;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          z-index: 1;
          transition: box-shadow 200ms;
        }
        .cff-card-btn:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.14);
        }

        /* ── Steps section ── */
        .cff-steps-head {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .cff-steps-head h2 {
          font-size: clamp(1.5rem, 2.5vw, 2rem);
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0 0 0.5rem;
        }
        .cff-steps-head p {
          font-size: 1rem;
          color: #64748b;
          margin: 0;
        }

        /* Combined connector + cards grid */
        .cff-steps-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          position: relative;
          align-items: start;
        }
        /* The dashed horizontal line behind the circles */
        .cff-steps-grid::before {
          content: '';
          position: absolute;
          top: 18px;
          left: calc((100% - 3rem) / 8);
          right: calc((100% - 3rem) / 8);
          border-top: 1.5px dashed #cbd5e1;
          z-index: 0;
        }

        .cff-step-col {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          height: 100%;
        }
        .cff-step-col .cff-step-card {
          flex: 1;
        }
        .cff-step-numrow {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
        }
        .cff-step-num {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #16a34a;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cff-step-card {
          border: 1px solid #e8edf2;
          border-radius: 16px;
          overflow: hidden;
          background: #ffffff;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
        }
        .cff-step-body {
          padding: 1.125rem 1.125rem 1rem;
          flex: 0 0 auto;
        }
        .cff-step-title {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.375rem;
          letter-spacing: -0.01em;
        }
        .cff-step-desc {
          font-size: 0.8rem;
          color: #64748b;
          line-height: 1.55;
          margin: 0;
        }
        .cff-step-photo {
          flex: 1;
          min-height: 130px;
          overflow: hidden;
        }
        .cff-step-photo-inner {
          width: 100%;
          height: 100%;
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .cff { padding: 4rem 1.5rem 5rem; }
          .cff-grid {
            grid-template-columns: 1fr;
            margin-bottom: 3.5rem;
          }
          .cff-card { height: 420px; }
          .cff-steps-grid {
            grid-template-columns: 1fr 1fr;
          }
          .cff-steps-grid::before { display: none; }
        }
        @media (max-width: 560px) {
          .cff-steps-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <section className="cff">
        <div className="cff-inner">

          {/* ── Header ── */}
          <div className="cff-head">
            <h2>
              ¿Qué puedes hacer en{' '}
              <span className="cff-green">QUIOBA Cuerpo</span>?
            </h2>
            <p>Todo lo que necesitas para comprender, organizar y mejorar tu bienestar.</p>
          </div>

          {/* ── Three main cards ── */}
          <div className="cff-grid">
            {MAIN_CARDS.map(({ Icon, title, desc, cta, href, photoBg, photo }) => (
              <div key={title} className="cff-card">
                <div className="cff-card-body">
                  <div className="cff-icon-circle">
                    <Icon />
                  </div>
                  <h3 className="cff-card-title">{title}</h3>
                  <p className="cff-card-desc">{desc}</p>
                </div>

                <div className="cff-photo-wrap">
                  {photo ? (
                    <Image
                      src={photo}
                      alt={title}
                      fill
                      className="cff-photo-inner"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="cff-photo-inner" style={{ background: photoBg }} />
                  )}
                  <Link href={href} className="cff-card-btn">
                    {cta} →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* ── Steps header ── */}
          <div className="cff-steps-head">
            <h2>
              Así funciona{' '}
              <span className="cff-green">QUIOBA Cuerpo</span>
            </h2>
            <p>Un recorrido simple para transformar tu bienestar cada día.</p>
          </div>

          {/* ── Steps (connector + cards in same 4-col grid) ── */}
          <div className="cff-steps-grid">
            {STEPS.map(({ n, title, desc, photoBg, photo }, i) => (
              <div key={n} className="cff-step-col">
                {/* Number circle */}
                <div className="cff-step-numrow">
                  <div className="cff-step-num">{n}</div>
                </div>

                {/* Card */}
                <div className="cff-step-card">
                  <div className="cff-step-body">
                    <h3 className="cff-step-title">{title}</h3>
                    <p className="cff-step-desc">{desc}</p>
                  </div>
                  <div className="cff-step-photo" style={{ position: 'relative' }}>
                    {photo ? (
                      <Image
                        src={photo}
                        alt={title}
                        fill
                        className="cff-step-photo-inner"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="cff-step-photo-inner" style={{ background: photoBg }} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>
    </>
  );
}
