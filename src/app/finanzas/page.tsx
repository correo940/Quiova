import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QUIOBA Finanzas — Conocimiento y herramientas para entender tu dinero',
  description:
    'QUIOBA Finanzas reúne contenido y herramientas sobre presupuestos, ahorro, seguros y finanzas personales.',
};

const TOPICS = [
  'Presupuesto personal',
  'Ahorro',
  'Seguros',
  'Gastos del hogar',
  'Finanzas familiares',
  'Control de deudas',
  'Planificación financiera',
  'Patrimonio',
];

const TOOLS = [
  { name: 'Registro de gastos', emoji: '💳', desc: 'Apunta y visualiza en qué se va tu dinero mes a mes.' },
  { name: 'Ahorro', emoji: '💰', desc: 'Lleva el seguimiento de tus objetivos y fondos de ahorro.' },
  { name: 'Seguros', emoji: '🛡️', desc: 'Guarda y organiza tus pólizas de seguro en un solo lugar.' },
  { name: 'Garantías', emoji: '📋', desc: 'Registra las garantías de tus compras y electrodomésticos.' },
];

function ArrowRight({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export default function FinanzasPage() {
  return (
    <div className="overflow-x-hidden" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>

      {/* Hero */}
      <section
        className="relative px-6 py-24 text-center overflow-hidden"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(184,117,20,0.1) 0%, transparent 70%), #fffbeb', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ backgroundColor: '#ffffff', boxShadow: '0 4px 20px rgba(184,117,20,0.15)' }}>
            <Image src="/images/logo-finanzas.png" alt="Finanzas" width={36} height={36} className="object-contain" />
          </div>

          <div>
            <p className="text-sm font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#d97706' }}>Los tres pilares</p>
            <h1 className="text-4xl md:text-6xl font-black leading-[1.05] mb-4" style={{ color: '#b87514' }}>
              QUIOBA Finanzas
            </h1>
            <p className="text-lg md:text-xl max-w-xl mx-auto leading-relaxed" style={{ color: '#374151' }}>
              Contenido y herramientas para que entiendas mejor tu dinero, organices tus gastos
              y tomes decisiones financieras más informadas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-black transition-all hover:opacity-90"
              style={{ backgroundColor: '#b87514', color: '#ffffff', boxShadow: '0 6px 20px rgba(184,117,20,0.25)' }}
            >
              Explorar contenido <ArrowRight size={16} />
            </Link>
            <Link href="/beta" className="text-sm font-semibold transition-opacity hover:opacity-70" style={{ color: '#b87514' }}>
              Solicitar acceso →
            </Link>
          </div>
        </div>
      </section>

      {/* Topics */}
      <section className="py-20 px-6" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold tracking-[0.22em] uppercase mb-4" style={{ color: '#94a3b8' }}>Qué encontrarás</p>
          <h2 className="text-3xl md:text-4xl font-black mb-8 leading-tight" style={{ color: '#0f172a' }}>
            Temas que cubre QUIOBA Finanzas
          </h2>
          <div className="flex flex-wrap gap-3">
            {TOPICS.map((t) => (
              <span
                key={t}
                className="px-4 py-2 rounded-full text-sm font-semibold"
                style={{ backgroundColor: '#fffbeb', color: '#b87514', border: '1.5px solid #fde68a' }}
              >
                {t}
              </span>
            ))}
          </div>
          <p className="mt-8 text-base leading-relaxed" style={{ color: '#64748b' }}>
            QUIOBA no ofrece asesoramiento financiero, fiscal ni de inversión. El contenido
            disponible tiene un carácter divulgativo y está pensado para que comprendas mejor
            los conceptos básicos de las finanzas personales. Ante cualquier decisión financiera
            importante, consulta a un profesional cualificado.
          </p>
        </div>
      </section>

      {/* Tools */}
      <section className="py-20 px-6" style={{ backgroundColor: '#f8fafc' }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold tracking-[0.22em] uppercase mb-4" style={{ color: '#94a3b8' }}>Herramientas</p>
          <h2 className="text-3xl md:text-4xl font-black mb-10 leading-tight" style={{ color: '#0f172a' }}>
            Aplicaciones relacionadas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="flex items-start gap-4 p-6 rounded-2xl"
                style={{ backgroundColor: '#ffffff', border: '1.5px solid #e2e8f0' }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: '#fffbeb', border: '1.5px solid #fde68a' }}
                >
                  {tool.emoji}
                </div>
                <div>
                  <p className="font-black text-base" style={{ color: '#b87514' }}>{tool.name}</p>
                  <p className="text-sm leading-relaxed mt-1" style={{ color: '#64748b' }}>{tool.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other pillars */}
      <section className="py-16 px-6" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold tracking-[0.22em] uppercase mb-6 text-center" style={{ color: '#94a3b8' }}>Explora también</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'QUIOBA Cuerpo', color: '#1a5c2e', bg: '#f0fdf4', border: '#bbf7d0', href: '/cuerpo', logo: '/images/logo-cuerpo.png' },
              { label: 'QUIOBA Mente', color: '#1558a8', bg: '#eff6ff', border: '#bfdbfe', href: '/mente', logo: '/images/logo-mente.png' },
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
                <ArrowRight size={14} style={{ color: p.color, marginLeft: 'auto' }} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Beta CTA */}
      <section className="py-20 px-6 text-center" style={{ backgroundColor: '#b87514' }}>
        <div className="max-w-lg mx-auto flex flex-col items-center gap-6">
          <h2 className="text-3xl md:text-4xl font-black" style={{ color: '#ffffff' }}>
            Empieza a organizar tus finanzas
          </h2>
          <Link
            href="/beta"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-black transition-all hover:scale-[1.03]"
            style={{ backgroundColor: '#ffffff', color: '#b87514' }}
          >
            Solicitar acceso <ArrowRight size={18} />
          </Link>
        </div>
      </section>

    </div>
  );
}
