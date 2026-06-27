import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QUIOBA — Tu sistema operativo personal y familiar',
  description:
    'QUIOBA combina conocimiento, organización e inteligencia artificial para ayudarte a comprender tu cuerpo, tu mente y tus finanzas, y convertir ese conocimiento en acciones reales.',
};

// ── Data ──────────────────────────────────────────────────────────────

// Video scenarios: factual descriptions of existing features only
const VIDEO_SCENARIOS = [
  {
    id: 'documentos',
    pillar: 'Hogar',
    color: '#1558a8',
    colorLight: '#eff6ff',
    colorBorder: '#bfdbfe',
    colorTag: '#dbeafe',
    colorTagText: '#1d4ed8',
    emoji: '📂',
    headline: 'Tus documentos, siempre a mano',
    caption: 'Guarda y organiza tus documentos más importantes para encontrarlos cuando los necesites.',
  },
  {
    id: 'gastos',
    pillar: 'Finanzas',
    color: '#b87514',
    colorLight: '#fffbeb',
    colorBorder: '#fde68a',
    colorTag: '#fef3c7',
    colorTagText: '#b45309',
    emoji: '💳',
    headline: 'Tus gastos, más claros',
    caption: 'Registra tus movimientos y visualiza en qué se va tu dinero mes a mes.',
  },
  {
    id: 'hogar',
    pillar: 'Hogar',
    color: '#1a5c2e',
    colorLight: '#f0fdf4',
    colorBorder: '#bbf7d0',
    colorTag: '#dcfce7',
    colorTagText: '#166534',
    emoji: '🏠',
    headline: 'Tu hogar, organizado',
    caption: 'Seguros, garantías, contraseñas, lista de la compra... Todo en un solo lugar.',
  },
];

// Knowledge pillars: content + featured article, no app grouping
const KNOWLEDGE_PILLARS = [
  {
    color: '#1a5c2e',
    colorLight: '#f0fdf4',
    colorBorder: '#bbf7d0',
    colorTag: '#dcfce7',
    colorTagText: '#166534',
    logo: '/images/logo-cuerpo.png',
    name: 'Cuerpo',
    desc: 'Conocimiento sobre salud, hábitos y bienestar personal.',
    tags: ['Ciclos circadianos', 'Sueño', 'Nutrición', 'Salud preventiva'],
    article: { title: 'Ciclos Circadianos', readTime: '8 min', href: '/articles/ciclos-circadianos' },
    href: '/cuerpo',
  },
  {
    color: '#1558a8',
    colorLight: '#eff6ff',
    colorBorder: '#bfdbfe',
    colorTag: '#dbeafe',
    colorTagText: '#1d4ed8',
    logo: '/images/logo-mente.png',
    name: 'Mente',
    desc: 'Recursos para aprender mejor y organizar tus ideas.',
    tags: ['Aprendizaje', 'Concentración', 'Organización', 'Productividad'],
    article: { title: 'Aprende a concentrarte', readTime: '7 min', href: '/articles' },
    href: '/mente',
  },
  {
    color: '#b87514',
    colorLight: '#fffbeb',
    colorBorder: '#fde68a',
    colorTag: '#fef3c7',
    colorTagText: '#b45309',
    logo: '/images/logo-finanzas.png',
    name: 'Finanzas',
    desc: 'Guías para entender tu dinero y tomar mejores decisiones.',
    tags: ['Presupuesto', 'Ahorro', 'Seguros', 'Finanzas personales'],
    article: { title: 'Entender tus finanzas', readTime: '6 min', href: '/articles' },
    href: '/finanzas',
  },
];

// Applications: not grouped by pillar — shown as independent tools
const BENTO_FEATURED = {
  name: 'Mi Hogar',
  emoji: '🏠',
  desc: 'El centro de tu hogar y tu familia',
  color: '#1558a8',
  colorLight: '#eff6ff',
  colorBorder: '#bfdbfe',
  colorTag: '#dbeafe',
  colorTagText: '#1d4ed8',
  subApps: ['Documentos', 'Lista de compra', 'Contraseñas', 'Recetas', 'Garantías'],
};

const BENTO_APPS = [
  { name: 'Organizador',     emoji: '⚡', color: '#1558a8', colorLight: '#eff6ff',  colorBorder: '#bfdbfe' },
  { name: 'El Campus',       emoji: '🎓', color: '#1a5c2e', colorLight: '#f0fdf4',  colorBorder: '#bbf7d0' },
  { name: 'Gastos',          emoji: '💳', color: '#b87514', colorLight: '#fffbeb',  colorBorder: '#fde68a' },
  { name: 'Documentos',      emoji: '📂', color: '#1a5c2e', colorLight: '#f0fdf4',  colorBorder: '#bbf7d0' },
  { name: 'Ahorro',          emoji: '💰', color: '#b87514', colorLight: '#fffbeb',  colorBorder: '#fde68a' },
  { name: 'Seguros',         emoji: '🛡️', color: '#7c3aed', colorLight: '#f5f3ff',  colorBorder: '#ddd6fe' },
  { name: 'Botiquín',        emoji: '💊', color: '#dc2626', colorLight: '#fef2f2',  colorBorder: '#fecaca' },
  { name: 'Lista de compra', emoji: '🛒', color: '#1a5c2e', colorLight: '#f0fdf4',  colorBorder: '#bbf7d0' },
  { name: 'Cuadrante',       emoji: '📊', color: '#7c3aed', colorLight: '#f5f3ff',  colorBorder: '#ddd6fe' },
  { name: 'Resumen Diario',  emoji: '📋', color: '#1558a8', colorLight: '#eff6ff',  colorBorder: '#bfdbfe' },
];

// ── Helpers ───────────────────────────────────────────────────────────

function ArrowRight({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function PlayIcon({ color }: { color: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-full transition-transform group-hover:scale-110"
      style={{ width: 60, height: 60, backgroundColor: 'rgba(255,255,255,0.97)', boxShadow: '0 6px 24px rgba(0,0,0,0.18)' }}
    >
      <svg width={24} height={24} viewBox="0 0 24 24" fill={color} style={{ marginLeft: 4 }}>
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
  );
}

function SectionLabel({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className="text-xs font-bold tracking-[0.22em] uppercase mb-3" style={{ color: light ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>
      {children}
    </p>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="overflow-x-hidden" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>

      {/* ─── 1. HERO ─────────────────────────────────────────────── */}
      <section
        className="relative flex flex-col items-center justify-center px-6 py-28 text-center overflow-hidden"
        style={{ minHeight: '88vh' }}
      >
        {/* Subtle colour splashes */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 55% 45% at 10% 15%, rgba(26,92,46,0.07) 0%, transparent 60%), radial-gradient(ellipse 45% 40% at 90% 20%, rgba(21,88,168,0.06) 0%, transparent 60%), radial-gradient(ellipse 35% 30% at 55% 88%, rgba(184,117,20,0.06) 0%, transparent 60%)' }} />

        <div className="relative max-w-4xl mx-auto flex flex-col items-center gap-8">
          {/* Beta badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border" style={{ borderColor: '#bbf7d0', color: '#166534', backgroundColor: '#f0fdf4' }}>
            <span className="w-2 h-2 rounded-full bg-green-500" style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
            Beta privada · Plazas limitadas
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.04]">
            Tu vida,{' '}
            <span style={{ color: '#1a5c2e' }}>organizada.</span>
            <br />
            Tu conocimiento,{' '}
            <span style={{ color: '#1558a8' }}>aplicado.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl max-w-xl leading-relaxed" style={{ color: '#475569' }}>
            QUIOBA es el sistema operativo personal y familiar que reúne conocimiento,
            organización y herramientas en un único ecosistema.
          </p>

          {/* Primary CTA */}
          <Link
            href="/beta"
            className="inline-flex items-center gap-2.5 px-9 py-4 rounded-2xl text-base font-black transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95"
            style={{ backgroundColor: '#1a5c2e', color: '#ffffff', boxShadow: '0 10px 30px rgba(26,92,46,0.30)' }}
          >
            Solicitar acceso anticipado
            <ArrowRight size={18} />
          </Link>

          {/* Pillar pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {[
              { label: 'Cuerpo',   color: '#1a5c2e', bg: '#f0fdf4', border: '#bbf7d0', href: '/cuerpo'   },
              { label: 'Mente',    color: '#1558a8', bg: '#eff6ff', border: '#bfdbfe', href: '/mente'    },
              { label: 'Finanzas', color: '#b87514', bg: '#fffbeb', border: '#fde68a', href: '/finanzas' },
            ].map((p) => (
              <Link key={p.label} href={p.href} className="px-4 py-1.5 rounded-full text-xs font-bold border transition-opacity hover:opacity-70" style={{ color: p.color, backgroundColor: p.bg, borderColor: p.border }}>
                {p.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 2. ASÍ TE AYUDA QUIOBA (videos) ────────────────────── */}
      <section className="py-24 px-6" style={{ backgroundColor: '#f8fafc' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <SectionLabel>En acción</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-black leading-tight" style={{ color: '#0f172a' }}>
              Así te ayuda QUIOBA
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {VIDEO_SCENARIOS.map((s) => (
              <div
                key={s.id}
                className="group flex flex-col rounded-3xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl"
                style={{ backgroundColor: '#ffffff', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
              >
                {/* Video placeholder — swap for <video autoPlay muted loop playsInline> when ready */}
                <div
                  className="relative w-full flex flex-col items-center justify-center gap-5"
                  style={{ aspectRatio: '4/3', backgroundColor: s.colorLight }}
                  data-video-slot={s.id}
                >
                  {/* Subtle vignette */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.08) 0%, transparent 50%)' }} aria-hidden="true" />

                  {/* Pillar label */}
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold z-10" style={{ backgroundColor: s.colorTag, color: s.colorTagText }}>
                    {s.pillar}
                  </div>

                  <span className="text-7xl select-none z-10" aria-hidden="true">{s.emoji}</span>
                  <div className="z-10"><PlayIcon color={s.color} /></div>
                </div>

                {/* Caption */}
                <div className="px-7 py-6 flex flex-col gap-2.5 flex-1">
                  <h3 className="font-black text-lg leading-snug" style={{ color: '#0f172a' }}>{s.headline}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{s.caption}</p>
                </div>

                {/* Accent strip */}
                <div className="h-1" style={{ backgroundColor: s.color }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. CONOCIMIENTO (pillar content, articles) ──────────── */}
      <section className="py-24 px-6" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-14 flex-wrap gap-4">
            <div>
              <SectionLabel>Conocimiento</SectionLabel>
              <h2 className="text-3xl md:text-5xl font-black leading-tight" style={{ color: '#0f172a' }}>
                Lo que puedes aprender
                <br className="hidden md:block" /> en QUIOBA
              </h2>
            </div>
            <Link href="/articles" className="text-sm font-bold flex items-center gap-1.5 transition-opacity hover:opacity-70" style={{ color: '#1a5c2e' }}>
              Ver todo el contenido <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {KNOWLEDGE_PILLARS.map((p) => (
              <div
                key={p.name}
                className="flex flex-col rounded-3xl overflow-hidden"
                style={{ backgroundColor: p.colorLight, border: `1.5px solid ${p.colorBorder}`, boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}
              >
                {/* Header */}
                <div className="p-7 flex flex-col gap-5 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ffffff', boxShadow: '0 2px 10px rgba(0,0,0,0.09)' }}>
                      <Image src={p.logo} alt={p.name} width={24} height={24} className="object-contain" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: p.color }}>QUIOBA</p>
                      <h3 className="font-black text-xl leading-tight" style={{ color: '#0f172a' }}>{p.name}</h3>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{p.desc}</p>

                  <div className="flex flex-wrap gap-2">
                    {p.tags.map((tag) => (
                      <span key={tag} className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: p.colorTag, color: p.colorTagText }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Featured article */}
                <Link
                  href={p.article.href}
                  className="group flex items-center justify-between gap-3 px-7 py-5 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#ffffff', borderTop: `1.5px solid ${p.colorBorder}` }}
                >
                  <div>
                    <p className="text-xs font-semibold mb-0.5" style={{ color: '#94a3b8' }}>Artículo · {p.article.readTime}</p>
                    <p className="font-black text-sm leading-tight" style={{ color: '#0f172a' }}>{p.article.title}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:translate-x-1" style={{ backgroundColor: p.colorLight }}>
                    <ArrowRight size={14} style={{ color: p.color }} />
                  </div>
                </Link>

                {/* Pillar page link */}
                <Link
                  href={p.href}
                  className="flex items-center justify-center gap-1.5 py-4 text-xs font-bold transition-opacity hover:opacity-70"
                  style={{ color: p.color, borderTop: `1px solid ${p.colorBorder}` }}
                >
                  Explorar QUIOBA {p.name} <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. APLICACIONES — big bento mockup ──────────────────── */}
      <section className="py-24 px-6" style={{ backgroundColor: '#f8fafc' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <SectionLabel>Aplicaciones</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-black leading-tight mb-3" style={{ color: '#0f172a' }}>
              Las herramientas de QUIOBA
            </h2>
            <p className="text-base max-w-md mx-auto" style={{ color: '#64748b' }}>
              Un ecosistema de aplicaciones integradas para organizar tu vida diaria.
            </p>
          </div>

          {/* Browser window mockup */}
          <div
            className="max-w-5xl mx-auto rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 40px 100px -15px rgba(0,0,0,0.13), 0 0 0 1.5px rgba(0,0,0,0.06)' }}
          >
            {/* Window chrome */}
            <div className="flex items-center gap-3 px-5 py-3.5" style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
              <div className="flex gap-1.5 flex-shrink-0">
                <span className="block w-3 h-3 rounded-full" style={{ backgroundColor: '#fc6058' }} />
                <span className="block w-3 h-3 rounded-full" style={{ backgroundColor: '#fec02f' }} />
                <span className="block w-3 h-3 rounded-full" style={{ backgroundColor: '#2bc840' }} />
              </div>
              <div className="flex-1 max-w-[180px] mx-auto px-3 py-1.5 rounded-lg text-center" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                <span className="text-[11px] font-mono" style={{ color: '#94a3b8' }}>quioba.com</span>
              </div>
            </div>

            {/* App interface */}
            <div className="p-5" style={{ backgroundColor: '#fafafa' }}>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4 pb-3.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div className="flex items-center gap-2">
                  <Image src="/images/logo.png" alt="QUIOBA" width={18} height={18} className="object-contain" />
                  <span className="font-black text-sm" style={{ color: '#1a5c2e' }}>QUIOBA</span>
                </div>
                <span className="text-xs hidden sm:block" style={{ color: '#94a3b8' }}>Sistema operativo personal y familiar</span>
              </div>

              {/* Bento grid: Mi Hogar featured + 10 regular tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Mi Hogar — featured tile (2 cols wide) */}
                <div
                  className="col-span-2 p-6 rounded-2xl flex flex-col gap-5"
                  style={{ backgroundColor: BENTO_FEATURED.colorLight, border: `1.5px solid ${BENTO_FEATURED.colorBorder}`, minHeight: 180 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style={{ backgroundColor: '#ffffff', boxShadow: '0 3px 12px rgba(0,0,0,0.1)' }}>
                      {BENTO_FEATURED.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-lg leading-tight" style={{ color: BENTO_FEATURED.color }}>{BENTO_FEATURED.name}</p>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: '#64748b' }}>{BENTO_FEATURED.desc}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {BENTO_FEATURED.subApps.map((sub) => (
                      <span key={sub} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: BENTO_FEATURED.colorTag, color: BENTO_FEATURED.colorTagText }}>
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Regular app tiles — 10 items = 2.5 rows × 4 cols */}
                {BENTO_APPS.map((app) => (
                  <div
                    key={app.name}
                    className="p-4 rounded-2xl flex flex-col gap-3 transition-all hover:scale-[1.03]"
                    style={{ backgroundColor: '#ffffff', border: '1.5px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: app.colorLight, border: `1.5px solid ${app.colorBorder}` }}
                    >
                      {app.emoji}
                    </div>
                    <p className="font-bold text-sm leading-tight" style={{ color: app.color }}>{app.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. BETA CTA ─────────────────────────────────────────── */}
      <section className="py-32 px-6 text-center" style={{ backgroundColor: '#1a5c2e' }}>
        <div className="max-w-xl mx-auto flex flex-col items-center gap-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border" style={{ borderColor: 'rgba(187,247,208,0.4)', color: '#bbf7d0', backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <span className="w-2 h-2 rounded-full bg-green-300" style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
            Programa Beta
          </div>

          <h2 className="text-4xl md:text-6xl font-black leading-[1.05]" style={{ color: '#ffffff' }}>
            Sé de los primeros
            <br />en acceder
          </h2>

          <p className="text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Plazas limitadas. Solo para personas comprometidas con organizar y mejorar su vida.
          </p>

          <Link
            href="/beta"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-lg font-black transition-all hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: '#ffffff', color: '#1a5c2e', boxShadow: '0 10px 40px rgba(0,0,0,0.22)' }}
          >
            Solicitar acceso <ArrowRight size={20} />
          </Link>

          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Sin coste. Sin compromiso.</p>
        </div>
      </section>

    </div>
  );
}
