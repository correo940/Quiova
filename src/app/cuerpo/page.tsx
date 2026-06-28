import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { CuerpoHero } from '@/components/cuerpo/CuerpoHero';
import { CuerpoFeatures } from '@/components/cuerpo/CuerpoFeatures';
import { CuerpoApps } from '@/components/cuerpo/CuerpoApps';

export const metadata: Metadata = {
  title: 'QUIOBA Cuerpo — Conocimiento y herramientas para tu bienestar',
  description:
    'QUIOBA Cuerpo reúne contenido y herramientas sobre salud, sueño, nutrición y bienestar para ayudarte a entender mejor tu cuerpo.',
};

function ArrowRight({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export default function CuerpoPage() {
  return (
    <div className="overflow-x-hidden" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>

      <CuerpoHero />

      <CuerpoFeatures />

      <CuerpoApps />

      {/* Featured article */}
      <section className="py-20 px-6" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold tracking-[0.22em] uppercase mb-4" style={{ color: '#94a3b8' }}>Artículo destacado</p>
          <Link
            href="/articles/ciclos-circadianos"
            className="group flex flex-col md:flex-row gap-6 p-8 rounded-3xl transition-all hover:scale-[1.01] hover:shadow-lg"
            style={{ backgroundColor: '#f0fdf4', border: '1.5px solid #bbf7d0' }}
          >
            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1a5c2e' }}>Cuerpo · 8 min</span>
              <h3 className="font-black text-2xl mt-2 mb-3 leading-tight" style={{ color: '#0f172a' }}>
                Ciclos Circadianos
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
                Una guía completa sobre qué ocurre en tu cuerpo a lo largo del día, con simuladores
                interactivos y análisis científicos.
              </p>
            </div>
            <div className="flex items-center flex-shrink-0">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1"
                style={{ backgroundColor: '#1a5c2e', color: '#ffffff' }}
              >
                <ArrowRight size={20} />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Other pillars */}
      <section className="py-16 px-6" style={{ backgroundColor: '#f8fafc' }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold tracking-[0.22em] uppercase mb-6 text-center" style={{ color: '#94a3b8' }}>Explora también</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'QUIOBA Mente', color: '#1558a8', bg: '#eff6ff', border: '#bfdbfe', href: '/mente', logo: '/images/logo-mente.png' },
              { label: 'QUIOBA Finanzas', color: '#b87514', bg: '#fffbeb', border: '#fde68a', href: '/finanzas', logo: '/images/logo-finanzas.png' },
            ].map((p) => (
              <Link
                key={p.label}
                href={p.href}
                className="flex items-center gap-4 p-5 rounded-2xl transition-all hover:scale-[1.02]"
                style={{ backgroundColor: p.bg, border: `1.5px solid ${p.border}` }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
                  <Image src={p.logo} alt={p.label} width={22} height={22} className="object-contain" />
                </div>
                <span className="font-black text-base" style={{ color: p.color }}>{p.label}</span>
                <ArrowRight size={14} style={{ color: p.color, marginLeft: 'auto' } as React.CSSProperties} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Beta CTA */}
      <section className="py-20 px-6 text-center" style={{ backgroundColor: '#1a5c2e' }}>
        <div className="max-w-lg mx-auto flex flex-col items-center gap-6">
          <h2 className="text-3xl md:text-4xl font-black" style={{ color: '#ffffff' }}>
            Empieza a organizar tu bienestar
          </h2>
          <Link
            href="/beta"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-black transition-all hover:scale-[1.03]"
            style={{ backgroundColor: '#ffffff', color: '#1a5c2e' }}
          >
            Solicitar acceso <ArrowRight size={18} />
          </Link>
        </div>
      </section>

    </div>
  );
}
