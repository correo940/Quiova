'use client';
import { useRef } from 'react';

const VIDEO_SCENARIOS = [
  {
    id: 'factura',
    emoji: '🧾',
    color: '#1a5c2e',
    colorLight: '#f0fdf4',
    title: 'Nunca más pierdas un documento',
    desc: 'Guarda facturas, contratos, garantías, seguros, contraseñas y cualquier documento importante en un único lugar.',
    videoSrc: '/videos/factura.mp4',
  },
  {
    id: 'compra',
    emoji: '🛒',
    color: '#1558a8',
    colorLight: '#eff6ff',
    title: 'Nunca olvides qué comprar',
    desc: 'Organiza tus listas de la compra y tenlas siempre contigo cuando las necesites.',
    videoSrc: '/videos/lista-compra.mp4',
  },
  {
    id: 'seguros',
    emoji: '🛡️',
    color: '#7c3aed',
    colorLight: '#f5f3ff',
    title: 'Todo tu hogar, bajo control',
    desc: 'Seguros, garantías, vehículos, suministros y documentos importantes organizados en un solo sitio.',
    videoSrc: '/videos/seguros.mp4',
  },
  {
    id: 'documentos',
    emoji: '📂',
    color: '#0891b2',
    colorLight: '#ecfeff',
    title: 'Toda tu información, organizada',
    desc: 'Accede en segundos a todo lo importante desde un único panel diseñado para simplificar tu vida.',
    videoSrc: '/videos/documentos.mp4',
  },
  {
    id: 'recordatorios',
    emoji: '🔔',
    color: '#b87514',
    colorLight: '#fffbeb',
    title: 'Que no se te vuelva a pasar nada',
    desc: 'Recibe recordatorios de vencimientos, citas, renovaciones y tareas importantes.',
  },
];

function VideoCard({ s }: { s: typeof VIDEO_SCENARIOS[number] }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    videoRef.current?.play();
  };

  const handleMouseLeave = () => {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #f1f5f9',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        cursor: 'default',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Área de vídeo */}
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
            preload="auto"
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
      <div className="px-4 py-4 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-sm flex-shrink-0"
            style={{ backgroundColor: s.colorLight }}
          >
            {s.emoji}
          </div>
          <p className="font-black text-sm leading-tight" style={{ color: '#0f172a' }}>
            {s.title}
          </p>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
          {s.desc}
        </p>
      </div>
    </div>
  );
}

export default function VideoScenarios() {
  return (
    <section className="py-20 px-6" style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-7xl mx-auto">
        <h2
          className="text-center text-3xl md:text-4xl font-black mb-12"
          style={{ color: '#0f172a' }}
        >
          Así te ayuda QUIOBA
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {VIDEO_SCENARIOS.map((s) => (
            <VideoCard key={s.id} s={s} />
          ))}
        </div>
      </div>
    </section>
  );
}
