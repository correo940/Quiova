'use client';
import { useRef, useEffect, useCallback, useState } from 'react';
import type { ReactNode } from 'react';

let activeVideoRef: HTMLVideoElement | null = null;

type Highlight = { text: string; color: string; bg: string };

function highlightText(str: string, highlights: Highlight[]): ReactNode {
  for (const h of highlights) {
    const idx = str.indexOf(h.text);
    if (idx === -1) continue;
    const before = str.slice(0, idx);
    const after = str.slice(idx + h.text.length);
    return (
      <>
        {before ? highlightText(before, highlights) : null}
        <span
          style={{
            color: h.color,
            backgroundColor: h.bg,
            borderRadius: 5,
            padding: '1px 6px',
            fontWeight: 700,
          }}
        >
          {h.text}
        </span>
        {after ? highlightText(after, highlights) : null}
      </>
    );
  }
  return str;
}

const VIDEO_SCENARIOS = [
  {
    id: 'factura',
    emoji: '📄',
    color: '#1a5c2e',
    colorLight: '#f0fdf4',
    title: 'Nunca más pierdas un documento',
    benefit: 'Todo en un lugar',
    desc: 'Facturas, contratos, garantías y documentos importantes, siempre a mano.',
    highlights: [{ text: 'Facturas, contratos, garantías', color: '#1a5c2e', bg: '#dcfce7' }],
    videoSrc: '/videos/factura.mp4',
  },
  {
    id: 'compra',
    emoji: '🛒',
    color: '#1558a8',
    colorLight: '#eff6ff',
    title: 'Nunca olvides qué comprar',
    benefit: 'Siempre contigo',
    desc: 'Listas de la compra organizadas y accesibles cuando más las necesitas.',
    highlights: [{ text: 'Listas de la compra', color: '#1558a8', bg: '#dbeafe' }],
    videoSrc: '/videos/lista-compra.mp4',
  },
  {
    id: 'seguros',
    emoji: '🏠',
    color: '#7c3aed',
    colorLight: '#f5f3ff',
    title: 'Todo tu hogar, bajo control',
    benefit: 'Control total',
    desc: 'Seguros, garantías, vehículos y suministros en un único sitio.',
    highlights: [{ text: 'Seguros, garantías', color: '#7c3aed', bg: '#ede9fe' }],
    videoSrc: '/videos/seguros.mp4',
  },
  {
    id: 'documentos',
    emoji: '📊',
    color: '#0891b2',
    colorLight: '#ecfeff',
    title: 'Toda tu información, organizada',
    benefit: 'Acceso inmediato',
    desc: 'Un panel diseñado para encontrar lo importante en segundos.',
    highlights: [{ text: 'en segundos', color: '#0891b2', bg: '#cffafe' }],
    videoSrc: '/videos/documentos.mp4',
  },
  {
    id: 'recordatorios',
    emoji: '🔔',
    color: '#b87514',
    colorLight: '#fffbeb',
    title: 'Que no se te vuelva a pasar nada',
    benefit: 'Recordatorios inteligentes',
    desc: 'Vencimientos, citas y renovaciones avisadas con tiempo de sobra.',
    highlights: [{ text: 'Vencimientos, citas', color: '#b87514', bg: '#fef3c7' }],
    videoSrc: '/videos/recordatorios.mp4',
  },
];

function VideoCard({ s }: { s: typeof VIDEO_SCENARIOS[number] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || !s.videoSrc) return;

    const isTouchDevice = window.matchMedia('(hover: none)').matches;
    if (!isTouchDevice) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (activeVideoRef && activeVideoRef !== video) {
              activeVideoRef.pause();
              activeVideoRef.currentTime = 0;
            }
            activeVideoRef = video;
            video.play().catch(() => {});
          } else {
            video.pause();
            video.currentTime = 0;
            if (activeVideoRef === video) activeVideoRef = null;
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [s.videoSrc]);

  const handleMouseEnter = useCallback(() => {
    setHovered(true);
    const v = videoRef.current;
    if (!v) return;
    if (activeVideoRef && activeVideoRef !== v) {
      activeVideoRef.pause();
      activeVideoRef.currentTime = 0;
    }
    activeVideoRef = v;
    v.currentTime = 0;
    v.play().catch(() => {});
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
      if (activeVideoRef === v) activeVideoRef = null;
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #f1f5f9',
        boxShadow: hovered
          ? '0 12px 36px rgba(0,0,0,0.13)'
          : '0 2px 12px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'box-shadow 280ms ease, transform 280ms ease',
        cursor: 'default',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Vídeo */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: '4/3', backgroundColor: s.colorLight }}
      >
        {s.videoSrc ? (
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
            src={s.videoSrc}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl select-none" aria-hidden="true">{s.emoji}</span>
          </div>
        )}
      </div>

      {/* Caption */}
      <div className="px-4 pt-4 pb-5 flex flex-col items-center text-center">
        {/* Icono + título */}
        <div className="flex items-start gap-2 mb-2.5 w-full">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
            style={{ backgroundColor: s.colorLight }}
          >
            {s.emoji}
          </div>
          <p className="font-black text-sm leading-snug text-left" style={{ color: '#0f172a' }}>
            {s.title}
          </p>
        </div>

        {/* Pill beneficio — centrada */}
        <div className="flex justify-center w-full mb-3">
          <span
            className="inline-flex items-center px-3 rounded-full text-[13px] font-semibold"
            style={{
              backgroundColor: s.color + '14',
              color: s.color,
              height: 28,
              letterSpacing: '0.01em',
            }}
          >
            {s.benefit}
          </span>
        </div>

        {/* Descripción con palabras destacadas */}
        <p
          className="text-xs text-left w-full"
          style={{ color: '#64748b', lineHeight: 1.65 }}
        >
          {highlightText(s.desc, s.highlights)}
        </p>
      </div>
    </div>
  );
}

export default function VideoScenarios() {
  return (
    <section className="py-20 px-6" style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center mb-5">
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border"
            style={{ borderColor: '#bbf7d0', color: '#166534', backgroundColor: '#f0fdf4' }}
          >
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            CÓMO FUNCIONA
          </span>
        </div>

        <h2 className="text-center text-3xl md:text-4xl font-black mb-4" style={{ color: '#0f172a' }}>
          Así te ayuda <span style={{ color: '#1a5c2e' }}>QUIOBA</span>
        </h2>

        <p className="text-center text-base md:text-lg mb-12" style={{ color: '#64748b' }}>
          Cada <span style={{ color: '#b87514', fontWeight: 700 }}>herramienta</span> resuelve un problema real de tu <span style={{ color: '#1558a8', fontWeight: 700 }}>día a día</span>.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {VIDEO_SCENARIOS.map((s) => (
            <VideoCard key={s.id} s={s} />
          ))}
        </div>
      </div>
    </section>
  );
}
