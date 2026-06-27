import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import VideoScenarios from '@/components/home/VideoScenarios';

export const metadata: Metadata = {
  title: 'QUIOBA — Tu sistema operativo personal y familiar',
  description:
    'QUIOBA es el sistema operativo personal y familiar que reúne conocimiento, organización y herramientas en un único ecosistema.',
};

// ── Data ────────────────────────────────────────────────────────────────────


const PILLARS_KNOWLEDGE = [
  {
    name: 'Cuerpo',
    logo: '/images/logo-cuerpo.png',
    photo: '/images/photo-cuerpo.jpg',
    photoPosition: 'center center',
    color: '#1a5c2e',
    tagColor: '#166534',
    desc: 'Entiende tu cuerpo y mejora tu bienestar diario.',
    cats: ['Sueño', 'Nutrición', 'Movimiento', 'Salud', 'Energía', 'Hábitos saludables'],
    articleTitle: 'Qué son los ciclos circadianos',
    articleHref: '/articles/ciclos-circadianos',
    href: '/cuerpo',
  },
  {
    name: 'Mente',
    logo: '/images/logo-mente.png',
    photo: '/images/photo-mente.jpg',
    photoPosition: 'right center',
    color: '#1558a8',
    tagColor: '#1d4ed8',
    desc: 'Desarrolla tu mente y alcanza tu mejor versión.',
    cats: ['Concentración', 'Productividad', 'Aprendizaje', 'Hábitos', 'Pensamiento crítico', 'Organización'],
    articleTitle: 'Cómo funciona tu atención',
    articleHref: '/articles',
    href: '/mente',
  },
  {
    name: 'Finanzas',
    logo: '/images/logo-finanzas.png',
    photo: '/images/photo-finanzas.jpg',
    photoPosition: 'right center',
    color: '#b87514',
    tagColor: '#b45309',
    desc: 'Toma el control de tu dinero y tu futuro.',
    cats: ['Presupuestos', 'Ahorro', 'Seguros', 'Fiscalidad', 'Inversión', 'Gastos'],
    articleTitle: 'Cómo organizar tus finanzas personales',
    articleHref: '/articles',
    href: '/finanzas',
  },
];

const SIDEBAR_APPS = [
  { name: 'Inicio',         emoji: '🏠' },
  { name: 'Mi Hogar',       emoji: '🏡' },
  { name: 'Documentos',     emoji: '📂' },
  { name: 'Gastos',         emoji: '💳' },
  { name: 'Seguros',        emoji: '🛡️' },
  { name: 'Contraseñas',    emoji: '🔑' },
  { name: 'Agenda',         emoji: '📅' },
  { name: 'Lista compra',   emoji: '🛒' },
  { name: 'Garantías',      emoji: '🏷️' },
  { name: 'Vehículos',      emoji: '🚗' },
  { name: 'Organizador',    emoji: '⚡' },
  { name: 'El Campus',      emoji: '🎓' },
  { name: 'Cuadrante',      emoji: '📊' },
];

const REMINDERS = [
  { text: 'ITV del coche',   date: '12 noviembre', dotBg: '#fef3c7', dot: '#f59e0b' },
  { text: 'Seguro de hogar', date: '10 diciembre',  dotBg: '#dbeafe', dot: '#3b82f6' },
  { text: 'Cumpleaños Ana',  date: '18 noviembre',  dotBg: '#fce7f3', dot: '#ec4899' },
];

const QUICK_ACCESS = [
  { name: 'Mi Hogar',      emoji: '🏡', bg: '#eff6ff' },
  { name: 'Documentos',    emoji: '📂', bg: '#f0fdf4' },
  { name: 'Gastos',        emoji: '💳', bg: '#fffbeb' },
  { name: 'Seguros',       emoji: '🛡️', bg: '#f5f3ff' },
  { name: 'Lista compra',  emoji: '🛒', bg: '#f0fdf4' },
  { name: 'Organizador',   emoji: '⚡', bg: '#eff6ff' },
];

const CHART_BARS = [
  { m: 'Jun', h: 38 },
  { m: 'Jul', h: 60 },
  { m: 'Ago', h: 45 },
  { m: 'Sep', h: 75 },
  { m: 'Oct', h: 52 },
  { m: 'Nov', h: 90 },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function ArrowRight({ size = 16, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

// ── Product Mockup ───────────────────────────────────────────────────────────

function ProductMockup() {
  return (
    <div
      className="rounded-2xl overflow-hidden w-full"
      style={{
        boxShadow: '0 25px 80px -10px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
        fontSize: 12,
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ backgroundColor: '#1e293b' }}
      >
        <div className="flex items-center gap-2">
          <Image src="/images/logo.png" alt="QUIOBA" width={20} height={20} className="object-contain brightness-0 invert" />
          <span className="font-black text-sm" style={{ color: '#ffffff' }}>QUIOBA</span>
        </div>
        <div className="flex gap-2.5">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
      </div>

      {/* Body */}
      <div className="flex" style={{ minHeight: 420, backgroundColor: '#f8fafc' }}>
        {/* Sidebar */}
        <div
          className="flex flex-col py-2 flex-shrink-0"
          style={{ width: 148, backgroundColor: '#ffffff', borderRight: '1px solid #f1f5f9' }}
        >
          {SIDEBAR_APPS.map((app, i) => (
            <div
              key={app.name}
              className="flex items-center gap-2 px-3 py-1.5 cursor-default"
              style={{
                color: i === 0 ? '#1a5c2e' : '#374151',
                backgroundColor: i === 0 ? '#f0fdf4' : 'transparent',
                fontWeight: i === 0 ? 700 : 400,
                fontSize: 11,
              }}
            >
              <span style={{ fontSize: 12, lineHeight: 1 }}>{app.emoji}</span>
              <span className="truncate">{app.name}</span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
          {/* Greeting */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-black text-sm" style={{ color: '#0f172a' }}>Buenas tardes, Juan</p>
              <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>Todo en orden. Aquí tienes lo importante del día.</p>
            </div>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>

          {/* Two columns: reminders + gastos */}
          <div className="grid grid-cols-2 gap-3">
            {/* Próximos recordatorios */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="font-bold" style={{ fontSize: 10, color: '#374151' }}>Próximos recordatorios</p>
                <span style={{ fontSize: 9, color: '#1a5c2e', fontWeight: 600, cursor: 'default' }}>Ver todos →</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {REMINDERS.map((r) => (
                  <div
                    key={r.text}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #f1f5f9' }}
                  >
                    <span
                      className="flex-shrink-0 rounded-full"
                      style={{ width: 7, height: 7, backgroundColor: r.dot }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold" style={{ fontSize: 9.5, color: '#374151' }}>{r.text}</p>
                      <p style={{ fontSize: 8.5, color: '#94a3b8' }}>{r.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gastos este mes */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="font-bold" style={{ fontSize: 10, color: '#374151' }}>Gastos este mes</p>
                <span style={{ fontSize: 9, color: '#1a5c2e', fontWeight: 600, cursor: 'default' }}>Ver todos →</span>
              </div>
              <div className="rounded-lg p-2" style={{ backgroundColor: '#ffffff', border: '1px solid #f1f5f9' }}>
                <p className="font-black" style={{ fontSize: 18, color: '#0f172a', lineHeight: 1 }}>728 €</p>
                <p style={{ fontSize: 8.5, color: '#94a3b8', marginBottom: 6 }}>56 % del mes anterior</p>
                {/* Bar chart */}
                <div className="flex items-end gap-1" style={{ height: 44 }}>
                  {CHART_BARS.map((b) => (
                    <div key={b.m} className="flex flex-col items-center flex-1 gap-0.5">
                      <div
                        className="w-full rounded-sm"
                        style={{ height: b.h * 0.44, backgroundColor: b.m === 'Nov' ? '#1a5c2e' : '#bbf7d0' }}
                      />
                      <span style={{ fontSize: 7, color: '#94a3b8' }}>{b.m}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Accesos rápidos */}
          <div>
            <p className="font-bold mb-2" style={{ fontSize: 10, color: '#374151' }}>Accesos rápidos</p>
            <div className="grid grid-cols-6 gap-1.5">
              {QUICK_ACCESS.map((a) => (
                <div key={a.name} className="flex flex-col items-center gap-1 cursor-default">
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{ width: 32, height: 32, backgroundColor: a.bg, fontSize: 15 }}
                  >
                    {a.emoji}
                  </div>
                  <span className="text-center leading-tight" style={{ fontSize: 7.5, color: '#64748b', maxWidth: 36 }}>{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div style={{ backgroundColor: '#ffffff', color: '#0f172a', overflowX: 'hidden' }}>

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative grid md:grid-cols-2"
        style={{ minHeight: 'calc(100vh - 64px)' }}
      >
        {/* Mobile background video (hidden on md+) */}
        <div className="absolute inset-0 block md:hidden overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          >
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>
          {/* Overlay para legibilidad del texto */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.50) 100%)',
            }}
          />
        </div>

        {/* Left: copy */}
        <div className="relative z-10 flex flex-col justify-center gap-5 px-8 md:px-14 lg:px-20 py-16 md:py-0">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 self-start px-4 py-1.5 rounded-full text-sm font-semibold border" style={{ borderColor: '#bbf7d0', color: '#166534', backgroundColor: '#f0fdf4' }}>
            <span className="w-2 h-2 rounded-full bg-green-500" style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
            Beta privada · Plazas limitadas
          </div>

          {/* H1 */}
          <h1 className="text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight leading-[1.03]">
            Tu vida,{' '}
            <span style={{ color: '#1a5c2e' }}>organizada.</span>
            <br />
            Tu conocimiento,{' '}
            <span style={{ color: '#1558a8' }}>aplicado.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg leading-relaxed max-w-md" style={{ color: '#000000' }}>
            QUIOBA es el sistema operativo personal y familiar que reúne
            conocimiento, organización y herramientas en un único ecosistema.
          </p>

          {/* CTA */}
          <Link
            href="/beta"
            className="inline-flex items-center gap-2.5 self-start px-8 py-4 rounded-2xl text-base font-black transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95"
            style={{ backgroundColor: '#1a5c2e', color: '#ffffff', boxShadow: '0 8px 28px rgba(26,92,46,0.28)' }}
          >
            Solicitar acceso a la beta
            <ArrowRight size={17} />
          </Link>

        </div>

        {/* Right: hero video — blends into left column via gradient */}
        <div
          className="relative hidden md:block overflow-hidden"
          style={{ minHeight: '60vh', backgroundColor: '#ffffff' }}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          >
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>

          {/* Gradient blanco → transparente en borde izquierdo */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to right, #ffffff 0%, rgba(255,255,255,0.5) 10%, rgba(255,255,255,0) 25%)',
              zIndex: 1,
            }}
          />
        </div>
      </section>

      {/* ── 2. ASÍ TE AYUDA QUIOBA (5 vídeos) ──────────────────────────────── */}
      <VideoScenarios />

      {/* ── 3 + 4. CONOCIMIENTO + HERRAMIENTAS ──────────────────────────────── */}
      <section className="py-24 px-6" style={{ backgroundColor: '#f8fafc' }}>
        <div className="max-w-7xl mx-auto">

          {/* Two-column layout: 65% left / 35% right */}
          <div className="grid md:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-10 xl:gap-14 items-start">

            {/* ── LEFT: Lo que puedes aprender ── */}
            <div>
              {/* Header */}
              <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black leading-tight mb-2" style={{ color: '#0f172a' }}>
                    Lo que puedes aprender<br className="hidden sm:block" /> en QUIOBA
                  </h2>
                  <p className="text-base" style={{ color: '#64748b' }}>
                    Conocimiento práctico para mejorar tu vida, mente y dinero.
                  </p>
                </div>
                <Link
                  href="/articles"
                  className="flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-bold transition-opacity hover:opacity-70 mt-1"
                  style={{ color: '#1a5c2e' }}
                >
                  Ver todo el contenido <ArrowRight size={13} />
                </Link>
              </div>

              {/* Pillar cards */}
              <div className="flex flex-col gap-5">
                {PILLARS_KNOWLEDGE.map((p) => (
                  <div
                    key={p.name}
                    className="rounded-2xl overflow-hidden flex"
                    style={{ backgroundColor: '#ffffff', boxShadow: '0 2px 20px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9' }}
                  >
                    {/* Content — fills available space */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      {/* Card header */}
                      <div className="flex items-center justify-between px-6 pt-6 pb-4 gap-4">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: p.color + '12', boxShadow: `0 0 0 1px ${p.color}20` }}
                          >
                            <Image src={p.logo} alt={p.name} width={26} height={26} className="object-contain" />
                          </div>
                          <div>
                            <p className="font-black text-lg leading-tight" style={{ color: p.color }}>
                              QUIOBA {p.name}
                            </p>
                            <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{p.desc}</p>
                          </div>
                        </div>
                        <Link
                          href={p.href}
                          className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                          style={{ backgroundColor: p.color + '12', color: p.color }}
                        >
                          Ver más →
                        </Link>
                      </div>

                      {/* Category chips */}
                      <div className="flex flex-wrap gap-2 px-6 pb-4">
                        {p.cats.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: p.color + '0d', color: p.tagColor }}
                          >
                            <span style={{ color: p.color, fontWeight: 700 }}>✓</span> {cat}
                          </span>
                        ))}
                      </div>

                      {/* Featured article */}
                      <div className="px-6 pb-6 mt-auto">
                        <Link
                          href={p.articleHref}
                          className="group/art flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.01]"
                          style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                        >
                          <div
                            className="w-14 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
                            style={{ backgroundColor: p.color + '18' }}
                          >
                            <Image src={p.logo} alt="" width={20} height={20} className="object-contain opacity-60" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#94a3b8' }}>Artículo destacado</p>
                            <p className="text-sm font-black leading-tight truncate" style={{ color: '#0f172a' }}>{p.articleTitle}</p>
                          </div>
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover/art:translate-x-0.5"
                            style={{ backgroundColor: p.color + '15', color: p.color }}
                          >
                            <ArrowRight size={12} />
                          </div>
                        </Link>
                      </div>
                    </div>

                    {/* Photo — clamp(220px, 32%, 360px), hidden below lg */}
                    <div
                      className="group hidden lg:block relative flex-shrink-0 overflow-hidden"
                      style={{ width: 'clamp(220px, 32%, 360px)' }}
                    >
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 z-10 pointer-events-none"
                        style={{
                          background: 'linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(255,255,255,.7) 25%, rgba(255,255,255,.2) 50%, rgba(255,255,255,0) 70%)',
                        }}
                      />
                      <Image
                        src={p.photo}
                        alt={p.name}
                        fill
                        className="object-cover transition-[transform,filter] duration-300 ease-out group-hover:scale-[1.03] group-hover:brightness-105"
                        style={{ objectPosition: p.photoPosition }}
                        sizes="260px"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: Las herramientas ── */}
            <div className="sticky top-24 flex flex-col gap-6">
              <div>
                <h2 className="text-3xl md:text-4xl font-black leading-tight mb-2" style={{ color: '#0f172a' }}>
                  Las herramientas<br /> de QUIOBA
                </h2>
                <p className="text-base mb-6" style={{ color: '#64748b' }}>
                  Todo lo que necesitas en un único lugar.
                </p>
              </div>

              <ProductMockup />

              {/* Benefits card */}
              <div
                className="rounded-2xl p-5"
                style={{ backgroundColor: '#ffffff', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}
              >
                <div className="flex flex-col gap-4">
                  {[
                    { icon: '📂', title: 'Todo centralizado', desc: 'Documentos, seguros, recordatorios y más en un panel.' },
                    { icon: '🔔', title: 'Sin olvidar nada', desc: 'Recordatorios automáticos de vencimientos y citas.' },
                    { icon: '🎓', title: 'Aprende mientras organizas', desc: 'El Campus QUIOBA conecta conocimiento con tu vida real.' },
                  ].map((b) => (
                    <div key={b.title} className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: '#f1f5f9' }}
                      >
                        {b.icon}
                      </div>
                      <div>
                        <p className="font-black text-sm leading-tight" style={{ color: '#0f172a' }}>{b.title}</p>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#64748b' }}>{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── BOTTOM: Campus full-width card ── */}
          <div
            className="mt-12 rounded-3xl overflow-hidden relative flex flex-col md:flex-row items-center justify-between gap-8 px-10 py-10"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1a5c2e 100%)', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
          >
            {/* Decorative circle */}
            <div
              aria-hidden="true"
              className="absolute right-0 top-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #4ade80, transparent)', transform: 'translate(30%, -30%)' }}
            />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#bbf7d0' }}>
                🎓 El Campus QUIOBA
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white leading-tight mb-2">
                Aprende. Aplica. Mejora.
              </h3>
              <p className="text-sm md:text-base" style={{ color: 'rgba(255,255,255,0.65)', maxWidth: 480 }}>
                Artículos, guías y recursos prácticos sobre cuerpo, mente y finanzas — diseñados para que el conocimiento cambie tu vida real.
              </p>
            </div>
            <Link
              href="/articles"
              className="relative z-10 flex-shrink-0 inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-sm font-black transition-all hover:scale-[1.03] active:scale-95"
              style={{ backgroundColor: '#ffffff', color: '#0f172a', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
            >
              Ir al Campus <ArrowRight size={14} />
            </Link>
          </div>

        </div>
      </section>

      {/* ── 5. CTA FINAL ────────────────────────────────────────────────────── */}
      <section
        className="flex flex-col sm:flex-row items-center justify-between gap-4 px-8 md:px-16 py-5"
        style={{ backgroundColor: '#1a5c2e' }}
      >
        <p className="text-sm font-semibold text-center sm:text-left" style={{ color: '#ffffff' }}>
          QUIOBA está en desarrollo.{' '}
          <span style={{ color: '#bbf7d0' }}>Únete a la beta privada.</span>
        </p>
        <Link
          href="/beta"
          className="flex-shrink-0 inline-flex items-center gap-2.5 px-7 py-3 rounded-xl text-sm font-black transition-all hover:scale-[1.03] active:scale-95"
          style={{ backgroundColor: '#ffffff', color: '#1a5c2e', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
        >
          Solicitar acceso ahora <ArrowRight size={14} />
        </Link>
      </section>

    </div>
  );
}
