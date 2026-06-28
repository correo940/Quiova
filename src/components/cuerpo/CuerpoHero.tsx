'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

function IconLeaf() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function IconList() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6" /><path d="M9 16h4" />
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function CuerpoHero() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      <style>{`
        .ch-section {
          position: relative;
          min-height: 100vh;
          display: grid;
          grid-template-columns: 44% 56%;
          background: radial-gradient(ellipse 90% 80% at 18% 45%,
            #daf0e0 0%, #e8f5ec 18%, #f2fbf4 40%, #f9fefb 65%, #ffffff 90%);
          overflow: hidden;
        }

        /* ── Left column ── */
        .ch-left {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 5.5rem max(2rem, 3vw) 5.5rem max(2.5rem, 7vw);
          z-index: 1;
        }

        .ch-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 100px;
          background: rgba(26, 92, 46, 0.07);
          border: 1px solid rgba(26, 92, 46, 0.14);
          font-size: 0.63rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #1a5c2e;
          width: fit-content;
          margin-bottom: 0.875rem;
        }

        .ch-brand-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 0.1rem;
        }

        .ch-quioba-text {
          font-size: clamp(1.75rem, 3vw, 2.375rem);
          font-weight: 700;
          color: #1a5c2e;
          letter-spacing: -0.01em;
          line-height: 1;
        }

        .ch-cuerpo {
          font-size: clamp(3.75rem, 9vw, 7rem);
          font-weight: 700;
          color: #0e3a1b;
          letter-spacing: -0.03em;
          line-height: 0.88;
          margin-bottom: 1.125rem;
        }

        .ch-subtitle {
          font-size: clamp(1.125rem, 2.2vw, 1.5rem);
          font-weight: 700;
          color: #0f172a;
          line-height: 1.28;
          margin-bottom: 0.75rem;
        }

        .ch-desc {
          font-size: 0.9375rem;
          color: #64748b;
          line-height: 1.55;
          margin-bottom: 1.5rem;
        }

        .ch-buttons {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.625rem;
          flex-wrap: wrap;
        }

        .ch-btn-p {
          display: inline-flex;
          align-items: center;
          padding: 0.8rem 1.5rem;
          border-radius: 12px;
          background: #1a5c2e;
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
          transition: opacity 200ms;
        }
        .ch-btn-p:hover { opacity: 0.87; }

        .ch-btn-s {
          display: inline-flex;
          align-items: center;
          padding: 0.8rem 1.5rem;
          border-radius: 12px;
          background: #ffffff;
          border: 1.5px solid #d1d5db;
          color: #111827;
          font-size: 0.9rem;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          transition: border-color 200ms;
        }
        .ch-btn-s:hover { border-color: #9ca3af; }

        /* ── Perks ── */
        .ch-perks {
          display: flex;
          gap: 1.375rem;
          flex-wrap: wrap;
        }

        .ch-perk {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .ch-perk-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #16a34a;
        }

        .ch-perk-text {
          font-size: 0.7rem;
          color: #64748b;
          line-height: 1.38;
          font-weight: 500;
          max-width: 78px;
        }

        /* ── Right column ── */
        .ch-right {
          position: relative;
          overflow: hidden;
        }

        .ch-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .ch-gradient {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 48%;
          background: linear-gradient(
            to right,
            #ecf8ef 0%,
            rgba(236, 248, 239, 0.78) 28%,
            rgba(236, 248, 239, 0.28) 60%,
            transparent 100%
          );
          z-index: 1;
          pointer-events: none;
        }

        /* ── Scroll indicator ── */
        .ch-scroll {
          position: absolute;
          bottom: 1.75rem;
          left: 50%;
          transform: translateX(-50%);
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 2px 16px rgba(0,0,0,0.13);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #374151;
          z-index: 10;
          cursor: pointer;
          border: none;
          outline: none;
          transition: transform 300ms ease;
        }
        .ch-scroll:hover {
          transform: translateX(-50%) translateY(3px);
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .ch-section {
            grid-template-columns: 1fr;
            min-height: auto;
          }
          .ch-left {
            padding: 3.5rem 1.5rem 2.5rem;
            order: 1;
          }
          .ch-right {
            height: 58vw;
            min-height: 240px;
            order: 2;
          }
          .ch-buttons {
            flex-direction: column;
          }
          .ch-btn-p,
          .ch-btn-s {
            width: 100%;
            justify-content: center;
          }
          .ch-scroll { display: none; }
        }
      `}</style>

      <section className="ch-section">

        {/* ── Left column ── */}
        <div
          className="ch-left"
          style={{
            opacity: ready ? 1 : 0,
            transform: ready ? 'translateY(0)' : 'translateY(22px)',
            transition: 'opacity 580ms ease, transform 580ms ease',
          }}
        >
          <span className="ch-badge">Bienvenido a</span>

          <div className="ch-brand-row">
            <Image
              src="/images/logo-cuerpo.png"
              alt="QUIOBA Cuerpo"
              width={46}
              height={46}
              className="object-contain"
              style={{ borderRadius: 10 }}
              priority
            />
            <span className="ch-quioba-text">QUIOBA</span>
          </div>

          <h1 className="ch-cuerpo">CUERPO</h1>

          <p className="ch-subtitle">
            Entiende tu cuerpo.<br />
            Vive mejor cada día.
          </p>

          <p className="ch-desc">
            Ciencia, hábitos y herramientas para una<br />
            vida más saludable.
          </p>

          <div className="ch-buttons">
            <Link href="/articles" className="ch-btn-p">
              Explorar contenido →
            </Link>
            <Link href="/beta" className="ch-btn-s">
              Abrir aplicaciones
            </Link>
          </div>

          <div className="ch-perks">
            <div className="ch-perk">
              <div className="ch-perk-icon"><IconLeaf /></div>
              <span className="ch-perk-text">Basado en evidencia científica</span>
            </div>
            <div className="ch-perk">
              <div className="ch-perk-icon"><IconList /></div>
              <span className="ch-perk-text">Herramientas prácticas</span>
            </div>
            <div className="ch-perk">
              <div className="ch-perk-icon"><IconSparkles /></div>
              <span className="ch-perk-text">IA integrada</span>
            </div>
          </div>
        </div>

        {/* ── Right column — video ── */}
        <div
          className="ch-right"
          style={{
            opacity: ready ? 1 : 0,
            transition: 'opacity 700ms ease 120ms',
          }}
        >
          <div className="ch-gradient" />
          <video
            className="ch-video"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src="/videos/cuerpo-hero.mp4" type="video/mp4" />
          </video>
        </div>

        {/* ── Scroll indicator ── */}
        <button
          className="ch-scroll"
          onClick={() => window.scrollBy({ top: window.innerHeight * 0.88, behavior: 'smooth' })}
          aria-label="Ir al siguiente bloque"
        >
          <ChevronDown />
        </button>

      </section>
    </>
  );
}
